# Rebuild Admin User Script
# This script uses the Supabase Admin API to create/update the admin user

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$ServiceRoleKey,
    
    [string]$AdminEmail = "gregory.manasseh@outlook.com",
    [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

Write-Host "Rebuilding admin user..." -ForegroundColor Green
Write-Host "Email: $AdminEmail" -ForegroundColor Cyan

# Set up headers for API calls
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
}

# Step 1: Delete existing admin user if it exists
Write-Host "`nStep 1: Checking for existing admin user..." -ForegroundColor Yellow

$listUsersUrl = "$SupabaseUrl/auth/v1/admin/users?per_page=1000"
$headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
}

try {
    $usersResponse = Invoke-RestMethod -Uri $listUsersUrl -Method Get -Headers $headers -ErrorAction Stop
    $adminUser = $usersResponse.users | Where-Object { $_.email -eq $AdminEmail }
    
    if ($adminUser) {
        Write-Host "Found existing admin user, deleting..." -ForegroundColor Yellow
        $deleteUrl = "$SupabaseUrl/auth/v1/admin/users/$($adminUser.id)"
        Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $headers -ErrorAction Stop
        Write-Host "Existing admin user deleted." -ForegroundColor Green
    } else {
        Write-Host "No existing admin user found." -ForegroundColor Green
    }
} catch {
    $errorMessage = $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        $errorMessage += "`nDetails: $($_.ErrorDetails.Message)"
    }
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $errorMessage += "`nResponse: $responseBody"
        } catch {
            $errorMessage += "`nCould not read response: $($_.Exception.Message)"
        }
    }
    Write-Host "Error checking/deleting existing user: $errorMessage" -ForegroundColor Red
    Write-Host "Continuing with user creation..." -ForegroundColor Yellow
}

# Step 2: Create new admin user
Write-Host "`nStep 2: Creating new admin user..." -ForegroundColor Yellow

$createUserUrl = "$SupabaseUrl/auth/v1/admin/users"
$userBody = @{
    email = $AdminEmail
    password = $AdminPassword
    email_confirm = $true
    user_metadata = @{
        name = "System Administrator"
        full_name = "System Administrator"
    }
    app_metadata = @{
        provider = "email"
        providers = @("email")
        role = "admin"
        status = "active"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    Write-Host "Request URL: $createUserUrl" -ForegroundColor Gray
    
    $createResponse = Invoke-RestMethod -Uri $createUserUrl -Method Post -Headers $headers -Body $userBody -ErrorAction Stop
    $adminUserId = $createResponse.id
    Write-Host "Admin user created successfully with ID: $adminUserId" -ForegroundColor Green
} catch {
    $errorMessage = $_.Exception.Message
    $responseBody = ""
    
    if ($_.ErrorDetails.Message) {
        $errorMessage += "`nDetails: $($_.ErrorDetails.Message)"
    }
    
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $errorMessage += "`nResponse Body: $responseBody"
        } catch {
            $errorMessage += "`nCould not read response body: $($_.Exception.Message)"
        }
    }
    
    Write-Host "Error creating admin user: $errorMessage" -ForegroundColor Red
    
    # Try alternative: Use signup endpoint then update via admin API
    Write-Host "`nTrying alternative method..." -ForegroundColor Yellow
    try {
        # First try signup
        $signupUrl = "$SupabaseUrl/auth/v1/signup"
        $signupBody = @{
            email = $AdminEmail
            password = $AdminPassword
            data = @{
                name = "System Administrator"
                full_name = "System Administrator"
            }
        } | ConvertTo-Json -Depth 10 -Compress
        
        $signupResponse = Invoke-RestMethod -Uri $signupUrl -Method Post -Headers $headers -Body $signupBody -ErrorAction Stop
        $adminUserId = $signupResponse.user.id
        Write-Host "User created via signup endpoint with ID: $adminUserId" -ForegroundColor Green
        
        # Update app_metadata to set admin role
        $updateUrl = "$SupabaseUrl/auth/v1/admin/users/$adminUserId"
        $updateBody = @{
            app_metadata = @{
                provider = "email"
                providers = @("email")
                role = "admin"
                status = "active"
            }
        } | ConvertTo-Json -Depth 10 -Compress
        
        Invoke-RestMethod -Uri $updateUrl -Method Put -Headers $headers -Body $updateBody -ErrorAction Stop
        Write-Host "User metadata updated to admin role." -ForegroundColor Green
    } catch {
        Write-Host "Alternative method also failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $altResponseBody = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                Write-Host "Alternative response: $altResponseBody" -ForegroundColor Red
            } catch {}
        }
        Write-Host "`nPlease check:" -ForegroundColor Yellow
        Write-Host "1. Service role key is correct and complete" -ForegroundColor Yellow
        Write-Host "2. Supabase project is active" -ForegroundColor Yellow
        Write-Host "3. Admin API is enabled in your Supabase project" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Create admin profile in database
Write-Host "`nStep 3: Creating admin profile in database..." -ForegroundColor Yellow

$profileUrl = "$SupabaseUrl/rest/v1/profiles"
$profileHeaders = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$profileBody = @{
    user_id = $adminUserId
    full_name = "System Administrator"
    role = "admin"
    status = "active"
    email_verified = $true
    phone_verified = $false
    bio = "System administrator account for Rhythm Guardian platform"
    profile_complete = $true
    documents_submitted = $false
    documents_verified = $false
    profile_completion_percentage = 100
    required_documents = @()
} | ConvertTo-Json -Depth 10

try {
    $profileResponse = Invoke-RestMethod -Uri $profileUrl -Method Post -Headers $profileHeaders -Body $profileBody
    Write-Host "Admin profile created successfully." -ForegroundColor Green
} catch {
    Write-Host "Error creating admin profile: $_" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    # Try to update if it already exists
    Write-Host "Attempting to update existing profile..." -ForegroundColor Yellow
    try {
        $updateUrl = "$profileUrl?user_id=eq.$adminUserId"
        Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $profileHeaders -Body $profileBody
        Write-Host "Admin profile updated successfully." -ForegroundColor Green
    } catch {
        Write-Host "Error updating profile: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Create admin user settings
Write-Host "`nStep 4: Creating admin user settings..." -ForegroundColor Yellow

$settingsUrl = "$SupabaseUrl/rest/v1/user_settings"
$settingsBody = @{
    user_id = $adminUserId
    email_notifications = $true
    push_notifications = $true
    booking_reminders = $true
    message_notifications = $true
    review_notifications = $true
    marketing_emails = $false
    timezone = "UTC"
    language = "en"
} | ConvertTo-Json -Depth 10

try {
    $settingsResponse = Invoke-RestMethod -Uri $settingsUrl -Method Post -Headers $profileHeaders -Body $settingsBody
    Write-Host "Admin user settings created successfully." -ForegroundColor Green
} catch {
    Write-Host "Error creating user settings: $_" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    # Try to update if it already exists
    Write-Host "Attempting to update existing settings..." -ForegroundColor Yellow
    try {
        $updateSettingsUrl = "$settingsUrl?user_id=eq.$adminUserId"
        Invoke-RestMethod -Uri $updateSettingsUrl -Method Patch -Headers $profileHeaders -Body $settingsBody
        Write-Host "Admin user settings updated successfully." -ForegroundColor Green
    } catch {
        Write-Host "Error updating settings: $_" -ForegroundColor Red
        # Settings are optional, so don't fail
    }
}

# Step 5: Verify the admin user
Write-Host "`nStep 5: Verifying admin user setup..." -ForegroundColor Yellow

try {
    $verifyUrl = "$SupabaseUrl/rest/v1/profiles?user_id=eq.$adminUserId&select=*"
    $verifyResponse = Invoke-RestMethod -Uri $verifyUrl -Method Get -Headers $profileHeaders
    
    if ($verifyResponse -and $verifyResponse.Count -gt 0) {
        $profile = $verifyResponse[0]
        Write-Host "Verification successful!" -ForegroundColor Green
        Write-Host "  - User ID: $($profile.user_id)" -ForegroundColor Cyan
        Write-Host "  - Full Name: $($profile.full_name)" -ForegroundColor Cyan
        Write-Host "  - Role: $($profile.role)" -ForegroundColor Cyan
        Write-Host "  - Status: $($profile.status)" -ForegroundColor Cyan
        Write-Host "  - Email Verified: $($profile.email_verified)" -ForegroundColor Cyan
        
        if ($profile.role -ne "admin") {
            Write-Host "  WARNING: Role is not 'admin'!" -ForegroundColor Red
        }
        if ($profile.status -ne "active") {
            Write-Host "  WARNING: Status is not 'active'!" -ForegroundColor Red
        }
    } else {
        Write-Host "Verification failed: Profile not found!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error verifying admin user: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nAdmin user rebuild completed successfully!" -ForegroundColor Green
Write-Host "`nLogin credentials:" -ForegroundColor Cyan
Write-Host "  Email: $AdminEmail" -ForegroundColor White
Write-Host "  Password: $AdminPassword" -ForegroundColor White
