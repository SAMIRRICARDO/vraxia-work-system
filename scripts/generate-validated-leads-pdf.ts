import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type LeadContext = {
  sourceFile?: string;
  company?: string;
  name?: string;
  role?: string;
  campaign?: string;
  previousStatus?: string;
};

type EmailResult = {
  email: string;
  domain?: string;
  mxHosts?: string[];
  checkedAt?: string;
  status: string;
  reason?: string;
  blockedByDoNotContact?: boolean;
  contexts?: LeadContext[];
};

type EmailReport = {
  _meta: {
    generatedAt: string;
    totalUniqueEmails: number;
    counts: Record<string, number>;
    smtpNoDataSent?: boolean;
    sourceFiles?: string[];
  };
  confirmedExists?: EmailResult[];
  deliverableCandidates?: EmailResult[];
  allResults?: EmailResult[];
};

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE_PATH = path.join(
  ROOT,
  "data",
  "leads",
  "validated",
  "all-leads-email-existence-report-2026-06-18.json",
);
const OUT_DIR = path.dirname(SOURCE_PATH);
const HTML_PATH = path.join(OUT_DIR, "all-leads-email-existence-report-2026-06-18.html");
const PDF_PATH = path.join(OUT_DIR, "all-leads-email-existence-report-2026-06-18.pdf");

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readReport(): EmailReport {
  return JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8").replace(/^\uFEFF/, "")) as EmailReport;
}

function unique(values: Array<string | undefined>): string {
  return Array.from(new Set(values.filter(Boolean))).join("; ");
}

function firstContext(result: EmailResult): LeadContext {
  return result.contexts?.[0] ?? {};
}

function sourceLabel(result: EmailResult): string {
  const sources = result.contexts?.map((context) => context.sourceFile) ?? [];
  return unique(sources);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed_exists: "Confirmado SMTP",
    valid_domain_only: "Dominio/MX valido",
    rejected: "Rejeitado SMTP",
    invalid_domain: "Dominio invalido",
    invalid_syntax: "Sintaxe invalida",
    blocked: "Bloqueado",
    inconclusive: "Inconclusivo",
  };
  return labels[status] ?? status;
}

function row(result: EmailResult, index: number): string {
  const context = firstContext(result);
  const mxHosts = (result.mxHosts ?? []).slice(0, 3).join(", ");
  return `
    <tr>
      <td class="num">${index + 1}</td>
      <td><strong>${esc(context.company || "-")}</strong></td>
      <td>${esc(context.name || "-")}</td>
      <td>${esc(context.role || "-")}</td>
      <td class="email">${esc(result.email)}</td>
      <td>${esc(statusLabel(result.status))}</td>
      <td>${esc(context.previousStatus || "-")}</td>
      <td class="small">${esc(mxHosts || "-")}</td>
      <td class="small">${esc(sourceLabel(result) || "-")}</td>
    </tr>`;
}

function statCard(label: string, value: number | string, className = ""): string {
  return `
    <div class="stat ${className}">
      <div class="stat-value">${esc(value)}</div>
      <div class="stat-label">${esc(label)}</div>
    </div>`;
}

const report = readReport();
const confirmed = report.confirmedExists ?? [];
const candidates = report.deliverableCandidates ?? [];
const counts = report._meta.counts ?? {};
const generatedAt = new Date(report._meta.generatedAt).toLocaleString("pt-BR", {
  timeZone: "America/Sao_Paulo",
});
const pdfGeneratedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const sourceCount = report._meta.sourceFiles?.length ?? 0;

const primaryRows = [...confirmed, ...candidates].map(row).join("");
const blocked = counts.blocked ?? 0;
const invalid = (counts.invalid_domain ?? 0) + (counts.invalid_syntax ?? 0);
const inconclusive = counts.inconclusive ?? 0;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Arial, sans-serif;
    color: #18202f;
    background: #fff;
    font-size: 10px;
  }
  .page { padding: 26px 30px; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #172033;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: .5px; color: #172033; }
  .subtitle { margin-top: 3px; color: #62708a; font-size: 10px; text-transform: uppercase; letter-spacing: .7px; }
  .meta { text-align: right; line-height: 1.45; color: #62708a; }
  .meta strong { color: #18202f; }
  .stats { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 14px 0 16px; }
  .stat { border: 1px solid #dfe5ef; border-radius: 6px; padding: 9px 10px; background: #f8fafc; min-height: 54px; }
  .stat-value { font-size: 18px; font-weight: 800; color: #172033; line-height: 1; }
  .stat-label { color: #62708a; margin-top: 5px; text-transform: uppercase; letter-spacing: .4px; font-size: 8px; }
  .good .stat-value { color: #087f5b; }
  .warn .stat-value { color: #b7791f; }
  .bad .stat-value { color: #c53030; }
  .note {
    border-left: 3px solid #2b6cb0;
    background: #eff6ff;
    color: #1e3a5f;
    padding: 9px 12px;
    margin: 10px 0 16px;
    line-height: 1.45;
  }
  h1 { font-size: 12px; text-transform: uppercase; letter-spacing: .5px; margin: 14px 0 8px; color: #172033; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th {
    background: #172033;
    color: #fff;
    font-size: 8px;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: .4px;
    padding: 6px 6px;
  }
  td {
    border-bottom: 1px solid #edf1f7;
    padding: 5px 6px;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  tbody tr:nth-child(even) { background: #fbfcfe; }
  .num { width: 28px; color: #718096; text-align: right; }
  .email { font-family: Consolas, "Courier New", monospace; color: #1f5f99; font-size: 9px; }
  .small { font-size: 8px; color: #59677c; }
  .footer {
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid #dfe5ef;
    color: #718096;
    font-size: 8px;
  }
  @page { size: A4 landscape; margin: 0; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">VRASHOWS / IALEADS</div>
      <div class="subtitle">Relatorio de leads com emails validados</div>
    </div>
    <div class="meta">
      <div><strong>Fonte:</strong> ${esc(path.relative(ROOT, SOURCE_PATH))}</div>
      <div><strong>Relatorio base:</strong> ${esc(generatedAt)}</div>
      <div><strong>PDF gerado:</strong> ${esc(pdfGeneratedAt)}</div>
      <div><strong>Arquivos analisados:</strong> ${esc(sourceCount)}</div>
    </div>
  </div>

  <div class="stats">
    ${statCard("Emails unicos", report._meta.totalUniqueEmails)}
    ${statCard("Confirmados SMTP", confirmed.length, "good")}
    ${statCard("Dominio/MX valido", candidates.length, "good")}
    ${statCard("Bloqueados", blocked, "warn")}
    ${statCard("Invalidos", invalid, "bad")}
    ${statCard("Inconclusivos", inconclusive, "warn")}
    ${statCard("No PDF", confirmed.length + candidates.length)}
  </div>

  <div class="note">
    Criterio deste PDF: inclui emails com mailbox confirmado por SMTP RCPT e emails com dominio/MX valido fora da blocklist.
    O relatorio base nao enviou mensagem: usou RCPT TO apenas e nao executou DATA. Muitos servidores corporativos bloqueiam validacao SMTP,
    portanto "Dominio/MX valido" e candidato de entregabilidade, nao prova absoluta de existencia da caixa postal.
  </div>

  <h1>Emails validados para entregabilidade</h1>
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th style="width:120px">Empresa</th>
        <th style="width:130px">Nome</th>
        <th style="width:180px">Cargo</th>
        <th style="width:190px">Email</th>
        <th style="width:96px">Status</th>
        <th style="width:76px">Status ant.</th>
        <th style="width:190px">MX hosts</th>
        <th>Origem</th>
      </tr>
    </thead>
    <tbody>${primaryRows}</tbody>
  </table>

  <div class="footer">
    <span>IALEADS Runtime - cheap mode / sem envio de email neste processo</span>
    <span>Total listado: ${confirmed.length + candidates.length}</span>
  </div>
</div>
</body>
</html>`;

fs.writeFileSync(HTML_PATH, html, "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file:///${HTML_PATH.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.pdf({
  path: PDF_PATH,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

console.log(`PDF gerado: ${PDF_PATH}`);
console.log(`HTML gerado: ${HTML_PATH}`);
console.log(`Listados: ${confirmed.length + candidates.length}`);
