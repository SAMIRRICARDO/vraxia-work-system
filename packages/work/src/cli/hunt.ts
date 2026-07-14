// packages/work/src/cli/hunt.ts
// VRAXIA WORK — Hunt Mode (LinkedIn + Gupy + Catho)
// Uso: tsx src/cli/hunt.ts [--platform linkedin|gupy|catho|all] [--dry-run] [--headless]

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

import { program } from 'commander';
import { LinkedInSession } from '../engine/session.js';
import { JobSearchEngine } from '../engine/search.js';
import { GupySearchEngine, GupyApplyEngine, GupyJob } from '../engine/gupy.js';
import { CathoSession, CathoSearchEngine, CathoApplyEngine } from '../engine/catho.js';
import { ObsidianVaultLoader } from '../rag/vault-loader.js';
import { VaultRetriever } from '../rag/retriever.js';
import { CandidateKBLoader } from '../rag/candidate-kb-loader.js';
import { CandidateKBRetriever } from '../rag/candidate-kb-retriever.js';
import { MatchAgent } from '../agents/MatchAgent.js';
import { HireScoreAgent } from '../agents/HireScoreAgent.js';
import { TwinSelectorAgent } from '../agents/TwinSelectorAgent.js';
import { QuestionnaireAgent } from '../agents/QuestionnaireAgent.js';
import { QuestionnaireLogger } from '../agents/QuestionnaireLogger.js';
import { TwinStore } from '../twin/candidate-twin.js';
import { ProfessionalTwinsStore } from '../twin/professional-twins.js';
import { CareerMemory } from '../memory/career-memory.js';
import { JobSearchConfig, CathoSearchConfig, CathoJob, Job, ApplicationStatus, JobScore } from '../types/index.js';
import type { HireScore } from '../types/hire-intelligence.js';
import { HIRE_THRESHOLD } from '../types/hire-intelligence.js';
import { GreenhouseApplyEngine } from '../engine/greenhouse.js';
// ── Nova arquitetura de candidatura ──────────────────────────────────────────
import { ApplicationService } from '../application/ApplicationService.js';
import { ApplicationRepository } from '../application/ApplicationRepository.js';

program
  .option('--platform <p>', 'Plataforma: linkedin | gupy | catho | all', 'all')
  .option('--dry-run', 'Nao submete — apenas escaneia e filtra')
  .option('--headless', 'Browser em modo headless')
  .option('--limit <n>', 'Maximo de aplicacoes por sessao', '10')
  .option('--vault <path>', 'Caminho do vault Obsidian', process.env.OBSIDIAN_VAULT ?? '')
  .option('--resume <path>', 'Caminho do PDF do curriculo', process.env.RESUME_PATH ?? '')
  .option('--log-questions', 'Salva perguntas e respostas em .vraxia-work/questionnaire-log')
  .option('--remote-only', 'Busca apenas vagas remotas (ignora CONFIG_SP)')
  .parse();

const opts = program.opts();

const KEYWORDS = [
  'AI Engineer',
  'LLM Engineer',
  'AI Solutions Architect',
  'Engenheiro de IA',
  'Full Stack Developer',
  'Desenvolvedor Full Stack',
  'Senior Software Engineer',
  'Node.js Developer',
  'Backend TypeScript',
];
const TITLE_BLACKLIST = ['junior', 'estagio', 'intern', 'trainee', 'jr', 'bolsista'];

// Keywords mais amplos para o mercado Catho (plataforma BR — menos vagas com título em inglês)
const CATHO_KEYWORDS = [
  'Engenheiro de IA',
  'Desenvolvedor IA',
  'Inteligência Artificial',
  'Machine Learning',
  'AI Engineer',
  'LLM',
  'Desenvolvedor Full Stack',
  'Full Stack',
  'Desenvolvedor Node',
  'Desenvolvedor Backend',
  'Desenvolvedor React',
  'Desenvolvedor Python',
  'Engenheiro de Software',
];

// 1ª prioridade: presencial + híbrido em São Paulo Capital
const LINKEDIN_CONFIG_SP_ONSITE: JobSearchConfig = {
  keywords: KEYWORDS,
  locations: ['São Paulo, Brazil', 'São Paulo, São Paulo, Brazil'],
  experienceLevels: ['MID_SENIOR_LEVEL', 'DIRECTOR'],
  jobTypes: ['FULL_TIME', 'CONTRACT'],
  datePosted: 'week',
  easyApplyOnly: true,
  remoteOnly: false,
  workType: 'ONSITE_HYBRID',
  companyBlacklist: [],
  titleBlacklist: TITLE_BLACKLIST,
  maxApplicationsPerRun: parseInt(opts.limit, 10),
};

// 2ª prioridade: qualquer modalidade em SP (inclui remotos postados com loc. SP)
const LINKEDIN_CONFIG_SP: JobSearchConfig = {
  keywords: KEYWORDS,
  locations: ['São Paulo, Brazil', 'São Paulo, São Paulo, Brazil'],
  experienceLevels: ['MID_SENIOR_LEVEL', 'DIRECTOR'],
  jobTypes: ['FULL_TIME', 'CONTRACT'],
  datePosted: 'week',
  easyApplyOnly: true,
  remoteOnly: false,
  companyBlacklist: [],
  titleBlacklist: TITLE_BLACKLIST,
  maxApplicationsPerRun: parseInt(opts.limit, 10),
};

// 3ª prioridade: vagas 100% remotas de qualquer lugar do Brasil/mundo
const LINKEDIN_CONFIG_BRASIL: JobSearchConfig = {
  keywords: KEYWORDS,
  locations: ['Brasil', 'Brazil', 'Remote'],
  experienceLevels: ['MID_SENIOR_LEVEL', 'DIRECTOR'],
  jobTypes: ['FULL_TIME', 'CONTRACT'],
  datePosted: 'week',
  easyApplyOnly: true,
  remoteOnly: true,
  companyBlacklist: [],
  titleBlacklist: TITLE_BLACKLIST,
  maxApplicationsPerRun: parseInt(opts.limit, 10),
};

// 4ª prioridade: vagas com candidatura externa (Greenhouse, Lever, Workday)
// SEM filtro easyApplyOnly para capturar empresas com ATS próprio
const LINKEDIN_CONFIG_EXTERNAL: JobSearchConfig = {
  keywords: ['AI Engineer', 'LLM Engineer', 'Senior Software Engineer', 'AI Architect', 'ML Engineer'],
  locations: ['Brazil', 'Remote'],
  experienceLevels: ['MID_SENIOR_LEVEL', 'DIRECTOR'],
  jobTypes: ['FULL_TIME'],
  datePosted: 'week',
  easyApplyOnly: false,
  remoteOnly: true,
  companyBlacklist: [],
  titleBlacklist: TITLE_BLACKLIST,
  maxApplicationsPerRun: parseInt(opts.limit, 10),
};

const GUPY_CONFIG = {
  keywords: KEYWORDS,
  companyWatchlist: [
    'nubank', 'stone', 'vtex', 'ifood', 'creditas',
    'dock', 'loft', 'ambevtech', 'totvs', 'xp-investimentos',
  ],
  useGupyBoard: true,
  locations: ['Sao Paulo'],
};

// Catho — SP capital (presencial/híbrido)
const CATHO_CONFIG_SP: CathoSearchConfig = {
  keywords: CATHO_KEYWORDS,
  location: 'São Paulo',
  remote: false,
  titleBlacklist: TITLE_BLACKLIST,
};

// Catho — remoto Brasil
const CATHO_CONFIG_REMOTE: CathoSearchConfig = {
  keywords: CATHO_KEYWORDS,
  location: '',
  remote: true,
  titleBlacklist: TITLE_BLACKLIST,
};

const PERSONAL_DATA = {
  name: process.env.CANDIDATE_NAME ?? 'Samir Ricardo Almeida',
  email: process.env.LINKEDIN_EMAIL ?? '',
  phone: process.env.CANDIDATE_PHONE ?? '',
  linkedin: process.env.LINKEDIN_PROFILE_URL ?? 'https://linkedin.com/in/samir-ricardo-almeida-b23b3825b',
};

// Extrai keywords técnicas simples do título + descrição da vaga
function extractKeywords(job: Job): string[] {
  const TECH_TERMS = /\b(typescript|javascript|python|node|react|vue|angular|aws|azure|gcp|docker|kubernetes|sql|postgres|redis|graphql|rest|api|llm|ai|machine learning|devops|cloud|java|go|rust|php|ruby|spring|django|fastapi|next|nest|express)\b/gi;
  const text = `${job.title} ${job.description.slice(0, 1000)}`;
  const matches = text.match(TECH_TERMS) ?? [];
  return [...new Set(matches.map(k => k.toLowerCase()))].slice(0, 15);
}

// ── Agent bundle ──────────────────────────────────────────────────────────────

interface HuntAgents {
  matcher: MatchAgent;             // legacy — fallback only
  questionnaire: QuestionnaireAgent;
  twinSelector: TwinSelectorAgent;
  hireScoreAgent: HireScoreAgent;
  twinsStore: ProfessionalTwinsStore;
}

// ── HIE scoring helper ────────────────────────────────────────────────────────
// Single entry point for scoring via HIE. Handles cache, twin selection, and logging.

async function scoreViaHIE(
  job: Job,
  agents: HuntAgents,
): Promise<HireScore> {
  // Check HIE cache first (3-day TTL)
  const cached = agents.twinsStore.getCachedHireScore(job.id);
  if (cached) {
    const twinLabel = agents.twinsStore.getById(cached.twinId)?.label ?? cached.twinId;
    console.log(`  [HIE CACHE] ${twinLabel} | IP: ${cached.interviewProbability}% | HS: ${cached.hireScore}/100 → ${cached.action}`);
    return cached;
  }

  // Select best twin for this job (Haiku — fast and cheap)
  const twins = agents.twinsStore.getAll();
  const selection = await agents.twinSelector.select(job, twins);
  const selectedTwin = selection.selectedTwin;

  // Compute Interview Probability + Hire Score (Sonnet)
  const hireScore = await agents.hireScoreAgent.score(job, selectedTwin);
  agents.twinsStore.saveHireScore(hireScore);

  const passedGate = hireScore.hireScore >= HIRE_THRESHOLD;
  const gateStr = passedGate ? '✅ APPLY' : hireScore.action;
  console.log(`  [HIE] ${selectedTwin.label} | IP: ${hireScore.interviewProbability}% | HS: ${hireScore.hireScore}/100 → ${gateStr}`);

  if (hireScore.keyStrengths.length) {
    console.log(`        ✓ ${hireScore.keyStrengths.slice(0, 3).join(' · ')}`);
  }
  if (hireScore.keyWeaknesses.length) {
    console.log(`        ✗ ${hireScore.keyWeaknesses[0]}`);
  }
  if (hireScore.atsKeywordsMissing.length) {
    console.log(`        ATS missing: ${hireScore.atsKeywordsMissing.slice(0, 4).join(', ')}`);
  }

  return hireScore;
}

// Adapts HireScore to the minimal JobScore fields ApplicationRepository.upsert() reads
function toJobScore(hs: HireScore): JobScore {
  return {
    jobId:       hs.jobId,
    titleFit:    Math.round(hs.dimensions.technicalFit / 10),
    stackFit:    Math.round(hs.dimensions.technicalFit / 10),
    companyFit:  5,
    dealBreaker: hs.hireScore === 0,
    total:       hs.hireScore,
    action:      hs.action,
    reason:      hs.reasoning,
  };
}

// ── processJob (Gupy + Catho) ─────────────────────────────────────────────────

async function processJob(
  job: Job,
  agents: HuntAgents,
  tracker: ApplicationRepository,
  memory: CareerMemory,
  applier: (job: Job) => Promise<boolean>,
  dryRun: boolean
): Promise<boolean> {
  if (tracker.alreadyApplied(job.id)) {
    console.log(`  ↩  Ja aplicado: ${job.title} @ ${job.company}`);
    return false;
  }

  const hireScore = await scoreViaHIE(job, agents);

  tracker.upsert({
    id: job.id,
    job,
    score: toJobScore(hireScore) as unknown as JobScore,
    status: (hireScore.action === 'SKIP' ? 'filtered_out' : 'queued') as ApplicationStatus,
  });

  if (hireScore.action !== 'APPLY') {
    if (hireScore.action === 'SKIP') {
      tracker.updateState(job.id, 'cancelled', { notes: hireScore.reasoning });
    }
    console.log(`  ${hireScore.action === 'SKIP' ? 'Pulando.' : 'Marcado para revisao manual.'}`);
    return false;
  }

  tracker.saveExplainability(job.id, hireScore.reasoning, undefined, undefined);
  tracker.updateStatus(job.id, 'applying');
  console.log(`  Aplicando${dryRun ? ' (DRY RUN)' : ''}...`);

  agents.questionnaire.setJob(job.id, job.title, job.company, job.linkedinUrl);

  try {
    const success = await applier(job);
    if (success) {
      if (dryRun) {
        tracker.updateStatus(job.id, 'queued', 'dry-run: aprovado, aguardando aplicacao real');
        console.log('  Aplicado! (simulado — mantido na fila)');
      } else {
        tracker.updateStatus(job.id, 'applied');
        memory.recordApplication(job.company, extractKeywords(job));
        console.log('  Aplicado!');
      }
      return true;
    } else {
      tracker.updateStatus(job.id, 'filtered_out', 'Nao submetido');
      return false;
    }
  } catch (err) {
    tracker.updateStatus(job.id, 'error', String(err));
    console.error('  Erro:', err);
    return false;
  } finally {
    agents.questionnaire.flushLog();
  }
}

async function main() {
  const platform = opts.platform as 'linkedin' | 'gupy' | 'catho' | 'all';
  const dryRun = !!opts.dryRun;
  const maxApply = parseInt(opts.limit, 10);

  console.log(`\nVRAXIA WORK — Hunt Mode [${platform.toUpperCase()}]${dryRun ? ' DRY RUN' : ''}`);
  console.log(`Hire Intelligence Engine active — HIRE_THRESHOLD: ${HIRE_THRESHOLD}/100\n`);

  // Sinaliza para a API que um hunt externo está ativo (usado pelo dashboard para polling rápido)
  const PID_FILE = path.resolve(process.cwd(), '.vraxia-work', 'hunt.pid');
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');
  const cleanPid = () => { try { fs.unlinkSync(PID_FILE); } catch {} };
  process.on('exit', cleanPid);
  process.on('SIGINT', () => { cleanPid(); process.exit(130); });
  process.on('SIGTERM', () => { cleanPid(); process.exit(143); });

  const retriever = new VaultRetriever();
  if (opts.vault) {
    try {
      const loader = new ObsidianVaultLoader(opts.vault);
      const chunks = loader.load('vraxia-work');
      retriever.index(chunks);
    } catch (err) {
      console.warn('[Hunt] Vault nao carregado — contexto padrao.\n', err);
    }
  }

  // Log de perguntas sempre ativo — alimenta o relatório do dashboard e do MCP
  const logger = new QuestionnaireLogger();
  console.log('[Hunt] Log de perguntas ativo → .vraxia-work/questionnaire-log.*\n');

  const twinStore  = new TwinStore();
  const memory     = await CareerMemory.create();

  // HIE agents — Career OS v2
  const twinsStore     = await ProfessionalTwinsStore.create();
  const twinSelector   = new TwinSelectorAgent(process.env.ANTHROPIC_API_KEY);
  const hireScoreAgent = new HireScoreAgent(process.env.ANTHROPIC_API_KEY);

  console.log(`[Hunt] Professional Twins loaded: ${twinsStore.getAll().map(t => t.id).join(', ')}\n`);

  const questionnaire = new QuestionnaireAgent(retriever, process.env.ANTHROPIC_API_KEY, logger);

  // Injeta facts do twin (Camada 1)
  const twinForFacts  = twinStore.get();
  const eduFact       = twinForFacts.learning.education?.[0];
  if (twinForFacts.identity.cpf)      questionnaire.setFact('cpf',         twinForFacts.identity.cpf);
  if (twinForFacts.identity.email)    questionnaire.setFact('email',        twinForFacts.identity.email);
  if (twinForFacts.identity.linkedin) questionnaire.setFact('linkedin',     twinForFacts.identity.linkedin);
  if (twinForFacts.identity.phone)    questionnaire.setFact('telefone',     twinForFacts.identity.phone);
  if (twinForFacts.identity.name)     questionnaire.setFact('nome',         twinForFacts.identity.name);
  if (eduFact?.institution)           questionnaire.setFact('escola',       eduFact.institution);
  if (eduFact?.degree)                questionnaire.setFact('escolaridade', eduFact.degree);
  if (eduFact?.course)                questionnaire.setFact('disciplina',   eduFact.course);

  // Ativa Candidate KB (Camadas 2–5) + CKOS como RAG enriquecido
  const KB_PATH   = process.env.CANDIDATE_KB_PATH ?? 'C:\\Users\\Administrador\\Desktop\\VRAXIA SYSTEM\\VRAXIA WORK\\candidate-kb';
  const CKOS_PATH = process.env.CANDIDATE_OS_PATH  ?? 'C:\\Users\\Administrador\\Desktop\\VRAXIA SYSTEM\\VRAXIA WORK\\candidate-os';
  try {
    const kbLoader = new CandidateKBLoader(KB_PATH, CKOS_PATH);
    const kb       = new CandidateKBRetriever(kbLoader.load());
    questionnaire.useKB(kb);
  } catch (err) {
    console.warn('[Hunt] Candidate KB não carregada — usando vault RAG:', String(err).slice(0, 80));
  }

  const agents: HuntAgents = {
    matcher:       new MatchAgent(retriever, twinStore, process.env.ANTHROPIC_API_KEY),
    questionnaire,
    twinSelector,
    hireScoreAgent,
    twinsStore,
  };

  const tracker = await ApplicationRepository.create();
  const session = new LinkedInSession();
  const page = await session.init({ headless: !!opts.headless });
  // try/finally garante que browser e DB sejam fechados mesmo em caso de erro fatal.

  try {
  const needsLinkedIn = platform === 'linkedin' || platform === 'all';
  if (needsLinkedIn) {
    const loggedIn = await session.login({
      email: process.env.LINKEDIN_EMAIL ?? '',
      password: process.env.LINKEDIN_PASSWORD ?? '',
    });

    if (!loggedIn) {
      console.error('Falha no login LinkedIn.');
      await session.close();
      tracker.close();
      process.exit(1);
    }
  }

  const resumePath = opts.resume || path.resolve(process.cwd(), 'resume.pdf');
  let totalApplied = 0;

  if (platform === 'linkedin' || platform === 'all') {
    console.log('\nLINKEDIN — Buscando vagas (SP + Brasil/Remoto)...');
    const searchEngine = new JobSearchEngine(page);
    const appService   = new ApplicationService(page, tracker);
    const ghEngine     = new GreenhouseApplyEngine(page, retriever, process.env.ANTHROPIC_API_KEY);
    const twin         = twinStore.get();

    const remoteOnly = !!opts.remoteOnly;

    const jobsSPOnsite  = remoteOnly ? [] : await searchEngine.scrapeJobList(LINKEDIN_CONFIG_SP_ONSITE).catch(e => { console.warn('[Hunt] Busca SP onsite falhou:', e); return []; });
    const jobsSP        = remoteOnly ? [] : await searchEngine.scrapeJobList(LINKEDIN_CONFIG_SP).catch(e => { console.warn('[Hunt] Busca SP falhou:', e); return []; });
    const jobsBR        = await searchEngine.scrapeJobList(LINKEDIN_CONFIG_BRASIL).catch(e => { console.warn('[Hunt] Busca BR falhou:', e); return []; });
    const jobsExternal  = await searchEngine.scrapeJobList(LINKEDIN_CONFIG_EXTERNAL).catch(e => { console.warn('[Hunt] Busca externa falhou:', e); return []; });

    const seenIds = new Set<string>();
    const jobs = [...jobsSPOnsite, ...jobsSP, ...jobsBR, ...jobsExternal].filter(j => { if (seenIds.has(j.id)) return false; seenIds.add(j.id); return true; });
    console.log(`${jobs.length} vagas únicas encontradas no LinkedIn (SP onsite/híbrido: ${jobsSPOnsite.length}, SP geral: ${jobsSP.length}, BR/Remoto: ${jobsBR.length}, Externa/ATS: ${jobsExternal.length}).\n`);

    for (const job of jobs) {
      if (totalApplied >= maxApply) break;
      console.log(`\n${job.title} @ ${job.company}`);
      job.description = await searchEngine.scrapeJobDescription(job.linkedinUrl);

      // Detecta tipo de candidatura (Easy Apply vs ATS externo)
      const atsResult = await searchEngine.detectApplyType().catch((): { type: 'easy_apply'; externalUrl?: string } => ({ type: 'easy_apply' }));
      job.applyType        = atsResult.type;
      job.externalApplyUrl = atsResult.externalUrl;
      if (atsResult.type !== 'easy_apply') {
        console.log(`  [ATS] ${atsResult.type.toUpperCase()}${atsResult.externalUrl ? ` → ${atsResult.externalUrl.slice(0, 60)}` : ''}`);
      }

      // ── Greenhouse (ATS externo implementado) ─────────────────────────────
      if (job.applyType === 'greenhouse') {
        if (!job.externalApplyUrl) {
          tracker.updateState(job.id, 'cancelled', { notes: 'Greenhouse — URL não detectada' });
          continue;
        }
        agents.questionnaire.setAtsSource('greenhouse');
        const ghOk = await processJob(job, agents, tracker, memory, async (j) => ghEngine.apply(j.externalApplyUrl!, {
          twin, resumePath, dryRun,
          onQuestion: async (q) => (await agents.questionnaire.answer(q)).answer,
          onFieldFilled: (label, value) => agents.questionnaire.logField(label, value),
        }), dryRun);
        if (ghOk) { totalApplied++; await new Promise(r => setTimeout(r, 4000 + Math.random() * 6000)); }
        continue;
      }

      // ── ATSs pendentes ────────────────────────────────────────────────────
      if (job.applyType === 'lever' || job.applyType === 'workday' || job.applyType === 'external') {
        const msg = `ATS ${job.applyType} — não implementado nesta versão`;
        tracker.updateState(job.id, 'cancelled', { notes: msg });
        console.log(`  ${msg}`);
        continue;
      }

      // ── LinkedIn Easy Apply via ApplicationService (máquina de estados) ────
      agents.questionnaire.setAtsSource('easy_apply');

      if (tracker.alreadyApplied(job.id)) {
        console.log(`  ↩  Já aplicado: ${job.title} @ ${job.company}`);
        continue;
      }

      // ── HIE scoring gate ──────────────────────────────────────────────────
      // Replaces MatchAgent.score(). Decision: APPLY only if hireScore >= HIRE_THRESHOLD (90).
      const hireScore = await scoreViaHIE(job, agents);

      // Upsert is safe here: job was not terminal (checked above via alreadyApplied).
      tracker.upsert({
        id: job.id,
        job,
        score: toJobScore(hireScore) as unknown as JobScore,
        status: hireScore.action === 'SKIP' ? 'filtered_out' : 'queued',
      });

      if (hireScore.action !== 'APPLY') {
        tracker.updateState(job.id, hireScore.action === 'SKIP' ? 'cancelled' : 'queued', {
          notes: hireScore.reasoning,
          reasonApply: undefined,
          reasonFilter: hireScore.action === 'SKIP' ? hireScore.reasoning : undefined,
        });
        console.log(`  ${hireScore.action === 'SKIP' ? 'Pulando.' : 'Marcado para revisao manual.'}`);
        continue;
      }

      tracker.saveExplainability(job.id, hireScore.reasoning, undefined, undefined);
      tracker.updateState(job.id, 'starting');
      console.log(`  Candidatando${dryRun ? ' (DRY RUN)' : ''}...`);

      agents.questionnaire.setJob(job.id, job.title, job.company, job.linkedinUrl);

      const result = await appService.process(job, {
        dryRun,
        resumePath,
        onQuestion: async (q) => (await agents.questionnaire.answer(q)).answer,
        onFieldFilled: (label, value) => agents.questionnaire.logField(label, value),
        onStateChange: (state) => {
          console.log(`    [state] ${state}`);
        },
        maxRetries: 1,
      });

      agents.questionnaire.flushLog();

      if (result.confirmed) {
        memory.recordApplication(job.company, extractKeywords(job));
        console.log(`  ✅ Candidatura CONFIRMADA (método: ${result.validation?.method ?? 'desconhecido'})`);
        console.log(`  📁 Evidências: ${result.evidenceDir}`);
        totalApplied++;
        await new Promise(r => setTimeout(r, 4000 + Math.random() * 6000));
      } else if (result.finalState === 'submitted') {
        console.log(`  ⚠️  Submetido mas NÃO confirmado — revisar evidências: ${result.evidenceDir}`);
      } else {
        console.log(`  ✗ Falha: ${result.error ?? result.finalState}`);
      }
    }
  }

  if ((platform === 'gupy' || platform === 'all') && totalApplied < maxApply) {
    console.log('\nGUPY — Buscando vagas...');
    const gupySearch = new GupySearchEngine(page);
    const gupyApply = new GupyApplyEngine(page);

    // API HTTP (primary — evita Cloudflare/bot-detection dos subdomínios)
    const uniqueJobs = await gupySearch.searchViaAPI(GUPY_CONFIG);
    console.log(`${uniqueJobs.length} vagas encontradas no Gupy.\n`);

    for (const job of uniqueJobs) {
      if (totalApplied >= maxApply) break;
      console.log(`\n[Gupy] ${job.title} @ ${job.company}`);
      job.description = await gupySearch.scrapeJobDescription(job);

      const applied = await processJob(job, agents, tracker, memory, async (j) => {
        return gupyApply.apply(j as GupyJob, {
          resumePath, dryRun, personalData: PERSONAL_DATA,
          onQuestion: async (q) => (await agents.questionnaire.answer(q)).answer,
        });
      }, dryRun);

      if (applied) {
        totalApplied++;
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
      }
    }
  }

  if ((platform === 'catho' || platform === 'all') && totalApplied < maxApply) {
    console.log('\nCATHO — Buscando vagas (SP + Remoto)...');

    const cathoSession = new CathoSession(page);
    const cathoLoggedIn = await cathoSession.login();
    if (!cathoLoggedIn) {
      console.error('[Catho] Falha no login — pulando plataforma.');
    } else {
      const cathoSearch = new CathoSearchEngine(page);
      const cathoApply  = new CathoApplyEngine(page);

      const jobsSP     = await cathoSearch.searchJobs(CATHO_CONFIG_SP).catch(e => { console.warn('[Catho] Busca SP falhou:', e); return [] as CathoJob[]; });
      const jobsRemote = await cathoSearch.searchJobs(CATHO_CONFIG_REMOTE).catch(e => { console.warn('[Catho] Busca remoto falhou:', e); return [] as CathoJob[]; });

      const seenCatho = new Set<string>();
      const cathoJobs = [...jobsSP, ...jobsRemote].filter(j => { if (seenCatho.has(j.id)) return false; seenCatho.add(j.id); return true; });
      console.log(`${cathoJobs.length} vagas únicas encontradas no Catho (SP: ${jobsSP.length}, Remoto: ${jobsRemote.length}).\n`);

      for (const job of cathoJobs) {
        if (totalApplied >= maxApply) break;
        console.log(`\n[Catho] ${job.title} @ ${job.company}`);
        job.description = await cathoSearch.scrapeJobDescription(job.applicationUrl);

        const applied = await processJob(job, agents, tracker, memory, async (j) => {
          return cathoApply.apply(j as CathoJob, {
            resumePath, dryRun,
            onQuestion: async (q) => (await agents.questionnaire.answer(q)).answer,
          });
        }, dryRun);

        if (applied) {
          totalApplied++;
          // Anti-ban: 45s–2min entre candidaturas no Catho
          await new Promise(r => setTimeout(r, 45000 + Math.random() * 75000));
        }
      }
    }
  }

  // ── HIE session summary ───────────────────────────────────────────────────
  console.log('\n─────────────────────────────────');
  console.log('RELATORIO FINAL');
  const stats = tracker.getStats();
  for (const [status, count] of Object.entries(stats)) {
    console.log(`  ${status}: ${count}`);
  }
  console.log(`  Aplicacoes nesta sessao: ${totalApplied}/${maxApply}`);

  // HIE stats: how many scored, how many passed the gate
  const hieApplied  = stats['applied'] ?? 0;
  const hieFiltered = stats['filtered_out'] ?? 0;
  const hieTotal    = hieApplied + hieFiltered;
  if (hieTotal > 0) {
    const gateRate = Math.round((hieApplied / hieTotal) * 100);
    console.log(`  HIE gate rate: ${gateRate}% passed (threshold: HS >= ${HIRE_THRESHOLD})`);
  }
  console.log('─────────────────────────────────\n');

  await deployDashboard(); // sempre — dry-run ou não

  } finally {
    // Garante cleanup mesmo em throw inesperado
    await session.close().catch(() => {});
    tracker.close();
    twinsStore.close();
    memory.close();
  }
}

// ── Deploy automático do dashboard após cada rodada ───────────────────────────

async function deployDashboard(): Promise<void> {
  const WORK_DIR  = path.resolve(process.cwd(), '.vraxia-work');
  const DASH_DIR  = path.resolve(process.cwd(), 'dashboard');
  const JSONL_SRC = path.join(WORK_DIR, 'questionnaire-log.jsonl');
  const SNAP_DEST = path.join(DASH_DIR, 'questionnaire-data.json');

  try {
    // Exporta snapshot agrupado por vaga
    if (fs.existsSync(JSONL_SRC)) {
      type Entry = Record<string, unknown>;
      const entries = fs.readFileSync(JSONL_SRC, 'utf-8')
        .split('\n').filter(l => l.trim())
        .map(l => { try { return JSON.parse(l) as Entry; } catch { return null; } })
        .filter(Boolean) as Entry[];

      const grouped: Record<string, { job_id: string; job_title: string; company: string; job_url: string; entries: Entry[] }> = {};
      for (const e of entries) {
        const key = (e['job_id'] as string) || 'unknown';
        if (!grouped[key]) {
          grouped[key] = {
            job_id:    e['job_id'] as string,
            job_title: e['job_title'] as string,
            company:   e['company'] as string,
            job_url:   (e['job_url'] as string) ?? '',
            entries:   [],
          };
        }
        grouped[key].entries.push(e);
      }

      fs.writeFileSync(SNAP_DEST, JSON.stringify(Object.values(grouped)), 'utf-8');
      console.log('[Deploy] questionnaire-data.json exportado.');
    }

    // Injeta tunnel URL para que o dashboard funcione via Vercel (acesso remoto)
    const tunnelUrlFile = path.join(WORK_DIR, 'tunnel-url.txt');
    if (fs.existsSync(tunnelUrlFile)) {
      const tunnelUrl = fs.readFileSync(tunnelUrlFile, 'utf-8').trim();
      if (tunnelUrl.startsWith('https://')) {
        fs.writeFileSync(
          path.join(DASH_DIR, 'api-config.json'),
          JSON.stringify({ apiUrl: tunnelUrl, updatedAt: new Date().toISOString() }),
          'utf-8',
        );
        console.log(`[Deploy] api-config.json gerado → ${tunnelUrl}`);
      }
    }

    console.log('[Deploy] Publicando dashboard no Vercel...');
    const out = execSync('vercel --prod --yes 2>&1', { cwd: DASH_DIR }).toString().trim();
    const urlMatch = out.match(/https:\/\/\S+\.vercel\.app/);
    console.log(`[Deploy] ✅ Dashboard atualizado${urlMatch ? ': ' + urlMatch[0] : ' no Vercel'}`);
  } catch (err) {
    console.warn('[Deploy] Aviso — falha no deploy automático:', String(err).slice(0, 120));
  }
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
