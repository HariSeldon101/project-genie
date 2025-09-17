# Stripe CLI Setup for Project Genie

This guide helps you set up the Stripe CLI to test Project Genie's subscription system locally.

## Quick Installation

### macOS (Recommended)
```bash
brew install stripe/stripe-cli/stripe
```

### Windows
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### Linux (Ubuntu/Debian)
```bash
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

## Setup for Project Genie

### 1. Login to Stripe CLI
```bash
stripe login
```
Press Enter to open your browser and authenticate.

### 2. Forward Webhooks to Local Dev Server

Start your Next.js dev server first:
```bash
npm run dev
```

In a new terminal, forward Stripe webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important:** Copy the webhook signing secret that appears:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 3. Update Environment Variables

Add the webhook secret to your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 4. Test a Payment Flow

#### Create a Test Checkout Session
```bash
# Create a checkout session for Basic plan (monthly)
stripe checkout sessions create \
  --success-url="http://localhost:3000/dashboard?success=true" \
  --cancel-url="http://localhost:3000/pricing" \
  --mode=subscription \
  --line-items="[{\"price\": \"${NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY}\", \"quantity\": 1}]"
```

Or use the UI:
1. Go to http://localhost:3000/pricing
2. Click "Start Basic" or "Go Premium"
3. Use test card: `4242 4242 4242 4242`

### 5. Monitor Events

The webhook listener will show events in real-time:
```
2024-01-15 10:30:45 --> checkout.session.completed [evt_xxx]
2024-01-15 10:30:46 --> customer.subscription.created [evt_xxx]
2024-01-15 10:30:47 --> invoice.payment_succeeded [evt_xxx]
```

## Useful CLI Commands

### View Test Data
```bash
# List recent customers
stripe customers list --limit 3

# List active subscriptions
stripe subscriptions list --status active --limit 5

# List recent payments
stripe payments list --limit 5
```

### Trigger Test Events
```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test failed payment
stripe trigger invoice.payment_failed

# Test subscription cancellation
stripe trigger customer.subscription.deleted
```

### Create Test Resources
```bash
# Create a test customer
stripe customers create \
  --email="test@example.com" \
  --name="Test User"

# Create a test product
stripe products create \
  --name="Project Genie Premium" \
  --description="Full access to all features"

# Create a price for the product
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring="[\"interval\": \"month\"]"
```

## Debugging Webhooks

### 1. Check Webhook Logs
```bash
# View recent webhook attempts
stripe events list --limit 10

# Resend a specific event
stripe events resend evt_xxxxxxxxxxxxx
```

### 2. Test Webhook Endpoint Directly
```bash
# Send a test webhook to your endpoint
stripe trigger checkout.session.completed \
  --override checkout_session:customer=cus_xxx \
  --override checkout_session:subscription=sub_xxx
```

### 3. View Detailed Event Data
```bash
# Get details of a specific event
stripe events retrieve evt_xxxxxxxxxxxxx
```

## Common Issues

### "Webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the secret from `stripe listen`
- Restart your Next.js dev server after updating environment variables

### "No such price"
- Make sure you've created the products and prices in your Stripe Dashboard
- Update the price IDs in your `.env.local` file

### "Customer not found"
- The user might not have a Stripe customer ID yet
- This is created automatically on first checkout

## Project Genie Webhook Events

Our app handles these Stripe events:

| Event | What it does |
|-------|--------------|
| `checkout.session.completed` | Creates/updates user subscription |
| `customer.subscription.updated` | Updates subscription tier |
| `customer.subscription.deleted` | Downgrades to free tier |
| `invoice.payment_succeeded` | Records successful payment |
| `invoice.payment_failed` | Sends payment failure notification |

## Testing Different Scenarios

### Test Upgrade Flow
1. Start as free user
2. Click upgrade button in Settings
3. Complete checkout with test card
4. Verify subscription tier updates

### Test Downgrade Flow
```bash
# Cancel a subscription
stripe subscriptions cancel sub_xxxxxxxxxxxxx
```

### Test Payment Failure
Use test card `4000 0000 0000 0002` to simulate a declined payment.

## Production Setup

For production, configure webhooks in the Stripe Dashboard:
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select the events listed above
4. Copy the signing secret to your production environment

## Resources

- [Stripe CLI Documentation](https://stripe.com/docs/cli)
- [Testing Webhooks Locally](https://stripe.com/docs/webhooks/test)
- [Test Cards Reference](https://stripe.com/docs/testing#cards)
- [Project Genie Stripe Setup](./STRIPE_SETUP.md)