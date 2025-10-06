'use client'

/**
 * User Management Client Component
 *
 * Technical PM Note: Client-side component for user management functionality
 * Handles real-time updates, filtering, and user actions
 *
 * ✅ CLAUDE.md Compliance:
 * - No mock data - uses real API responses
 * - Proper error handling with toast notifications
 * - Responsive design with shadcn/ui components
 */

import { useState, useCallback } from 'react'
import { UserTable } from '@/components/admin/users/user-table'
import { BulkOnlineStatus } from '@/components/admin/users/online-status'
import { toast } from 'sonner'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UserData {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean | null
  is_active: boolean | null
  subscription_tier: string | null
  created_at: string
  updated_at: string
  scrape_count: number
  document_count: number
  auth_provider: string
  last_sign_in_at: string | null
}

interface UserManagementClientProps {
  initialUsers: UserData[]
}

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers)
  const [loading, setLoading] = useState(false)

  // Refresh user data
  const refreshUsers = useCallback(async () => {
    setLoading(true)

    permanentLogger.breadcrumb('user_refresh', 'Refreshing user list', {
      timestamp: Date.now()
    })

    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])

      permanentLogger.info('USER_MANAGEMENT', 'User list refreshed', {
        userCount: data.users?.length || 0
      })

      toast.success('User list refreshed')
    } catch (error) {
      permanentLogger.captureError('USER_MANAGEMENT', error as Error, {
        operation: 'refreshUsers'
      })

      toast.error('Failed to refresh users')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header with refresh and online count */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">All Users</h2>
          <BulkOnlineStatus userIds={users.map(u => u.id)} />
        </div>
        <Button
          onClick={refreshUsers}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* User Table */}
      <UserTable
        users={users}
        onRefresh={refreshUsers}
        loading={loading}
      />
    </div>
  )
}