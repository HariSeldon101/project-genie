import Stripe from 'stripe'

// Only initialize Stripe if we have a secret key
// This prevents build errors when environment variables aren't available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null

export const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}

// Pricing configuration
export const PRICING = {
  basic: {
    monthly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY || 'price_basic_monthly',
      amount: 1900, // $19.00
    },
    annual: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL || 'price_basic_annual',
      amount: 18000, // $180.00 ($15/month)
    }
  },
  premium: {
    monthly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY || 'price_premium_monthly',
      amount: 4900, // $49.00
    },
    annual: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL || 'price_premium_annual',
      amount: 46800, // $468.00 ($39/month)
    }
  }
}

// Export price IDs for easy access in client components
export const STRIPE_PRICE_IDS = {
  basic: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY || 'price_basic_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL || 'price_basic_annual',
  },
  premium: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY || 'price_premium_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL || 'price_premium_annual',
  }
}