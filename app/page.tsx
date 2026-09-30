import { supabaseServer } from '@/lib/supabase-server';
import Tracker from './tracker';
export const dynamic='force-dynamic';
export default async function Page(){
 const client=await supabaseServer();const {data:{user}}=await client.auth.getUser();
 return <Tracker signedIn={!!user} name="Your space" googleAccount={user?.app_metadata.providers?.includes('google')||false}/>;
}
