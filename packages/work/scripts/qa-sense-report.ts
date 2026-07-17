#!/usr/bin/env tsx
// qa-sense-report.ts
// Relatório diário de qualidade do Sense Agent (QuestionnaireAgent)
// Detecta alucinações, inconsistências e padrões para treinar a KB
// Uso: npx tsx scripts/qa-sense-report.ts [--json] [--days 7] [--suggest-kb]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORK_DIR  = path.resolve(__dirname, '../');
const QA_PATH   = path.join(WORK_DIR, 'dashboard', 'questionnaire-data.json');
const KB_PATH   = process.env.CANDIDATE_KB_PATH
  ?? 'C:\\Users\\Administrador\\Desktop\\VRAXIA SYSTEM\\VRAXIA WORK\\candidate-kb';
const FAQ_PATH  = path.join(KB_PATH, 'faq.md');

const FLAG_JSON       = process.argv.includes('--json');
const FLAG_SUGGEST_KB = process.argv.includes('--suggest-kb');
const DAYS            = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '7', 10);

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface QAEntry {
  timestamp: string;
  job_id: string;
  job_title: string;
  company: string;
  tipo_detectado: string;
  pergunta: string;
  resposta_gerada: string;
  chunks_consultados: unknown[];
}

interface QAJob {
  job_id: string;
  job_title: string;
  company: string;
  job_url: string;
  entries: QAEntry[];
}

interface Alert {
  severity: 'CRÍTICO' | 'AVISO' | 'INFO';
  tipo: string;
  empresa: string;
  vaga: string;
  pergunta: string;
  resposta: string;
  motivo: string;
}

// ─── Carrega dados ───────────────────────────────────────────────────────────

function loadEntries(sinceDays: number): QAEntry[] {
  if (!fs.existsSync(QA_PATH)) {
    console.error(`[ERROR] Arquivo não encontrado: ${QA_PATH}`);
    process.exit(1);
  }

  const raw: QAJob[] = JSON.parse(fs.readFileSync(QA_PATH, 'utf-8'));
  const cutoff = new Date(Date.now() - sinceDays * 86400_000);

  const all: QAEntry[] = [];
  for (const job of raw) {
    for (const e of job.entries ?? []) {
      if (new Date(e.timestamp) >= cutoff) all.push(e);
    }
  }
  return all;
}

// ─── Detectores de problema ───────────────────────────────────────────────────

const HALLUCINATION_PATTERNS = [
  /n[aã]o (posso|consigo) (ver|visualizar|acessar|ler)/i,
  /como (uma |uma )?ia|como assistente/i,
  /desculpe,? (mas|n[aã]o)/i,
  /já entreguei.*aviso|handed in.*notice|given.*notice/i,  // inventa que saiu do emprego
  /currently working at|atualmente trabalho na [a-z]/i,    // pode inventar empresa
];

const UI_NOISE_PATTERNS = [
  /^(color|colour|opacity|background|border|width|height|padding|margin|font)$/i,
  /^(size|scale|radius|shadow|weight|align|display|position)$/i,
];

const LLM_TYPES = new Set(['OPEN_ENDED', 'TECH_STACK', 'MOTIVATION', 'SOFT_SKILL', 'PROJECT', 'COMPANY_SPECIFIC']);

function detectAlerts(entries: QAEntry[]): Alert[] {
  const alerts: Alert[] = [];

  for (const e of entries) {
    const isLLM    = LLM_TYPES.has(e.tipo_detectado);
    const hasChunk = e.chunks_consultados?.length > 0;
    const resp     = e.resposta_gerada ?? '';
    const perg     = e.pergunta ?? '';

    // 1. Alucinação por padrão linguístico
    for (const pat of HALLUCINATION_PATTERNS) {
      if (pat.test(resp)) {
        alerts.push({
          severity: 'CRÍTICO',
          tipo: e.tipo_detectado,
          empresa: e.company,
          vaga: e.job_title,
          pergunta: perg,
          resposta: resp.slice(0, 200),
          motivo: `Padrão de alucinação detectado: ${pat.source}`,
        });
        break;
      }
    }

    // 2. LLM sem contexto RAG (alto risco de invenção)
    if (isLLM && !hasChunk && LLM_TYPES.has(e.tipo_detectado) && e.tipo_detectado !== 'OPEN_ENDED') {
      alerts.push({
        severity: 'AVISO',
        tipo: e.tipo_detectado,
        empresa: e.company,
        vaga: e.job_title,
        pergunta: perg,
        resposta: resp.slice(0, 150),
        motivo: 'LLM respondeu sem nenhum chunk de contexto RAG',
      });
    }

    // 3. Resposta vazia
    if (!resp || resp.trim() === '') {
      alerts.push({
        severity: 'AVISO',
        tipo: e.tipo_detectado,
        empresa: e.company,
        vaga: e.job_title,
        pergunta: perg,
        resposta: '(vazia)',
        motivo: 'Resposta gerada está vazia',
      });
    }

    // 4. Ruído de UI capturado como pergunta
    if (UI_NOISE_PATTERNS.some(p => p.test(perg.trim()))) {
      alerts.push({
        severity: 'AVISO',
        tipo: e.tipo_detectado,
        empresa: e.company,
        vaga: e.job_title,
        pergunta: perg,
        resposta: resp.slice(0, 100),
        motivo: 'Atributo CSS/UI capturado como pergunta — bug no scraper',
      });
    }

    // 5. Email errado (email corporativo em vez de pessoal)
    if (/vrashows\.com\.br|vraxia\.com/i.test(resp) && /email|e-mail/i.test(perg)) {
      alerts.push({
        severity: 'CRÍTICO',
        tipo: e.tipo_detectado,
        empresa: e.company,
        vaga: e.job_title,
        pergunta: perg,
        resposta: resp.slice(0, 100),
        motivo: 'Email corporativo usado em candidatura — deve ser eliteasamir@gmail.com',
      });
    }

    // 6. Telefone placeholder
    if (/98765-4321|98765\.4321/i.test(resp)) {
      alerts.push({
        severity: 'CRÍTICO',
        tipo: e.tipo_detectado,
        empresa: e.company,
        vaga: e.job_title,
        pergunta: perg,
        resposta: resp.slice(0, 100),
        motivo: 'Telefone placeholder/fake detectado — deve ser 11953577804',
      });
    }
  }

  return alerts;
}

// ─── Candidatos para KB (LLM recorrentes) ────────────────────────────────────

function findKBCandidates(entries: QAEntry[]): { pergunta: string; resposta: string; ocorrencias: number; tipo: string }[] {
  const map = new Map<string, { respostas: string[]; tipo: string }>();

  for (const e of entries) {
    if (!LLM_TYPES.has(e.tipo_detectado)) continue;
    const key = e.pergunta?.trim().toLowerCase();
    if (!key || key.length < 5) continue;
    const cur = map.get(key) ?? { respostas: [], tipo: e.tipo_detectado };
    cur.respostas.push(e.resposta_gerada ?? '');
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.respostas.length >= 3)
    .map(([perg, v]) => {
      // Resposta mais frequente
      const freq = new Map<string, number>();
      for (const r of v.respostas) {
        const k = r.trim().slice(0, 200);
        freq.set(k, (freq.get(k) ?? 0) + 1);
      }
      const [resposta] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      return { pergunta: perg, resposta, ocorrencias: v.respostas.length, tipo: v.tipo };
    })
    .sort((a, b) => b.ocorrencias - a.ocorrencias)
    .slice(0, 20);
}

// ─── Estatísticas ─────────────────────────────────────────────────────────────

function buildStats(entries: QAEntry[]) {
  const byType = new Map<string, number>();
  let llmSemCtx = 0;
  let vazias = 0;

  for (const e of entries) {
    byType.set(e.tipo_detectado, (byType.get(e.tipo_detectado) ?? 0) + 1);
    if (LLM_TYPES.has(e.tipo_detectado) && !e.chunks_consultados?.length) llmSemCtx++;
    if (!e.resposta_gerada?.trim()) vazias++;
  }

  const llmTotal  = entries.filter(e => LLM_TYPES.has(e.tipo_detectado)).length;
  const fastTotal = entries.length - llmTotal;

  return { total: entries.length, llmTotal, fastTotal, llmSemCtx, vazias, byType };
}

// ─── Gera sugestões de entrada para faq.md ───────────────────────────────────

function generateFAQSuggestions(candidates: ReturnType<typeof findKBCandidates>): string {
  let out = '\n\n# === SUGESTÕES AUTO-GERADAS (revisar antes de aplicar) ===\n\n';
  for (const c of candidates.slice(0, 10)) {
    const pattern = c.pergunta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out += `@@entry\n`;
    out += `patterns: ${pattern}\n`;
    out += `answer: ${c.resposta.trim().replace(/\n/g, ' ').slice(0, 300)}\n`;
    out += `@@end\n\n`;
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const entries     = loadEntries(DAYS);
  const stats       = buildStats(entries);
  const alerts      = detectAlerts(entries);
  const kbCandidates = findKBCandidates(entries);

  const criticos = alerts.filter(a => a.severity === 'CRÍTICO');
  const avisos   = alerts.filter(a => a.severity === 'AVISO');

  if (FLAG_JSON) {
    console.log(JSON.stringify({ stats, alerts, kbCandidates }, null, 2));
    return;
  }

  const line = '─'.repeat(70);
  const today = new Date().toLocaleDateString('pt-BR');

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  VRAXIA SENSE — Relatório de Qualidade  ${today}  (últimos ${DAYS} dias)`);
  console.log(`${'═'.repeat(70)}\n`);

  // Estatísticas
  console.log('📊 ESTATÍSTICAS');
  console.log(line);
  console.log(`  Total de respostas : ${stats.total}`);
  console.log(`  FAST (zero LLM)    : ${stats.fastTotal} (${pct(stats.fastTotal, stats.total)}%)`);
  console.log(`  LLM (Haiku)        : ${stats.llmTotal} (${pct(stats.llmTotal, stats.total)}%)`);
  console.log(`  LLM sem RAG        : ${stats.llmSemCtx} ⚠️`);
  console.log(`  Respostas vazias   : ${stats.vazias}`);
  console.log('');
  console.log('  Por tipo:');
  for (const [tipo, count] of [...stats.byType.entries()].sort((a, b) => b[1] - a[1])) {
    const marker = LLM_TYPES.has(tipo) ? '🤖' : '⚡';
    console.log(`    ${marker} ${tipo.padEnd(22)} ${count}`);
  }

  // Alertas críticos
  console.log(`\n🚨 ALERTAS CRÍTICOS (${criticos.length})`);
  console.log(line);
  if (!criticos.length) {
    console.log('  ✅ Nenhum alerta crítico.');
  } else {
    for (const a of criticos.slice(0, 15)) {
      console.log(`\n  [${a.tipo}] ${a.empresa} — ${a.vaga.slice(0, 45)}`);
      console.log(`  ❓ ${a.pergunta.slice(0, 80)}`);
      console.log(`  💬 ${a.resposta.slice(0, 100)}`);
      console.log(`  ⚠️  ${a.motivo}`);
    }
  }

  // Avisos
  console.log(`\n⚠️  AVISOS (${avisos.length})`);
  console.log(line);
  if (!avisos.length) {
    console.log('  ✅ Nenhum aviso.');
  } else {
    const groups = new Map<string, number>();
    for (const a of avisos) groups.set(a.motivo, (groups.get(a.motivo) ?? 0) + 1);
    for (const [motivo, count] of [...groups.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  (${count}x) ${motivo}`);
    }
    const sample = avisos.find(a => a.motivo.includes('RAG'));
    if (sample) {
      console.log(`\n  Exemplo LLM sem RAG:`);
      console.log(`    [${sample.tipo}] ${sample.empresa}: "${sample.pergunta.slice(0, 60)}"`);
      console.log(`    → "${sample.resposta.slice(0, 100)}"`);
    }
  }

  // Candidatos KB
  console.log(`\n🧠 TOP CANDIDATOS PARA KB (LLM recorrente → pode virar FAST)`);
  console.log(line);
  for (const c of kbCandidates.slice(0, 15)) {
    console.log(`  (${String(c.ocorrencias).padStart(3)}x) [${c.tipo}] "${c.pergunta.slice(0, 60)}"`);
    console.log(`         → "${c.resposta.slice(0, 100).replace(/\n/g, ' ')}"`);
  }

  // Ação recomendada
  console.log(`\n💡 AÇÕES RECOMENDADAS`);
  console.log(line);
  if (criticos.length > 0) {
    console.log(`  1. Corrigir ${criticos.length} alertas críticos (email/telefone/alucinação)`);
  }
  if (stats.llmSemCtx > 0) {
    console.log(`  2. ${stats.llmSemCtx} respostas LLM sem contexto RAG — adicionar aos FAQ/hard-rules`);
  }
  const kbGain = kbCandidates.reduce((s, c) => s + c.ocorrencias, 0);
  console.log(`  3. Adicionar ${kbCandidates.length} padrões à KB economizaria ~${kbGain} chamadas LLM`);
  console.log('');

  if (FLAG_SUGGEST_KB) {
    const suggestions = generateFAQSuggestions(kbCandidates);
    const outPath = path.join(WORK_DIR, '.vraxia-work', `qa-kb-suggestions-${today.replace(/\//g, '-')}.md`);
    fs.writeFileSync(outPath, suggestions, 'utf-8');
    console.log(`\n📝 Sugestões de FAQ salvas em: ${outPath}`);
    console.log('   Revise e copie para faq.md quando validado.\n');
  }

  console.log(`${'═'.repeat(70)}\n`);
}

function pct(n: number, total: number): string {
  return total ? Math.round(n / total * 100).toString() : '0';
}

main();
