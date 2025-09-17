#!/bin/bash

# Supabase Auth Configuration Update Script
# This script helps you update Supabase auth URLs

echo "🔧 Supabase Auth Configuration Helper"
echo "======================================"
echo ""
echo "⚠️  IMPORTANT: Auth URL configuration must be done through the Supabase Dashboard"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Open your browser and go to:"
echo "   https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/auth/url-configuration"
echo ""
echo "2. Update the Site URL to:"
echo "   https://project-genie-one.vercel.app"
echo ""
echo "3. Add these Redirect URLs (one per line):"
echo "   https://project-genie-one.vercel.app/auth/callback"
echo "   https://project-genie-one.vercel.app"
echo "   https://project-genie-hariseldon101s-projects.vercel.app/auth/callback"
echo "   https://project-genie-hariseldon101s-projects.vercel.app"
echo "   http://localhost:3000/auth/callback"
echo "   http://localhost:3000"
echo ""
echo "4. Click 'Save' at the bottom of the page"
echo ""
echo "Press Enter to open the Supabase dashboard in your browser..."
read

# Open the Supabase dashboard
open "https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/auth/url-configuration"

echo ""
echo "✅ Dashboard opened. Please update the settings as shown above."
echo ""
echo "After updating, you can test the auth flow at:"
echo "https://project-genie-one.vercel.app/login"