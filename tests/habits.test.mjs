import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { applyAction, getState } from '../lib/tracker-service.ts';
import { streaks, yearDays, dayInZone, shiftDay } from '../lib/habits.ts';
function database() {
 const sql = new DatabaseSync(':memory:');
 sql.exec('PRAGMA foreign_keys=ON');
 sql.exec(readFileSync(new URL('../drizzle/0000_violet_ser_duncan.sql',import.meta.url),'utf8'));
 return {sql,prepare(query) { const statement=sql.prepare(query);let args=[];return {bind(...v){args=v;return this;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){const result=statement.run(...args);return {meta:{changes:Number(result.changes)}};}};}};
}
const action=(db,owner,body)=>applyAction(db,owner,{timezone:'UTC',...body});
test('streaks span year and leap-day boundaries; today may be unfinished',()=>{
 assert.deepEqual(streaks(['2025-12-30','2025-12-31','2026-01-01'],'2026-01-02'),{current:3,best:3});
 assert.deepEqual(streaks(['2024-02-28','2024-02-29','2024-03-01'],'2024-03-01'),{current:3,best:3});
 assert.deepEqual(streaks(['2026-01-01','2026-01-02','2026-01-04'],'2026-01-06'),{current:0,best:2});
 assert.deepEqual(streaks(['2026-01-01','2026-01-01','2026-01-03'],'2026-01-02'),{current:1,best:1});
 assert.equal(yearDays(2024).length,366);assert.equal(yearDays(2026).length,365);
 assert.equal(dayInZone('Asia/Kolkata',new Date('2026-01-01T20:00:00Z')),'2026-01-02');
});
test('five-habit limit cannot be bypassed with extra creation calls',async()=>{
 const db=database();
 await Promise.all(Array.from({length:5},(_,i)=>action(db,'alice',{action:'create',name:'Habit '+i})));
 await assert.rejects(action(db,'alice',{action:'create',name:'Sixth'}),/up to five/);
 assert.equal((await getState(db,'alice','UTC')).habits.length,5);
 assert.throws(()=>db.sql.prepare('INSERT INTO habits VALUES (?,?,?,?,?)').run('bad','alice',6,'Bypass','2026-01-01'),/CHECK/);
 db.sql.close();
});
test('account isolation covers reads, rename, check-in, uncheck and delete',async()=>{
 const db=database(); const initial=await action(db,'alice',{action:'create',name:'Read'});const id=initial.habits[0].id;
 assert.equal((await getState(db,'bob','UTC')).habits.length,0);
 for(const body of [{action:'rename',name:'Hacked'},{action:'complete',day:initial.today,completed:true},{action:'complete',day:initial.today,completed:false},{action:'delete'}]){
  await assert.rejects(action(db,'bob',{id,...body}),/not found/);
 }
 assert.equal((await getState(db,'alice','UTC')).habits[0].name,'Read');db.sql.close();
});
test('completion is idempotent, renaming preserves history, deleting clears history',async()=>{
 const db=database();let state=await action(db,'alice',{action:'create',name:'Read'});const id=state.habits[0].id;
 for(let n=0;n<2;n++)state=await action(db,'alice',{action:'complete',id,day:state.today,completed:true});
 assert.equal(state.completions.length,1);
 state=await action(db,'alice',{action:'rename',id,name:'Read 10 pages'});assert.equal(state.completions.length,1);
 state=await action(db,'alice',{action:'complete',id,day:state.today,completed:false});assert.equal(state.completions.length,0);
 state=await action(db,'alice',{action:'complete',id,day:state.today,completed:true});
 await action(db,'alice',{action:'delete',id});assert.equal(db.sql.prepare('SELECT count(*) n FROM completions').get().n,0);
 db.sql.close();
});
test('rejects invalid names, timezones, future dates and dates before creation',async()=>{
 const db=database();await assert.rejects(action(db,'alice',{action:'create',name:'   '}),/name/);
 await assert.rejects(action(db,'alice',{action:'create',name:'x'.repeat(61)}),/name/);
 await assert.rejects(applyAction(db,'alice',{action:'create',name:'Read',timezone:'Invalid/Zone'}),/timezone/);
 const state=await action(db,'alice',{action:'create',name:'Read'});const id=state.habits[0].id;
 for(const day of ['2026-02-30',shiftDay(state.today,1),shiftDay(state.today,-1)])await assert.rejects(action(db,'alice',{action:'complete',id,day,completed:true}),/date/);
 await assert.rejects(action(db,'alice',{action:'complete',id,day:state.today,completed:'true'}),/check-in/);
 db.sql.close();
});
