const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {Client}=require('../../4_Head_poltary_system/node_modules/pg');
const jwt=require('../../4_Head_poltary_system/node_modules/jsonwebtoken');
(async()=>{
 const dir=path.join(process.env.APPDATA,'4head-desktop'),password=crypto.createHash('sha256').update(`${dir}:4head-local-db`).digest('hex');
 const port=Number(fs.readFileSync(path.join(dir,'postgres-data/postmaster.pid'),'utf8').split(/\r?\n/)[3]);
 const c=new Client({host:'127.0.0.1',port,user:'postgres',password,database:'4head_local',options:'-c default_transaction_read_only=on'});
 try{
 await c.connect();const {rows:[owner]}=await c.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(r.name)='owner' AND u.deleted_at IS NULL LIMIT 1");
 const token=jwt.sign({sub:owner.id},crypto.createHash('sha512').update(`${password}:4head-jwt`).digest('hex'),{expiresIn:'5m'});
 const log=fs.readFileSync(path.join(dir,'4head-desktop.log'),'utf8'),apiPort=[...log.matchAll(/Application is running on: http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/g)].at(-1)[1];
 const get=async route=>{const res=await fetch(`http://127.0.0.1:${apiPort}${route}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(15000)});assert.equal(res.status,200);return (await res.json()).data;};
 const results=[];
 for(const kind of ['sale','purchase']){
 const date=kind==='sale'?'sale_date':'purchase_date';const {rows:[expected]}=await c.query(`SELECT COUNT(*)::int count,SUM(total_amount)::text amount FROM brokerage_${kind}s WHERE deleted_at IS NULL AND status::text='active' AND ${date}='2026-10-12'`);
 const data=await get(`/brokerage/${kind}s?from=2026-10-12&to=2026-10-12&limit=2&page=1`);assert.equal(data.pagination.total,expected.count);assert.equal(Number(data.summary.totalAmount),Number(expected.amount));results.push({kind,rows:expected.count,total:expected.amount});
 }
 const book=await get('/reports/day-book?from=2026-10-01&to=2026-10-18');
 assert.equal(book.transactionCount,book.transactions.length);const keys=new Set(book.transactions.filter(t=>t.partyId).map(t=>`${t.departmentId}:${t.partyId}`));assert.equal(book.partyCount,keys.size);
 for(const party of book.parties){assert(keys.has(`${party.departmentId}:${party.partyId}`));assert(Math.abs(Number(party.openingBalance)+Number(party.periodCredit)-Number(party.periodDebit)-Number(party.closingBalance))<0.01);}
 const report={version:require('../package.json').version,passed:true,results,dayBookTransactions:book.transactionCount,participatingAccounts:book.partyCount};fs.writeFileSync(path.resolve(__dirname,'../../qa-artifacts/installed-day-book-1.0.25.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await c.end();}
})().catch(e=>{console.error(e);process.exitCode=1;});
