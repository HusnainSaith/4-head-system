const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync,fork}=require('child_process');
const {Client}=require('../../4_Head_poltary_system/node_modules/pg');
const jwt=require('../../4_Head_poltary_system/node_modules/jsonwebtoken');
const root=path.resolve(__dirname,'../..'),userData=path.join(process.env.APPDATA,'4head-desktop');
const sandbox=path.join(root,'qa-artifacts','settlement-direction-live'),data=path.join(userData,'postgres-data');
if(!process.argv.includes('--apply-authorized-correction'))throw Error('Explicit correction flag required');
assert(fs.existsSync(path.join(userData,'database-backups/manual-before-settlement-direction-correction/postgres-data/PG_VERSION')), 'Full database backup required');
const pgctl=path.join(root,'desktop/node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe');
const password=crypto.createHash('sha256').update(`${userData}:4head-local-db`).digest('hex');
let child,started=false,client;const checks=[];
(async()=>{
 if(fs.existsSync(sandbox))throw Error('Refusing to overwrite isolated test database');
 fs.mkdirSync(sandbox,{recursive:true});
 assert(!fs.existsSync(path.join(data,'postmaster.pid')),'Clone must be from a stopped database');
 execFileSync(pgctl,['-D',data,'-l',path.join(sandbox,'postgres.log'),'-o','-p 55623 -h 127.0.0.1','-w','start'],{stdio:'ignore',windowsHide:true});started=true;
 client=new Client({host:'127.0.0.1',port:55623,user:'postgres',password,database:'4head_local'});await client.connect();
 const {rows:[owner]}=await client.query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(r.name)='owner' AND u.deleted_at IS NULL LIMIT 1");
 const secret=crypto.randomBytes(48).toString('hex'),token=jwt.sign({sub:owner.id},secret,{expiresIn:'10m'});
 child=fork(path.join(root,'4_Head_poltary_system/dist/src/main.js'),[],{cwd:path.join(root,'4_Head_poltary_system'),env:{...process.env,DB_HOST:'127.0.0.1',DB_PORT:'55623',DB_USERNAME:'postgres',DB_PASSWORD:password,DB_DATABASE:'4head_local',DB_NAME:'4head_local',JWT_SECRET:secret,PORT:'55624',PGOPTIONS:'',NODE_ENV:'test',DESKTOP_AUTO_MIGRATE:'false',DESKTOP_SCHEMA_UPGRADE:'false',DESKTOP_AUTO_SEED:'false',NOTIFICATION_ENABLED:'false',DISABLE_EMAIL_DELIVERY:'true',TYPEORM_LOGGING:'false'},stdio:['ignore','pipe','pipe','ipc']});
 await new Promise((resolve,reject)=>{let ready=false;const timer=setTimeout(()=>reject(Error('Isolated backend startup timed out')),45000);child.stdout.on('data',d=>{fs.appendFileSync(path.join(sandbox,'backend.log'),d);if(!ready&&String(d).includes('Application is running on:')){ready=true;clearTimeout(timer);resolve();}});child.stderr.on('data',d=>fs.appendFileSync(path.join(sandbox,'backend.log'),d));child.once('exit',code=>{if(!ready){clearTimeout(timer);reject(Error(`Isolated backend exited: ${code}`));}});});
 console.log('Backed-up desktop database ready for the requested settlement correction');
 const request=async(method,route,body,status=200)=>{const response=await fetch(`http://127.0.0.1:55624${route}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const result=await response.json();assert.equal(response.status,status,`${method} ${route}: ${JSON.stringify(result)}`);return result.data;};
 const balance=async(party,dept)=>Number((await client.query("SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount ELSE -amount END),0) value FROM ledger_entries WHERE party_id=$1 AND department_id=$2",[party,dept])).rows[0].value);

 const id='ad7743de-ef6f-460d-8039-b68bfe97d61f';
 const {rows:[old]}=await client.query('SELECT * FROM party_settlements WHERE id=$1',[id]);assert(old&&old.status==='active'&&!old.deleted_at);assert.equal(Number(old.settlement_amount),1108736);assert.equal(old.notes,'transfer');assert.equal(old.payable_party_id,'9485ecc7-e58f-4405-9e3c-336b8810313c');assert.equal(old.receivable_party_id,'7402d8d6-0931-445d-b93c-a1a0fd2caf14');
 const otherBefore=(await client.query('SELECT id,status,settlement_amount,payable_party_id,receivable_party_id FROM party_settlements WHERE id!=$1 ORDER BY id',[id])).rows;
 const beforeSource=await balance(old.receivable_party_id,old.department_id),beforeTarget=await balance(old.payable_party_id,old.department_id);
 await request('DELETE',`/parties/settlements/${id}`,{reason:'Correcting the transfer direction requested by the user: subtract Falaq Khata, add falaq PS'});
 const corrected=await request('POST','/parties/settlements',{payablePartyId:old.receivable_party_id,receivablePartyId:old.payable_party_id,departmentId:old.department_id,settlementAmount:Number(old.settlement_amount),settlementDate:'2026-10-03',reference:old.reference||undefined,notes:old.notes},201);assert(corrected.id);
 const source=await balance(old.receivable_party_id,old.department_id),target=await balance(old.payable_party_id,old.department_id);
 assert.equal(source,beforeSource-2*Number(old.settlement_amount));assert.equal(target,beforeTarget+2*Number(old.settlement_amount));
 assert.equal(source,8890708);assert.equal(target,6962070);
 const otherAfter=(await client.query('SELECT id,status,settlement_amount,payable_party_id,receivable_party_id FROM party_settlements WHERE id!=ALL($1::uuid[]) ORDER BY id',[[id,corrected.id]])).rows;assert.deepEqual(otherBefore,otherAfter);
 const statement=await request('GET',`/parties/${old.receivable_party_id}/statement`);
 assert(statement.entries.filter(row=>row.sourceId===id).every(row=>row.settlementStatus==='reversed'));
 const report={originalSettlement:id,correctedSettlement:corrected.id,amount:1108736,source:'Falaq Khata',sourceBalance:source,destination:'falaq PS',destinationBalance:target,otherSettlementsUnchanged:true,reversedStatusVerified:true,passed:true};
 fs.writeFileSync(path.join(root,'qa-artifacts/settlement-direction-applied-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await client.query("SET LOCAL TIME ZONE 'UTC'");const snapshot=await require('./verify-existing-database.cjs').capture(client);await client.query('ROLLBACK');fs.writeFileSync(path.join(root,'qa-artifacts/desktop-update-1.0.23-before.json'),JSON.stringify(snapshot,null,2),{flag:'wx'});
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
 if(child){if(child.connected)child.send({type:'shutdown'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},10000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
 if(client)await client.end();if(started)execFileSync(pgctl,['-D',data,'-m','fast','-w','stop'],{stdio:'ignore',windowsHide:true});
});




