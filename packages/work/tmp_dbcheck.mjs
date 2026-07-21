import initSqlJs from 'sql.js';
import fs from 'fs';

// Collect all jobs with questionnaire activity missing from DB
const JSONL_PATH = '.vraxia-work/questionnaire-log.jsonl';
const DEC_PATH   = '.vraxia-work/decisions.jsonl';
const DB_PATH    = '.vraxia-work/work.db';

const entries = fs.readFileSync(JSONL_PATH, 'utf-8')
  .split('\n').filter(l => l.trim())
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

// Group by job_id, collect metadata
const byJob = {};
entries.forEach(e => {
  if (!e.job_id) return;
  if (!byJob[e.job_id]) byJob[e.job_id] = { job_id: e.job_id, job_title: e.job_title, company: e.company, timestamps: [] };
  byJob[e.job_id].timestamps.push(e.timestamp);
});

// Load decisions for extra info
const decisions = fs.existsSync(DEC_PATH)
  ? fs.readFileSync(DEC_PATH, 'utf-8').split('\n').filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  : [];
const decByJob = {};
decisions.forEach(d => { if (d.jobId) decByJob[d.jobId] = d; });

// Load DB
const SQL = await initSqlJs();
const buf = fs.readFileSync(DB_PATH);
const db = new SQL.Database(buf);

let inserted = 0, updated = 0;

for (const [jobId, info] of Object.entries(byJob)) {
  const sorted = info.timestamps.filter(Boolean).sort();
  if (!sorted.length) continue;
  const firstTs = sorted[0];
  const lastTs  = sorted[sorted.length - 1];
  const dateStr = firstTs.slice(0, 10);

  // Only process 07/17+ sessions
  if (dateStr < '2026-07-17') continue;

  // Check if in DB
  const existing = db.exec('SELECT id, status, application_state FROM job_applications WHERE id = ?', [jobId]);
  const dec = decByJob[jobId];
  const scoreTotal = dec?.hireScore ?? 0;
  const scoreAction = dec?.action ?? 'APPLY';
  const platform = dec?.platform ?? 'linkedin';

  if (!existing.length || !existing[0].values.length) {
    // Insert missing record
    db.run(`INSERT OR IGNORE INTO job_applications
      (id, job_title, company, location, linkedin_url, description,
       is_easy_apply, status, application_state, score_total, score_action,
       scanned_at, applied_at, updated_at, platform)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        jobId,
        info.job_title ?? '',
        info.company ?? '',
        null,
        `https://www.linkedin.com/jobs/view/${jobId}/`,
        null,
        1,
        'applied',
        'confirmed',
        scoreTotal,
        scoreAction,
        firstTs,
        lastTs,
        lastTs,
        platform === 'unknown' ? 'linkedin' : platform,
      ]
    );
    console.log(`INSERT: ${jobId} - ${info.company} - ${info.job_title?.slice(0,40)} [${dateStr}]`);
    inserted++;
  } else {
    const [curStatus, curState] = existing[0].values[0].slice(1);
    if (curStatus === 'queued' || curState === 'queued') {
      // Update to applied
      db.run(`UPDATE job_applications SET status='applied', application_state='confirmed', applied_at=?, updated_at=? WHERE id=?`,
        [lastTs, lastTs, jobId]);
      console.log(`UPDATE: ${jobId} - ${info.company} queued→applied [${dateStr}]`);
      updated++;
    } else {
      console.log(`SKIP: ${jobId} - ${info.company} already ${curStatus}/${curState}`);
    }
  }
}

// Save
fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
db.close();

console.log(`\nDone: ${inserted} inserted, ${updated} updated`);

// Verify
const SQL2 = await initSqlJs();
const db2 = new SQL2.Database(fs.readFileSync(DB_PATH));
const res = db2.exec("SELECT DATE(applied_at) as d, COUNT(*) as cnt FROM job_applications WHERE applied_at IS NOT NULL GROUP BY DATE(applied_at) ORDER BY d");
console.log('\nApplications by applied_at after fix:');
if (res.length) {
  const cols = res[0].columns;
  res[0].values.forEach(row => console.log(JSON.stringify(Object.fromEntries(cols.map((c,i)=>[c,row[i]])))));
}
db2.close();
