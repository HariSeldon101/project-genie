# How to Get Your Stripe API Keys

## Quick Steps to Get Your Keys

### 1. Sign Up / Log In to Stripe
Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and create an account or log in.

### 2. Get Your API Keys

1. In the Stripe Dashboard, click on **"Developers"** in the left sidebar
2. Click on **"API keys"**
3. You'll see two keys:
   - **Publishable key**: Starts with `pk_test_` (for client-side)
   - **Secret key**: Starts with `sk_test_` (for server-side) - click "Reveal test key" to see it

### 3. Create Your Products and Prices

#### Create Products:
1. Go to **"Products"** in the Stripe Dashboard
2. Click **"+ Add product"**
3. Create these products:

**Basic Plan:**
- Name: "Project Genie Basic"
- Description: "For small teams and growing projects"

**Premium Plan:**
- Name: "Project Genie Premium"  
- Description: "For enterprises and large teams"

#### Add Prices to Each Product:

For **Basic Plan**, add:
- Monthly: $19.00 (recurring monthly)
- Annual: $180.00 (recurring yearly)

For **Premium Plan**, add:
- Monthly: $49.00 (recurring monthly)
- Annual: $468.00 (recurring yearly)

#### Get Price IDs:
After creating, click on each product to see its prices. Each price has an ID like `price_1AbCdEfGhIjKlMnO`. Copy these IDs.

### 4. Update Your .env.local

Replace the placeholder values in your `.env.local`:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...  # Your publishable key
STRIPE_SECRET_KEY=sk_test_51ABC...                   # Your secret key
STRIPE_WEBHOOK_SECRET=whsec_dcf456ce20a7fd39c813b7ae4d4cfa436b8c452008630c20f738fa800b93a0f7

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=price_1ABC...    # Basic monthly price ID
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL=price_1DEF...     # Basic annual price ID
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_1GHI...  # Premium monthly price ID
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_1JKL...   # Premium annual price ID
```

### 5. Restart Your Dev Server

After updating `.env.local`, restart your Next.js server:
```bash
# Stop the server with Ctrl+C, then:
npm run dev
```

## Testing Your Setup

1. Go to http://localhost:3000/pricing
2. Click any upgrade button
3. You should be redirected to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`

## Need Help?

- Stripe Dashboard: https://dashboard.stripe.com
- API Keys: https://dashboard.stripe.com/test/apikeys
- Products: https://dashboard.stripe.com/test/products

## Important Notes

- Keep your **secret key** private - never commit it to Git
- The **publishable key** is safe to use in client-side code
- Use **test mode** keys (starting with `_test_`) for development
- Switch to **live mode** keys when ready for production