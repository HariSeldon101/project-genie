/**
 * Subscriptions Repository - Handles all subscriptions table database operations
 *
 * Technical PM Note: This centralizes subscription and billing operations.
 * No other file should directly query the subscriptions table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export class SubscriptionsRepository extends BaseRepository {
  private static instance: SubscriptionsRepository

  static getInstance(): SubscriptionsRepository {
    if (!this.instance) {
      this.instance = new SubscriptionsRepository()
    }
    return this.instance
  }

  /**
   * Get subscription by user ID
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const timer = permanentLogger.timing('repository.getUserSubscription')

    return this.execute('getUserSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching user subscription', {
        userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'getUserSubscription',
          userId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Create or update subscription
   */
  async upsertSubscription(subscription: SubscriptionInsert): Promise<Subscription> {
    const timer = permanentLogger.timing('repository.upsertSubscription')

    return this.execute('upsertSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Upserting subscription', {
        userId: subscription.user_id,
        tier: subscription.tier,
        status: subscription.status,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .upsert({
          ...subscription,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'upsertSubscription',
          userId: subscription.user_id
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to upsert subscription - no data returned')
      }

      permanentLogger.info('SUBSCRIPTIONS_REPOSITORY', 'Subscription upserted', {
        userId: subscription.user_id,
        tier: subscription.tier,
        status: subscription.status
      })

      timer.stop()
      return data
    })
  }

  /**
   * Update subscription
   */
  async updateSubscription(userId: string, updates: SubscriptionUpdate): Promise<Subscription> {
    const timer = permanentLogger.timing('repository.updateSubscription')

    return this.execute('updateSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating subscription', {
        userId,
        fields: Object.keys(updates),
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'updateSubscription',
          userId
        })
        throw error
      }

      if (!data) {
        throw new Error('Subscription not found')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get subscription by Stripe customer ID
   */
  async getByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    const timer = permanentLogger.timing('repository.getByStripeCustomerId')

    return this.execute('getByStripeCustomerId', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching subscription by Stripe ID', {
        stripeCustomerId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .select('*')
        .eq('stripe_customer_id', stripeCustomerId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'getByStripeCustomerId',
          stripeCustomerId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const timer = permanentLogger.timing('repository.getByStripeSubscriptionId')

    return this.execute('getByStripeSubscriptionId', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching subscription by Stripe subscription ID', {
        stripeSubscriptionId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'getByStripeSubscriptionId',
          stripeSubscriptionId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const timer = permanentLogger.timing('repository.cancelSubscription')

    return this.execute('cancelSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Cancelling subscription', {
        userId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'cancelSubscription',
          userId
        })
        throw error
      }

      if (!data) {
        throw new Error('Subscription not found')
      }

      permanentLogger.info('SUBSCRIPTIONS_REPOSITORY', 'Subscription cancelled', {
        userId
      })

      timer.stop()
      return data
    })
  }

  /**
   * Get active subscriptions by tier
   */
  async getActiveSubscriptionsByTier(tier: string): Promise<Subscription[]> {
    const timer = permanentLogger.timing('repository.getActiveSubscriptionsByTier')

    return this.execute('getActiveSubscriptionsByTier', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching active subscriptions by tier', {
        tier,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .select('*')
        .eq('tier', tier)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'getActiveSubscriptionsByTier',
          tier
        })
        throw error
      }

      timer.stop()
      return data || []
    })
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    total: number
    active: number
    cancelled: number
    byTier: Record<string, number>
  }> {
    const timer = permanentLogger.timing('repository.getSubscriptionStats')

    return this.execute('getSubscriptionStats', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching subscription statistics', {
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .select('tier, status')

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'getSubscriptionStats'
        })
        throw error
      }

      const stats = {
        total: data?.length || 0,
        active: 0,
        cancelled: 0,
        byTier: {} as Record<string, number>
      }

      data?.forEach(sub => {
        if (sub.status === 'active') stats.active++
        if (sub.status === 'cancelled') stats.cancelled++
        if (sub.tier) {
          stats.byTier[sub.tier] = (stats.byTier[sub.tier] || 0) + 1
        }
      })

      timer.stop()
      return stats
    })
  }

  /**
   * Get count of active subscriptions
   * Used for admin dashboard metrics
   */
  async getActiveSubscriptionCount(): Promise<number> {
    const timer = permanentLogger.timing('repository.getActiveSubscriptionCount')

    return this.execute('getActiveSubscriptionCount', async (client) => {
      permanentLogger.breadcrumb('repository', 'Counting active subscriptions', {
        timestamp: Date.now()
      })

      const { count, error } = await client
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'getActiveSubscriptionCount'
        })
        throw error
      }

      timer.stop()
      return count || 0
    })
  }

  /**
   * Update subscription and return user ID
   * Used by webhook handler to get user context after update
   */
  async updateAndGetUserId(stripeSubscriptionId: string, updates: SubscriptionUpdate): Promise<{
    subscription: Subscription
    userId: string
  }> {
    const timer = permanentLogger.timing('repository.updateAndGetUserId')

    return this.execute('updateAndGetUserId', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating subscription and getting user ID', {
        stripeSubscriptionId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .update(updates)
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTIONS_REPOSITORY', error as Error, {
          operation: 'updateAndGetUserId',
          stripeSubscriptionId
        })
        throw error
      }

      if (!data || !data.user_id) {
        throw new Error('Failed to update subscription or get user ID')
      }

      timer.stop()
      return {
        subscription: data,
        userId: data.user_id
      }
    })
  }

  /**
   * Get subscription by Stripe subscription ID
   * Alias for consistency with old repository
   */
  async getByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return this.getByStripeSubscriptionId(stripeSubscriptionId)
  }
}