// packages/work/src/agents/cache.ts
// QA Cache persistente — zero tokens para perguntas já respondidas.
// Smart Cache: perguntas binárias NUNCA são cacheadas (sempre consultam o SSoT).
// Profile versioning: invalida automaticamente o cache quando o perfil muda.

import fs from 'fs';
import path from 'path';

const WORK_DIR   = path.resolve(process.cwd(), '.vraxia-work');
const CACHE_PATH = path.join(WORK_DIR, 'qa-cache.json');

// Chave especial no JSON do cache — não é uma resposta de questionário
const VERSION_KEY = '__pv__';

export class QACache {
  private cache = new Map<string, string>();
  private dirty = false;
  private storedProfileVersion?: number;

  constructor(private filePath: string = CACHE_PATH) {
    this.load();
  }

  // ── Profile versioning ────────────────────────────────────────────────────────

  /**
   * Registra a versão atual do perfil. Se diferente da versão armazenada,
   * invalida o cache inteiro (garante que respostas antigas não persistam).
   */
  setProfileVersion(version: number): void {
    if (this.storedProfileVersion !== undefined && this.storedProfileVersion !== version) {
      console.log(`[Cache] Profile v${this.storedProfileVersion} → v${version}. Invalidando cache de respostas.`);
      this.cache.clear();
    }
    this.storedProfileVersion = version;
    this.dirty = true;
    this.flush();
  }

  // ── Smart cache — detecção de perguntas binárias ──────────────────────────────

  /**
   * Perguntas binárias de capacidade NUNCA devem ser cacheadas.
   * O SSoT (CandidateProfileLoader) é consultado a cada resposta.
   */
  private isBinaryQuestion(question: string): boolean {
    const t = this.normalize(question);

    // Exclui perguntas numéricas ("quantos anos", "how many years")
    if (/quantos anos|how many (years|months)|how long|ha quanto tempo|por quantos anos/.test(t)) return false;

    return (
      /^(possui |tem |ja |do you have |have you |are you |did you )/.test(t) ||
      /\b(possui|have you (worked|used|built|deployed|implemented)|do you have|are you (familiar|experienced|proficient))\b/.test(t)
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  get(question: string): string | undefined {
    if (this.isBinaryQuestion(question)) return undefined; // sempre consulta SSoT
    return this.cache.get(this.normalize(question));
  }

  set(question: string, answer: string): void {
    if (this.isBinaryQuestion(question)) return; // não persiste respostas binárias

    const key = this.normalize(question);
    if (this.cache.get(key) === answer) return;
    this.cache.set(key, answer);
    this.dirty = true;
    this.flush();
  }

  flush(): void {
    if (!this.dirty) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const obj = Object.fromEntries(this.cache);
      if (this.storedProfileVersion !== undefined) {
        obj[VERSION_KEY] = String(this.storedProfileVersion);
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
      this.dirty = false;
    } catch {
      // falha silenciosa — cache em memória ainda funciona
    }
  }

  get size(): number { return this.cache.size; }

  stats(): { size: number; filePath: string; exists: boolean; profileVersion?: number } {
    return {
      size: this.cache.size,
      filePath: this.filePath,
      exists: fs.existsSync(this.filePath),
      profileVersion: this.storedProfileVersion,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────────────

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as Record<string, string>;

      // Extrai metadados especiais antes de carregar entradas
      if (raw[VERSION_KEY]) {
        this.storedProfileVersion = parseInt(raw[VERSION_KEY], 10);
      }

      for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith('__')) continue; // ignora chaves de metadados
        this.cache.set(k, v);
      }
    } catch {
      // cache corrompido — começa vazio
    }
  }

  private normalize(question: string): string {
    return question
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
