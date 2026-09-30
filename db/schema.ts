import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, check, primaryKey } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
 user_id:text('user_id').primaryKey(),
 timezone:text('timezone').notNull(),
});
export const habits = sqliteTable('habits', {
 id:text('id').primaryKey(),
 user_id:text('user_id').notNull(),
 slot:integer('slot').notNull(),
 name:text('name').notNull(),
 created_date:text('created_date').notNull(),
},t=>[
 uniqueIndex('habits_owner_slot').on(t.user_id,t.slot),
 check('habit_slot_range',sql`${t.slot} >= 1 AND ${t.slot} <= 5`),
 check('habit_name_length',sql`length(trim(${t.name})) BETWEEN 1 AND 60`)
]);
export const completions = sqliteTable('completions',{
 habit_id:text('habit_id').notNull().references(()=>habits.id,{onDelete:'cascade'}),
 day:text('day').notNull(),
},t=>[primaryKey({columns:[t.habit_id,t.day]})]);
