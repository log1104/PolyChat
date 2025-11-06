param(
    [switch]$WithFrontend,
    [switch]$SkipSupabaseStart
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Warn {
    param([string]$Message)
    Write-Host "!!  $Message" -ForegroundColor Yellow
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    throw "Supabase CLI not found. Install it before running this script."
}

if ($WithFrontend -and -not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "pnpm is required to launch the frontend. Install it or rerun without -WithFrontend."
}

$envFile = Join-Path $repoRoot ".env"
if (-not (Test-Path $envFile)) {
    throw "Missing .env file at $envFile."
}

Write-Step "Loading environment variables from .env"
Get-Content $envFile | ForEach-Object {
    if (-not $_) { return }
    if ($_.StartsWith("#")) { return }
    $parts = $_ -split "=", 2
    if ($parts.Length -ne 2) { return }
    $name = $parts[0].Trim()
    if (-not $name) { return }
    $value = $parts[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

if (-not $env:OPENROUTER_API_KEY -and -not $env:OPENAI_API_KEY) {
    Write-Warn "OPENROUTER_API_KEY or OPENAI_API_KEY is not set. The chat function will return 500 responses."
}

if (-not $SkipSupabaseStart) {
    Write-Step "Ensuring Supabase stack is running"
    $supabaseRunning = $false
    try {
        $statusOutput = supabase status --output json 2>$null
        if ($LASTEXITCODE -eq 0 -and $statusOutput) {
            $status = $statusOutput | ConvertFrom-Json
            if ($status.state -eq "running") {
                $supabaseRunning = $true
            }
        }
    } catch {
        $supabaseRunning = $false
    }

    if (-not $supabaseRunning) {
        Write-Step "Starting Supabase containers (this may take a minute)"
        supabase start
        if ($LASTEXITCODE -ne 0) {
            throw "supabase start failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Step "Supabase containers already running"
    }
} else {
    Write-Warn "Skipping Supabase start (per -SkipSupabaseStart)"
}

Write-Step "Launching Edge Function: chat"
$functionCommand = "cd `"$repoRoot`"; supabase functions serve chat --no-verify-jwt"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", $functionCommand | Out-Null

if ($WithFrontend) {
    Write-Step "Launching frontend dev server on http://127.0.0.1:5173/"
    $frontendCommand = "cd `"$repoRoot`"; pnpm --filter @polychat/web dev -- --host 127.0.0.1"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null
}

Write-Step "Finished. Check the opened terminals for live logs."
