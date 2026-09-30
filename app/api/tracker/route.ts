import { supabaseServer } from '@/lib/supabase-server';
import { json,readInput } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const client=await supabaseServer();const {data:{user}}=await client.auth.getUser();
 if(!user)return json({error:'Please sign in to view your habits.'},401);
 const {data,error}=await client.rpc('tracker_state',{requested_zone:new URL(request.url).searchParams.get('timezone')||'UTC'});
 return error?json({error:'Unable to load your habits. Please try again.'},503):json(data);
}
export async function POST(request:Request){
 let input;try{input=await readInput(request);}catch{return json({error:'Invalid request.'},400);}
 const client=await supabaseServer();const {data:{user}}=await client.auth.getUser();
 if(!user)return json({error:'Please sign in to save your habits.'},401);
 const {data,error}=await client.rpc('tracker_action',{input});
 return error?json({error:error.code==='P0001'?error.message:'Your changes could not be saved. Please try again.'},400):json(data);
}
