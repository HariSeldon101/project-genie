/**
 * Admin User Management Page
 *
 * Technical PM Note: Admin-only dashboard page for managing all users
 * Shows comprehensive user data including auth methods, usage statistics, and activity
 *
 * ✅ CLAUDE.md Compliance:
 * - Server component with proper auth checking
 * - Real data only - no mock fallbacks
 * - Comprehensive error handling
 * - Repository pattern for data access
 */

import { Suspense } from 'react'
import { checkAdminAuth } from '@/lib/admin/auth'
import { UserManagementClient } from './user-management-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Users, Shield, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { ProfilesRepository } from '@/lib/repositories/profiles-repository'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'

export const metadata = {
  title: 'User Management | Admin',
  description: 'Manage all users, permissions, and subscriptions',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="h-[500px] bg-gray-100" />
      </div>
    </div>
  )
}

async function getUserStats() {
  const timer = permanentLogger.timing('admin.getUserStats')

  try {
    // Get repository instance and fetch users with real statistics
    const repository = ProfilesRepository.getInstance()

    permanentLogger.breadcrumb('admin_users', 'Fetching users with statistics', {
      timestamp: Date.now()
    })

    // CLAUDE.md: NO FALLBACK - directly call the method that handles both scenarios
    // The repository method already has proper fallback logic when views don't exist
    const usersWithStats = await repository.getAllUsersWithStats()

    permanentLogger.info('ADMIN_USERS_PAGE', 'Users fetched successfully', {
      count: usersWithStats.length,
      duration: timer.stop()
    })

    return {
      users: usersWithStats,
      total: usersWithStats.length,
      limit: 50,
      offset: 0,
      hasMore: false
    }
  } catch (error) {
    // CLAUDE.md: No console.error - use permanentLogger
    permanentLogger.captureError('ADMIN_USERS_PAGE', error as Error, {
      operation: 'getUserStats'
    })

    timer.stop()
    return null
  }
}

export default async function AdminUsersPage() {
  try {
    // Check admin authentication - will redirect if not admin
    await checkAdminAuth()

    // Fetch initial user data
    const initialData = await getUserStats()

    if (!initialData) {
      return (
        <div className="container mx-auto p-6 space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load users</AlertTitle>
            <AlertDescription>
              There was an error loading the user data. Please try refreshing the page.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <Button asChild>
              <a href="/admin/users">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </a>
            </Button>
          </div>
        </div>
      )
    }

    // Calculate stats
    const stats = {
      totalUsers: initialData.total || 0,
      adminUsers: initialData.users?.filter((u: any) => u.is_admin).length || 0,
      activeUsers: initialData.users?.filter((u: any) => u.is_active !== false).length || 0,
      premiumUsers: initialData.users?.filter((u: any) =>
        u.subscription_tier === 'premium' || u.subscription_tier === 'team'
      ).length || 0
    }

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-yellow-600" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts, permissions, subscriptions, and access control
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/admin">
              Back to Admin Dashboard
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold">{stats.adminUsers}</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
              <div className="h-8 w-8 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Premium Users</p>
                <p className="text-2xl font-bold">{stats.premiumUsers}</p>
              </div>
              <div className="h-8 w-8 bg-purple-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* User Table - Client Component */}
        <Suspense fallback={<LoadingSkeleton />}>
          <UserManagementClient initialUsers={initialData.users || []} />
        </Suspense>
      </div>
    )
  } catch (error) {
    // Auth error - user will be redirected
    permanentLogger.captureError('ADMIN_USERS_PAGE', error as Error, {
      operation: 'AdminUsersPage',
      stage: 'auth_check'
    })
    return null
  }
}