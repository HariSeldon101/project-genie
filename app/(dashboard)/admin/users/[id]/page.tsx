/**
 * Admin User Detail Page
 *
 * Technical PM Note: Detailed view of individual user with full management capabilities
 * Shows complete user profile, activity history, and administrative controls
 *
 * ✅ CLAUDE.md Compliance:
 * - Server component with auth checking
 * - Repository pattern for data access
 * - Comprehensive error handling
 * - No mock data
 */

import { notFound } from 'next/navigation'
import { checkAdminAuth } from '@/lib/admin/auth'
import { UserDetailClient } from './user-detail-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export const metadata = {
  title: 'User Details | Admin',
  description: 'View and manage individual user details',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function getUserDetails(userId: string) {
  try {
    // Use the repository directly instead of fetching from API
    // This avoids authentication issues and is more efficient
    const { ProfilesRepository } = await import('@/lib/repositories/profiles-repository')
    const repository = ProfilesRepository.getInstance()

    const userWithStats = await repository.getUserWithStats(userId)

    if (!userWithStats) {
      return null
    }

    // Map the repository data to match client component expectations
    // The repository returns recent_activity, recent_scrapes, recent_documents
    // But we need to map them properly for the client component
    return {
      ...userWithStats,
      // Ensure these arrays exist even if empty
      recent_activity: userWithStats.recent_activity || [],
      scrapes: userWithStats.recent_scrapes || [],
      documents: userWithStats.recent_documents || []
    }
  } catch (error) {
    // CLAUDE.md: No console.error - use permanentLogger
    permanentLogger.captureError('ADMIN_USER_PAGE', error as Error, {
      operation: 'getUserDetails',
      userId
    })
    throw error
  }
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  try {
    // Check admin authentication - will redirect if not admin
    await checkAdminAuth()

    // Await params (Next.js 15 requirement)
    const { id } = await params

    // Fetch user details
    const userDetails = await getUserDetails(id)

    if (!userDetails) {
      notFound()
    }

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>

          <div className="flex-1">
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-muted-foreground">
              Managing: {userDetails.email}
            </p>
          </div>
        </div>

        {/* User Detail Client Component */}
        <UserDetailClient user={userDetails} />
      </div>
    )
  } catch (error) {
    // Check if it's an auth error
    if ((error as any)?.message?.includes('Unauthorized')) {
      // Auth error - user will be redirected
      return null
    }

    // Other error - show error state
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load user details</AlertTitle>
          <AlertDescription>
            There was an error loading this user&apos;s information. Please try again.
          </AlertDescription>
        </Alert>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }
}