# Check Database Status Script
# This script checks if the database migrations have been applied

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$ServiceRoleKey
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
}

$issues = @()
$checks = @()

# Check 1: Can we access the auth.users table?
Write-Host "Checking auth schema..." -ForegroundColor Yellow
try {
    $listUsersUrl = "$SupabaseUrl/auth/v1/admin/users?per_page=1"
    $response = Invoke-RestMethod -Uri $listUsersUrl -Method Get -Headers $headers -ErrorAction Stop
    $checks += @{Name="Auth API Access"; Status="OK"; Message="Can access auth.users table"}
    Write-Host "  [OK] Auth API is accessible" -ForegroundColor Green
} catch {
    $errorDetails = $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message
    }
    $checks += @{Name="Auth API Access"; Status="FAILED"; Message=$errorDetails}
    $issues += "Cannot access auth.users table: $errorDetails"
    Write-Host "  [FAILED] Auth API is not accessible: $errorDetails" -ForegroundColor Red
}

# Check 2: Can we access the profiles table?
Write-Host "Checking profiles table..." -ForegroundColor Yellow
try {
    $profilesUrl = "$SupabaseUrl/rest/v1/profiles?select=user_id`&limit=1"
    $response = Invoke-RestMethod -Uri $profilesUrl -Method Get -Headers $headers -ErrorAction Stop
    $checks += @{Name="Profiles Table"; Status="OK"; Message="Can access profiles table"}
    Write-Host "  [OK] Profiles table is accessible" -ForegroundColor Green
} catch {
    $errorDetails = $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message
    }
    $checks += @{Name="Profiles Table"; Status="FAILED"; Message=$errorDetails}
    $issues += "Cannot access profiles table: $errorDetails"
    Write-Host "  [FAILED] Profiles table is not accessible: $errorDetails" -ForegroundColor Red
}

# Check 3: Can we access platform_settings table?
Write-Host "Checking platform_settings table..." -ForegroundColor Yellow
try {
    $settingsUrl = "$SupabaseUrl/rest/v1/platform_settings?select=key`&limit=1"
    $response = Invoke-RestMethod -Uri $settingsUrl -Method Get -Headers $headers -ErrorAction Stop
    $checks += @{Name="Platform Settings Table"; Status="OK"; Message="Can access platform_settings table"}
    Write-Host "  [OK] Platform settings table is accessible" -ForegroundColor Green
} catch {
    $errorDetails = $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message
    }
    $checks += @{Name="Platform Settings Table"; Status="FAILED"; Message=$errorDetails}
    $issues += "Cannot access platform_settings table: $errorDetails"
    Write-Host "  [FAILED] Platform settings table is not accessible: $errorDetails" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($check in $checks) {
    $statusColor = if ($check.Status -eq "OK") { "Green" } else { "Red" }
    Write-Host "$($check.Name): " -NoNewline
    Write-Host $check.Status -ForegroundColor $statusColor
    if ($check.Message) {
        Write-Host "  -> $($check.Message)" -ForegroundColor Gray
    }
}

Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "[SUCCESS] All database checks passed! The database schema appears to be set up correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the rebuild-admin-user script:" -ForegroundColor Yellow
    Write-Host "  .\scripts\rebuild-admin-user.ps1 -SupabaseUrl $SupabaseUrl -ServiceRoleKey YOUR_KEY" -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Database issues detected!" -ForegroundColor Red
    Write-Host ""
    Write-Host "The following issues were found:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Solution: Apply Database Migrations" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You need to apply the database migrations before creating an admin user." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Using Supabase Dashboard (Recommended)" -ForegroundColor Green
    Write-Host "  1. Go to https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "  2. Select your project" -ForegroundColor White
    Write-Host "  3. Go to SQL Editor" -ForegroundColor White
    Write-Host "  4. Run each migration file in order from supabase/migrations/:" -ForegroundColor White
    Write-Host "     - 00001_initial_setup.sql" -ForegroundColor Cyan
    Write-Host "     - 00002_security_and_indexes.sql" -ForegroundColor Cyan
    Write-Host "     - 00003_initial_data.sql" -ForegroundColor Cyan
    Write-Host "     - 00004_functions_and_triggers.sql" -ForegroundColor Cyan
    Write-Host "     - 00008_add_profile_insert_policy.sql" -ForegroundColor Cyan
    Write-Host "     - 00009_add_user_profile_fk.sql" -ForegroundColor Cyan
    Write-Host "     - 00010_add_profile_completion_fields.sql" -ForegroundColor Cyan
    Write-Host "     - 00011_ensure_admin_user.sql" -ForegroundColor Cyan
    Write-Host "     - 00012_add_public_read_platform_settings.sql" -ForegroundColor Cyan
    Write-Host "     - 00013_fix_profile_insert_trigger.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 2: Using Supabase CLI" -ForegroundColor Green
    Write-Host "  .\scripts\apply_migrations.ps1 -ProjectRef qxtnwlpjnsntsjtgeybp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After applying migrations, run this check script again to verify." -ForegroundColor Yellow
}

