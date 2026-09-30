import assert from 'node:assert/strict';
const base='http://localhost:5173';
const anonymous=await fetch(base+'/api/tracker');assert.equal(anonymous.status,401);
const forged=await fetch(base+'/api/tracker',{headers:{'oai-authenticated-user-id':'someone','oai-authenticated-user-email':'someone@example.com'}});assert.equal(forged.status,401);
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.get('set-cookie').split(';')[0];
const good=await fetch(base+'/api/tracker?timezone=UTC',{headers:{cookie}});assert.equal(good.status,200);assert.match(good.headers.get('cache-control'),/no-store/);
for(const origin of ['https://untrusted.example','']){
 const headers={cookie,'content-type':'application/json'};if(origin)headers.origin=origin;
 const res=await fetch(base+'/api/tracker',{method:'POST',headers,body:JSON.stringify({action:'create',name:'Should not save',timezone:'UTC'})});assert.equal(res.status,403);
}
console.log('HTTP checks passed: anonymous and forged identities rejected, signed-in reads allowed, private caching, cross-origin and missing-origin writes blocked.');
