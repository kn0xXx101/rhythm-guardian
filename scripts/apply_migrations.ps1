Param(
  [Parameter(Mandatory=$false)]
  [string]$ProjectRef,
  [Parameter(Mandatory=$false)]
  [string]$AccessToken,
  [Parameter(Mandatory=$false)]
  [string]$DbUrl
)

function Exec($cmd) {
  Write-Host "→ $cmd" -ForegroundColor Cyan
  $proc = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command $cmd" -NoNewWindow -PassThru -Wait
  if ($proc.ExitCode -ne 0) {
    throw "Command failed with exit code $($proc.ExitCode): $cmd"
  }
}

Write-Host "Starting Supabase database migration..." -ForegroundColor Green

# Ensure we run from repo root
$repoRoot = Split-Path -Parent $PSCommandPath
Set-Location (Split-Path -Parent $repoRoot)

# Validate migrations directory exists
$migrationsDir = Join-Path (Get-Location) "supabase/migrations"
if (-not (Test-Path $migrationsDir)) {
  throw "Migrations directory not found at '$migrationsDir'"
}

# Optional: Login if token provided (avoids interactive prompts)
if ($AccessToken -and $AccessToken.Trim().Length -gt 0) {
  Exec "npx supabase login --token `"$AccessToken`""
}

# Either link to project by ref or use a direct DB URL
if ($DbUrl -and $DbUrl.Trim().Length -gt 0) {
  Write-Host "Using provided database URL for migration." -ForegroundColor Yellow
  Exec "npx supabase db push --db-url `"$DbUrl`""
}
else {
  if (-not ($ProjectRef -and $ProjectRef.Trim().Length -gt 0)) {
    throw "ProjectRef is required when DbUrl is not provided."
  }
  Exec "npx supabase link --project-ref `"$ProjectRef`""
  Exec "npx supabase db push"
}

Write-Host "Migration completed successfully." -ForegroundColor Green