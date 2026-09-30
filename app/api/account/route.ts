import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase-server';
import { json,readInput } from '@/lib/http';
import {cookies} from 'next/headers';
import {validProof} from '@/lib/deletion-proof';
export async function DELETE(request:Request){
 let input;try{input=await readInput(request);}catch{return json({error:'Invalid request.'},400);}
 if(input.confirmation!=='DELETE')return json({error:'Type DELETE to confirm.'},400);
 const client=await supabaseServer();const {data:{user}}=await client.auth.getUser();
 if(!user?.email)return json({error:'Please sign in again.'},401);
 const verifier=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const jar=await cookies();
 if(user.app_metadata.providers?.includes('google')){
  const {data:{session}}=await client.auth.getSession();
  if(!session||!validProof(jar.get('fivefold-delete-proof')?.value,user.id,session.access_token))return json({error:'Confirm your identity with Google first. Confirmation lasts five minutes.'},403);
 }else{
  if(typeof input.password!=='string'||!input.password)return json({error:'Enter your password.'},400);
  const {data,error}=await verifier.auth.signInWithPassword({email:user.email,password:input.password});
  if(error||data.user?.id!==user.id)return json({error:'Password incorrect. Your account has not been deleted.'},403);
 }
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!secret){await verifier.auth.signOut();return json({error:'Account deletion is temporarily unavailable. Please try again later.'},503);}
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await admin.auth.admin.deleteUser(user.id,false);
 await verifier.auth.signOut();
 if(result.error)return json({error:'Deletion failed. Please try again.'},503);
 jar.delete('fivefold-delete-proof');jar.delete('fivefold-delete-intent');
 await client.auth.signOut({scope:'local'});
 return json({deleted:true});
}
