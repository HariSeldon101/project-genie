# Stripe Integration Setup Guide

## Overview
Project Genie uses Stripe for subscription management with three tiers: Free, Basic ($19/mo), and Premium ($49/mo).

## Setup Steps

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete your business profile
3. Enable test mode for development

### 2. Create Products and Prices

In your Stripe Dashboard:

#### Basic Plan
1. Go to Products → Add Product
2. Name: "Project Genie Basic"
3. Add two prices:
   - Monthly: $19.00 recurring monthly
   - Annual: $180.00 recurring yearly (saves 20%)
4. Copy the price IDs (they look like `price_1234567890abcdef`)

#### Premium Plan
1. Add Product: "Project Genie Premium"
2. Add two prices:
   - Monthly: $49.00 recurring monthly
   - Annual: $468.00 recurring yearly (saves 20%)
3. Copy the price IDs

### 3. Configure Environment Variables

Add to your `.env.local`:

```env
# Stripe API Keys (from Dashboard → Developers → API keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...

# Stripe Price IDs (from Products page)
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...

# Webhook Secret (see step 4)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Set Up Webhooks

#### For Local Development:
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

#### For Production:
1. Go to Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret

### 5. Test the Integration

1. Start your dev server: `npm run dev`
2. If using local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Go to `/pricing` and click a plan
4. Use test card: `4242 4242 4242 4242`
5. Check `/dashboard` - subscription should be updated

## How It Works

### User Flow:
1. **Pricing Page** → User clicks "Start Basic" or "Go Premium"
2. **Stripe Checkout** → Redirected to Stripe's hosted checkout
3. **Payment** → User enters card details
4. **Webhook** → Stripe notifies our API of successful payment
5. **Database Update** → User's subscription_tier is updated
6. **Dashboard** → User sees premium features unlocked

### Key Components:

- `/lib/stripe/config.ts` - Client-safe configuration
- `/lib/stripe/client.ts` - Server-side Stripe client
- `/lib/hooks/use-stripe-checkout.ts` - React hook for checkout
- `/app/api/stripe/checkout/route.ts` - Creates checkout sessions
- `/app/api/stripe/webhook/route.ts` - Handles Stripe events

### Settings Page Integration:
- Free users see "Upgrade to Basic" button
- Basic users see "Upgrade to Premium" button  
- Premium users see "Manage Subscription" button (opens Stripe portal)

## Troubleshooting

### "Neither apiKey nor config.authenticator provided"
- Ensure `STRIPE_SECRET_KEY` is set in `.env.local`
- Restart dev server after adding env variables

### Webhook signature verification failed
- Make sure `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
- For local dev, use the secret from `stripe listen` command

### Subscription not updating
- Check webhook logs in Stripe Dashboard
- Verify database has `subscriptions` table
- Check API route logs for errors

## Testing Cards

Use these test cards in test mode:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Any future date for expiry, any 3 digits for CVC.

## Production Checklist

- [ ] Switch to live API keys
- [ ] Update webhook endpoint to production URL
- [ ] Test with real card in live mode
- [ ] Set up customer portal branding
- [ ] Configure email receipts
- [ ] Enable tax collection if needed
- [ ] Set up Stripe Radar for fraud prevention