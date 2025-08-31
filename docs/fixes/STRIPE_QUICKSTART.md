# 🚀 Stripe Quick Setup for Project Genie

## Option 1: Automatic Setup (Recommended)

### Step 1: Login to Stripe CLI
```bash
stripe login
```
This will open your browser. Authenticate with your Stripe account.

### Step 2: Run the Setup Script
```bash
./scripts/setup-stripe.sh
```

This script will:
- Create Basic and Premium products in Stripe
- Set up monthly and annual pricing
- Generate a `.env.stripe` file with all your keys

### Step 3: Copy Configuration
Copy the generated values from `.env.stripe` to your `.env.local`

### Step 4: Restart Dev Server
```bash
npm run dev
```

---

## Option 2: Manual Setup via Dashboard

### Step 1: Get Your API Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** and **Secret key**

### Step 2: Quick Product Creation via CLI

If you're logged into Stripe CLI, you can create products quickly:

```bash
# Create Basic Product with Monthly Price
stripe products create \
  --name="Project Genie Basic" \
  --default-price-data[currency]=usd \
  --default-price-data[unit_amount]=1900 \
  --default-price-data[recurring][interval]=month

# Create Premium Product with Monthly Price  
stripe products create \
  --name="Project Genie Premium" \
  --default-price-data[currency]=usd \
  --default-price-data[unit_amount]=4900 \
  --default-price-data[recurring][interval]=month
```

### Step 3: Update .env.local

Add your keys to `.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
```

---

## Testing Your Setup

### Start Webhook Forwarding
In a new terminal:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Checkout
1. Visit http://localhost:3000/pricing
2. Click "Start Basic" or "Go Premium"
3. Use test card: `4242 4242 4242 4242`

### View Your Products
```bash
# List all products
stripe products list

# List all prices
stripe prices list
```

---

## Troubleshooting

### "Neither apiKey nor config.authenticator provided"
You need to add `STRIPE_SECRET_KEY` to your `.env.local`

### "No such price"
You need to create products in Stripe and add their price IDs to `.env.local`

### Can't login to Stripe CLI
Make sure you have a Stripe account at https://dashboard.stripe.com

---

## Need Help?

1. Check Stripe Dashboard: https://dashboard.stripe.com
2. View API keys: https://dashboard.stripe.com/test/apikeys
3. View products: https://dashboard.stripe.com/test/products
4. Read docs: https://stripe.com/docs