// packages/mcp/src/tools/work.ts
// Tools do VRAXIA WORK — candidaturas, estatísticas, scoring e Truth Engine.

import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  WORK_PKG,
  WORK_DATA,
  NOITE_LOG,
  withDb,
  dbQuery,
  readJsonl,
  QUESTIONNAIRE_LOG,
  textResult,
  errorResult,
  safe,
  periodCutoff,
  getAnthropic,
  CHEAP_MODEL,
} from '../config.js';

export function registerWorkTools(server: McpServer): void {
  // ── vraxia_work_hunt ────────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_hunt',
    {
      description:
        'Inicia uma sessão de busca e candidatura automática de vagas (VRAXIA WORK). ' +
        'Roda em background via Playwright nas plataformas LinkedIn, Gupy e/ou Catho. ' +
        'Use dryRun=true para simular sem submeter candidaturas. Retorna o PID do processo.',
      inputSchema: {
        platform: z
          .enum(['linkedin', 'gupy', 'catho', 'all'])
          .default('all')
          .describe('Plataforma de vagas a usar'),
        limit: z.number().int().min(1).max(24).default(5).describe('Máximo de candidaturas na sessão'),
        dryRun: z.boolean().default(true).describe('true = simula sem submeter (seguro); false = candidatura real'),
      },
    },
    safe(async ({ platform, limit, dryRun }) => {
      const args = ['tsx', 'src/cli/hunt.ts', '--platform', platform, '--limit', String(limit)];
      if (dryRun) args.push('--dry-run');

      const child = spawn('npx', args, {
        cwd: WORK_PKG,
        stdio: 'ignore',
        shell: true,
        detached: true,
      });
      child.unref();

      if (!child.pid) return errorResult('Falha ao iniciar o processo hunt.');
      return textResult({
        started: true,
        pid: child.pid,
        command: `npx ${args.join(' ')}`,
        note: 'Processo em background. Consulte vraxia_work_stats para acompanhar resultados.',
      });
    })
  );

  // ── vraxia_work_stats ───────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_stats',
    {
      description:
        'Retorna estatísticas completas do VRAXIA WORK: totais por status, HIE breakdown ' +
        '(APPLY/REVIEW/SKIP por score_action), custo estimado, cache de scoring e métricas ' +
        'de Truth Engine (truth rate, confidence distribution).',
      inputSchema: {
        period: z.enum(['today', 'week', 'month', 'all']).default('all').describe('Período de análise'),
      },
    },
    safe(async ({ period }) => {
      const cutoff = periodCutoff(period);
      const stats = await withDb(db => {
        let where = '1=1';
        const params: (string | number)[] = [];
        if (cutoff) {
          where = 'updated_at >= ?';
          params.push(cutoff);
        }
        const byStatusRows = dbQuery(
          db,
          `SELECT status, COUNT(*) as cnt FROM job_applications WHERE ${where} GROUP BY status`,
          params
        );
        const byPlatformRows = dbQuery(
          db,
          `SELECT COALESCE(platform, 'linkedin') as p, COUNT(*) as cnt FROM job_applications WHERE ${where} GROUP BY p`,
          params
        );
        const lastRun = dbQuery(db, `SELECT MAX(updated_at) as lr FROM job_applications`);

        // HIE score_action breakdown (APPLY/REVIEW/SKIP)
        const hieRows = dbQuery(db, `
          SELECT COALESCE(score_action, 'UNSCORED') as action, COUNT(*) as cnt
          FROM job_applications WHERE ${where}
          GROUP BY score_action
        `, params);

        // Truth Engine summary
        const truthRow = dbQuery(db, `
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN confidence = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN confidence = 'PROBABLE'  THEN 1 ELSE 0 END) as probable,
            SUM(CASE WHEN confidence = 'FAILED'    THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN confidence = 'UNKNOWN'   THEN 1 ELSE 0 END) as unknown_c,
            ROUND(AVG(CASE WHEN health_score > 0 THEN health_score END), 1) as avg_health,
            ROUND(AVG(CASE WHEN score_total > 0 THEN score_total END), 1) as avg_score
          FROM job_applications
          WHERE ${where}
        `, params);

        const tr = truthRow[0] ?? {};
        const tTotal = (tr['total'] as number) ?? 0;
        const tConf  = (tr['confirmed'] as number) ?? 0;

        const hieByAction = Object.fromEntries(hieRows.map(r => [r['action'], r['cnt']]));

        return {
          byStatus: Object.fromEntries(byStatusRows.map(r => [r['status'], r['cnt']])),
          byPlatform: Object.fromEntries(byPlatformRows.map(r => [r['p'], r['cnt']])),
          lastRun: lastRun[0]?.['lr'] ?? null,
          hie: {
            apply:    (hieByAction['APPLY']   as number) ?? 0,
            review:   (hieByAction['REVIEW']  as number) ?? 0,
            skip:     (hieByAction['SKIP']    as number) ?? 0,
            unscored: (hieByAction['UNSCORED'] as number) ?? 0,
            avgScore: (tr['avg_score'] as number) ?? 0,
            thresholds: { hire: 75, review: 60 },
          },
          truth: {
            total:     tTotal,
            confirmed: tConf,
            probable:  (tr['probable']  as number) ?? 0,
            failed:    (tr['failed']    as number) ?? 0,
            unknown:   (tr['unknown_c'] as number) ?? 0,
            truthRate: tTotal > 0 ? Math.round((tConf / tTotal) * 100) : 0,
            avgHealthScore: (tr['avg_health'] as number) ?? 0,
          },
        };
      });

      if (!stats) return textResult({ warning: 'Banco work.db não encontrado — rode um hunt primeiro.' });

      const entries = readJsonl(QUESTIONNAIRE_LOG);
      const llmCalls = entries.filter(e => e['api_called'] === true).length;
      const scoringCalls =
        ((stats.byStatus['applied'] as number) ?? 0) +
        ((stats.byStatus['review']  as number) ?? 0) +
        ((stats.byStatus['filtered_out'] as number) ?? 0);
      const estimatedCostUsd =
        (scoringCalls * 4_000 * 0.80 + llmCalls * 650 * 4.0) / 1_000_000;

      const cacheStats = await withDb(db => {
        const total = dbQuery(db, `SELECT COUNT(*) as cnt FROM score_cache`)[0]?.['cnt'] ?? 0;
        const fresh  = dbQuery(db,
          `SELECT COUNT(*) as cnt FROM score_cache WHERE scored_at >= ?`,
          [new Date(Date.now() - 5 * 86_400_000).toISOString()]
        )[0]?.['cnt'] ?? 0;
        return { total, fresh };
      });

      return textResult({
        period,
        ...stats,
        questionnaireEntries: entries.length,
        llmCallsReal:    llmCalls,
        scoringCalls,
        estimatedCostUsd,
        scoreCache: cacheStats ?? { total: 0, fresh: 0 },
      });
    })
  );

  // ── vraxia_work_list_applications ───────────────────────────────────────────
  server.registerTool(
    'vraxia_work_list_applications',
    {
      description:
        'Lista candidaturas do VRAXIA WORK com filtros. Retorna título, empresa, plataforma, ' +
        'status, estado granular, confidence, score e data de cada candidatura.',
      inputSchema: {
        status: z
          .enum(['applied', 'queued', 'filtered_out', 'error', 'applying', 'all'])
          .default('all')
          .describe('Filtrar por status legado'),
        score_action: z
          .enum(['APPLY', 'REVIEW', 'SKIP', 'all'])
          .default('all')
          .describe('Filtrar por decisão HIE (APPLY/REVIEW/SKIP). REVIEW e SKIP ficam em filtered_out — use este filtro para distingui-los.'),
        application_state: z
          .enum([
            'discovered', 'queued', 'starting', 'opening_job', 'opening_easy_apply',
            'uploading_resume', 'filling_questions', 'reviewing', 'submitting',
            'submitted', 'validating', 'confirmed', 'failed', 'cancelled',
            'blocked', 'timeout', 'retrying', 'already_applied',
            'rejected', 'interview', 'offer', 'hired', 'all',
          ])
          .default('all')
          .describe('Filtrar por estado granular do ciclo de vida'),
        confidence: z
          .enum(['CONFIRMED', 'PROBABLE', 'FAILED', 'UNKNOWN', 'all'])
          .default('all')
          .describe('Filtrar por nível de confiança do Truth Engine'),
        platform: z.enum(['linkedin', 'gupy', 'catho', 'all']).default('all').describe('Filtrar por plataforma'),
        limit: z.number().int().min(1).max(100).default(20).describe('Máximo de resultados'),
      },
    },
    safe(async ({ status, score_action, application_state, confidence, platform, limit }) => {
      const rows = await withDb(db => {
        let sql = `SELECT id, job_title, company, location, status, application_state,
                          confidence, validation_score, health_score, error_category,
                          platform, score_total, score_action, updated_at, applied_at
                   FROM job_applications WHERE 1=1`;
        const params: (string | number)[] = [];
        if (status !== 'all') {
          sql += ' AND status = ?';
          params.push(status);
        }
        if (score_action !== 'all') {
          sql += ' AND score_action = ?';
          params.push(score_action);
        }
        if (application_state !== 'all') {
          sql += ' AND application_state = ?';
          params.push(application_state);
        }
        if (confidence !== 'all') {
          sql += ' AND confidence = ?';
          params.push(confidence);
        }
        if (platform !== 'all') {
          sql += ` AND COALESCE(platform, 'linkedin') = ?`;
          params.push(platform);
        }
        sql += ' ORDER BY updated_at DESC LIMIT ?';
        params.push(limit);
        return dbQuery(db, sql, params);
      });

      if (!rows) return textResult({ warning: 'Banco work.db não encontrado.' });
      return textResult({ count: rows.length, applications: rows });
    })
  );

  // ── vraxia_work_truth_stats ─────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_truth_stats',
    {
      description:
        'Métricas do Truth Engine: taxa de confirmação objetiva, distribuição de confidence ' +
        '(CONFIRMED/PROBABLE/FAILED/UNKNOWN), funil por estado do ciclo de vida, ' +
        'breakdown de erros por categoria com contagem, e health score médio.',
      inputSchema: {
        include_funnel: z.boolean().default(true).describe('Incluir funil completo por estado'),
        include_errors: z.boolean().default(true).describe('Incluir breakdown de categorias de erro'),
      },
    },
    safe(async ({ include_funnel, include_errors }) => {
      const result = await withDb(db => {
        // Truth confidence distribution
        const truthRows = db.exec(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN confidence = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN confidence = 'PROBABLE'  THEN 1 ELSE 0 END) as probable,
            SUM(CASE WHEN confidence = 'FAILED'    THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN confidence = 'UNKNOWN'   THEN 1 ELSE 0 END) as unknown_c,
            ROUND(AVG(CASE WHEN health_score > 0 THEN health_score END), 1) as avg_health,
            ROUND(AVG(CASE WHEN validation_score > 0 THEN validation_score END), 1) as avg_valscore,
            SUM(CASE WHEN validation_method = 'network_response' THEN 1 ELSE 0 END) as portal_conf,
            SUM(CASE WHEN validation_method = 'my_jobs_applied'  THEN 1 ELSE 0 END) as myjobs_conf
          FROM job_applications
        `);

        const row = truthRows[0]?.values?.[0] ?? [0,0,0,0,0,0,0,0,0];
        const total      = (row[0] as number) ?? 0;
        const confirmed  = (row[1] as number) ?? 0;
        const probable   = (row[2] as number) ?? 0;
        const failed     = (row[3] as number) ?? 0;
        const unknown    = (row[4] as number) ?? 0;
        const avgHealth  = (row[5] as number) ?? 0;
        const avgValScore= (row[6] as number) ?? 0;
        const portalConf = (row[7] as number) ?? 0;
        const myJobsConf = (row[8] as number) ?? 0;

        // Error category breakdown
        let byErrorCategory: Record<string, number> = {};
        if (include_errors) {
          const errRows = db.exec(`
            SELECT error_category, COUNT(*) as cnt FROM job_applications
            WHERE error_category IS NOT NULL GROUP BY error_category ORDER BY cnt DESC
          `);
          if (errRows.length) {
            for (const r of errRows[0].values) {
              byErrorCategory[r[0] as string] = r[1] as number;
            }
          }
        }

        // State funnel
        let funnel: { state: string; count: number }[] = [];
        if (include_funnel) {
          const stateOrder = [
            'discovered', 'queued', 'starting', 'opening_job', 'opening_easy_apply',
            'uploading_resume', 'filling_questions', 'reviewing', 'submitting',
            'submitted', 'validating', 'confirmed', 'already_applied',
            'failed', 'cancelled', 'blocked', 'timeout',
            'rejected', 'interview', 'offer', 'hired',
          ];
          const stateRows = db.exec(`
            SELECT COALESCE(application_state, status) as s, COUNT(*) as c
            FROM job_applications GROUP BY s
          `);
          const countByState: Record<string, number> = {};
          if (stateRows.length) {
            for (const r of stateRows[0].values) countByState[r[0] as string] = r[1] as number;
          }
          funnel = stateOrder
            .filter(s => countByState[s] > 0)
            .map(s => ({ state: s, count: countByState[s] }));
        }

        // Proof type summary
        const proofRows = db.exec(`SELECT proofs_json FROM job_applications WHERE proofs_json IS NOT NULL`);
        const proofTypeSummary: Record<string, number> = {};
        if (proofRows.length) {
          for (const r of proofRows[0].values) {
            try {
              const proofs = JSON.parse(r[0] as string) as Array<{ type: string }>;
              for (const p of proofs) proofTypeSummary[p.type] = (proofTypeSummary[p.type] ?? 0) + 1;
            } catch { /* skip */ }
          }
        }

        return {
          total, confirmed, probable, failed, unknown,
          truthRate:    total > 0 ? Math.round((confirmed / total) * 100) : 0,
          avgHealthScore:    Math.round(avgHealth),
          avgValidationScore: Math.round(avgValScore),
          portalConfirmationRate: total > 0 ? +(portalConf / total).toFixed(3) : 0,
          myJobsConfirmationRate: total > 0 ? +(myJobsConf / total).toFixed(3) : 0,
          byErrorCategory,
          proofTypeSummary,
          funnel,
        };
      });

      if (!result) return textResult({ warning: 'Banco work.db não encontrado.' });
      return textResult(result);
    })
  );

  // ── vraxia_work_get_evidence ────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_get_evidence',
    {
      description:
        'Retorna o TruthRecord de uma candidatura específica — provas coletadas, confidence level, ' +
        'validation score, RCA do erro (se houver) e lista de evidências no diretório. ' +
        'Use para auditar se uma candidatura foi de fato submetida.',
      inputSchema: {
        job_id: z.string().describe('ID da candidatura (campo id da job_applications)'),
      },
    },
    safe(async ({ job_id }) => {
      // Busca dados no banco
      const row = await withDb(db => {
        const rows = dbQuery(db,
          `SELECT id, job_title, company, platform, status, application_state,
                  confidence, validation_score, health_score,
                  proofs_json, error_category, error_rca,
                  validation_method, trace_id, evidence_dir, updated_at
           FROM job_applications WHERE id = ? LIMIT 1`,
          [job_id]
        );
        return rows[0] ?? null;
      });

      if (!row) return textResult({ error: `Candidatura ${job_id} não encontrada no banco.` });

      // Tenta ler o truth-record.json do diretório de evidências
      let truthRecord: unknown = null;
      const evidenceDir = (row['evidence_dir'] as string) ||
        path.join(WORK_DATA, 'logs', `application_${job_id}`);

      if (fs.existsSync(evidenceDir)) {
        const truthPath = path.join(evidenceDir, 'truth-record.json');
        if (fs.existsSync(truthPath)) {
          try { truthRecord = JSON.parse(fs.readFileSync(truthPath, 'utf-8')); } catch { /* skip */ }
        }

        // Lista arquivos de evidência
        const files = fs.readdirSync(evidenceDir).map(f => {
          const stat = fs.statSync(path.join(evidenceDir, f));
          return { file: f, sizeKb: Math.round(stat.size / 1024 * 10) / 10 };
        });

        return textResult({
          application: row,
          evidenceDir,
          truthRecord,
          evidenceFiles: files,
        });
      }

      return textResult({
        application: row,
        evidenceDir,
        truthRecord: null,
        evidenceFiles: [],
        note: 'Diretório de evidências não encontrado — candidatura pode ter ocorrido antes do Truth Engine.',
      });
    })
  );

  // ── vraxia_work_noite ──────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_noite',
    {
      description:
        'Inicia ou consulta o modo noturno do VRAXIA WORK (NOITE.ps1). ' +
        'Sem argumentos: retorna status atual (rodando/encerrado + últimas linhas do log). ' +
        'Com action="start": dispara uma nova execução do NOITE em background. ' +
        'Com action="stop": encerra o processo NOITE ativo.',
      inputSchema: {
        action: z
          .enum(['status', 'start', 'stop'])
          .default('status')
          .describe('status = consulta | start = inicia NOITE | stop = encerra'),
        rounds: z.number().int().min(1).max(3).default(3).describe('Número de rodadas (só para start)'),
        limit_per_round: z.number().int().min(1).max(24).default(8).describe('Vagas por rodada (só para start)'),
      },
    },
    safe(async ({ action, rounds, limit_per_round }) => {
      const noiteScript = path.join(WORK_PKG, 'NOITE.ps1');

      if (action === 'start') {
        if (!fs.existsSync(noiteScript)) return errorResult('NOITE.ps1 não encontrado.');
        const limiteNoite = rounds * limit_per_round;
        const args = [
          '-ExecutionPolicy', 'Bypass', '-File', noiteScript,
          '-LimiteNoite', String(limiteNoite),
          '-LimitePorRodada', String(limit_per_round),
        ];
        const child = spawn('powershell.exe', args, {
          cwd: WORK_PKG, stdio: 'ignore', detached: true,
        });
        child.unref();
        if (!child.pid) return errorResult('Falha ao iniciar NOITE.ps1');
        return textResult({ started: true, pid: child.pid, rounds, limit_per_round, limiteNoite });
      }

      if (action === 'stop') {
        const { execSync } = await import('child_process');
        try {
          execSync('powershell -Command "Get-Process powershell | Where-Object {$_.CommandLine -like \'*NOITE*\'} | Stop-Process -Force"', { stdio: 'ignore' });
          return textResult({ stopped: true });
        } catch {
          return textResult({ stopped: false, note: 'Nenhum processo NOITE encontrado.' });
        }
      }

      // action === 'status'
      const logLines: string[] = [];
      if (fs.existsSync(NOITE_LOG)) {
        try {
          const raw = fs.readFileSync(NOITE_LOG, 'utf-8');
          const stamped = raw.split('\n').filter(l => l.match(/\[202\d-\d\d-\d\d/));
          logLines.push(...stamped.slice(-20));
        } catch {
          try {
            // Tenta UTF-16 (encoding do Tee-Object PS)
            const buf = fs.readFileSync(NOITE_LOG);
            const raw = buf.toString('utf16le');
            const stamped = raw.split('\n').filter(l => l.match(/\[202\d-\d\d-\d\d/));
            logLines.push(...stamped.slice(-20));
          } catch { /* skip */ }
        }
      }

      const stats = await withDb(db => {
        const s = dbQuery(db, `SELECT status, COUNT(*) as c FROM job_applications GROUP BY status`);
        const t = dbQuery(db, `SELECT confidence, COUNT(*) as c FROM job_applications GROUP BY confidence`);
        return {
          byStatus: Object.fromEntries(s.map(r => [r['status'], r['c']])),
          byConfidence: Object.fromEntries(t.map(r => [r['confidence'], r['c']])),
        };
      });

      return textResult({ recentLog: logLines, dbStats: stats });
    })
  );

  // ── vraxia_work_tunnel ─────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_tunnel',
    {
      description:
        'Retorna a URL pública do tunnel Cloudflare do dashboard VRAXIA WORK. ' +
        'Inclui links diretos para o dashboard e principais endpoints da API.',
      inputSchema: {},
    },
    safe(async () => {
      const tunnelFile = path.join(WORK_DATA, 'tunnel-url.txt');
      if (!fs.existsSync(tunnelFile)) {
        return textResult({ error: 'Tunnel não ativo — execute start-tunnel.ts primeiro.' });
      }
      const url = fs.readFileSync(tunnelFile, 'utf-8').trim();
      return textResult({
        tunnelUrl: url,
        dashboard:  `${url}/work`,
        apiHealth:  `${url}/api/work/health`,
        apiStats:   `${url}/api/work/stats`,
        apiTruth:   `${url}/api/work/truth-stats`,
        apiFunnel:  `${url}/api/work/funnel`,
        apiApps:    `${url}/api/work/applications`,
      });
    })
  );

  // ── vraxia_work_recover ────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_recover',
    {
      description:
        'Recupera candidaturas de evidence dirs que estejam faltando no banco work.db. ' +
        'Útil após falha de persistência — lê manifest.json e truth-record.json de cada ' +
        'diretório de evidência e insere/atualiza as linhas no DB.',
      inputSchema: {},
    },
    safe(async () => {
      const script = path.join(WORK_PKG, 'scripts', 'recover-evidence-to-db.ts');
      if (!fs.existsSync(script)) return errorResult('Script de recuperação não encontrado.');

      return new Promise(resolve => {
        const child = spawn('npx', ['tsx', script], {
          cwd: WORK_PKG, shell: true,
        });
        const lines: string[] = [];
        child.stdout?.on('data', d => lines.push(...String(d).split('\n').filter(Boolean)));
        child.stderr?.on('data', d => lines.push(...String(d).split('\n').filter(Boolean)));
        child.on('close', code => {
          const summary = lines.find(l => l.includes('Recovery complete')) ?? 'Sem sumário';
          resolve(textResult({ exitCode: code, summary, log: lines.slice(-30) }));
        });
      });
    })
  );

  // ── vraxia_work_score_job ───────────────────────────────────────────────────
  server.registerTool(
    'vraxia_work_score_job',
    {
      description:
        'Avalia o fit de uma vaga para o perfil do candidato (Samir Ricardo, Engenheiro de IA/AI Architect). ' +
        'Usa escala 0-100 com 6 dimensões: matchTecnico(0-35), matchSalarial(0-20), matchSenioridade(0-20), ' +
        'matchCultural(0-10), matchIdioma(0-10), matchLocalizacao(0-5). ' +
        'Ação: APPLY ≥75 (HIRE_THRESHOLD), REVIEW ≥60 (REVIEW_THRESHOLD), SKIP <60 ou dealBreaker.',
      inputSchema: {
        title: z.string().describe('Título da vaga'),
        company: z.string().default('').describe('Nome da empresa'),
        description: z.string().default('').describe('Descrição da vaga'),
        location: z.string().default('').describe('Localização/modalidade da vaga'),
        salary: z.string().default('').describe('Faixa salarial informada (opcional)'),
      },
    },
    safe(async ({ title, company, description, location, salary }) => {
      const prompt = `Você é um avaliador especializado de vagas para Samir Ricardo, Engenheiro de IA e AI Architect.
Perfil: 15+ anos de experiência, stack TypeScript/Node.js/Python/IA/LLM/RAG/Azure/Anthropic,
nível Sênior/Staff (nunca júnior/estágio/trainee), modalidade remoto ou híbrido/SP capital,
salário alvo R$15.000–R$25.000 CLT ou R$20.000–R$35.000 PJ.

VAGA:
Título: ${title}
Empresa: ${company || 'não informada'}
Localização: ${location || 'não informada'}
Salário: ${salary || 'não informado'}
Descrição: ${description.slice(0, 2000) || 'não informada'}

Retorne SOMENTE JSON, sem texto adicional:
{"matchTecnico":<0-35>,"matchSalarial":<0-20>,"matchSenioridade":<0-20>,"matchCultural":<0-10>,"matchIdioma":<0-10>,"matchLocalizacao":<0-5>,"dealBreaker":<true|false>,"reason":"<1 frase>","reasonApply":<"frase" ou null>,"reasonFilter":<"frase" ou null>}

Regras:
- matchSalarial=15 se faixa não informada
- dealBreaker=true APENAS para estágio/júnior/trainee ou localização proibida
- reasonApply: preencha se total>=75, senão null
- reasonFilter: preencha se total<50, senão null`;

      const response = await getAnthropic().messages.create({
        model: CHEAP_MODEL,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const raw = text.replace(/```json|```/g, '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}') as Record<string, unknown>;

      const dims = {
        matchTecnico:     Math.min(35, Math.max(0, (parsed['matchTecnico']     as number) ?? 0)),
        matchSalarial:    Math.min(20, Math.max(0, (parsed['matchSalarial']    as number) ?? 15)),
        matchSenioridade: Math.min(20, Math.max(0, (parsed['matchSenioridade'] as number) ?? 0)),
        matchCultural:    Math.min(10, Math.max(0, (parsed['matchCultural']    as number) ?? 5)),
        matchIdioma:      Math.min(10, Math.max(0, (parsed['matchIdioma']      as number) ?? 7)),
        matchLocalizacao: Math.min(5,  Math.max(0, (parsed['matchLocalizacao'] as number) ?? 3)),
      };
      const total = Object.values(dims).reduce((a, b) => a + b, 0);
      const dealBreaker = (parsed['dealBreaker'] as boolean) ?? false;
      const action = dealBreaker || total < 60 ? 'SKIP' : total >= 75 ? 'APPLY' : 'REVIEW';

      return textResult({
        dimensions: dims,
        total,
        dealBreaker,
        action,
        reason:       parsed['reason']       ?? '',
        reasonApply:  parsed['reasonApply']  ?? null,
        reasonFilter: parsed['reasonFilter'] ?? null,
      });
    })
  );
}
