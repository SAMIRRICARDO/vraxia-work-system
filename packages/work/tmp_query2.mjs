import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const buf = fs.readFileSync('.vraxia-work/work.db');
const db = new SQL.Database(buf);

const cols = db.exec("PRAGMA table_info(job_applications)")[0];
console.log('Columns:', cols.values.map(r => r[1]).join(', '));

const byStatus = db.exec("SELECT status, COUNT(*) as cnt FROM job_applications GROUP BY status");
console.log('By status:', JSON.stringify(byStatus[0]?.values));

const total = db.exec("SELECT COUNT(*) FROM job_applications");
console.log('Total rows:', total[0]?.values[0][0]);

const tsCol = cols.values.find(r => String(r[1]).includes('time') || String(r[1]).includes('date') || String(r[1]).includes('at'));
if (tsCol) {
  const col = tsCol[1];
  const daily = db.exec(`SELECT substr(${col},1,10) as day, COUNT(*) as cnt FROM job_applications WHERE ${col} IS NOT NULL GROUP BY day ORDER BY day DESC LIMIT 7`);
  console.log('Daily (by', col, '):', JSON.stringify(daily[0]?.values));
}
