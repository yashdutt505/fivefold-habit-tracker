import 'server-only';
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
function sign(value:string){return createHmac('sha256',process.env.SUPABASE_SECRET_KEY!).update(value).digest('base64url');}
export function sealProof(user:string,token=''){const payload=Buffer.from(JSON.stringify({user,token:token?createHash('sha256').update(token).digest('hex'):'',expires:Date.now()+5*60*1000})).toString('base64url');return payload+'.'+sign(payload);}
export function validProof(value:string|undefined,user:string,token=''){
 try{if(!value)return false;const [payload,signature]=value.split('.');const expected=sign(payload);if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.user===user&&data.expires>Date.now()&&data.token===(token?createHash('sha256').update(token).digest('hex'):'');}catch{return false;}
}
export const proofCookie={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:300};
