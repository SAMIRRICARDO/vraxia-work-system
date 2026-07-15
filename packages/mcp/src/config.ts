// packages/mcp/src/config.ts
// Configuração compartilhada: paths, env, cliente Anthropic e helpers de DB.

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Raiz do monorepo: packages/mcp/src -> packages/mcp -> packages -> raiz
export const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
export const WORK_PKG = path.join(ROOT_DIR, 'packages', 'work');
export const WORK_DATA = path.join(WORK_PKG, '.vraxia-work');
export const DB_PATH = path.join(WORK_DATA, 'work.db');
export const QUESTIONNAIRE_LOG = path.join(WORK_DATA, 'questionnaire-log.jsonl');
export const SCHEDULER_HISTORY = path.join(WORK_DATA, 'scheduler-history.jsonl');
export const NOITE_LOG = path.join(WORK_DATA, 'noite.log');
export const LEADS_INDEX = path.join(ROOT_DIR, 'memory', 'leads', 'index.jsonl');
export const METRICS_JSON = path.join(ROOT_DIR, 'logs', 'metrics.json');

// Carrega .env da raiz e do pacote work (sem sobrescrever env existente)
dotenv.config({ path: path.join(ROOT_DIR, '.env'), override: false });
dotenv.config({ path: path.join(WORK_PKG, '.env'), override: false });

export const VAULT_PATH = process.env.OBSIDIAN_VAULT ?? path.join(ROOT_DIR, 'obsidian-vault');

const VRAXIA_WORK_BASE = process.env.VRAXIA_WORK_BASE ??
  path.join('C:', 'Users', 'Administrador', 'Desktop', 'VRAXIA SYSTEM', 'VRAXIA WORK');
export const CANDIDATE_KB_PATH = process.env.CANDIDATE_KB_PATH ??
  path.join(VRAXIA_WORK_BASE, 'candidate-kb');
export const CANDIDATE_OS_PATH = process.env.CANDIDATE_OS_PATH ??
  path.join(VRAXIA_WORK_BASE, 'candidate-os');

// Cheap mode: tudo que chama LLM usa Haiku por padrão
export const CHEAP_MODEL = process.env.MCP_MODEL ?? 'claude-haiku-4-5-20251001';

let anthropic: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

// ── SQLite (sql.js, leitura de arquivo — sem lock) ───────────────────────────
let SQL: SqlJsStatic | null = null;

async function getSQLEngine(): Promise<SqlJsStatic> {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

export async function withDb<T>(fn: (db: Database) => T): Promise<T | null> {
  if (!fs.existsSync(DB_PATH)) return null;
  const engine = await getSQLEngine();
  const db = new engine.Database(fs.readFileSync(DB_PATH));
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function dbQuery(
  db: Database,
  sql: string,
  params: (string | number | null)[] = []
): Record<string, unknown>[] {
  const res = db.exec(sql, params);
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

// ── JSONL ─────────────────────────────────────────────────────────────────────
export function readJsonl(file: string): Record<string, unknown>[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => {
      try {
        return JSON.parse(l) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Record<string, unknown>[];
}

// ── Resultado MCP padronizado (nunca lança — server não pode travar) ─────────
export interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export function textResult(data: unknown): ToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }] };
}

export function errorResult(err: unknown): ToolResult {
  return { content: [{ type: 'text', text: `Erro: ${String(err)}` }], isError: true };
}

/** Envolve um handler de tool: qualquer exceção vira errorResult. */
export function safe<A extends unknown[]>(
  fn: (...args: A) => Promise<ToolResult>
): (...args: A) => Promise<ToolResult> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResult(err);
    }
  };
}

/** Corte de período para filtros SQL (ISO date). */
export function periodCutoff(period: string): string | null {
  const now = Date.now();
  switch (period) {
    case 'today': {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case 'week':
      return new Date(now - 7 * 86_400_000).toISOString();
    case 'month':
      return new Date(now - 30 * 86_400_000).toISOString();
    default:
      return null; // 'all'
  }
}
