// packages/mcp/src/server.ts
// VRAXIA MCP Server — expõe os agentes VRAXIA como tools/resources/prompts MCP.
// Executado diretamente: conecta via stdio (Claude Desktop).
// Para SSE (Claude Code/web): npx tsx src/transport/sse.ts --port 3002

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'url';
import { registerWorkTools } from './tools/work.js';
import { registerLeadsTools } from './tools/leads.js';
import { registerVaultTools } from './tools/vault.js';
import { registerSenseTools } from './tools/sense.js';
import { registerObservabilityTools } from './tools/observability.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export function buildServer(): McpServer {
  const server = new McpServer({
    name: 'vraxia',
    version: '0.1.0',
  });

  registerWorkTools(server);
  registerLeadsTools(server);
  registerVaultTools(server);
  registerSenseTools(server);
  registerObservabilityTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout é o canal MCP — logs vão para stderr
  console.error('[VRAXIA MCP] Server conectado via stdio.');
}

// Roda main() apenas quando executado diretamente (não quando importado pelo SSE)
const isDirectRun = process.argv[1] && path_eq(process.argv[1], fileURLToPath(import.meta.url));

function path_eq(a: string, b: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
  return norm(a) === norm(b);
}

if (isDirectRun) {
  main().catch(err => {
    console.error('[VRAXIA MCP] Erro fatal:', err);
    process.exit(1);
  });
}
