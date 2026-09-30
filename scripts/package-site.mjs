import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
mkdirSync('.sites-runtime',{recursive:true});
const stage=mkdtempSync(path.join(root,'.sites-runtime/package-'));
const config=JSON.parse(readFileSync('.openai/hosting.json','utf8').replace(/^\uFEFF/,''));
if(!config.project_id)throw new Error('Site identity is required');
for(const file of ['dist/server/index.js','dist/client','dist/.openai/hosting.json'])if(!existsSync(file))throw new Error('Build output missing: '+file);
cpSync('dist',path.join(stage,'dist'),{recursive:true});
cpSync('dist/.openai',path.join(stage,'.openai'),{recursive:true});
// Deployment migration discovery needs the source migration directory at the archive root.
if(config.d1){
 if(!existsSync('drizzle/meta/_journal.json'))throw new Error('D1 migrations are missing');
 const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
 if(!journal.entries.length)throw new Error('D1 migration journal is empty');
 for(const entry of journal.entries)if(!existsSync('drizzle/'+entry.tag+'.sql'))throw new Error('Missing migration '+entry.tag);
 cpSync('drizzle',path.join(stage,'drizzle'),{recursive:true});
}
const archive=path.join(root,'.sites-runtime/fivefold.tar.gz');
const items=['.openai','dist',...(config.d1?['drizzle']:[])];
const packed=spawnSync('tar',['-czf',archive,'-C',stage,...items],{encoding:'utf8'});
if(packed.status!==0)throw new Error(packed.stderr);
const listing=spawnSync('tar',['-tzf',archive],{encoding:'utf8'});
if(listing.status!==0)throw new Error(listing.stderr);
const entries=listing.stdout.split(/\r?\n/);
for(const required of ['.openai/hosting.json','dist/server/index.js',...(config.d1?['drizzle/meta/_journal.json','drizzle/0000_violet_ser_duncan.sql']:[])])if(!entries.includes(required))throw new Error('Archive missing '+required);
console.log(JSON.stringify({archive,migrationsIncluded:!!config.d1,validated:true}));
