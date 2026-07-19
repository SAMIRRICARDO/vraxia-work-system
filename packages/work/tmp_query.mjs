import Database from 'better-sqlite3';
const db = new Database('.vraxia-work/work.db');
const byStatus = db.prepare('SELECT status, COUNT(*) as cnt FROM job_applications GROUP BY status').all();
const total = db.prepare('SELECT COUNT(*) as t FROM job_applications').get();
const cols = db.prepare("PRAGMA table_info(job_applications)").all();
console.log('Columns:', cols.map(c => c.name).join(', '));
console.log('By status:', JSON.stringify(byStatus));
console.log('Total:', JSON.stringify(total));
try {
  const daily = db.prepare("SELECT date(applied_at) as day, COUNT(*) as cnt FROM job_applications WHERE applied_at IS NOT NULL GROUP BY day ORDER BY day DESC LIMIT 7").all();
  console.log('Daily:', JSON.stringify(daily));
} catch(e) { console.log('daily err:', e.message); }
