import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
export async function supabaseServer() {
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  cookies:{getAll:()=>jar.getAll(),setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot write cookies. API requests refresh them. */}}}
 });
}
