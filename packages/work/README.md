# VRAXIA WORK — Autonomous Job Application Engine

> Autonomous system for job discovery, scoring, application, and evidence-based
> verification. Runs on TypeScript · Playwright · Anthropic Claude.

**Stack:** TypeScript · Node.js · Playwright · Anthropic Claude · SQLite · Express · TF-IDF RAG · Telegram

---

## What It Does

VRAXIA WORK is a career automation runtime that:

1. **Discovers jobs** on LinkedIn, Gupy, and Catho using heuristic filters and LLM scoring
2. **Scores and filters** each listing with a specialized agent (score 0–25, configurable threshold)
3. **Applies autonomously** via Playwright with anti-detection, CV upload, and intelligent questionnaire filling
4. **Verifies independently** whether the application was submitted using multiple evidence sources
5. **Exposes a dashboard** with application analytics, workflow funnel, Truth Engine status, and per-application audit

The system runs autonomously: a scheduler triggers the hunt within a daily randomized window,
sends a Telegram report, and adjusts behavior based on detected historical patterns.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VRAXIA WORK                                  │
│                                                                       │
│  CLI / Scheduler                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  │   hunt.ts    │   │ scheduler.ts │   │    Telegram notify      │  │
│  └──────┬───────┘   └──────┬───────┘   └─────────────────────────┘  │
│         │                  │                                          │
│         ▼                  ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                  ApplicationService                          │    │
│  │  JobFilterAgent → Apply Engine → ValidationEngine           │    │
│  │                         ↓                                    │    │
│  │               ApplicationTruthEngine                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                             │                                         │
│         ┌───────────────────┼───────────────────┐                    │
│         ▼                   ▼                   ▼                    │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐          │
│  │  SQLite DB  │   │ EvidenceDir  │   │  CareerMemory DB │          │
│  │  work.db    │   │ screenshots/ │   │  career-mem.db   │          │
│  └─────────────┘   │ network.json │   └──────────────────┘          │
│                    │ trace.json   │                                   │
│                    │ truth-record │                                   │
│                    └──────────────┘                                   │
│                                                                       │
│  Express API :3001                                                    │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  /api/work/applications  /truth-stats  /workflow-stats     │      │
│  │  /api/work/evidence/:id  /analytics    /chat               │      │
│  └────────────────────────────────────────────────────────────┘      │
│                             │                                         │
│                     ┌───────▼────────┐                               │
│                     │  Dashboard SPA  │                              │
│                     │  (Vercel/local) │                              │
│                     └────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Modules

### Cognitive Agents (`src/agents/`)

Each agent is an isolated LLM specialist with minimal context and controlled cost.

| Agent | Model | Responsibility |
|---|---|---|
| `JobFilterAgent` | Sonnet | Compatibility score per job (0–25). Threshold 18 = APPLY |
| `QuestionnaireAgent` | Haiku | Answers application questions via 5-layer RAG pipeline |
| `ResumeAgent` | Sonnet | Adapts CV to each company and role |
| `ATSAgent` | Sonnet | ATS compatibility: present vs. absent keywords |
| `InterviewCoach` | Sonnet | Generates likely questions and model answers per company |
| `SalaryAdvisor` | Sonnet | Compensation benchmarking with negotiation script |
| `LearningAgent` | Sonnet | Maps skill gaps from analyzed job listings |
| `NetworkingAgent` | Sonnet | Networking strategies and connection message scripts |
| `StatusTracker` | Haiku | Extracts application status from screenshots |

**Cost hierarchy:** Haiku for fast extraction → Sonnet for reasoning → TF-IDF for
retrieval (zero cost).

---

### Browser Automation (`src/engine/`)

| Module | Detail |
|---|---|
| `LinkedInSession` | Manages cookies, expiry detection, automatic session renewal |
| `JobSearchEngine` | Navigates LinkedIn Jobs with filters, extracts 50–100 listings per run |
| Apply Engine | Clicks Easy Apply, fills questionnaires, uploads CV, submits (private) |
| `GupySearchEngine / ApplyEngine` | Full Gupy platform support |
| `CathoSearchEngine / ApplyEngine` | Full Catho platform support |
| `GreenhouseApplyEngine` | External ATS Greenhouse applications |
| `ModalityDetector` | CPU-only geographic filter: REMOTE / HYBRID / ON-SITE |

**Anti-detection:** user-agent rotation, randomized human delays, Playwright stealth
plugin, ban-signal detection with mandatory cooldown.

---

### Application State Machine (`src/application/`)

Each application follows a strictly typed lifecycle:

```
discovered → queued → starting → opening_job → opening_easy_apply
  → uploading_resume → filling_questions → reviewing → submitting
  → submitted → validating → confirmed | failed | blocked | timeout
```

Post-apply states (updated via dashboard):
```
confirmed → interview → offer → hired
         → rejected
```

Invalid transitions throw immediately. Retry paths are first-class states:
`failed → retrying → starting`. See [ADR-003](../../docs/ADR-003-state-machine.md).

---

### Truth Engine

The most critical component. Independently evaluates whether an application was
actually submitted, regardless of what the workflow reported.

**Why it exists:** Automation can complete its workflow and reach a success state
while the actual HTTP submit request failed silently — expired session, network
error without exception, redirect to a page that looks like confirmation but is
not. The Truth Engine collects physical evidence.

Evidence sources are hierarchically weighted by reliability. Network-level proof
(HTTP 2xx to the submit endpoint) is the strongest possible signal — it means the
server accepted the request. Platform-side confirmation ("My Jobs > Applied") is
independently verifiable. Visual evidence (screenshots, page text) is weaker but
contributes when stronger evidence is absent. The specific weights and classification
thresholds are defined in the private implementation.

→ See [ADR-002: Truth Engine](../../docs/ADR-002-truth-engine.md) for the full rationale.

**Clear separation of concerns:**
- `ApplicationState` — what the robot did (workflow perspective)
- `TruthStatus` — what the evidence shows (independent auditor perspective)

These two values are surfaced as independent columns in the dashboard. A `confirmed`
workflow does not imply `VERIFIED` truth.

---

### 5-Layer RAG Pipeline (`src/rag/`)

`QuestionnaireAgent` uses an embedding-free retrieval pipeline (zero cost):

```
Application question
      ↓
Layer 1: Hard rules (CPF, address, fixed personal data)
      ↓
Layer 2: Structured FAQ (known recurring questions with known answers)
      ↓
Layer 3: Previous interview answers from career memory
      ↓
Layer 4: TF-IDF RAG over personal knowledge base (750+ indexed chunks)
      ↓
Layer 5: LLM (Haiku) with enriched context
```

TF-IDF implemented in pure TypeScript — no embedding API calls, no network
latency, no additional cost.

---

### Candidate Digital Twin (`src/twin/`)

JSON persisted in SQLite, used by all agents as base context:

```typescript
{
  identity:     { name, email, phone, location, linkedin, github },
  professional: { title, yearsExp, seniority, skills[], stack[] },
  projects:     [{ name, description, tech[], highlights[] }],
  history:      [{ role, company, period, highlights[] }]
}
```

Eliminates context repetition across prompts. Each agent receives only the
relevant subset of the Twin for its task.

---

### Career Memory (`src/memory/`)

`CareerMemory` maintains a separate SQLite database with accumulated knowledge
between runs:

- `company_insights` — hiring process history per company
- `keyword_performance` — which skills generated the most matches
- `question_bank` — question bank with best validated answers
- `resume_performance` — conversion rate per CV version

Enables offline analysis without LLM calls — patterns extracted from hundreds
of application cycles.

---

### Plugin Marketplace (`src/marketplace/`)

Pluggable extensions via `AgentPlugin` interface:

| Plugin | Category | Intents |
|---|---|---|
| `startup-radar` | Hunt | HUNT |
| `cover-letter` | Resume | RESUME |
| `equity-calculator` | Salary | SALARY |
| `linkedin-optimizer` | Resume | RESUME |
| `headhunter-script` | Network | NETWORK |
| `visa-filter` | Hunt | HUNT |

Installed and activated via dashboard at runtime. `AgentRegistry` dispatches to
the correct plugins by intent.

---

## Dashboard

SPA built with HTML5 + Tailwind CSS 3.4 + Chart.js. Dark glass-morphism design. Deployed on Vercel.

### Overview and KPIs

![Overview and KPIs](docs/screenshots/overview.png)

Session counters (listings scanned, applications submitted, approval rate, cost),
quick actions, and full application table with filters by status, platform, modality,
and real-time search.

---

### Application Table

![Application table](docs/screenshots/candidaturas.png)

Full application history with ATS score, platform badge (LinkedIn / Catho / Gupy),
geographic modality (Remote / Hybrid / On-Site), status, and 7 per-row actions:
audit, explanation, ATS analysis, CV view, interview prep, salary benchmark.

---

### Truth Engine — Evidence Audit

![Truth Engine](docs/screenshots/truth-engine.png)

Complete separation between **Workflow Status** (what the robot did: queued,
submitted, failed, cancelled) and **Truth Status** (objective evidence: VERIFIED,
REJECTED, PENDING). State funnel, error classification with automatic RCA, evidence
types collected, and Truth Status distribution chart.

---

### Executive Analytics

![Analytics](docs/screenshots/analytics.png)

Complete funnel (529 scanned → 82 applications → 126 under review), score
distribution by bucket (Skip / Review / Apply), platform breakdown, top companies,
15.5% application rate, skills map vs. market demand, and top requested technologies.

---

### Questionnaire Log

![Questionnaire log](docs/screenshots/questionnaire.png)

86 jobs processed · 2,044 questions answered · 123 resolved via cache · 1,921 via
LLM. Full per-company log with each question, resolution source (RAG layer / LLM /
cache), and context used.

---

### Agent Marketplace

![Marketplace](docs/screenshots/marketplace.png)

6 runtime-installable plugins: Startup Radar, Cover Letter, Equity Calculator,
LinkedIn Optimizer, Headhunter Script, Visa Filter. Each plugin has category, tags,
description, and Execute / Install button without server restart.

---

## Autonomous Scheduler

Runs via Windows Task Scheduler (VRAXIA-WORK-Daily):

```
1. Selects a randomized human-like window (e.g., 14:32–17:45 based on history)
2. Waits for a random time within the window
3. Triggers hunt.ts --platform linkedin --limit 10
4. Records result in scheduler-history.jsonl
5. Sends Telegram report (applied · under review · filtered · errors · cost)
6. Activates mandatory cooldown if ≥3 rejections detected in 7 days
```

---

## Telegram Notifications

Automatic post-hunt reports with:
- Total listings scanned / applied / filtered
- Truth Rate and Portal Confirmation Rate
- Estimated round cost (USD)
- Ban-signal alerts or critical error notifications

---

## Full Stack

| Layer | Technology |
|---|---|
| Runtime | TypeScript 5.4 · Node.js 18+ (ESM) |
| Browser | Playwright 1.44 + stealth plugin |
| LLM | Anthropic Claude (Sonnet 4, Haiku 4.5) |
| Storage | SQL.js (SQLite in Node) |
| API | Express 5 |
| Frontend | HTML5 · Tailwind CSS 3.4 · Chart.js |
| RAG | TF-IDF local (no embeddings) |
| CLI | Commander 12 · tsx |
| Notifications | Telegram Bot API (native fetch) |
| Deploy | Vercel (dashboard) · localhost (API) |
| Testing | Vitest 2 |

---

## Commands

```bash
# Application
npm run hunt                    # search + apply (LinkedIn)
npm run hunt -- --platform gupy --limit 5 --dry-run

# Session
npm run session:renew           # renew LinkedIn cookies
npm run catho:login             # Catho session setup

# Dashboard
npm run serve                   # local API :3001
npm run tunnel                  # expose via cloudflared
npm run start:full              # serve + tunnel in parallel

# QA / maintenance
npm run sense:report            # 7-day report
npm run sense:report:full       # 30-day report + KB suggestions
npm run errors:reset            # clear errors (use --dry-run first)
npm run typecheck               # type check without emit
npm run test                    # vitest
```

---

## Evidence per Application

Each application generates a directory `.vraxia-work/logs/application_{jobId}/`:

```
application_abc123/
├── manifest.json         metadata: company, platform, duration, final state
├── network.json          all captured requests (URL, method, status, body)
├── trace.json            robot events (step, action, durationMs, result)
├── timeline.json         state transition timeline
├── health-report.json    browser health score post-application
├── truth-record.json     TruthRecord: verdict, score, evidence, summary
└── screenshot_*.png      visual evidence (upload, submit, confirmation)
```

---

## Engineering Patterns

- **Typed state machine** — invalid transitions rejected at runtime, not just in lint
- **Truth/Workflow separation** — business metrics do not depend on automation success claims
- **Hierarchical RAG** — deterministic retrieval before LLM call (lower latency and cost)
- **Digital Twin** — candidate context centralized, not duplicated per prompt
- **Evidence-driven validation** — physical audit across multiple independent sources
- **Plugin registry** — extensibility without modifying the core
- **Cost-first model selection** — Haiku where speed matters, Sonnet where quality matters
- **Offline-first** — SQLite local, RAG local, scheduler local — no cloud dependency

---

## Performance

| Operation | Average time |
|---|---|
| Scan 50 listings (search) | ~25s |
| Score 1 listing (LLM) | ~3s (with prompt cache) |
| Full application (apply + verification) | ~45–90s |
| Truth evaluation (local) | ~200ms |
| **Total per 10-application round** | **~20 min** |

**Estimated cost:** ~$0.003/application (Sonnet with cache). 5 applications/day ≈ $5/year.

---

## Repository Structure

```
packages/work/
├── src/
│   ├── agents/               9 specialized LLM agents
│   ├── api/server.ts         Express + 25+ REST endpoints
│   ├── application/          State machine · Truth Engine · Repository
│   ├── cli/                  8 standalone entrypoint scripts
│   ├── engine/               Browser automation (LinkedIn, Gupy, Catho)
│   ├── marketplace/          Registry + 6 plugins
│   ├── memory/               CareerMemory (SQLite)
│   ├── notifications/        Telegram
│   ├── rag/                  Vault loader + TF-IDF retriever
│   ├── scheduler/            Daily runner + cooldown logic
│   ├── twin/                 CandidateTwin store
│   └── types/                Shared type definitions
├── dashboard/
│   ├── index.html            Full SPA (~3,200 lines)
│   └── vercel.json
├── package.json
└── tsconfig.json
```

---

## Why This System

Applying to jobs in Brazil at meaningful volume (dozens per week for reasonable
response rates) while maintaining quality (adapted CV, contextually answered
questionnaires, verified submissions) is a systems engineering problem: it
requires browser automation, LLM orchestration, local RAG, knowledge persistence,
and evidence-based verification working together in a runtime that operates
autonomously at near-zero cost with full auditability.

This is a personal-scale system. It is not a SaaS product and has no external users.

---

## License

Copyright © 2026 Samir Ricardo de Oliveira Almeida. All Rights Reserved.

See [LICENSE](../../LICENSE) for full terms.

---

*Built by [Samir Ricardo](https://linkedin.com/in/samir-ricardo-almeida-b23b3825b)*
