import { supabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import {cookies} from 'next/headers';
import {validProof,sealProof,proofCookie} from '@/lib/deletion-proof';
export async function GET(request:Request){
 const url=new URL(request.url),client=await supabaseServer();
 const code=url.searchParams.get('code');
 if(code){const {data,error}=await client.auth.exchangeCodeForSession(code);if(!error){
  const jar=await cookies(),intent=jar.get('fivefold-delete-intent')?.value;jar.delete('fivefold-delete-intent');
  if(intent&&data.user&&data.session&&validProof(intent,data.user.id)){jar.set('fivefold-delete-proof',sealProof(data.user.id,data.session.access_token),proofCookie);return NextResponse.redirect(new URL('/?delete=confirm',url.origin));}
  return NextResponse.redirect(new URL(url.searchParams.get('next')==='/login?reset=1'?'/login?reset=1':'/',url.origin));
 }}
 return NextResponse.redirect(new URL('/login?error=confirmation',url.origin));
}
