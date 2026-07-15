// packages/work/src/notifications/telegram.ts
// Notificações Telegram via Bot API — sem dependência externa, usa fetch nativo (Node 18+).
// Padrão: HTML parse_mode, mensagens ricas, cooldown anti-spam.

import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const WORK_DIR          = path.resolve(process.cwd(), '.vraxia-work');
const DB_PATH           = path.join(WORK_DIR, 'work.db');
const TUNNEL_URL_FILE   = path.join(WORK_DIR, 'tunnel-url.txt');
const STARTUP_NOTIFY_TS = path.join(WORK_DIR, 'startup-last-notify.txt');

const STARTUP_COOLDOWN_MS = 5 * 60 * 1000; // 5 min entre notificações de startup

// ─── Bot API ──────────────────────────────────────────────────────────────────

function credentials(): { token: string; chatId: string } {
  const token  = process.env['TELEGRAM_BOT_TOKEN']  ?? '';
  const chatId = process.env['TELEGRAM_CHAT_ID']    ?? '';
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env');
  return { token, chatId };
}

export async function sendMessage(html: string): Promise<void> {
  const { token, chatId } = credentials();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body = JSON.stringify({
    chat_id:    chatId,
    text:       html,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${detail}`);
  }
}

// ─── Cooldown helpers ─────────────────────────────────────────────────────────

function canNotify(file: string, cooldownMs: number): boolean {
  try {
    if (!fs.existsSync(file)) return true;
    const last = parseInt(fs.readFileSync(file, 'utf-8').trim(), 10);
    return Date.now() - last > cooldownMs;
  } catch { return true; }
}

function markNotified(file: string): void {
  try { fs.writeFileSync(file, String(Date.now())); } catch {}
}

// ─── Leitura do DB ────────────────────────────────────────────────────────────

interface DayStats {
  applied: number;
  review: number;
  filtered: number;
  errors: number;
  topByIP: Array<{ company: string; job_title: string; ip: number }>;
  topLegacy: Array<{ company: string; score: number }>;
  estimatedCostUsd: number;
  hireScoreCount: number;
  applyGate: number;
  reviewGate: number;
  avgIP: number;
}

async function readTodayStats(): Promise<DayStats> {
  const empty: DayStats = {
    applied: 0, review: 0, filtered: 0, errors: 0,
    topByIP: [], topLegacy: [], estimatedCostUsd: 0,
    hireScoreCount: 0, applyGate: 0, reviewGate: 0, avgIP: 0,
  };
  if (!fs.existsSync(DB_PATH)) return empty;

  try {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db  = new SQL.Database(buf);

    const exec = (sql: string) => {
      const r = db.exec(sql);
      if (!r.length) return [];
      const cols = r[0].columns;
      return r[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
    };

    const tableExists = (t: string) => {
      try { db.exec(`SELECT 1 FROM ${t} LIMIT 1`); return true; } catch { return false; }
    };

    const today = new Date().toISOString().slice(0, 10);

    const statusRows = exec(
      `SELECT status, COUNT(*) as cnt FROM job_applications
       WHERE DATE(updated_at) = '${today}' GROUP BY status`
    );
    const byStatus: Record<string, number> = {};
    for (const r of statusRows) byStatus[r['status'] as string] = r['cnt'] as number;

    // Top vagas: prefere hire_scores (IP%) se disponível, fallback para score_total
    let topByIP: DayStats['topByIP'] = [];
    let applyGate = 0, reviewGate = 0, hireScoreCount = 0, avgIP = 0;

    if (tableExists('hire_scores')) {
      const hsRows = exec(
        `SELECT hs.interview_probability, hs.action, ja.company, ja.job_title
         FROM hire_scores hs
         JOIN job_applications ja ON hs.job_id = ja.id
         WHERE DATE(ja.updated_at) = '${today}'
         ORDER BY hs.interview_probability DESC LIMIT 5`
      );
      topByIP       = hsRows.map(r => ({
        company:   r['company']   as string,
        job_title: r['job_title'] as string,
        ip:        Math.round(r['interview_probability'] as number),
      }));
      const allHS   = exec(`SELECT interview_probability, action FROM hire_scores hs JOIN job_applications ja ON hs.job_id = ja.id WHERE DATE(ja.updated_at) = '${today}'`);
      hireScoreCount = allHS.length;
      applyGate     = allHS.filter(r => r['action'] === 'APPLY').length;
      reviewGate    = allHS.filter(r => r['action'] === 'REVIEW').length;
      avgIP         = hireScoreCount > 0
        ? Math.round(allHS.reduce((s, r) => s + (r['interview_probability'] as number ?? 0), 0) / hireScoreCount)
        : 0;
    }

    const topLegacy = tableExists('hire_scores') ? [] : exec(
      `SELECT company, MAX(score_total) as score FROM job_applications
       WHERE DATE(updated_at) = '${today}' AND score_total > 0
       ORDER BY score_total DESC LIMIT 5`
    ).map(r => ({ company: r['company'] as string, score: r['score'] as number }));

    // Custo estimado
    const qlogPath = path.join(WORK_DIR, 'questionnaire-log.jsonl');
    let llmCalls = 0;
    if (fs.existsSync(qlogPath)) {
      for (const line of fs.readFileSync(qlogPath, 'utf-8').split('\n').filter(l => l.trim())) {
        try {
          const e = JSON.parse(line);
          if ((e['timestamp'] as string)?.startsWith(today) && e['api_called'] === true) llmCalls++;
        } catch { /* ignore */ }
      }
    }
    const scoringCalls     = (byStatus['applied'] ?? 0) + (byStatus['review'] ?? 0) + (byStatus['filtered_out'] ?? 0);
    const totalTokens      = (scoringCalls * 4_000) + (llmCalls * 650) + (hireScoreCount * 512);
    const estimatedCostUsd = totalTokens * 0.80 / 1_000_000;

    db.close();
    return {
      applied:  byStatus['applied']      ?? 0,
      review:   byStatus['review']       ?? 0,
      filtered: (byStatus['filtered_out'] ?? 0) + (byStatus['scanned'] ?? 0),
      errors:   byStatus['error']        ?? 0,
      topByIP,
      topLegacy,
      estimatedCostUsd,
      hireScoreCount,
      applyGate,
      reviewGate,
      avgIP,
    };
  } catch {
    return empty;
  }
}

// ─── Próxima execução ─────────────────────────────────────────────────────────

function nextRunLabel(): string {
  const now   = new Date();
  // Task Scheduler slots (horário local)
  const slots = [0, 4, 8, 12, 16, 20];
  const h     = now.getHours();
  const next  = slots.find(s => s > h);
  if (next !== undefined) {
    const d = new Date(now);
    d.setHours(next, 1, 0, 0);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  // Próximo dia
  const tomorrow = new Date(now.getTime() + 86_400_000);
  tomorrow.setHours(0, 1, 0, 0);
  return tomorrow.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// ─── Relatório diário ─────────────────────────────────────────────────────────

export interface ReportEntry {
  date:       string;
  window:     string;
  firedAt:    string;
  exitCode:   number | null;
  durationMs: number;
  platform:   string;
  dryRun:     boolean;
}

export async function sendDailyReport(entry: ReportEntry): Promise<void> {
  const stats  = await readTodayStats();
  const dur    = Math.round(entry.durationMs / 1000);
  const durStr = dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`;
  const date   = new Date(entry.firedAt).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const exitOk      = entry.exitCode === 0 || entry.exitCode === null;
  const statusIcon  = entry.dryRun ? '🧪' : exitOk ? '✅' : '⚠️';
  const modeLabel   = entry.dryRun ? ' <i>[DRY RUN]</i>' : '';
  const exitLabel   = exitOk ? 'OK' : `exit ${entry.exitCode}`;

  // HireScore block
  const hsBlock = stats.hireScoreCount > 0
    ? `\n🧠 <b>HireScore Engine</b>\n` +
      `  APPLY ≥90%:  <b>${stats.applyGate}</b>   REVIEW: <b>${stats.reviewGate}</b>   Avg IP: <b>${stats.avgIP}%</b>`
    : '';

  // Top vagas
  let topBlock = '';
  if (stats.topByIP.length) {
    topBlock = '\n\n🏆 <b>Top vagas por IP</b>\n' +
      stats.topByIP.map(c => `  • ${c.company}  <b>${c.ip}%</b>`).join('\n');
  } else if (stats.topLegacy.length) {
    topBlock = '\n\n🏆 <b>Top vagas (score legado)</b>\n' +
      stats.topLegacy.map(c => `  • ${c.company}  <b>${c.score}/30</b>`).join('\n');
  }

  const msg = `${statusIcon} <b>VRAXIA WORK — ${date}</b>${modeLabel}

⏱ Duração: ${durStr}   📡 ${entry.platform.toUpperCase()}   <code>${exitLabel}</code>

✅ Aplicadas:  <b>${stats.applied}</b>
⚠️ Revisão:    <b>${stats.review}</b>
⏭ Filtradas:  <b>${stats.filtered}</b>
❌ Erros:      <b>${stats.errors}</b>${hsBlock}

💰 Custo est.: <b>$${stats.estimatedCostUsd.toFixed(4)}</b>${topBlock}

📅 Próxima: ${nextRunLabel()}`;

  await sendMessage(msg);
}

// ─── Notificação de startup do servidor ──────────────────────────────────────

export async function sendServerStartup(): Promise<void> {
  // Cooldown: não envia se já notificou nos últimos 5 minutos
  if (!canNotify(STARTUP_NOTIFY_TS, STARTUP_COOLDOWN_MS)) return;

  const tunnelUrl = fs.existsSync(TUNNEL_URL_FILE)
    ? fs.readFileSync(TUNNEL_URL_FILE, 'utf-8').trim()
    : null;

  const dbOk = fs.existsSync(DB_PATH);
  const now  = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const tunnelBlock = tunnelUrl
    ? `\n🔗 <b>Túnel ativo</b>\n<code>${tunnelUrl}</code>\n\n⚙️ Configure no dashboard:\n${tunnelUrl}`
    : '\n⚠️ Túnel ainda não inicializado — execute <code>npm run tunnel</code>';

  const msg = `🟢 <b>VRAXIA WORK — Servidor online</b>

📡 Porta: <b>3001</b>   ${now}
🗄 DB: ${dbOk ? '✅ encontrado' : '⚠️ não encontrado — execute o hunt'}${tunnelBlock}

🌐 Dashboard: <a href="https://ai-cognitive-runtime.vercel.app">ai-cognitive-runtime.vercel.app</a>`;

  await sendMessage(msg);
  markNotified(STARTUP_NOTIFY_TS);
}

// ─── Notificação de túnel (usada por start-tunnel.ts) ────────────────────────

const TUNNEL_NOTIFY_TS   = path.join(WORK_DIR, 'tunnel-last-notify.txt');
const TUNNEL_COOLDOWN_MS = 2 * 60 * 1000; // 2 min entre notificações do mesmo túnel

export async function sendTunnelNotification(
  tunnelUrl: string,
  provider: 'cloudflare' | 'ngrok' = 'cloudflare',
): Promise<void> {
  if (!canNotify(TUNNEL_NOTIFY_TS, TUNNEL_COOLDOWN_MS)) {
    console.log('[Tunnel] Telegram cooldown ativo — notificação suprimida.');
    return;
  }

  const providerIcon  = provider === 'ngrok' ? '🟠' : '🟡';
  const providerLabel = provider === 'ngrok' ? 'ngrok' : 'Cloudflare';
  const now           = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const msg = `🔗 <b>VRAXIA — Túnel ativo</b>  ${providerIcon} <b>${providerLabel}</b>

<code>${tunnelUrl}</code>

⚙️ Configure no dashboard (settings ⚙):
<a href="https://ai-cognitive-runtime.vercel.app">ai-cognitive-runtime.vercel.app</a>

📅 ${now}`;

  await sendMessage(msg);
  markNotified(TUNNEL_NOTIFY_TS);
  console.log(`[Tunnel] Telegram enviado — ${providerLabel}: ${tunnelUrl}`);
}

// ─── Teste rápido: npx tsx src/notifications/telegram.ts ─────────────────────
if (process.argv[1]?.endsWith('telegram.ts') || process.argv[1]?.endsWith('telegram.js')) {
  let envDir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const p = path.join(envDir, '.env');
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
        if (m) process.env[m[1]] ??= m[2].trim();
      }
      break;
    }
    envDir = path.dirname(envDir);
  }

  sendDailyReport({
    date: new Date().toISOString().slice(0, 10),
    window: 'Teste',
    firedAt: new Date().toISOString(),
    exitCode: 0,
    durationMs: 743_000,
    platform: 'all',
    dryRun: false,
  }).then(() => console.log('✅ Relatório diário enviado!')).catch(console.error);
}
