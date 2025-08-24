#!/bin/bash

# Stripe Setup Script for Project Genie
# This script creates the products and prices in your Stripe account

echo "🚀 Project Genie - Stripe Setup Script"
echo "======================================"
echo ""
echo "This script will create the following in your Stripe account:"
echo "- Basic Plan ($19/month, $180/year)"
echo "- Premium Plan ($49/month, $468/year)"
echo ""
echo "Please make sure you're logged into Stripe CLI first:"
echo "Run: stripe login"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Create Basic Product
echo ""
echo "📦 Creating Basic Plan product..."
BASIC_PRODUCT=$(stripe products create \
  --name="Project Genie Basic" \
  --description="For small teams and growing projects. Includes 10 projects, 10 team members, and all standard features." \
  --metadata[tier]="basic" \
  --json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$BASIC_PRODUCT" ]; then
  echo "❌ Failed to create Basic product"
  exit 1
fi

echo "✅ Created Basic product: $BASIC_PRODUCT"

# Create Basic Monthly Price
echo "💰 Creating Basic monthly price ($19/month)..."
BASIC_MONTHLY=$(stripe prices create \
  --product="$BASIC_PRODUCT" \
  --unit-amount=1900 \
  --currency=usd \
  --recurring[interval]=month \
  --metadata[plan]="basic_monthly" \
  --json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

echo "✅ Created Basic monthly price: $BASIC_MONTHLY"

# Create Basic Annual Price
echo "💰 Creating Basic annual price ($180/year)..."
BASIC_ANNUAL=$(stripe prices create \
  --product="$BASIC_PRODUCT" \
  --unit-amount=18000 \
  --currency=usd \
  --recurring[interval]=year \
  --metadata[plan]="basic_annual" \
  --json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

echo "✅ Created Basic annual price: $BASIC_ANNUAL"

# Create Premium Product
echo ""
echo "📦 Creating Premium Plan product..."
PREMIUM_PRODUCT=$(stripe products create \
  --name="Project Genie Premium" \
  --description="For enterprises and large teams. Unlimited projects, unlimited team members, white label, and priority support." \
  --metadata[tier]="premium" \
  --json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$PREMIUM_PRODUCT" ]; then
  echo "❌ Failed to create Premium product"
  exit 1
fi

echo "✅ Created Premium product: $PREMIUM_PRODUCT"

# Create Premium Monthly Price
echo "💰 Creating Premium monthly price ($49/month)..."
PREMIUM_MONTHLY=$(stripe prices create \
  --product="$PREMIUM_PRODUCT" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring[interval]=month \
  --metadata[plan]="premium_monthly" \
  --json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

echo "✅ Created Premium monthly price: $PREMIUM_MONTHLY"

# Create Premium Annual Price
echo "💰 Creating Premium annual price ($468/year)..."
PREMIUM_ANNUAL=$(stripe prices create \
  --product="$PREMIUM_PRODUCT" \
  --unit-amount=46800 \
  --currency=usd \
  --recurring[interval]=year \
  --metadata[plan]="premium_annual" \
  --json | grep -o '"id": "[^"]*' | grep -o '[^"]*$' | head -1)

echo "✅ Created Premium annual price: $PREMIUM_ANNUAL"

# Get API Keys
echo ""
echo "🔑 Fetching your API keys..."
PUBLISHABLE_KEY=$(stripe config --list | grep 'test_mode_pk_test' | awk '{print $2}' || echo "pk_test_YOUR_KEY")
SECRET_KEY=$(stripe config --list | grep 'test_mode_sk_test' | awk '{print $2}' || echo "sk_test_YOUR_KEY")

# Output configuration
echo ""
echo "=========================================="
echo "✅ STRIPE SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Add these to your .env.local file:"
echo ""
echo "# Stripe Configuration"
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY"
echo "STRIPE_SECRET_KEY=$SECRET_KEY"
echo "STRIPE_WEBHOOK_SECRET=whsec_dcf456ce20a7fd39c813b7ae4d4cfa436b8c452008630c20f738fa800b93a0f7"
echo ""
echo "# Stripe Price IDs"
echo "NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=$BASIC_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL=$BASIC_ANNUAL"
echo "NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY=$PREMIUM_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL=$PREMIUM_ANNUAL"
echo ""
echo "=========================================="
echo ""
echo "📝 These values have been saved to: .env.stripe"
echo "Copy them to your .env.local file to use them."

# Save to file
cat > .env.stripe << EOF
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
STRIPE_SECRET_KEY=$SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_dcf456ce20a7fd39c813b7ae4d4cfa436b8c452008630c20f738fa800b93a0f7

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=$BASIC_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL=$BASIC_ANNUAL
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY=$PREMIUM_MONTHLY
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL=$PREMIUM_ANNUAL
EOF

echo ""
echo "🎉 Setup complete! Your products and prices are ready in Stripe."
echo ""
echo "Next steps:"
echo "1. Copy the values from .env.stripe to your .env.local"
echo "2. Restart your Next.js dev server"
echo "3. Test the checkout at http://localhost:3000/pricing"