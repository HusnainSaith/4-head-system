const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {Client}=require('../../4_Head_poltary_system/node_modules/pg');
const jwt=require('../../4_Head_poltary_system/node_modules/jsonwebtoken');
const dotenv=require('../../4_Head_poltary_system/node_modules/dotenv');
const {DataSource}=require('../../4_Head_poltary_system/node_modules/typeorm');
const {SnakeNamingStrategy}=require('../../4_Head_poltary_system/node_modules/typeorm-naming-strategies');
const {LedgerEntry}=require('../../4_Head_poltary_system/dist/src/modules/ledger/entities/ledger-entry.entity');
const {ChartOfAccount}=require('../../4_Head_poltary_system/dist/src/modules/ledger/entities/chart-of-account.entity');
const {LedgerRepository}=require('../../4_Head_poltary_system/dist/src/modules/ledger/ledger.repository');
const {LedgerService}=require('../../4_Head_poltary_system/dist/src/modules/ledger/ledger.service');
async function main(){
  const local=process.argv.includes('--local');
  const userData=path.join(process.env.APPDATA,'4head-desktop');
  const config={};
  if(local) for(const name of ['.env','.env.local']){const file=path.resolve(__dirname,'../../4_Head_poltary_system',name);if(fs.existsSync(file))Object.assign(config,dotenv.parse(fs.readFileSync(file)));}
  const password=local?config.DB_PASSWORD:crypto.createHash('sha256').update(`${userData}:4head-local-db`).digest('hex');
  const client=new Client({host:local?config.DB_HOST:'127.0.0.1',port:local?Number(config.DB_PORT||5432):Number(fs.readFileSync(path.join(userData,'postgres-data/postmaster.pid'),'utf8').split(/\r?\n/)[3]),user:local?config.DB_USERNAME:'postgres',password,database:local?(config.DB_DATABASE||config.DB_NAME):'4head_local',options:'-c default_transaction_read_only=on'});
  let statementSource;
  try{
    await client.connect();
    const {rows:[owner]}=await client.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(r.name)='owner' AND u.deleted_at IS NULL LIMIT 1");
    assert(owner,'An existing owner is needed');
    const secret=local?config.JWT_SECRET:crypto.createHash('sha512').update(`${password}:4head-jwt`).digest('hex');
    const token=jwt.sign({sub:owner.id},secret,{expiresIn:'5m'});
    let port=process.env.FOURHEAD_SMOKE_PORT;
    if(!port&&!local){const log=fs.readFileSync(path.join(userData,'4head-desktop.log'),'utf8');port=[...log.matchAll(/Application is running on: http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/g)].at(-1)?.[1];}
    assert(port,'Backend API port required');
    const timings=[];
    async function get(route){const started=performance.now();const response=await fetch(`http://127.0.0.1:${port}${route}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(15000)});const result=await response.json();assert.equal(response.status,200,`${route}: ${JSON.stringify(result)}`);timings.push(Math.round(performance.now()-started));return result.data;}
    const {rows:balances}=await client.query("SELECT party_id,department_id,SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END)::text AS balance FROM ledger_entries WHERE party_id IS NOT NULL GROUP BY party_id,department_id");
    const byDepartment=new Map(balances.map(row=>[`${row.department_id}:${row.party_id}`,Number(row.balance)]));
    const global=new Map();for(const row of balances)global.set(row.party_id,(global.get(row.party_id)||0)+Number(row.balance));
    let checkedParties=0,checkedDepartmentBalances=0,checkedStatements=0;
    const departments=await get('/departments');
    for(const department of departments){
      let page=1,pages=1;
      do{const result=await get(`/parties?departmentId=${department.id}&limit=100&page=${page}`);pages=result.pagination.totalPages;for(const party of result.items){assert.equal(Number(party.currentBalance),byDepartment.get(`${department.id}:${party.id}`)||0,`${department.type} party-picker sign/balance differs from ledger`);checkedParties++;}page++;}while(page<=pages);
      const result=await get(`/departments/${department.type.toLowerCase().replaceAll('_','-')}/party-balances`);
      let payable=0,receivable=0;
      for(const party of result.parties){const expected=byDepartment.get(`${department.id}:${party.partyId}`)||0;assert.equal(Number(party.balance),expected);if(expected>0)payable+=expected;else receivable-=expected;checkedDepartmentBalances++;}
      assert(Math.abs(Number(result.totalPayable)-payable)<0.01);assert(Math.abs(Number(result.totalReceivable)-receivable)<0.01);
    }
    const outstanding=await get('/reports/outstanding-balances');
    for(const row of outstanding)assert.equal(Number(row.balance),byDepartment.get(`${row.departmentId}:${row.partyId}`)||0);
    const parties=await get('/parties?limit=100');
    const allParties=[...parties.items];
    for(let page=2;page<=parties.pagination.totalPages;page++){
      const next=await get(`/parties?limit=100&page=${page}`);
      allParties.push(...next.items);
    }
    for(const party of allParties){assert(Math.abs(Number(party.currentBalance)-(global.get(party.id)||0))<0.01);}
    statementSource=new DataSource({type:'postgres',host:client.connectionParameters.host,port:client.connectionParameters.port,username:client.connectionParameters.user,password,database:client.connectionParameters.database,
      entities:[path.resolve(__dirname,'../../4_Head_poltary_system/dist/src/modules/**/*.entity.js')],namingStrategy:new SnakeNamingStrategy(),synchronize:false,installExtensions:false,logging:false,extra:{options:'-c default_transaction_read_only=on'}});
    await statementSource.initialize();
    const ledgerService=new LedgerService(new LedgerRepository(statementSource.getRepository(LedgerEntry),statementSource.getRepository(ChartOfAccount)));
    for(const [index,party] of allParties.entries()){
      // Sample HTTP behavior, then verify every remaining statement through the
      // same production service/repository with writes blocked and no API burst.
      const statement=index<10?await get(`/parties/${party.id}/statement`):await ledgerService.getPartyStatement(party.id);let balance=0;
      for(const entry of statement.entries){balance+=(entry.entryType==='credit'?1:-1)*Number(entry.amount);assert(Math.abs(Number(entry.runningBalance)-balance)<0.01);}
      assert(Math.abs(Number(statement.closingBalance)-balance)<0.01);checkedStatements++;
      assert(Math.abs(Number(statement.closingBalance)-(global.get(party.id)||0))<0.01,'Statement and party balance disagree');
    }
    const result={environment:local?'local':'desktop',checkedAt:new Date().toISOString(),departments:departments.length,checkedParties,checkedDepartmentBalances,outstandingRows:outstanding.length,checkedStatements,requests:timings.length,maxResponseMilliseconds:Math.max(...timings),passed:true};
    fs.writeFileSync(path.resolve(__dirname,`../../qa-artifacts/party-balance-signs-${local?'local':require('../package.json').version}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{if(statementSource?.isInitialized)await statementSource.destroy();await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});

