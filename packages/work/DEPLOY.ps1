# VRAXIA WORK — Deploy Diário do Dashboard
# Faz deploy do dashboard para Vercel todos os dias às 20h.
# Uso: powershell -ExecutionPolicy Bypass -File DEPLOY.ps1

$ErrorActionPreference = "Continue"

$RootDir     = "C:\AI-LAB\ai-cognitive-runtime"
$WorkDir     = "$RootDir\packages\work"
$DashDir     = "$WorkDir\dashboard"
$DataDir     = "$WorkDir\.vraxia-work"
$LogFile     = "$DataDir\deploy.log"

New-Item -ItemType Directory -Force $DataDir | Out-Null

function Log {
    param([string]$Msg, [string]$Color = "White")
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg"
    Write-Host $line -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

# ── Carregar .env ─────────────────────────────────────────────────────────────
foreach ($envPath in @("$RootDir\.env", "$WorkDir\.env")) {
    if (-not (Test-Path $envPath)) { continue }
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $k = $Matches[1]; $v = $Matches[2].Trim('"').Trim("'").Trim()
            if ($k -and -not [System.Environment]::GetEnvironmentVariable($k, 'Process')) {
                [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
            }
        }
    }
}

# ── Telegram ──────────────────────────────────────────────────────────────────
function Send-Telegram {
    param([string]$Text)
    $token = $env:TELEGRAM_BOT_TOKEN
    $chat  = $env:TELEGRAM_CHAT_ID
    if (-not $token -or -not $chat) { return }
    try {
        $body = @{ chat_id = $chat; text = $Text; parse_mode = "HTML" } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" `
            -Method POST -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
    } catch {
        Log "WARN Telegram: $_" Yellow
    }
}

# ── Deploy ────────────────────────────────────────────────────────────────────
Log "" White
Log "╔══════════════════════════════════════════╗" Cyan
Log "║   VRAXIA WORK — DEPLOY DASHBOARD         ║" Cyan
Log "╚══════════════════════════════════════════╝" Cyan

$vercelPath = (Get-Command vercel -ErrorAction SilentlyContinue).Source
if (-not $vercelPath) {
    foreach ($p in @("$env:APPDATA\npm\vercel.cmd", "$env:APPDATA\npm\vercel")) {
        if (Test-Path $p) { $vercelPath = $p; break }
    }
}
if (-not $vercelPath) {
    Log "ERRO: vercel CLI não encontrado no PATH." Red
    Send-Telegram "❌ <b>VRAXIA DEPLOY — Falhou</b>`nvercel CLI não encontrado."
    exit 1
}

Log "Dashboard dir: $DashDir" White
Log "Iniciando deploy para Vercel..." Cyan

$start  = Get-Date
Push-Location $DashDir
try {
    $output = & $vercelPath --prod --yes 2>&1
    $code   = $LASTEXITCODE
} finally {
    Pop-Location
}
$dur = [int]((Get-Date) - $start).TotalSeconds

foreach ($line in $output) { Log "$line" White }

if ($code -eq 0) {
    # Extrai URL do output do vercel
    $url = ($output | Select-String -Pattern 'https://\S+\.vercel\.app') |
           Select-Object -Last 1 | ForEach-Object { $_.Matches[0].Value }
    if (-not $url) { $url = "https://vraxia-platform.vercel.app" }

    Log "Deploy concluído em ${dur}s — $url" Green
    Send-Telegram "✅ <b>VRAXIA DEPLOY — Dashboard atualizado!</b>`n🔗 $url`n⏱ ${dur}s`n🕐 $(Get-Date -Format 'HH:mm dd/MM')"
} else {
    Log "ERRO: Deploy falhou (exit $code, ${dur}s)." Red
    $errLines = ($output | Select-Object -Last 5) -join "`n"
    Send-Telegram "❌ <b>VRAXIA DEPLOY — Falhou!</b>`nExit: $code`n<code>$errLines</code>"
    exit $code
}
