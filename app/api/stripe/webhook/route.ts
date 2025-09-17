import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import Stripe from 'stripe'
import { SubscriptionsRepository } from '@/lib/repositories/subscriptions-repository'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const timer = permanentLogger.timing('api.stripe.webhook')

  // Check if Stripe is configured
  if (!stripe || !endpointSecret) {
    timer.stop()
    return NextResponse.json(
      { error: 'Webhook handler not configured' },
      { status: 503 }
    )
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    timer.stop()
    permanentLogger.captureError('STRIPE_WEBHOOK', err, {
      message: 'Webhook signature verification failed'
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  permanentLogger.breadcrumb('api', 'Stripe webhook received', {
    eventType: event.type,
    eventId: event.id,
    timestamp: Date.now()
  })

  // Get repositories
  const subscriptionRepo = SubscriptionsRepository.getInstance()
  const profilesRepo = ProfilesRepository.getInstance()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get subscription details
        const subscription = await stripe!.subscriptions.retrieve(
          session.subscription as string
        )

        // Update user subscription in database using repository
        await subscriptionRepo.upsertSubscription({
          user_id: session.metadata?.user_id!,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items.data[0].price.id,
          tier: session.metadata?.tier || 'basic',
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })

        // Update user's subscription tier in profile
        await profilesRepo.updateProfile(session.metadata?.user_id!, {
          subscription_tier: session.metadata?.tier || 'basic',
          updated_at: new Date().toISOString()
        })

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription status using repository
        await subscriptionRepo.updateSubscription(subscription.id, {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })

        // Update user tier if subscription is canceled
        if (subscription.status === 'canceled') {
          const userSubscription = await subscriptionRepo.getByStripeId(subscription.id)

          if (userSubscription && userSubscription.user_id) {
            await profilesRepo.updateProfile(userSubscription.user_id, {
              subscription_tier: 'free',
              updated_at: new Date().toISOString()
            })
          }
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription status to canceled and get user ID
        const result = await subscriptionRepo.updateAndGetUserId(subscription.id, {
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Downgrade user to free tier
        if (result.userId) {
          await profilesRepo.updateProfile(result.userId, {
            subscription_tier: 'free',
            updated_at: new Date().toISOString()
          })
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // TODO: Create InvoiceRepository if invoice tracking is needed
        permanentLogger.info('STRIPE_WEBHOOK', 'Invoice payment succeeded', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid
        })

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        permanentLogger.warn('STRIPE_WEBHOOK', 'Invoice payment failed', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amountDue: invoice.amount_due
        })

        // Update subscription status to past_due for this customer
        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id

          await subscriptionRepo.updateSubscription(subscriptionId, {
            status: 'past_due',
            updated_at: new Date().toISOString()
          })

          permanentLogger.info('STRIPE_WEBHOOK', 'Subscription marked as past due', {
            subscriptionId,
            customerId: invoice.customer
          })
        }

        break
      }

      default:
        permanentLogger.info('STRIPE_WEBHOOK', 'Unhandled event type', {
          eventType: event.type
        })
    }

    timer.stop()
    return NextResponse.json({ received: true })
  } catch (error: any) {
    timer.stop()
    permanentLogger.captureError('STRIPE_WEBHOOK', error, {
      endpoint: 'POST /api/stripe/webhook',
      eventType: event.type
    })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}