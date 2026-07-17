# ══════════════════════════════════════════════════════════════════════════════
# VRAXIA WORK — Startup Script
# Inicia servidor + Desktop Agent automaticamente
# ══════════════════════════════════════════════════════════════════════════════

$WorkDir  = $PSScriptRoot
$RdaToken = "2ec0688b-dea5-4fc9-a909-5091c54f9236-35dc982f-db2d-46ce-8b1d-98b4edd1f8ce"
$Port     = 3001

# ── Matar processos antigos na porta 3001 ─────────────────────────────────────
Write-Host "[START] Verificando porta $Port..." -ForegroundColor Cyan
$pids = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess
foreach ($p in ($pids | Sort-Object -Unique)) {
    if ($p -gt 0) {
        Write-Host "[START] Matando processo PID $p na porta $Port" -ForegroundColor Yellow
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Milliseconds 800

# ── Iniciar servidor em janela separada ───────────────────────────────────────
Write-Host "[START] Iniciando servidor VRAXIA WORK..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$WorkDir'; `$host.UI.RawUI.WindowTitle = 'VRAXIA SERVER'; npx tsx src/api/server.ts"
) -WindowStyle Normal

# Aguarda servidor subir
Write-Host "[START] Aguardando servidor iniciar..." -ForegroundColor Cyan
$maxWait = 20
$started = $false
for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 1
    $listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listen) { $started = $true; break }
    Write-Host "  aguardando... ($($i+1)s)" -ForegroundColor DarkGray
}

if (-not $started) {
    Write-Host "[START] ERRO: Servidor não subiu em ${maxWait}s" -ForegroundColor Red
    exit 1
}
Write-Host "[START] Servidor online em http://localhost:$Port/work" -ForegroundColor Green

# ── Iniciar Desktop Agent em janela separada ──────────────────────────────────
Write-Host "[START] Iniciando Desktop Agent..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$WorkDir'; `$host.UI.RawUI.WindowTitle = 'VRAXIA AGENT'; npx tsx src/remote-dev/agent/desktop-agent.ts --token $RdaToken"
) -WindowStyle Normal

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host " VRAXIA WORK — Serviços iniciados" -ForegroundColor Cyan
Write-Host "  Dashboard : http://localhost:$Port/work" -ForegroundColor White
Write-Host "  RDA API   : http://localhost:$Port/api/rda" -ForegroundColor White
Write-Host "  Agent     : Minha Maquina (conectando...)" -ForegroundColor White
Write-Host "════════════════════════════════════════" -ForegroundColor DarkCyan
