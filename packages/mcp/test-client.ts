// Teste: conecta via stdio e lista tools/resources/prompts do VRAXIA MCP Server.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath, // node
    args: [path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(__dirname, 'src', 'server.ts')],
    cwd: __dirname,
  });

  const client = new Client({ name: 'vraxia-test', version: '0.0.1' });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log(`\nTOOLS (${tools.tools.length}):`);
  for (const t of tools.tools) console.log(`  - ${t.name}: ${(t.description ?? '').slice(0, 80)}...`);

  const resources = await client.listResources();
  console.log(`\nRESOURCES (${resources.resources.length}):`);
  for (const r of resources.resources.slice(0, 5)) console.log(`  - ${r.uri}`);

  const templates = await client.listResourceTemplates();
  console.log(`\nRESOURCE TEMPLATES (${templates.resourceTemplates.length}):`);
  for (const r of templates.resourceTemplates) console.log(`  - ${r.uriTemplate}`);

  const prompts = await client.listPrompts();
  console.log(`\nPROMPTS (${prompts.prompts.length}):`);
  for (const p of prompts.prompts) console.log(`  - ${p.name}: ${(p.description ?? '').slice(0, 70)}...`);

  // Smoke test de uma tool sem custo de API
  const stats = await client.callTool({ name: 'vraxia_work_stats', arguments: { period: 'all' } });
  const first = (stats.content as { type: string; text?: string }[])[0];
  console.log(`\nSMOKE TEST vraxia_work_stats:\n${(first?.text ?? '').slice(0, 400)}`);

  await client.close();
  console.log('\nOK — server funcional.');
}

main().catch(e => {
  console.error('FALHA:', e);
  process.exit(1);
});
