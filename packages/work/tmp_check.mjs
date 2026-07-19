import initSqlJs from 'sql.js';
import fs from 'fs';
const DB_PATH = '.vraxia-work/work.db';
const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(DB_PATH));
const exec = (q, p=[]) => { const r=db.exec(q,p); if(!r.length) return []; return r[0].values.map(row=>Object.fromEntries(r[0].columns.map((c,i)=>[c,row[i]]))); };

console.log('=== TOTAL ===');
console.log(exec('SELECT COUNT(*) as total FROM job_applications')[0]);

console.log('\n=== Por status ===');
exec('SELECT status, COUNT(*) as cnt FROM job_applications GROUP BY status ORDER BY cnt DESC').forEach(r=>console.log(r));

console.log('\n=== Por application_state ===');
exec('SELECT application_state, COUNT(*) as cnt FROM job_applications GROUP BY application_state ORDER BY cnt DESC').forEach(r=>console.log(r));

console.log('\n=== applied_at nulos vs preenchidos ===');
exec('SELECT applied_at IS NULL as is_null, COUNT(*) as cnt FROM job_applications GROUP BY is_null').forEach(r=>console.log(r));

console.log('\n=== Por dia (applied_at) - últimos 7 dias ===');
exec("SELECT DATE(applied_at) as day, COUNT(*) as cnt FROM job_applications WHERE applied_at IS NOT NULL GROUP BY day ORDER BY day DESC LIMIT 7").forEach(r=>console.log(r));

console.log('\n=== Por dia (updated_at) - últimos 7 dias ===');
exec("SELECT DATE(updated_at) as day, status, COUNT(*) as cnt FROM job_applications WHERE DATE(updated_at) >= DATE('now','-7 days') GROUP BY day, status ORDER BY day DESC, cnt DESC").forEach(r=>console.log(r));

db.close();
