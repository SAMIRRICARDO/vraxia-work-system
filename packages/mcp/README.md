# @vraxia/mcp — VRAXIA MCP Server

Expõe os agentes do ecossistema VRAXIA como **tools MCP** utilizáveis por qualquer cliente
(Claude Desktop, Claude Code, web). Autocontido: lê SQLite/JSONL/vault diretamente e usa
**Haiku (cheap mode)** em toda tool que chama LLM.

## Instalação

```bash
cd packages/mcp
npm install
npm run typecheck   # opcional
```

As variáveis de ambiente são carregadas automaticamente de `.env` (raiz do repo) e
`packages/work/.env` — não é preciso duplicá-las na config dos clientes.
Necessárias: `ANTHROPIC_API_KEY` (tools LLM) e `OBSIDIAN_VAULT` (vault search/resources).

## Uso

### Claude Desktop (stdio)

Já configurado em `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vraxia": {
      "command": "node",
      "args": [
        "C:\\AI-LAB\\ai-cognitive-runtime\\packages\\mcp\\node_modules\\tsx\\dist\\cli.mjs",
        "C:\\AI-LAB\\ai-cognitive-runtime\\packages\\mcp\\src\\server.ts"
      ]
    }
  }
}
```

Reinicie o Claude Desktop e as tools `vraxia_*` aparecem automaticamente.
(Para usar `dist/server.js` em vez de tsx: `npm run build` e troque os args.)

### Claude Code / web (SSE)

```bash
npm run start:sse            # porta 3002 (ou: npx tsx src/transport/sse.ts --port 3002)
claude mcp add --transport sse vraxia http://localhost:3002/sse
```

### Teste manual

```bash
npx tsx test-client.ts       # lista tools/resources/prompts + smoke test
```

## Tools

| Tool | Descrição |
|------|-----------|
| `vraxia_work_hunt` | Inicia hunt de vagas em background (platform, limit, dryRun) |
| `vraxia_work_stats` | Estatísticas de candidaturas do SQLite (period) |
| `vraxia_work_list_applications` | Lista candidaturas com filtros (status, platform, limit) |
| `vraxia_work_score_job` | Score 0-30 + ação (APPLY/REVIEW/SKIP) de uma vaga · Haiku |
| `vraxia_search_leads` | Busca no índice do Codex Lead Engine (company, role, location) |
| `vraxia_enrich_lead` | Padrões de email corporativo + dados do índice local |
| `vraxia_generate_outreach` | Email de outreach padrão VRASHOWS · Haiku |
| `vraxia_vault_search` | Busca TF-IDF no vault Obsidian (zero custo de API) |
| `vraxia_sense_classify` | Classificação de eventos via VRAXIA Sense · Haiku |
| `vraxia_get_costs` | Custos de IA por escopo (work/core) e período |
| `vraxia_get_logs` | Logs: scheduler, modo noturno, questionário |

## Resources

- `vraxia://vault/{filename}` — arquivos .md do vault (com listagem)
- `vraxia://applications/recent` — últimas 10 candidaturas
- `vraxia://stats/dashboard` — KPIs agregados

## Prompts

- `vraxia_hunt_briefing` — briefing executivo das vagas do dia/semana (injeta dados do SQLite)
- `vraxia_outreach_campaign` — campanha B2B de 3 emails no padrão VRASHOWS

## Arquitetura

```
src/
  config.ts            paths, .env, Anthropic client, sql.js, helpers safe()
  server.ts            buildServer() — registra tudo; stdio quando executado direto
  tools/               work · leads · vault · sense · observability
  resources/index.ts   vault file, recent applications, dashboard stats
  prompts/index.ts     hunt briefing, outreach campaign
  transport/
    stdio.ts           Claude Desktop
    sse.ts             Claude Code/web — GET /sse + POST /messages (porta 3002)
```

Princípios: nunca travar (todo handler embrulhado em `safe()` → `isError`),
leitura direta de dados (sem dependência dos outros pacotes), Haiku por padrão
(`MCP_MODEL` sobrescreve), logs em stderr (stdout é o canal MCP).
