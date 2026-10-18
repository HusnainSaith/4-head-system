const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync,fork}=require('child_process');
const {Client}=require('../../4_Head_poltary_system/node_modules/pg');
const jwt=require('../../4_Head_poltary_system/node_modules/jsonwebtoken');
const root=path.resolve(__dirname,'../..'),userData=path.join(process.env.APPDATA,'4head-desktop');
const sandbox=path.join(root,'qa-artifacts','statement-actions-clone-1.0.22'),data=path.join(sandbox,'postgres-data');
const pgctl=path.join(root,'desktop/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe');
const password=crypto.createHash('sha256').update(`${userData}:4head-local-db`).digest('hex');
let child,started=false,client;const checks=[];
(async()=>{
 if(fs.existsSync(sandbox))throw Error('Refusing to overwrite isolated test database');
 fs.mkdirSync(sandbox,{recursive:true});fs.cpSync(path.join(userData,'database-backups/manual-before-app-1.0.22/postgres-data'),data,{recursive:true});
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
 const {rows:[adjustment]}=await client.query("SELECT * FROM ledger_entries WHERE source_type='party_adjustment' AND source_id=id AND party_id IS NOT NULL LIMIT 1");assert(adjustment);
 const before=await balance(adjustment.party_id,adjustment.department_id),signed=Number(adjustment.amount)*(adjustment.entry_type==='credit'?1:-1);
 await request('PATCH',`/parties/${adjustment.party_id}/statement-adjustments/${adjustment.id}`,{date:'2026-10-01',amount:123.45,entryType:'debit',notes:'Isolated adjustment test'});
 assert(Math.abs((await balance(adjustment.party_id,adjustment.department_id))-(before-signed-123.45))<0.001);
 checks.push('Standalone adjustment edit changes only its intended signed party balance');
 await request('DELETE',`/parties/${adjustment.party_id}/statement-adjustments/${adjustment.id}`);assert(Math.abs((await balance(adjustment.party_id,adjustment.department_id))-(before-signed))<0.001);checks.push('Standalone adjustment deletion removes exactly the requested adjustment');
 await request('DELETE',`/parties/${adjustment.party_id}/statement-adjustments/${adjustment.id}`,undefined,404);checks.push('Repeated adjustment deletion is refused');
 const {rows:[opening]}=await client.query("SELECT * FROM ledger_entries WHERE source_type='opening_balance' AND party_id IS NOT NULL AND source_id IN (SELECT source_id FROM ledger_entries WHERE source_type='opening_balance' GROUP BY source_id HAVING COUNT(*)=2) LIMIT 1");assert(opening);
 await request('PATCH',`/parties/${opening.party_id}/statement-adjustments/${opening.id}`,{date:'2026-10-01',amount:234.56,entryType:'debit',notes:'Isolated opening correction'});
 const {rows:pair}=await client.query("SELECT entry_type,amount FROM ledger_entries WHERE source_type='opening_balance' AND source_id=$1",[opening.source_id]);assert.equal(pair.length,2);assert.equal(pair.reduce((sum,row)=>sum+Number(row.amount)*(row.entry_type==='credit'?1:-1),0),0);
 assert.equal(Number((await client.query('SELECT opening_balance FROM parties WHERE id=$1',[opening.party_id])).rows[0].opening_balance),-234.56);checks.push('Opening balance edit keeps the control entry and party opening balance consistent');
 await request('DELETE',`/parties/${opening.party_id}/statement-adjustments/${opening.id}`);assert.equal((await client.query("SELECT COUNT(*) FROM ledger_entries WHERE source_type='opening_balance' AND source_id=$1",[opening.source_id])).rows[0].count,'0');checks.push('Opening balance deletion removes the paired entries atomically');
 const {rows:[settlement]}=await client.query("SELECT * FROM party_settlements WHERE status='active' AND deleted_at IS NULL LIMIT 1");assert(settlement);
 const {rows:[settlementEntry]}=await client.query("SELECT * FROM ledger_entries WHERE source_type='party_adjustment' AND source_id=$1 AND party_id=$2 LIMIT 1",[settlement.id,settlement.payable_party_id]);
 const payable=await balance(settlement.payable_party_id,settlement.department_id),receivable=await balance(settlement.receivable_party_id,settlement.department_id);
 await request('PATCH',`/parties/${settlement.payable_party_id}/statement-adjustments/${settlementEntry.id}`,{date:'2026-10-01',amount:Number(settlement.settlement_amount)+1,entryType:settlementEntry.entry_type,notes:'Isolated complete settlement edit'});
 assert(Math.abs((await balance(settlement.payable_party_id,settlement.department_id))-(payable-1))<0.001);assert(Math.abs((await balance(settlement.receivable_party_id,settlement.department_id))-(receivable+1))<0.001);checks.push('Settlement edit updates both party balances using its complete amount');
 await request('DELETE',`/parties/${settlement.payable_party_id}/statement-adjustments/${settlementEntry.id}`);assert.equal((await client.query('SELECT status FROM party_settlements WHERE id=$1',[settlement.id])).rows[0].status,'reversed');checks.push('Settlement delete uses the complete accounting reversal');
 for(const kind of ['sale','purchase']){
 const table=kind==='sale'?'brokerage_sales':'brokerage_purchases',dateField=kind==='sale'?'saleDate':'purchaseDate';
 const {rows:[row]}=await client.query(`SELECT * FROM ${table} WHERE deleted_at IS NULL LIMIT 1`);assert(row);
 await request('PATCH',`/brokerage/${kind}s/${row.id}`,{[dateField]:'2026-10-01'});const {rows:[edited]}=await client.query(`SELECT * FROM ${table} WHERE id=$1`,[row.id]);assert.equal(edited.total_amount,row.total_amount);assert.equal(edited.quantity_kg,row.quantity_kg);checks.push(`Brokerage ${kind} date edit preserves transaction amounts`);
 await request('DELETE',`/brokerage/${kind}s/${row.id}`);const {rows:[deleted]}=await client.query(`SELECT * FROM ${table} WHERE id=$1`,[row.id]);assert(deleted.deleted_at||deleted.status==='cancelled');checks.push(`Brokerage ${kind} cancellation succeeds through its department route`);
 }
 for(const direction of ['paid','received']){
 const {rows:[payment]}=await client.query("SELECT pp.* FROM party_payments pp JOIN departments d ON d.id=pp.department_id WHERE d.type='BROKERAGE' AND pp.direction=$1 AND pp.deleted_at IS NULL LIMIT 1",[direction]);assert(payment);
 await request('PATCH',`/parties/${payment.party_id}/payments/${payment.id}`,{paymentDate:'2026-10-01'});const {rows:[edited]}=await client.query('SELECT * FROM party_payments WHERE id=$1',[payment.id]);assert.equal(edited.amount,payment.amount);checks.push(`Brokerage payment ${direction} date edit preserves amount`);
 await request('DELETE',`/parties/${payment.party_id}/payments/${payment.id}`);checks.push(`Brokerage payment ${direction} delete succeeds through the party route`);
 }
 const report={version:'1.0.22',isolatedDatabase:true,checks,passed:true};fs.writeFileSync(path.join(root,'qa-artifacts/statement-actions-1.0.22-integration.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
 if(child){if(child.connected)child.send({type:'shutdown'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},10000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
 if(client)await client.end();if(started)execFileSync(pgctl,['-D',data,'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});
});



