import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICING } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionsRepository } from '@/lib/repositories/subscriptions-repository'
import { parseJsonRequest, createErrorResponse } from '@/lib/utils/request-parser'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { z } from 'zod'

// Request schema for checkout session creation
const CheckoutRequestSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  tier: z.enum(['free', 'basic', 'premium'], {
    errorMap: () => ({ message: 'Invalid subscription tier' })
  }),
  billingCycle: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid billing cycle' })
  })
})

type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const routeCategory = 'STRIPE_CHECKOUT'

  // Add breadcrumb for route entry
  permanentLogger.info(routeCategory, 'Checkout session request started', {
    method: 'POST',
    url: request.url,
    timestamp: new Date().toISOString()
  })

  try {
    // Check if Stripe is configured
    if (!stripe) {
      permanentLogger.captureError(routeCategory, new Error('Stripe not configured'), {
        message: 'Payment system not configured'
      })
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      )
    }

    // Use shared request parser with schema validation
    const parseResult = await parseJsonRequest<CheckoutRequest>(request, {
      schema: CheckoutRequestSchema,
      logCategory: routeCategory,
      maxBodySize: 100 * 1024 // 100KB limit for checkout requests
    })

    // Check if parsing was successful
    const errorResponse = createErrorResponse(parseResult)
    if (errorResponse) {
      permanentLogger.captureError(routeCategory, new Error('Request parsing failed'), {
        error: parseResult.error,
        timing: parseResult.timing
      })
      return errorResponse
    }

    // Type-safe access to validated body
    const { priceId, tier, billingCycle } = parseResult.data!

    // Log validated request
    permanentLogger.info(routeCategory, 'Checkout request validated', {
      tier,
      billingCycle,
      parseTimeMs: parseResult.timing?.parseMs,
      validationTimeMs: parseResult.timing?.validationMs
    })

    // Get user session using server client
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use repository instead of direct database access
    const subscriptionsRepo = SubscriptionsRepository.getInstance()
    const subscription = await subscriptionsRepo.getUserSubscription(user.id)

    let customerId = subscription?.stripe_customer_id

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe!.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      customerId = customer.id

      // Store customer ID using repository
      await subscriptionsRepo.upsertSubscription({
        user_id: user.id,
        stripe_customer_id: customerId,
        tier: 'free',
        status: 'inactive'
      })
    }

    // Create checkout session
    const session = await stripe!.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        tier,
        billing_cycle: billingCycle
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier
        }
      },
      allow_promotion_codes: true,
    })

    // Log successful checkout session creation
    const totalTimeMs = Date.now() - startTime
    permanentLogger.info(routeCategory, 'Checkout session created successfully', {
      sessionId: session.id,
      tier,
      billingCycle,
      customerId,
      parseTimeMs: parseResult.timing?.parseMs,
      sessionCreationTimeMs: totalTimeMs - (parseResult.timing?.parseMs || 0),
      totalTimeMs
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      timing: {
        parseMs: parseResult.timing?.parseMs,
        processingMs: totalTimeMs - (parseResult.timing?.parseMs || 0),
        totalMs: totalTimeMs
      }
    })
  } catch (error: any) {
    // Comprehensive error logging
    const errorMessage = error.message || 'Failed to create checkout session'
    const totalTimeMs = Date.now() - startTime

    permanentLogger.captureError(routeCategory, error as Error, {
      method: 'POST',
      path: '/api/stripe/checkout',
      errorMessage,
      totalTimeMs,
      breadcrumbs: permanentLogger.getBreadcrumbs ? permanentLogger.getBreadcrumbs() : []
    })

    // Return detailed error response (NO fallback data)
    return NextResponse.json(
      {
        error: errorMessage,
        timing: { totalMs: totalTimeMs },
        requestId: request.headers.get('x-request-id') || 'unknown'
      },
      { status: 500 }
    )
  }
}

// Handle customer portal for managing subscriptions
export async function GET(request: NextRequest) {
  const timer = permanentLogger.timing('api.stripe.portal.get')

  try {
    // Check if Stripe is configured
    if (!stripe) {
      timer.stop()
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      )
    }

    // Get user session using server client
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      timer.stop()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    permanentLogger.breadcrumb('api', 'Creating Stripe portal session', {
      userId: user.id,
      timestamp: Date.now()
    })

    // Get customer ID using repository
    const subscriptionsRepo = SubscriptionsRepository.getInstance()
    const subscription = await subscriptionsRepo.getUserSubscription(user.id)

    if (!subscription?.stripe_customer_id) {
      timer.stop()
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create portal session
    const session = await stripe!.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    permanentLogger.info('STRIPE_CHECKOUT', 'Portal session created', {
      userId: user.id
    })

    timer.stop()
    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    timer.stop()
    permanentLogger.captureError('STRIPE_CHECKOUT', error as Error, {
      endpoint: 'GET /api/stripe/checkout'
    })

    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}