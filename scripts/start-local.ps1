param(
    [switch]$WithFrontend,
    [switch]$SkipSupabaseStart,
    [switch]$ResetSupabaseContainers,
    [switch]$SkipDbPush
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

function Reset-SupabaseEnvironment {
    param(
        [string]$ProjectName
    )

    Write-Step "Resetting Supabase containers for project '$ProjectName'"
    try {
        supabase stop 2>$null | Out-Null
    } catch {
        Write-Warn "supabase stop reported an error: $($_.Exception.Message)"
    }

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warn "Docker CLI not found; cannot remove stale Supabase containers automatically."
        return
    }

    try {
        $containerList = docker ps -a --filter "label=com.supabase.cli.project=$ProjectName" --format "{{.ID}}"
        if ($LASTEXITCODE -ne 0) {
            throw "docker ps exited with code $LASTEXITCODE"
        }
        $containers = $containerList -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
        if ($containers.Count -eq 0) {
            Write-Step "No leftover containers detected for '$ProjectName'."
            return
        }
        Write-Step "Removing $($containers.Count) leftover Supabase container(s)."
        docker rm -f @containers | Out-Null
    } catch {
        Write-Warn "Failed to prune Supabase containers: $($_.Exception.Message)"
    }
}

$shellCommand = Get-Command pwsh -ErrorAction SilentlyContinue
if ($shellCommand) {
    $shellPath = $shellCommand.Source
    Write-Step "Using pwsh ($shellPath) for spawned terminals."
} else {
    $shellPath = (Get-Command powershell -ErrorAction Stop).Source
    Write-Warn "PowerShell 7 (pwsh) not found on PATH. Falling back to Windows PowerShell.`n    Tip: run ``powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1 -WithFrontend``"
}

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Write-Step "Loading environment variables from $Path"
    Get-Content $Path | ForEach-Object {
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
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot
$projectName = Split-Path $repoRoot -Leaf

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

Import-DotEnv -Path $envFile

$apiEnvFile = Join-Path $repoRoot "apps/api/.env"
Import-DotEnv -Path $apiEnvFile

# Supabase Edge Functions read secrets out of the process env. Load supabase/.env so OPENROUTER/OpenAI keys
# are available before we run `supabase start` or `supabase functions serve`.
$supabaseEnvFile = Join-Path $repoRoot "supabase/.env"
Import-DotEnv -Path $supabaseEnvFile

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

    if (-not $supabaseRunning -or $ResetSupabaseContainers) {
        Reset-SupabaseEnvironment -ProjectName $projectName
        if ($ResetSupabaseContainers) {
            $supabaseRunning = $false
        }
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

if (-not $SkipDbPush) {
    Write-Step "Applying pending Supabase migrations (supabase db push)"
    try {
        supabase db push
        if ($LASTEXITCODE -ne 0) {
            throw "supabase db push failed with exit code $LASTEXITCODE"
        }
    } catch {
        throw "Unable to apply database migrations: $($_.Exception.Message)"
    }
} else {
    Write-Warn "Skipping Supabase db push (per -SkipDbPush)"
}

Write-Step "Launching Edge Function: chat"
$functionCommand = "cd `"$repoRoot`"; supabase functions serve chat --no-verify-jwt --watch --env-file `"$envFile`""
Start-Process $shellPath -ArgumentList "-NoExit", "-Command", $functionCommand | Out-Null

Write-Step "Launching Edge Function: mentor-overrides"
$mentorOverridesCommand = "cd `"$repoRoot`"; supabase functions serve mentor-overrides --no-verify-jwt --watch --env-file `"$envFile`""
Start-Process $shellPath -ArgumentList "-NoExit", "-Command", $mentorOverridesCommand | Out-Null

Write-Step "Launching Edge Function: chat-models"
$chatModelsCommand = "cd `"$repoRoot`"; supabase functions serve chat-models --no-verify-jwt --watch --env-file `"$envFile`""
Start-Process $shellPath -ArgumentList "-NoExit", "-Command", $chatModelsCommand | Out-Null

if ($WithFrontend) {
    Write-Step "Launching frontend dev server on http://127.0.0.1:5173/"
    $frontendCommand = "cd `"$repoRoot`"; pnpm --filter @polychat/web dev -- --host 127.0.0.1"
    Start-Process $shellPath -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null
}

Write-Step "Finished. Check the opened terminals for live logs."
