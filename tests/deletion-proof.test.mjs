import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sealProof,validProof} from '../lib/deletion-proof.ts';
test('deletion confirmation binds account, session, signature and expiry',()=>{
 process.env.SUPABASE_SECRET_KEY='test-only-not-a-real-credential';
 const value=sealProof('alice','session-a');
 assert.equal(validProof(value,'alice','session-a'),true);
 assert.equal(validProof(value,'bob','session-a'),false);
 assert.equal(validProof(value,'alice','session-b'),false);
 assert.equal(validProof(value+'x','alice','session-a'),false);
 assert.equal(validProof(undefined,'alice','session-a'),false);
 const actualNow=Date.now;try{Date.now=()=>actualNow()+301000;assert.equal(validProof(value,'alice','session-a'),false);}finally{Date.now=actualNow;}
});
