import {createClient} from '@supabase/supabase-js';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
import {sealProof} from '../lib/deletion-proof.ts';
const base=process.env.LIVE_TEST_BASE;
if(!base||!process.env.SUPABASE_SECRET_KEY)throw new Error('Explicit LIVE_TEST_BASE and test credentials are required.');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ids=[];const password=randomUUID()+'Aa9!';
const session=()=>({cookies:new Map()});
async function request(jar,path,method='GET',input,origin=base){const r=await fetch(base+path,{method,headers:{Origin:origin,...(input?{'Content-Type':'application/json'}:{}),Cookie:[...jar.cookies].map(([k,v])=>k+'='+v).join('; ')},body:input?JSON.stringify(input):undefined});for(const cookie of r.headers.getSetCookie()){const kv=cookie.split(';')[0],i=kv.indexOf('=');jar.cookies.set(kv.slice(0,i),kv.slice(i+1));}return {status:r.status,body:await r.json()};}
try{
 const a=session(),b=session();
 for(const jar of [a,b]){const email='fivefold-test-'+randomUUID()+'@example.com';const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;ids.push(data.user.id);assert.equal((await request(jar,'/api/auth','POST',{action:'signin',email,password})).status,200);}
 assert.equal((await request(session(),'/api/tracker')).status,401);
 let state;for(let i=0;i<5;i++){const r=await request(a,'/api/tracker','POST',{action:'create',name:'Verification '+i,timezone:'UTC'});assert.equal(r.status,200,JSON.stringify(r.body));state=r.body;}
 assert.equal((await request(a,'/api/tracker','POST',{action:'create',name:'Sixth',timezone:'UTC'})).status,400);
 const id=state.habits[0].id;assert.equal((await request(a,'/api/tracker','POST',{action:'complete',id,day:state.today,completed:true,timezone:'UTC'})).status,200);
 assert.equal((await request(b,'/api/tracker')).body.habits.length,0);
 assert.equal((await request(b,'/api/tracker','POST',{action:'delete',id,timezone:'UTC'})).status,400);
 assert.equal((await request(a,'/api/tracker','POST',{action:'delete',id,timezone:'UTC'},'https://untrusted.example')).status,400);
 assert.equal((await request(a,'/api/account','DELETE',{confirmation:'DELETE',password:'incorrect'})).status,403);
 assert.equal((await request(a,'/api/tracker')).body.habits.length,5);
 const stale=session();stale.cookies=new Map(a.cookies);
 const deleted=await request(a,'/api/account','DELETE',{confirmation:'DELETE',password});assert.equal(deleted.status,200,JSON.stringify(deleted.body));
 assert.equal((await admin.auth.admin.getUserById(ids[0])).data.user,null);
 assert.equal((await request(stale,'/api/tracker')).status,401);
 assert.equal((await request(b,'/api/tracker')).status,200);
 await admin.auth.admin.updateUserById(ids[1],{app_metadata:{providers:['google']}});
 assert.equal((await request(b,'/api/account','DELETE',{confirmation:'DELETE'})).status,403);
 const reader=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...b.cookies].map(([name,value])=>({name,value})),setAll:()=>{}}});
 const {data:{session:bs}}=await reader.auth.getSession();
 b.cookies.set('fivefold-delete-proof',sealProof(ids[0],bs.access_token));
 assert.equal((await request(b,'/api/account','DELETE',{confirmation:'DELETE'})).status,403);
 b.cookies.set('fivefold-delete-proof',sealProof(ids[1],bs.access_token));
 const googleDelete=await request(b,'/api/account','DELETE',{confirmation:'DELETE'});
 assert.equal(googleDelete.status,200,JSON.stringify(googleDelete.body));
 assert.equal((await admin.auth.admin.getUserById(ids[1])).data.user,null);
 console.log('PASS: live habit operations, limits, account isolation, CSRF, password and Google-proof deletion, stale-session denial.');
}finally{for(const id of ids)await admin.auth.admin.deleteUser(id);}
