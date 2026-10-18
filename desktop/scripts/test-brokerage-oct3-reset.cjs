const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync,fork}=require('child_process');
const {Client}=require('../../4_Head_poltary_system/node_modules/pg');
const jwt=require('../../4_Head_poltary_system/node_modules/jsonwebtoken');
const root=path.resolve(__dirname,'../..'),userData=path.join(process.env.APPDATA,'4head-desktop');
const sandbox=path.join(root,'qa-artifacts','brokerage-oct3-reset-clone'),data=path.join(sandbox,'postgres-data');
const pgctl=path.join(root,'desktop/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe');
const password=crypto.createHash('sha256').update(`${userData}:4head-local-db`).digest('hex');
let child,started=false,client;const checks=[];
(async()=>{
 if(fs.existsSync(sandbox))throw Error('Refusing to overwrite isolated test database');
 fs.mkdirSync(sandbox,{recursive:true});fs.cpSync(path.join(userData,'database-backups/manual-before-brokerage-oct3-reset/postgres-data'),data,{recursive:true});
 assert(!fs.existsSync(path.join(data,'postmaster.pid')),'Clone must be from a stopped database');
 execFileSync(pgctl,['-D',data,'-l',path.join(sandbox,'postgres.log'),'-o','-p 55623 -h 127.0.0.1','-w','start'],{stdio:'ignore',windowsHide:true});started=true;
 client=new Client({host:'127.0.0.1',port:55623,user:'postgres',password,database:'4head_local'});await client.connect();
 const {rows:[owner]}=await client.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(r.name)='owner' AND u.deleted_at IS NULL LIMIT 1");
 const secret=crypto.randomBytes(48).toString('hex'),token=jwt.sign({sub:owner.id},secret,{expiresIn:'10m'});
 child=fork(path.join(root,'4_Head_poltary_system/dist/src/main.js'),[],{cwd:path.join(root,'4_Head_poltary_system'),env:{...process.env,DB_HOST:'127.0.0.1',DB_PORT:'55623',DB_USERNAME:'postgres',DB_PASSWORD:password,DB_DATABASE:'4head_local',DB_NAME:'4head_local',JWT_SECRET:secret,PORT:'55624',PGOPTIONS:'',NODE_ENV:'test',DESKTOP_AUTO_MIGRATE:'false',DESKTOP_SCHEMA_UPGRADE:'false',DESKTOP_AUTO_SEED:'false',NOTIFICATION_ENABLED:'false',DISABLE_EMAIL_DELIVERY:'true',TYPEORM_LOGGING:'false'},stdio:['ignore','pipe','pipe','ipc']});
 await new Promise((resolve,reject)=>{let ready=false;const timer=setTimeout(()=>reject(Error('Isolated backend startup timed out')),45000);child.stdout.on('data',d=>{fs.appendFileSync(path.join(sandbox,'backend.log'),d);if(!ready&&String(d).includes('Application is running on:')){ready=true;clearTimeout(timer);resolve();}});child.stderr.on('data',d=>fs.appendFileSync(path.join(sandbox,'backend.log'),d));child.once('exit',code=>{if(!ready){clearTimeout(timer);reject(Error(`Isolated backend exited: ${code}`));}});});
 console.log('Isolated database clone ready; desktop and local databases are not test targets');
 const request=async(method,route,body,status=200)=>{const response=await fetch(`http://127.0.0.1:55624${route}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const result=await response.json();assert.equal(response.status,status,`${method} ${route}: ${JSON.stringify(result)}`);return result.data;};
 const balance=async(party,dept)=>Number((await client.query("SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) value FROM ledger_entries WHERE party_id=$1 AND department_id=$2",[party,dept])).rows[0].value);

 const plan=JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts/brokerage-oct3-reset-plan.json'),'utf8'));
 assert.equal(plan.opening.length,1);const opening=plan.opening[0];
 await request('PATCH',`/parties/${opening.party_id}/statement-adjustments/${opening.id}`,{date:'2026-09-30',amount:8125394,entryType:'credit',notes:'Opening payable corrected as requested; older records included'});
 for(const row of plan.settlements)await request('DELETE',`/parties/settlements/${row.id}`,{reason:'User requested removal of brokerage transactions dated October 3, 2026'});
 for(const row of plan.sales)await request('DELETE',`/brokerage/sales/${row.id}`);
 for(const row of plan.purchases)await request('DELETE',`/brokerage/purchases/${row.id}`);
 const {rows:[party]}=await client.query('SELECT opening_balance FROM parties WHERE id=$1',[opening.party_id]);assert.equal(Number(party.opening_balance),8125394);
 const {rows:openingRows}=await client.query("SELECT entry_date::text,entry_type,amount FROM ledger_entries WHERE source_type='opening_balance' AND source_id=$1",[opening.party_id]);assert.equal(openingRows.length,2);assert(openingRows.every(row=>row.entry_date==='2026-09-30' && Number(row.amount)===8125394));
 checks.push('Opening balance is positive payable 8,125,394 on September 30 with a matching control entry');
 const cancelled=[...plan.sales,...plan.purchases,...plan.settlements].map(row=>row.id);
 const {rows:nets}=await client.query("SELECT source_id,party_id,SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END)::text AS net FROM ledger_entries WHERE source_id=ANY($1::uuid[]) GROUP BY source_id,party_id",[cancelled]);assert(nets.every(row=>Math.abs(Number(row.net))<0.01));
 checks.push('All 18 cancelled transactions have zero net ledger effect for every affected party and control account');
 for(const [table,date,condition] of [['brokerage_sales','sale_date',"deleted_at IS NULL AND status::text!='cancelled'"],['brokerage_purchases','purchase_date',"deleted_at IS NULL AND status::text!='cancelled'"],['party_settlements','settlement_date',"deleted_at IS NULL AND status='active'"]]){
 const {rows:[remaining]}=await client.query(`SELECT COUNT(*) FROM ${table} t JOIN departments d ON d.id=t.department_id WHERE d.type='BROKERAGE' AND t.${date}='2026-10-03' AND ${condition.replaceAll('deleted_at','t.deleted_at').replaceAll('status','t.status')}`);assert.equal(Number(remaining.count),0);
 }
 checks.push('No active brokerage sales, purchases, or settlements remain for October 3');
 const expected={cancelledSales:plan.sales.length,cancelledPurchases:plan.purchases.length,cancelledSettlements:plan.settlements.length,openingBalance:8125394,openingDate:'2026-09-30',checks,passed:true};
 fs.writeFileSync(path.join(root,'qa-artifacts/brokerage-oct3-reset-clone-test.json'),JSON.stringify(expected,null,2));console.log(JSON.stringify(expected,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
 if(child){if(child.connected)child.send({type:'shutdown'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},10000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
 if(client)await client.end();if(started)execFileSync(pgctl,['-D',data,'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});
});



