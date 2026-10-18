const fs=require('fs'),path=require('path'),{fork}=require('child_process');
const dotenv=require('../../4_Head_poltary_system/node_modules/dotenv');
(async()=>{
const root=path.resolve(__dirname,'../../4_Head_poltary_system'),config={};
for(const name of ['.env','.env.local']){const file=path.join(root,name);if(fs.existsSync(file))Object.assign(config,dotenv.parse(fs.readFileSync(file)));}
const file=path.resolve(__dirname,'../../qa-artifacts/local-party-signs-backend.log');
const child=fork(path.join(root,'dist/src/main.js'),[],{cwd:root,env:{...process.env,...config,PORT:'55620',PGOPTIONS:'-c default_transaction_read_only=on',NODE_ENV:'test',DESKTOP_AUTO_MIGRATE:'false',DESKTOP_SCHEMA_UPGRADE:'false',DESKTOP_AUTO_SEED:'false',NOTIFICATION_ENABLED:'false',DISABLE_EMAIL_DELIVERY:'true',TYPEORM_LOGGING:'false'},stdio:['ignore','pipe','pipe','ipc']});
try{
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local test backend startup timed out')),45000);let ready=false;
child.stdout.on('data',data=>{fs.appendFileSync(file,data);if(!ready&&String(data).includes('Application is running on:')){ready=true;clearTimeout(timer);resolve();}});
child.stderr.on('data',data=>fs.appendFileSync(file,data));child.once('exit',code=>{if(!ready){clearTimeout(timer);reject(Error(`Local test backend exited: ${code}`));}});});
console.log('Local production backend ready with database writes blocked');
const tester=fork(path.join(__dirname,'verify-party-balance-signs.cjs'),['--local'],{env:{...process.env,FOURHEAD_SMOKE_PORT:'55620'},stdio:['ignore','inherit','inherit','ipc']});
const code=await new Promise(resolve=>tester.once('exit',resolve));if(code!==0)throw Error('Local sign reconciliation failed');
}finally{if(child.connected)child.send({type:'shutdown'});await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},10000);child.once('exit',()=>{clearTimeout(timer);resolve();});});}
})().catch(error=>{console.error(error.message);process.exitCode=1});
