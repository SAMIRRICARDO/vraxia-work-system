// packages/mcp/src/tools/vault.ts
// Tool do Human RAG — busca TF-IDF local no vault Obsidian (zero custo de API).

import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VAULT_PATH, CANDIDATE_KB_PATH, CANDIDATE_OS_PATH, textResult, safe } from '../config.js';

export interface VaultChunk {
  source: string;
  section: string;
  content: string;
  tags: string[];
}

function walkDir(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(fullPath, ext));
    else if (entry.name.endsWith(ext)) results.push(fullPath);
  }
  return results;
}

export function loadDirChunks(baseDir: string): VaultChunk[] {
  const chunks: VaultChunk[] = [];
  for (const file of walkDir(baseDir, '.md')) {
    let raw: string;
    try {
      raw = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const { data: frontmatter, content } = matter(raw);
    const relative = path.relative(baseDir, file);
    const tags: string[] = Array.isArray(frontmatter['tags']) ? frontmatter['tags'] : [];

    let section = 'root';
    let buffer: string[] = [];
    const flush = () => {
      const text = buffer.join('\n').trim();
      if (text.length >= 20) chunks.push({ source: relative, section, content: text, tags });
    };
    for (const line of content.split('\n')) {
      const heading = line.match(/^#{1,3}\s+(.+)/);
      if (heading) {
        flush();
        buffer = [];
        section = heading[1].trim();
      } else {
        buffer.push(line);
      }
    }
    flush();
  }
  return chunks;
}

export function loadVaultChunks(): VaultChunk[] {
  return loadDirChunks(VAULT_PATH);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

export function tfidfSearch(chunks: VaultChunk[], query: string, topK: number): (VaultChunk & { score: number })[] {
  const queryTokens = tokenize(query);
  const scored = chunks.map(chunk => {
    const chunkTokens = tokenize(chunk.content + ' ' + chunk.section);
    const chunkSet = new Set(chunkTokens);
    let score = 0;
    for (const token of queryTokens) {
      if (chunkSet.has(token)) {
        const tf = chunkTokens.filter(t => t === token).length / chunkTokens.length;
        const df = chunks.filter(c => tokenize(c.content).includes(token)).length;
        score += tf * Math.log(chunks.length / (df + 1));
      }
    }
    for (const tag of chunk.tags) {
      if (queryTokens.some(t => tag.toLowerCase().includes(t))) score += 0.5;
    }
    return { ...chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function registerVaultTools(server: McpServer): void {
  server.registerTool(
    'vraxia_vault_search',
    {
      description:
        'Busca semântica (TF-IDF local, zero custo) no vault Obsidian — a memória de longo prazo ' +
        'do ecossistema VRAXIA (Human RAG). Retorna os chunks mais relevantes com arquivo de origem e seção.',
      inputSchema: {
        query: z.string().describe('Consulta de busca'),
        topK: z.number().int().min(1).max(20).default(5).describe('Número de chunks a retornar'),
      },
    },
    safe(async ({ query, topK }) => {
      if (!fs.existsSync(VAULT_PATH)) {
        return textResult({ warning: `Vault não encontrado: ${VAULT_PATH}. Configure OBSIDIAN_VAULT no .env.` });
      }
      const chunks = loadVaultChunks();
      if (!chunks.length) return textResult({ warning: 'Vault vazio — nenhum chunk .md indexável.' });

      const results = tfidfSearch(chunks, query, topK);
      return textResult({
        vault: VAULT_PATH,
        totalChunks: chunks.length,
        results: results.map(r => ({
          source: r.source,
          section: r.section,
          score: Number(r.score.toFixed(4)),
          content: r.content.slice(0, 800),
        })),
      });
    })
  );

  // ── vraxia_kb_search ────────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_kb_search',
    {
      description:
        'Busca TF-IDF no candidate-kb (RAG de entrevistas/currículo) e candidate-os (CKOS — ' +
        'base de conhecimento operacional do candidato). Escopo: experience, skills, interview-answers, ' +
        'elevator pitch, ATS Q&A, comportamental, stack. Zero custo de API.',
      inputSchema: {
        query: z.string().describe('Consulta de busca'),
        topK: z.number().int().min(1).max(20).default(5).describe('Número de chunks a retornar'),
        scope: z
          .enum(['all', 'candidate-kb', 'candidate-os'])
          .default('all')
          .describe('Limitar busca a uma das bases ou pesquisar nas duas'),
      },
    },
    safe(async ({ query, topK, scope }) => {
      const kbExists = fs.existsSync(CANDIDATE_KB_PATH);
      const osExists = fs.existsSync(CANDIDATE_OS_PATH);

      if (!kbExists && !osExists) {
        return textResult({
          warning: 'Nenhuma base encontrada.',
          candidateKbPath: CANDIDATE_KB_PATH,
          candidateOsPath: CANDIDATE_OS_PATH,
        });
      }

      const chunks: VaultChunk[] = [];
      const sources: string[] = [];

      if (scope !== 'candidate-os' && kbExists) {
        const kb = loadDirChunks(CANDIDATE_KB_PATH).map(c => ({ ...c, source: `kb/${c.source}` }));
        chunks.push(...kb);
        sources.push(`candidate-kb (${kb.length} chunks)`);
      }
      if (scope !== 'candidate-kb' && osExists) {
        const os = loadDirChunks(CANDIDATE_OS_PATH).map(c => ({ ...c, source: `os/${c.source}` }));
        chunks.push(...os);
        sources.push(`candidate-os (${os.length} chunks)`);
      }

      if (!chunks.length) return textResult({ warning: 'Bases encontradas mas sem conteúdo .md indexável.' });

      const results = tfidfSearch(chunks, query, topK);
      return textResult({
        scope,
        indexed: sources,
        totalChunks: chunks.length,
        results: results.map(r => ({
          source: r.source,
          section: r.section,
          score: Number(r.score.toFixed(4)),
          content: r.content.slice(0, 800),
        })),
      });
    })
  );
}
