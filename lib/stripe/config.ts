// Client-safe Stripe configuration
// This file can be imported in client components

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

export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// Pricing amounts for display
export const PRICING_DISPLAY = {
  basic: {
    monthly: 19,
    annual: 15, // per month when billed annually
  },
  premium: {
    monthly: 49,
    annual: 39, // per month when billed annually
  }
}