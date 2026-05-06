#Requires -Version 5.1
<#
.DESCRIPTION
  Runs supabase-nuke-public-schema.sql against your database.
  Deletes ALL tables/views/functions in schema "public" only.

.PARAMETER DatabaseUrl
  Postgres connection URI (postgresql://postgres.[ref]:password@...) from
  Dashboard → Database → Connection string.

.EXAMPLE
  .\scripts\supabase-nuke-public.ps1 -DatabaseUrl $env:DATABASE_URL
#>
param(
  [Parameter(Mandatory = $false)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlPath = Join-Path $scriptRoot "supabase-nuke-public-schema.sql"

if (-not (Test-Path $sqlPath)) {
  Write-Error "Missing SQL file: $sqlPath"
}

if (-not $DatabaseUrl) {
  $DatabaseUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
}

if (-not $DatabaseUrl) {
  Write-Error @"
No connection string provided.

Dashboard → Settings → Database → URI (postgresql://...)
Then either:
  `$env:DATABASE_URL = '<paste uri>'
  .\scripts\supabase-nuke-public.ps1

Or pass -DatabaseUrl 'postgresql://...'
"@
}

$confirm = Read-Host "TYPE DELETE to erase all objects in schema public"
if ($confirm -ne "DELETE") {
  Write-Host "Aborted." -ForegroundColor Yellow
  exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Error "psql not found. Install PostgreSQL client tools or add psql to PATH."
}

Write-Host "Executing $sqlPath ..." -ForegroundColor Red
& psql $DatabaseUrl -v ON_ERROR_STOP=1 -f $sqlPath
if ($LASTEXITCODE -ne 0) {
  Write-Error "psql exited with code $LASTEXITCODE"
}

Write-Host "Done. Re-apply migrations: npx supabase db push --linked or your usual workflow." -ForegroundColor Cyan
