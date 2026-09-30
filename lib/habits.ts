export type Habit = { id: string; slot: number; name: string; created_date: string };
export type Completion = { habit_id: string; day: string };
export function dayInZone(zone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function shiftDay(day: string, amount: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function streaks(days: string[], today: string) {
  const sorted = [...new Set(days.filter(d => d <= today))].sort();
  let best = 0, run = 0, previous = '';
  for (const day of sorted) { run = previous && shiftDay(previous, 1) === day ? run + 1 : 1; best = Math.max(best, run); previous = day; }
  const set = new Set(sorted);
  let cursor = set.has(today) ? today : shiftDay(today, -1), current = 0;
  while (set.has(cursor)) { current++; cursor = shiftDay(cursor, -1); }
  return { current, best };
}
export function yearDays(year: number) {
  const days: string[] = [];
  let day = `${year}-01-01`;
  while (day.startsWith(`${year}-`)) { days.push(day); day = shiftDay(day, 1); }
  return days;
}
