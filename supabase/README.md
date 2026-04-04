# Database Migrations

This directory contains the database migrations for the Rhythm Guardian application. The migrations are designed to be run in sequence to set up the complete database schema and functionality.

## Migration Files

1. `00001_initial_setup.sql`
   - Sets up basic database extensions
   - Creates custom types (user roles, statuses, etc.)
   - Creates core tables (profiles, bookings, messages, reviews, etc.)
   - Establishes basic table structure and relationships

2. `00002_security_and_indexes.sql`
   - Enables Row Level Security (RLS)
   - Creates security policies for all tables
   - Sets up indexes for optimized query performance
   - Implements access control for different user roles

3. `00003_initial_data.sql`
   - Inserts default platform settings
   - Creates initial admin user
   - Sets up basic configuration data
   - Establishes system defaults

4. `00004_functions_and_triggers.sql`
   - Creates database functions for automated tasks
   - Sets up triggers for:
     - Profile rating updates
     - Booking statistics
     - Notification generation
     - User activity tracking

## Database Features

- **User Management**
  - Role-based access control (Admin, Musician, Hirer)
  - Profile management with verification
  - User settings and preferences

- **Booking System**
  - Event booking management
  - Payment processing
  - Status tracking
  - Automated notifications

- **Messaging System**
  - Direct messaging between users
  - Booking-related communications
  - Message status tracking
  - Auto-moderation features

- **Review System**
  - Performance reviews
  - Rating calculations
  - Response management
  - Automated profile updates

- **Security**
  - Row Level Security (RLS)
  - Role-based permissions
  - Data access controls
  - Audit trails

## How to Apply Migrations

1. Ensure you have access to your Supabase project
2. Run migrations in sequence:
   ```bash
   # Using Supabase CLI
   supabase db reset

   # Or manually through SQL editor
   # Run each migration file in order:
   # 1. 00001_initial_setup.sql
   # 2. 00002_security_and_indexes.sql
   # 3. 00003_initial_data.sql
   # 4. 00004_functions_and_triggers.sql
   ```

## Default Admin Account

After running migrations, you can log in with:
- Email: admin@rhythmguardian.com
- Password: admin123

**Important:** Change the admin password immediately after first login.

## Maintenance

- Backup your database regularly
- Monitor database performance
- Check logs for any security policy violations
- Keep track of user growth and data volume
