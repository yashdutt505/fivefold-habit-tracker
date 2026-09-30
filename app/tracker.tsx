"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Plus, Pencil, Flame, Trophy, Check, LockKeyhole } from 'lucide-react';
import { ThemeToggle } from './theme';
import { AccountSettings } from './account-settings';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { dayInZone, streaks, yearDays, type Habit, type Completion } from '@/lib/habits';
type Data = { habits: Habit[]; completions: Completion[]; timezone: string; today: string };
const empty: Data = {habits:[],completions:[],timezone:'UTC',today:''};
export default function Tracker({signedIn,name,googleAccount=false}:{signedIn:boolean;name:string;googleAccount?:boolean}) {
 const [data,setData]=useState<Data>(empty),[loading,setLoading]=useState(signedIn),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [clock,setClock]=useState(''),[zone,setZone]=useState('UTC'),[filter,setFilter]=useState('all');
 const [editor,setEditor]=useState<Habit|'new'|null>(null),[draft,setDraft]=useState(''),[deleting,setDeleting]=useState<Habit|null>(null),[detail,setDetail]=useState('');
 const lock=useRef(false);
 const load=useCallback(async()=>{
  if(!signedIn)return;
  const browserZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response=await fetch('/api/tracker?timezone='+encodeURIComponent(browserZone),{cache:'no-store'});
  const body=await response.json() as Data & {error?:string};
  if(!response.ok)throw new Error(body.error||'Unable to load your habits.');
  setData(body);
 },[signedIn]);
 useEffect(()=>{
  const z=Intl.DateTimeFormat().resolvedOptions().timeZone;setZone(z);setClock(dayInZone(z));
  load().catch(e=>setError(e.message)).finally(()=>setLoading(false));
  const refresh=()=>{setClock(dayInZone(z));load().catch(e=>setError(e.message));};
  const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[load]);
 const today=data.today||clock, timezone=data.today?data.timezone:zone, year=Number(today.slice(0,4))||new Date().getFullYear();
 const habits=data.habits, completions=data.completions;
 const has=(id:string,day:string)=>completions.some(c=>c.habit_id===id&&c.day===day);
 const stats=habits.map(h=>streaks(completions.filter(c=>c.habit_id===h.id).map(c=>c.day),today));
 const done=habits.filter(h=>has(h.id,today)).length, percentage=habits.length?Math.round(done/habits.length*100):0;
 const yearCompletions=completions.filter(c=>c.day.startsWith(year+'-')&&c.day<=today);
 const activeDays=new Set(yearCompletions.map(c=>c.day)).size;
 const days=yearDays(year), offset=(new Date(year+'-01-01T12:00:00Z').getUTCDay()+6)%7;
 const count=(day:string)=>completions.filter(c=>c.day===day&&(filter==='all'||filter===c.habit_id)).length;
 const displayDate=(day:string)=>new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});
 async function mutate(action:Record<string,unknown>) {
  if(lock.current)return false;
  lock.current=true;setBusy(true);setError('');
  try {
   const response=await fetch('/api/tracker',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...action,timezone})});
   const body=await response.json() as Data & {error?:string};if(!response.ok)throw new Error(body.error||'Your changes could not be saved.');
   setData(body);return true;
  } catch(e){setError(e instanceof Error?e.message:'Your changes could not be saved. Please try again.');return false;}
  finally{lock.current=false;setBusy(false);}
 }
 function openEditor(h:Habit|'new'){setDraft(h==='new'?'':h.name);setError('');setEditor(h);}
 const live=useRef({data,today});live.current={data,today};
 useEffect(()=>{
  type Context={registerTool:(tool:{name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>unknown};
  const context=(document as Document & {modelContext?:Context}).modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  try { Promise.resolve(context.registerTool({
   name:'get_habit_progress',description:'Read the signed-in visitor’s habits, today’s check-ins, and current and best streaks.',
   inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},
   execute(input:unknown){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');
    if(!signedIn)throw new Error('Sign in first.');
    const {data,today}=live.current;return {today,habits:data.habits.map(h=>({id:h.id,name:h.name,completedToday:data.completions.some(c=>c.habit_id===h.id&&c.day===today),...streaks(data.completions.filter(c=>c.habit_id===h.id).map(c=>c.day),today)}))};
   }},{signal:lifecycle.signal})).catch(()=>{});
  }catch{} return()=>lifecycle.abort();
 },[signedIn]);
 return <main className="shell">
  <header className="topbar"><div className="brand"><span className="brandmark" aria-hidden="true">{[1,2,3,4,5,6].map(n=><i key={n}/>)}</span>fivefold<span className="sr-only">Habit tracker</span></div>
   <div className="account"><span>{signedIn?name:'Your habits. Your space.'}</span><ThemeToggle/><a href={signedIn?'/login':'/login'} onClick={async e=>{if(signedIn){e.preventDefault();const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});if(r.ok)location.assign('/');else setError('Could not sign out. Please try again.');}}}>{signedIn?'Sign out':'Sign in'}</a></div></header>
  <section className="intro"><div><div className="eyebrow">A little progress, every day</div><h1>Show up for yourself.</h1><p>Five habits. One day at a time.</p></div><div className="date-block"><strong>{today?displayDate(today):'Your daily rhythm'}</strong><span className="subtle">{timezone.replaceAll('_',' ')}</span></div></section>
  {!signedIn&&<div className="auth-note"><div><strong>Make this your daily space.</strong><p>Sign in to save your habits and keep your progress across devices.</p></div><a className="primary" href="/login">Sign in</a></div>}
  {error&&<div className="notice" role="alert">{error} {!editor&&!deleting&&<button className="secondary" onClick={()=>{setLoading(true);load().then(()=>setError('')).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Retry</button>}</div>}
  <section className="summary" aria-label="Your progress">
   <div className="metric focus"><div className="ring" style={{'--fill':percentage+'%'} as CSSProperties}><span>{percentage}%</span></div><div><div className="metric-value">{done}<small> / {habits.length}</small></div><div className="metric-label">Habits completed today</div></div></div>
   <div className="metric"><div><div className="metric-value">{Math.max(0,...stats.map(s=>s.best))}<small> days</small></div><div className="metric-label">Longest habit streak</div></div><Trophy size={23} color="#8c7441" aria-hidden="true"/></div>
   <div className="metric"><div><div className="metric-value">{activeDays}<small> days</small></div><div className="metric-label">Active days in {year}</div></div></div>
  </section>
  <section aria-labelledby="habits-title"><div className="section-head"><h2 id="habits-title">Your daily five <span className="subtle">· {habits.length}/5</span></h2><button className="primary" disabled={!signedIn||loading||busy||habits.length>=5} onClick={()=>openEditor('new')}><Plus size={16}/> Add habit</button></div>
   {loading?<div className="empty" role="status">Loading your habits…</div>:habits.length===0?<div className="empty"><h3>Start with one small thing.</h3><p>Read a few pages, go for a walk, or choose something of your own.</p>{signedIn?<button className="secondary" onClick={()=>openEditor('new')}>Add your first habit</button>:<span className="subtle">Your progress starts after you sign in.</span>}</div>:
    <div className="habit-list">{habits.map((h,i)=><div className={'habit-row'+(has(h.id,today)?' done':'')} key={h.id}>
     <Checkbox className="habit-check" aria-label={'Mark '+h.name+' completed today'} checked={has(h.id,today)} disabled={busy} onCheckedChange={v=>mutate({action:'complete',id:h.id,day:today,completed:v===true})}/>
     <div><div className="habit-name">{h.name}</div><div className="habit-number">{has(h.id,today)?'DONE FOR TODAY':'DAILY HABIT '+String(h.slot).padStart(2,'0')}</div></div>
     <div className="streak current"><strong><Flame size={16} color="#b77b31" aria-hidden="true"/>{stats[i].current}</strong><span>Current streak</span></div><div className="streak best"><strong>{stats[i].best}</strong><span>Best streak</span></div>
     <button className="icon-button" aria-label={'Edit '+h.name} onClick={()=>openEditor(h)} disabled={busy}><Pencil size={17}/></button>
    </div>)}</div>}
  </section>
  <section className="year-panel" aria-labelledby="year-title"><div className="year-top"><div><h2 id="year-title">Your year, one square at a time.</h2><p className="subtle">{yearCompletions.length} check-ins in {year}. Every little square counts.</p></div><span className="secondary">{year}</span></div>
   <div className="filters" aria-label="Calendar habit filter"><button className={'filter'+(filter==='all'?' active':'')} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All habits</button>{habits.map(h=><button key={h.id} title={h.name} aria-pressed={filter===h.id} className={'filter'+(filter===h.id?' active':'')} onClick={()=>setFilter(h.id)}>{h.name}</button>)}</div>
   <div className="calendar-scroll" tabIndex={0} role="region" aria-label={'Activity calendar for '+year}><div className="calendar-inner">
    <div className="month-labels">{Array.from({length:12},(_,i)=><span key={i} style={{gridColumn:Math.floor((Math.round((Date.UTC(year,i,1)-Date.UTC(year,0,1))/86400000)+offset)/7)+1}}>{new Date(year,i,1).toLocaleString('en',{month:'short'})}</span>)}</div>
    <div className="calendar-body"><div className="week-labels" aria-hidden="true"><span>M</span><span/><span>W</span><span/><span>F</span><span/><span/></div><div className="heatmap">
     {Array.from({length:offset},(_,i)=><span key={'pad'+i}/>)}{days.map(day=>{const n=count(day),future=day>today;return <button key={day} className={'day'+(future?' future':'')+(day===today?' today':'')} data-level={filter==='all'?n:n?5:0} title={day+': '+n+' completed'} aria-label={day+': '+n+' habits completed'+(future?', future date':'')} disabled={!signedIn||future||!habits.some(h=>h.created_date<=day)} onClick={()=>setDetail(day)}/>;})}
    </div></div></div></div>
   <div className="calendar-foot"><span>{signedIn?'Select a square to view or update that day.':'Sign in to start filling your year.'}</span><div className="legend"><span>Less</span>{[0,1,2,3,4,5].map(n=><i key={n} className="day" data-level={n}/>)}<span>More</span></div></div>
  </section>
  <footer><span style={{display:'flex',alignItems:'center',gap:6}}><LockKeyhole size={13}/> Saved securely. Private to your account.</span><span>Streaks span years. Today stays open until midnight.</span></footer>{signedIn&&<AccountSettings googleAccount={googleAccount}/>}
  <Dialog open={!!editor} onOpenChange={open=>{if(!open&&!busy)setEditor(null);}}><DialogContent><DialogHeader><DialogTitle>{editor==='new'?'A new daily habit':'Edit your habit'}</DialogTitle><DialogDescription>{editor==='new'?'Choose something small enough to do every day.':'Renaming keeps your history and streaks.'}</DialogDescription></DialogHeader>
   <form className="dialog-form" onSubmit={async e=>{e.preventDefault();if(await mutate({action:editor==='new'?'create':'rename',id:editor&&editor!=='new'?editor.id:undefined,name:draft}))setEditor(null);}}>
    <label>Habit name<input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} maxLength={60} placeholder="e.g. Read for 20 minutes" required disabled={busy}/></label>
    {error&&<p role="alert" className="notice">{error}</p>}<div className="dialog-actions">{editor&&editor!=='new'&&<button type="button" className="danger" disabled={busy} onClick={()=>{setDeleting(editor);setEditor(null);}}>Delete habit</button>}<button type="button" className="secondary" onClick={()=>setEditor(null)} disabled={busy}>Cancel</button><button className="primary" disabled={busy||!draft.trim()}>{busy?'Saving…':'Save habit'}</button></div>
   </form></DialogContent></Dialog>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open&&!busy)setDetail('');}}><DialogContent><DialogHeader><DialogTitle>{detail?displayDate(detail):'Daily check-ins'}</DialogTitle><DialogDescription>Changes update your calendar and streaks.</DialogDescription></DialogHeader><div className="detail-list">{habits.filter(h=>h.created_date<=detail).map(h=><label className="detail-item" key={h.id}><Checkbox checked={has(h.id,detail)} disabled={busy} onCheckedChange={v=>mutate({action:'complete',id:h.id,day:detail,completed:v===true})}/><span>{h.name}</span>{has(h.id,detail)&&<Check size={16} color="#126c4c"/>}</label>)}</div>{error&&<p className="notice" role="alert">{error}</p>}</DialogContent></Dialog>
  <AlertDialog open={!!deleting} onOpenChange={open=>{if(!open&&!busy)setDeleting(null);}}><AlertDialogContent><AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle><AlertDialogDescription>This permanently deletes this habit and all its check-ins. You can then add a new habit in its place.</AlertDialogDescription>{error&&<p role="alert">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep habit</AlertDialogCancel><AlertDialogAction disabled={busy} className="bg-destructive text-white" onClick={async e=>{e.preventDefault();if(await mutate({action:'delete',id:deleting?.id})){if(filter===deleting?.id)setFilter('all');setDeleting(null);}}}>{busy?'Deleting…':'Delete habit'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
