#!/bin/bash

echo "🚀 Project Genie Development Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    brew install supabase/tap/supabase
else
    echo -e "${GREEN}✅ Supabase CLI found${NC}"
fi

# Check if environment variables are set
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Check if Supabase URL and keys are configured
if grep -q "your_supabase" .env.local; then
    echo -e "${RED}❌ Please update .env.local with your actual Supabase credentials${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

echo ""
echo "🔧 Setting up database..."
echo ""

# Link to Supabase project
echo "Linking to Supabase project..."
supabase link --project-ref vnuieavheezjxbkyfxea

# Push database schema
echo ""
echo "Pushing database schema..."
supabase db push --include-all

echo ""
echo "🌱 Creating test accounts..."
npm run seed

echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Configure OAuth providers in Supabase Dashboard (see OAUTH_SETUP.md)"
echo "2. Start the development server: npm run dev"
echo "3. Login with test account: test@projectgenie.dev / TestPass123!"
echo ""
echo "Happy coding! 🎉"