import { dayInZone, type Habit, type Completion } from './habits.ts';
export class InputError extends Error {
 status:number;
 constructor(message:string,status=400){super(message);this.status=status;}
}
export function validateZone(value:unknown):string {
 if(typeof value!=='string'||value.length>80)throw new InputError('Choose a valid timezone.');
 try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return value;}catch{throw new InputError('Choose a valid timezone.');}
}
export async function getState(db:D1Database,owner:string,requestedZone:string) {
 const profile=await db.prepare('SELECT timezone FROM profiles WHERE user_id = ?').bind(owner).first<{timezone:string}>();
 const timezone=profile?.timezone||validateZone(requestedZone);
 const habits=await db.prepare('SELECT id, slot, name, created_date FROM habits WHERE user_id = ? ORDER BY slot').bind(owner).all<Habit>();
 const completions=await db.prepare('SELECT c.habit_id, c.day FROM completions c JOIN habits h ON h.id = c.habit_id WHERE h.user_id = ? ORDER BY c.day').bind(owner).all<Completion>();
 return {habits:habits.results,completions:completions.results,timezone,today:dayInZone(timezone)};
}
export async function applyAction(db:D1Database,owner:string,input:unknown) {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new InputError('Invalid request.');
 const b=input as Record<string,unknown>;
 const requestedZone=validateZone(b.timezone);
 const profile=await db.prepare('SELECT timezone FROM profiles WHERE user_id = ?').bind(owner).first<{timezone:string}>();
 const timezone=profile?.timezone||requestedZone,today=dayInZone(timezone);
 if(!['create','rename','complete','delete'].includes(String(b.action)))throw new InputError('Unknown action.');
 let name='';
 if(b.action==='create'||b.action==='rename'){
  if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>60)throw new InputError('Use a habit name between 1 and 60 characters.');
  name=b.name.trim();
 }
 if(b.action!=='create'){
  if(typeof b.id!=='string'||b.id.length>100)throw new InputError('Invalid habit.');
  const habit=await db.prepare('SELECT id, created_date FROM habits WHERE id = ? AND user_id = ?').bind(b.id,owner).first<Habit>();
  if(!habit)throw new InputError('Habit not found.',404);
  if(b.action==='complete'){
   if(typeof b.completed!=='boolean'||typeof b.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.day))throw new InputError('Invalid check-in.');
   const parsed=new Date(b.day+'T12:00:00Z');
   if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==b.day||b.day>today||b.day<habit.created_date)throw new InputError('Choose a date from when you created this habit through today.');
  }
 }
 if(b.action==='create'){
  const result=await db.prepare(`INSERT INTO habits(id,user_id,slot,name,created_date)
   SELECT ?, ?, slots.n, ?, ? FROM
   (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) slots
   WHERE NOT EXISTS (SELECT 1 FROM habits h WHERE h.user_id = ? AND h.slot = slots.n)
   ORDER BY slots.n LIMIT 1`).bind(crypto.randomUUID(),owner,name,today,owner).run();
  if(!result.meta.changes)throw new InputError('You can track up to five habits. Delete one to make room.',409);
 }else if(b.action==='rename'){
  await db.prepare('UPDATE habits SET name = ? WHERE id = ? AND user_id = ?').bind(name,b.id,owner).run();
 }else if(b.action==='delete'){
  await db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').bind(b.id,owner).run();
 }else if(b.completed){
  await db.prepare('INSERT OR IGNORE INTO completions(habit_id,day) SELECT id, ? FROM habits WHERE id = ? AND user_id = ?').bind(b.day,b.id,owner).run();
 }else{
  await db.prepare('DELETE FROM completions WHERE day = ? AND habit_id IN (SELECT id FROM habits WHERE id = ? AND user_id = ?)').bind(b.day,b.id,owner).run();
 }
 await db.prepare('INSERT OR IGNORE INTO profiles(user_id,timezone) VALUES (?,?)').bind(owner,timezone).run();
 return getState(db,owner,timezone);
}
