/**
 * Script to create admin user using Supabase Admin API
 * This ensures proper password hashing that Supabase Auth can verify
 * 
 * Usage:
 *   node scripts/create-admin-user.js
 * 
 * Requires environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Helper to load env file
function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (e) {
    return {};
  }
}

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Try to load .env.local and .env files
const envLocal = loadEnvFile(join(rootDir, '.env.local'));
const env = loadEnvFile(join(rootDir, '.env'));

// Merge env vars (process.env takes precedence)
const envVars = { ...env, ...envLocal, ...process.env };

const supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Missing required environment variables');
  console.error('Required: SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const adminEmail = 'gregory.manasseh@outlook.com';
const adminPassword = 'admin123';

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    console.log(`Email: ${adminEmail}`);
    
    // Step 1: Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const existingUser = existingUsers.users.find(u => u.email === adminEmail);
    
    if (existingUser) {
      console.log('User already exists. Deleting existing user...');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        throw new Error(`Failed to delete existing user: ${deleteError.message}`);
      }
      console.log('Existing user deleted.');
    }
    
    // Step 2: Create user using Admin API (this properly hashes the password)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
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
      throw new Error(`Failed to create user: ${createError.message}`);
    }
    
    if (!newUser.user) {
      throw new Error('User creation returned no user data');
    }
    
    console.log('✓ User created successfully');
    console.log(`  User ID: ${newUser.user.id}`);
    
    // Step 3: Create profile
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
      console.warn('You may need to create the profile manually');
    } else {
      console.log('✓ Profile created successfully');
    }
    
    // Step 4: Create user settings
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
    
    console.log('\n✅ Admin user setup complete!');
    console.log('\nLogin credentials:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

createAdminUser();

