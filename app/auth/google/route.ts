import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {supabaseServer} from '@/lib/supabase-server';
import {sealProof,proofCookie} from '@/lib/deletion-proof';
export async function GET(request:Request){
 const url=new URL(request.url),client=await supabaseServer(),jar=await cookies();
 const reauth=url.searchParams.get('reauth')==='delete';
 if(reauth){const {data:{user}}=await client.auth.getUser();if(!user)return NextResponse.redirect(new URL('/login',url.origin));jar.set('fivefold-delete-intent',sealProof(user.id),proofCookie);}
 else {jar.delete('fivefold-delete-intent');jar.delete('fivefold-delete-proof');}
 const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:url.origin+'/auth/confirm',queryParams:{prompt:'select_account',...(reauth?{max_age:'0'}:{})},scopes:'openid email profile'}});
 return NextResponse.redirect(error||!data.url?new URL('/login?error=google',url.origin):data.url);
}
