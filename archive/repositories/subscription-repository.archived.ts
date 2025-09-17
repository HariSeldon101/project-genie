/**
 * Subscription Repository - Handles all subscription database operations
 *
 * Technical PM Note: This centralizes Stripe subscription management.
 * No other file should directly query the subscriptions table.
 */

import { BaseRepository } from './base-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import type { Database } from '@/lib/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export class SubscriptionRepository extends BaseRepository {
  private static instance: SubscriptionRepository

  static getInstance(): SubscriptionRepository {
    if (!this.instance) {
      this.instance = new SubscriptionRepository()
    }
    return this.instance
  }

  /**
   * Get user's subscription
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
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
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
   * Get subscription by Stripe subscription ID
   */
  async getByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const timer = permanentLogger.timing('repository.getByStripeId')

    return this.execute('getByStripeId', async (client) => {
      permanentLogger.breadcrumb('repository', 'Fetching subscription by Stripe ID', {
        stripeSubscriptionId,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .maybeSingle()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
          operation: 'getByStripeId',
          stripeSubscriptionId
        })
        throw error
      }

      timer.stop()
      return data
    })
  }

  /**
   * Upsert subscription (create or update)
   */
  async upsertSubscription(subscription: SubscriptionInsert): Promise<Subscription> {
    const timer = permanentLogger.timing('repository.upsertSubscription')

    return this.execute('upsertSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Upserting subscription', {
        userId: subscription.user_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        tier: subscription.tier,
        status: subscription.status,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .upsert(subscription, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
          operation: 'upsertSubscription',
          subscription
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to upsert subscription - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update subscription
   */
  async updateSubscription(stripeSubscriptionId: string, updates: SubscriptionUpdate): Promise<Subscription> {
    const timer = permanentLogger.timing('repository.updateSubscription')

    return this.execute('updateSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating subscription', {
        stripeSubscriptionId,
        updates,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
          operation: 'updateSubscription',
          stripeSubscriptionId,
          updates
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to update subscription - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Update subscription and get user ID
   */
  async updateAndGetUserId(stripeSubscriptionId: string, updates: SubscriptionUpdate): Promise<{
    subscription: Subscription
    userId: string
  }> {
    const timer = permanentLogger.timing('repository.updateAndGetUserId')

    return this.execute('updateAndGetUserId', async (client) => {
      permanentLogger.breadcrumb('repository', 'Updating subscription and getting user ID', {
        stripeSubscriptionId,
        updates,
        timestamp: Date.now()
      })

      const { data, error } = await client
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .select('*, user_id')
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
          operation: 'updateAndGetUserId',
          stripeSubscriptionId,
          updates
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
   * Cancel subscription
   */
  async cancelSubscription(stripeSubscriptionId: string): Promise<Subscription> {
    const timer = permanentLogger.timing('repository.cancelSubscription')

    return this.execute('cancelSubscription', async (client) => {
      permanentLogger.breadcrumb('repository', 'Canceling subscription', {
        stripeSubscriptionId,
        timestamp: Date.now()
      })

      const updates: SubscriptionUpdate = {
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await client
        .from('subscriptions')
        .update(updates)
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .select()
        .single()

      if (error) {
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
          operation: 'cancelSubscription',
          stripeSubscriptionId
        })
        throw error
      }

      if (!data) {
        throw new Error('Failed to cancel subscription - no data returned')
      }

      timer.stop()
      return data
    })
  }

  /**
   * Get active subscriptions count
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
        permanentLogger.captureError('SUBSCRIPTION_REPOSITORY', error as Error, {
          operation: 'getActiveSubscriptionCount'
        })
        throw error
      }

      timer.stop()
      return count || 0
    })
  }
}