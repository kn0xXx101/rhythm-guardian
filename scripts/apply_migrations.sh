#!/bin/bash
# Script to apply Supabase migrations

echo "Applying Supabase migrations..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI could not be found. Please install it from https://supabase.com/docs/guides/cli"
    exit 1
fi

# Run migration apply command
supabase db push

if [ $? -eq 0 ]; then
    echo "Migrations applied successfully."
else
    echo "Failed to apply migrations."
    exit 1
fi
