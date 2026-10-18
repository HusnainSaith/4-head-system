const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync,fork}=require('child_process');
const {Client}=require('../../4_Head_poltary_system/node_modules/pg');
const jwt=require('../../4_Head_poltary_system/node_modules/jsonwebtoken');
const root=path.resolve(__dirname,'../..'),userData=path.join(process.env.APPDATA,'4head-desktop');
const sandbox=path.join(root,'qa-artifacts','day-book-1.0.25-clone'),data=path.join(sandbox,'postgres-data');
const pgctl=path.join(root,'desktop/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe');
const password=crypto.createHash('sha256').update(`${userData}:4head-local-db`).digest('hex');
let child,started=false,client;const checks=[];
(async()=>{
 if(fs.existsSync(sandbox))throw Error('Refusing to overwrite isolated test database');
 fs.mkdirSync(sandbox,{recursive:true});fs.cpSync(path.join(userData,'database-backups/manual-before-app-1.0.25/postgres-data'),data,{recursive:true});
 assert(!fs.existsSync(path.join(data,'postmaster.pid')),'Clone must be from a stopped database');
 execFileSync(pgctl,['-D',data,'-l',path.join(sandbox,'postgres.log'),'-o','-p 55623 -h 127.0.0.1','-w','start'],{stdio:'ignore',windowsHide:true});started=true;
 client=new Client({host:'127.0.0.1',port:55623,user:'postgres',password,database:'4head_local'});await client.connect();
 const {rows:[owner]}=await client.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(r.name)='owner' AND u.deleted_at IS NULL LIMIT 1");
 const secret=crypto.randomBytes(48).toString('hex'),token=jwt.sign({sub:owner.id},secret,{expiresIn:'10m'});
 child=fork(path.join(root,'4_Head_poltary_system/dist/src/main.js'),[],{cwd:path.join(root,'4_Head_poltary_system'),env:{...process.env,DB_HOST:'127.0.0.1',DB_PORT:'55623',DB_USERNAME:'postgres',DB_PASSWORD:password,DB_DATABASE:'4head_local',DB_NAME:'4head_local',JWT_SECRET:secret,PORT:'55624',PGOPTIONS:'-c default_transaction_read_only=on',NODE_ENV:'test',DESKTOP_AUTO_MIGRATE:'false',DESKTOP_SCHEMA_UPGRADE:'false',DESKTOP_AUTO_SEED:'false',NOTIFICATION_ENABLED:'false',DISABLE_EMAIL_DELIVERY:'true',TYPEORM_LOGGING:'false'},stdio:['ignore','pipe','pipe','ipc']});
 await new Promise((resolve,reject)=>{let ready=false;const timer=setTimeout(()=>reject(Error('Isolated backend startup timed out')),45000);child.stdout.on('data',d=>{fs.appendFileSync(path.join(sandbox,'backend.log'),d);if(!ready&&String(d).includes('Application is running on:')){ready=true;clearTimeout(timer);resolve();}});child.stderr.on('data',d=>fs.appendFileSync(path.join(sandbox,'backend.log'),d));child.once('exit',code=>{if(!ready){clearTimeout(timer);reject(Error(`Isolated backend exited: ${code}`));}});});
 console.log('Isolated database clone ready; desktop and local databases are not test targets');
 const request=async(method,route,body,status=200)=>{const response=await fetch(`http://127.0.0.1:55624${route}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const result=await response.json();assert.equal(response.status,status,`${method} ${route}: ${JSON.stringify(result)}`);return result.data;};
 const balance=async(party,dept)=>Number((await client.query("SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) value FROM ledger_entries WHERE party_id=$1 AND department_id=$2",[party,dept])).rows[0].value);

 const {capture}=require('./verify-existing-database.cjs');await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL TIME ZONE 'UTC'");const before=await capture(client);await client.query('ROLLBACK');
 const checks=[];
 for(const kind of ['sale','purchase']){
  const table=kind==='sale'?'brokerage_sales':'brokerage_purchases',date=kind==='sale'?'sale_date':'purchase_date';
  const {rows:[expected]}=await client.query(`SELECT COUNT(*)::int count,COALESCE(SUM(total_amount),0)::text amount FROM ${table} WHERE deleted_at IS NULL AND status::text='active' AND ${date}='2026-10-12'`);
  const result=await request('GET',`/brokerage/${kind}s?from=2026-10-12&to=2026-10-12&page=1&limit=2`);
  assert.equal(result.pagination.total,expected.count);assert.equal(Number(result.summary.totalAmount),Number(expected.amount));assert(expected.count>0);
  const ids=[];for(let page=1;page<=result.pagination.totalPages;page++){const pageData=page===1?result:await request('GET',`/brokerage/${kind}s?from=2026-10-12&to=2026-10-12&page=${page}&limit=2`);for(const row of pageData.items){assert.equal(String(row[kind==='sale'?'saleDate':'purchaseDate']).slice(0,10),'2026-10-12');ids.push(row.id);}}
  assert.equal(ids.length,expected.count);assert.equal(new Set(ids).size,expected.count);checks.push({check:kind+' October 12 full pagination and summary',rows:expected.count,total:expected.amount});
 }
 const all=await request('GET','/reports/day-book?from=2026-10-01&to=2026-10-18');
 assert(all.transactions.every(row=>row.date>='2026-10-01'&&row.date<='2026-10-18'));
 const departments=await request('GET','/departments');
 for(const department of departments){const book=await request('GET',`/reports/day-book?from=2026-10-01&to=2026-10-18&departmentId=${department.id}`);assert(book.transactions.every(row=>row.departmentId===department.id));assert.equal(book.transactionCount,all.transactions.filter(row=>row.departmentId===department.id).length);checks.push({check:department.type+' day book',rows:book.transactionCount,parties:book.partyCount});}
 const sqlSources=[['brokerage_sales','sale','sale_date',"status::text='active'"],['brokerage_purchases','purchase','purchase_date',"status::text='active'"],['supply_sales','sale','sale_date',"status='posted'"],['supply_purchases','purchase','purchase_date',"status='posted'"],['wastage_sales','sale','sale_date','TRUE'],['wastage_purchases','purchase','purchase_date','TRUE'],['shop_sales','sale','sale_date','TRUE'],['shop_purchases','purchase','purchase_date',"status='posted'"]];
 let count=0,totalSales=0,totalPurchases=0;for(const [table,kind,date,condition]of sqlSources){const {rows:[row]}=await client.query(`SELECT COUNT(*)::int count,COALESCE(SUM(total_amount),0)::text amount FROM ${table} WHERE deleted_at IS NULL AND ${condition} AND ${date} BETWEEN '2026-10-01' AND '2026-10-18'`);count+=row.count;if(kind==='sale')totalSales+=Number(row.amount);else totalPurchases+=Number(row.amount);}
 assert.equal(all.transactionCount,count);assert.equal(Number(all.summary.sales),totalSales);assert.equal(Number(all.summary.purchases),totalPurchases);
 const participantKeys=new Set(all.transactions.filter(row=>row.partyId).map(row=>row.departmentId+':'+row.partyId));assert.equal(all.partyCount,participantKeys.size);
 for(const party of all.parties){assert(participantKeys.has(party.departmentId+':'+party.partyId));const {rows:[ledger]}=await client.query("SELECT COALESCE(SUM(CASE WHEN entry_date<'2026-10-01' THEN CASE WHEN entry_type='credit' THEN amount ELSE -amount END ELSE 0 END),0)::text opening,COALESCE(SUM(CASE WHEN entry_date<='2026-10-18' THEN CASE WHEN entry_type='credit' THEN amount ELSE -amount END ELSE 0 END),0)::text closing,COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0)::text current FROM ledger_entries WHERE party_id=$1 AND department_id=$2",[party.partyId,party.departmentId]);assert.equal(Number(party.openingBalance),Number(ledger.opening));assert.equal(Number(party.closingBalance),Number(ledger.closing));assert.equal(Number(party.currentBalance),Number(ledger.current));assert(Math.abs(Number(party.openingBalance)+Number(party.periodCredit)-Number(party.periodDebit)-Number(party.closingBalance))<0.01);}
 checks.push({check:'All day book source rows, participants, ledger balances and exact range totals',rows:count,parties:all.partyCount});
 const day=await request('GET','/reports/day-book?from=2026-10-12&to=2026-10-12');assert(day.transactions.every(row=>row.date==='2026-10-12'));checks.push({check:'Inclusive single-day day book',rows:day.transactionCount});
 await request('GET','/reports/day-book?from=2026-10-18&to=2026-10-01',undefined,400);await request('GET','/reports/day-book?from=bad&to=2026-10-01',undefined,400);await request('GET','/reports/day-book?from=2026-10-01&to=2026-10-18&departmentId=bad',undefined,400);
 const empty=await request('GET','/reports/day-book?from=2099-01-01&to=2099-01-02');assert.equal(empty.transactionCount,0);assert.equal(empty.partyCount,0);
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL TIME ZONE 'UTC'");const after=await capture(client);await client.query('ROLLBACK');assert.deepEqual(after,before);
 const report={version:'1.0.25',checks,readOnlyRecordsUnchanged:true,passed:true};fs.writeFileSync(path.join(root,'qa-artifacts/day-book-1.0.25-integration.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(root,'qa-artifacts/day-book-1.0.25-sample.json'),JSON.stringify(all,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
 if(child){if(child.connected)child.send({type:'shutdown'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},10000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
 if(client)await client.end();if(started)execFileSync(pgctl,['-D',data,'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});
});



