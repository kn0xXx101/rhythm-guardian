# Script to create admin user using Supabase Admin API
# This ensures proper password hashing that Supabase Auth can verify
#
# Usage:
#   $env:SUPABASE_URL="your-url"
#   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
#   .\scripts\create-admin-user.ps1
#
# Or set variables in PowerShell:
#   $env:VITE_SUPABASE_URL="your-url"
#   $env:VITE_SUPABASE_SERVICE_ROLE_KEY="your-key"
#   .\scripts\create-admin-user.ps1

$adminEmail = "gregory.manasseh@outlook.com"
$adminPassword = "admin123"

# Get environment variables
$supabaseUrl = $env:SUPABASE_URL
if (-not $supabaseUrl) {
    $supabaseUrl = $env:VITE_SUPABASE_URL
}

$supabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $supabaseServiceRoleKey) {
    $supabaseServiceRoleKey = $env:VITE_SUPABASE_SERVICE_ROLE_KEY
}

if (-not $supabaseUrl -or -not $supabaseServiceRoleKey) {
    Write-Host "Error: Missing required environment variables" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set one of the following:" -ForegroundColor Yellow
    Write-Host "  SUPABASE_URL (or VITE_SUPABASE_URL)"
    Write-Host "  SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)"
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Cyan
    Write-Host '  $env:SUPABASE_URL="https://your-project.supabase.co"'
    Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"'
    Write-Host '  .\scripts\create-admin-user.ps1'
    exit 1
}

Write-Host "Creating admin user..." -ForegroundColor Green
Write-Host "Email: $adminEmail"

# Create the Node.js script content
$nodeScript = @"
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '$supabaseUrl';
const supabaseServiceRoleKey = '$supabaseServiceRoleKey';
const adminEmail = '$adminEmail';
const adminPassword = '$adminPassword';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      throw new Error(\`Failed to list users: \${listError.message}\`);
    }
    
    const existingUser = existingUsers.users.find(u => u.email === adminEmail);
    
    if (existingUser) {
      console.log('User already exists. Deleting existing user...');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        throw new Error(\`Failed to delete existing user: \${deleteError.message}\`);
      }
      console.log('Existing user deleted.');
    }
    
    // Create user using Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'System Administrator',
        full_name: 'System Administrator'
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'admin',
        status: 'active'
      }
    });
    
    if (createError) {
      throw new Error(\`Failed to create user: \${createError.message}\`);
    }
    
    if (!newUser.user) {
      throw new Error('User creation returned no user data');
    }
    
    console.log('✓ User created successfully');
    console.log(\`  User ID: \${newUser.user.id}\`);
    
    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        full_name: 'System Administrator',
        role: 'admin',
        status: 'active',
        email_verified: true,
        phone_verified: false,
        bio: 'System administrator account for Rhythm Guardian platform',
        profile_complete: true,
        documents_submitted: false,
        documents_verified: false,
        profile_completion_percentage: 100,
        required_documents: [],
        last_active_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (profileError) {
      console.warn('Warning: Failed to create profile:', profileError.message);
    } else {
      console.log('✓ Profile created successfully');
    }
    
    // Create user settings
    const { error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: newUser.user.id,
        email_notifications: true,
        push_notifications: true,
        booking_reminders: true,
        message_notifications: true,
        review_notifications: true,
        marketing_emails: false,
        timezone: 'UTC',
        language: 'en'
      }, {
        onConflict: 'user_id'
      });
    
    if (settingsError) {
      console.warn('Warning: Failed to create user settings:', settingsError.message);
    } else {
      console.log('✓ User settings created successfully');
    }
    
    console.log('');
    console.log('✅ Admin user setup complete!');
    console.log('');
    console.log('Login credentials:');
    console.log(\`  Email: \${adminEmail}\`);
    console.log(\`  Password: \${adminPassword}\`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error creating admin user:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createAdminUser();
"@

# Write temporary script
$tempScript = Join-Path $env:TEMP "create-admin-user-temp.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding utf8

try {
    # Run the Node.js script
    node $tempScript
} finally {
    # Clean up
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
    }
}

