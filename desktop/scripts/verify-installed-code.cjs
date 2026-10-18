const fs=require('fs'),path=require('path'),crypto=require('crypto');
const version=require('../package.json').version;
const installed=path.join(process.env.LOCALAPPDATA,'Programs/4Head Poultry ERP/resources');
const runtime=path.resolve(__dirname,'../runtime');
function hashes(root){const result={};function visit(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,file.name);if(file.isDirectory())visit(p);else result[path.relative(root,p)]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}}visit(root);return result;}
const actualVersion=JSON.parse(fs.readFileSync(path.join(installed,'app/package.json'),'utf8')).version;
const checks={version:version===actualVersion};const counts={};
for(const part of ['backend/dist','frontend']){const expected=hashes(path.join(runtime,part)),actual=hashes(path.join(installed,part));checks[part]=JSON.stringify(expected)===JSON.stringify(actual);counts[part]=Object.keys(actual).length;}
const report={version,installedVersion:actualVersion,checks,counts,matches:Object.values(checks).every(Boolean)};fs.writeFileSync(path.resolve(__dirname,`../../qa-artifacts/installed-code-${version}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.matches)process.exitCode=1;
