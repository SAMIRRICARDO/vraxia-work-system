// packages/mcp/src/transport/stdio.ts
// Transporte stdio explícito (Claude Desktop). Equivalente a rodar src/server.ts direto.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from '../server.js';

async function main(): Promise<void> {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
  console.error('[VRAXIA MCP] stdio transport ativo.');
}

main().catch(err => {
  console.error('[VRAXIA MCP] Erro fatal:', err);
  process.exit(1);
});
