import { supabaseServer } from '@/lib/supabase-server';
import { json,readInput } from '@/lib/http';
export async function POST(request:Request){
 let input;try{input=await readInput(request);}catch{return json({error:'Invalid request.'},400);}
 const client=await supabaseServer();
 if(input.action==='signout'){await client.auth.signOut({scope:'local'});return json({ok:true});}
 const email=typeof input.email==='string'?input.email.trim():'';
 const password=typeof input.password==='string'?input.password:'';
 const origin=new URL(request.url).origin;
 if(input.action==='recover'){
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:origin+'/auth/confirm?next=/login?reset=1'});
  return error?json({error:'Could not send a reset email. Please try again later.'},400):json({message:'If this email has an account, a password reset link is on its way.'});
 }
 if(input.action==='reset'){
  const {data:{user}}=await client.auth.getUser();if(!user)return json({error:'Open the link in your password reset email first.'},401);
  if(password.length<12)return json({error:'Use at least 12 characters.'},400);
  const {error}=await client.auth.updateUser({password});return error?json({error:'Password could not be updated.'},400):json({ok:true});
 }
 if(input.action==='signup'){
  if(process.env.ENABLE_EMAIL_SIGNUP!=='true')return json({error:'Please use Google to create an account.'},400);
  if(password.length<12)return json({error:'Use a password with at least 12 characters.'},400);
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:origin+'/auth/confirm'}});
  return error?json({error:'Sign-up failed. Please check your details or try again later.'},400):json(data.session?{ok:true}:{message:'Check your email to confirm your account, then sign in.'});
 }
 if(input.action!=='signin')return json({error:'Unknown action.'},400);
 const {error}=await client.auth.signInWithPassword({email,password});
 return error?json({error:'Unable to sign in. Check your email, password, and email confirmation.'},401):json({ok:true});
}
