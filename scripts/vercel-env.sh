#!/bin/bash

# Add environment variables to Vercel
echo "Setting up Vercel environment variables..."

# Supabase
echo "https://vnuieavheezjxbkyfxea.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudWllYXZoZWV6anhia3lmeGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY1NDEsImV4cCI6MjA3MTUyMjU0MX0.T69QjJp96EoGO0GDLwOwZWbI9Ir6B5ARzz7SBVwjqM0" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudWllYXZoZWV6anhia3lmeGVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk0NjU0MSwiZXhwIjoyMDcxNTIyNTQxfQ.K75891AhRUdiljehYltHlVj_JWHF3Ms0A9yxdY_Adkk" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# App URL
echo "https://project-genie.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production

echo "Environment variables added!"