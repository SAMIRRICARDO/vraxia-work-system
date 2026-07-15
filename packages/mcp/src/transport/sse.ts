// packages/mcp/src/transport/sse.ts
// Transporte SSE via HTTP (Claude Code, web). Uso: npx tsx src/transport/sse.ts --port 3002
// Endpoints: GET /sse (stream) + POST /messages?sessionId=... (mensagens do cliente)

import express from 'express';
import type { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { buildServer } from '../server.js';

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? parseInt(process.argv[portArg + 1], 10) : 3002;

const app = express();
const transports = new Map<string, SSEServerTransport>();

app.get('/sse', async (_req: Request, res: Response) => {
  try {
    const transport = new SSEServerTransport('/messages', res);
    transports.set(transport.sessionId, transport);
    res.on('close', () => transports.delete(transport.sessionId));

    const server = buildServer();
    await server.connect(transport);
    console.error(`[VRAXIA MCP] Sessão SSE conectada: ${transport.sessionId}`);
  } catch (err) {
    console.error('[VRAXIA MCP] Erro ao conectar SSE:', err);
    if (!res.headersSent) res.status(500).end();
  }
});

app.post('/messages', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.query['sessionId'] ?? '');
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Sessão não encontrada: ${sessionId}` });
      return;
    }
    await transport.handlePostMessage(req, res);
  } catch (err) {
    console.error('[VRAXIA MCP] Erro em /messages:', err);
    if (!res.headersSent) res.status(500).json({ error: String(err) });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', server: 'vraxia-mcp', sessions: transports.size });
});

app.listen(PORT, () => {
  console.error(`[VRAXIA MCP] SSE transport ativo em http://localhost:${PORT}/sse`);
  console.error(`[VRAXIA MCP] Adicione no Claude Code: claude mcp add --transport sse vraxia http://localhost:${PORT}/sse`);
});
