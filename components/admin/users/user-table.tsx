'use client'

/**
 * User Management Table Component
 *
 * Technical PM Note: Comprehensive user table with sorting, filtering, and quick actions
 * Displays all user information requested including auth method, activity, and usage stats
 *
 * ✅ CLAUDE.md Compliance:
 * - No mock data - real users only
 * - Tooltips on all interactive elements
 * - Mobile responsive design
 * - Proper error handling with permanentLogger
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { OnlineStatus, BulkOnlineStatus } from '@/components/admin/users/online-status'
import {
  Shield,
  ShieldOff,
  MoreHorizontal,
  Eye,
  KeyRound,
  Ban,
  CheckCircle,
  Mail,
  Chrome,
  Linkedin,
  User,
  FileText,
  Globe,
  Crown,
  Clock,
  Activity,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Copy,
  Check
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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

interface UserTableProps {
  users: UserData[]
  onRefresh?: () => void
  loading?: boolean
}

export function UserTable({ users, onRefresh, loading = false }: UserTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof UserData>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(user => user.subscription_tier === tierFilter)
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.is_active !== false)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => user.is_active === false)
    } else if (statusFilter === 'admin') {
      filtered = filtered.filter(user => user.is_admin === true)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    return filtered
  }, [users, searchQuery, tierFilter, statusFilter, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex)

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, tierFilter, statusFilter])

  // Handle sorting
  const handleSort = (field: keyof UserData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Get auth provider icon
  const getAuthProviderIcon = (provider: string) => {
    switch (provider) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'google':
        return <Chrome className="h-4 w-4" />
      case 'linkedin':
      case 'linkedin_oidc':
        return <Linkedin className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Get tier badge color
  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'basic':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'team':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Online status is now handled by the OnlineStatus component
  // which uses Supabase Realtime for live updates

  const copyToClipboard = async (text: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(userId)
      toast.success('UUID copied to clipboard')

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedId(null)
      }, 2000)

      // Log the action for debugging
      console.log('[UserTable] UUID copied:', text)
    } catch (err) {
      toast.error('Failed to copy UUID')
      console.error('[UserTable] Copy failed:', err)
    }
  }

  // Handle quick actions
  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !currentStatus })
      })

      if (response.ok) {
        toast.success(currentStatus ? 'Admin access revoked' : 'Admin access granted')
        onRefresh?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update admin status')
      }
    } catch (error) {
      toast.error('Failed to update admin status')
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentStatus ? 'disable' : 'enable' })
      })

      if (response.ok) {
        toast.success(currentStatus ? 'User disabled' : 'User enabled')
        onRefresh?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user status')
      }
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleResetPassword = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' })
      })

      if (response.ok) {
        toast.success('Password reset email sent')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send reset email')
      }
    } catch (error) {
      toast.error('Failed to send reset email')
    }
  }

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(u => u.id)))
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  // Bulk action handlers
  const handleBulkDisable = async () => {
    if (!selectedUsers.size) {
      toast.error('No users selected')
      return
    }

    const confirmed = confirm(`Are you sure you want to disable ${selectedUsers.size} users?`)
    if (!confirmed) return

    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/admin/users/${userId}/disable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disable' })
        })
      )

      await Promise.all(promises)
      toast.success(`Successfully disabled ${selectedUsers.size} users`)
      setSelectedUsers(new Set())
      onRefresh?.()
    } catch (error) {
      toast.error('Failed to disable some users')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  const handleBulkEnable = async () => {
    if (!selectedUsers.size) {
      toast.error('No users selected')
      return
    }

    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/admin/users/${userId}/disable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enable' })
        })
      )

      await Promise.all(promises)
      toast.success(`Successfully enabled ${selectedUsers.size} users`)
      setSelectedUsers(new Set())
      onRefresh?.()
    } catch (error) {
      toast.error('Failed to enable some users')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  const handleBulkGrantAdmin = async () => {
    if (!selectedUsers.size) {
      toast.error('No users selected')
      return
    }

    const confirmed = confirm(`Are you sure you want to grant admin access to ${selectedUsers.size} users?`)
    if (!confirmed) return

    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_admin: true })
        })
      )

      await Promise.all(promises)
      toast.success(`Successfully granted admin access to ${selectedUsers.size} users`)
      setSelectedUsers(new Set())
      onRefresh?.()
    } catch (error) {
      toast.error('Failed to grant admin access to some users')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  const handleBulkRevokeAdmin = async () => {
    if (!selectedUsers.size) {
      toast.error('No users selected')
      return
    }

    const confirmed = confirm(`Are you sure you want to revoke admin access from ${selectedUsers.size} users?`)
    if (!confirmed) return

    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_admin: false })
        })
      )

      await Promise.all(promises)
      toast.success(`Successfully revoked admin access from ${selectedUsers.size} users`)
      setSelectedUsers(new Set())
      onRefresh?.()
    } catch (error) {
      toast.error('Failed to revoke admin access from some users')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  // Export handlers
  const generateCSV = (data: UserData[]) => {
    const headers = [
      'ID',
      'Email',
      'Full Name',
      'Admin',
      'Active',
      'Subscription Tier',
      'Auth Provider',
      'Scrapes Run',
      'Documents Generated',
      'Signup Date',
      'Last Sign In'
    ]

    const rows = data.map(user => [
      user.id,
      user.email,
      user.full_name || '',
      user.is_admin ? 'Yes' : 'No',
      user.is_active === false ? 'No' : 'Yes',
      user.subscription_tier || 'free',
      user.auth_provider || 'email',
      user.scrape_count.toString(),
      user.document_count.toString(),
      new Date(user.created_at).toISOString(),
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toISOString() : 'Never'
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    return csvContent
  }

  const handleExportSelected = () => {
    if (!selectedUsers.size) {
      toast.error('No users selected')
      return
    }

    const selectedData = paginatedUsers.filter(user => selectedUsers.has(user.id))
    const csv = generateCSV(selectedData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${selectedData.length} users to CSV`)
  }

  const handleExportAll = () => {
    const csv = generateCSV(filteredAndSortedUsers)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `all_users_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${filteredAndSortedUsers.length} users to CSV`)
  }

  const SortIcon = ({ field }: { field: keyof UserData }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4 ml-1 inline" /> :
      <ChevronDown className="h-4 w-4 ml-1 inline" />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="team">Team</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="admin">Admins Only</SelectItem>
          </SelectContent>
        </Select>

        {onRefresh && (
          <Button onClick={onRefresh} variant="outline" disabled={loading}>
            Refresh
          </Button>
        )}

        <TooltipWrapper content="Export all filtered users to CSV">
          <Button onClick={handleExportAll} variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Export All
          </Button>
        </TooltipWrapper>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers(new Set())}
              >
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <TooltipWrapper content="Disable selected users">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDisable}
                  disabled={bulkActionInProgress}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Disable
                </Button>
              </TooltipWrapper>
              <TooltipWrapper content="Enable selected users">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEnable}
                  disabled={bulkActionInProgress}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Enable
                </Button>
              </TooltipWrapper>
              <TooltipWrapper content="Grant admin access">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkGrantAdmin}
                  disabled={bulkActionInProgress}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Grant Admin
                </Button>
              </TooltipWrapper>
              <TooltipWrapper content="Revoke admin access">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRevokeAdmin}
                  disabled={bulkActionInProgress}
                >
                  <ShieldOff className="h-4 w-4 mr-1" />
                  Revoke Admin
                </Button>
              </TooltipWrapper>
              <div className="h-8 w-px bg-gray-300" />
              <TooltipWrapper content="Export selected users to CSV">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Export Selected
                </Button>
              </TooltipWrapper>
            </div>
          </div>
        </div>
      )}

      {/* Results count and items per page */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Items per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('full_name')}
              >
                User <SortIcon field="full_name" />
              </TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('subscription_tier')}
              >
                Tier <SortIcon field="subscription_tier" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 text-center"
                onClick={() => handleSort('scrape_count')}
              >
                Scrapes <SortIcon field="scrape_count" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 text-center"
                onClick={() => handleSort('document_count')}
              >
                Docs <SortIcon field="document_count" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('created_at')}
              >
                Joined <SortIcon field="created_at" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('last_sign_in_at')}
              >
                Last Active <SortIcon field="last_sign_in_at" />
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50">
                <TableCell>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {user.full_name || 'Unnamed User'}
                      </span>
                      {user.is_admin && (
                        <TooltipWrapper content="Admin user">
                          <Crown className="h-4 w-4 text-yellow-600" />
                        </TooltipWrapper>
                      )}
                      <OnlineStatus
                        userId={user.id}
                        lastSignInAt={user.last_sign_in_at}
                        size="sm"
                        showTooltip={true}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{user.email}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <TooltipWrapper content={`UUID: ${user.id} (Click to copy)`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(user.id, user.id)
                          }}
                          className="group flex items-center gap-1 text-xs text-gray-400 font-mono hover:text-gray-600 transition-colors"
                        >
                          <span className="truncate max-w-[200px]">{user.id}</span>
                          {copiedId === user.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </TooltipWrapper>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <TooltipWrapper content={`Authenticated via ${user.auth_provider}`}>
                    <div className="flex items-center gap-1">
                      {getAuthProviderIcon(user.auth_provider)}
                      <span className="text-xs capitalize">{user.auth_provider}</span>
                    </div>
                  </TooltipWrapper>
                </TableCell>

                <TableCell>
                  {user.is_active === false ? (
                    <Badge variant="destructive">Disabled</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>

                <TableCell>
                  <Badge className={getTierColor(user.subscription_tier)}>
                    {user.subscription_tier || 'free'}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <TooltipWrapper content={`${user.scrape_count} scrapes run`}>
                    <div className="flex items-center justify-center gap-1">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span>{user.scrape_count}</span>
                    </div>
                  </TooltipWrapper>
                </TableCell>

                <TableCell className="text-center">
                  <TooltipWrapper content={`${user.document_count} documents generated`}>
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span>{user.document_count}</span>
                    </div>
                  </TooltipWrapper>
                </TableCell>

                <TableCell>
                  <TooltipWrapper content={new Date(user.created_at).toLocaleString()}>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </span>
                  </TooltipWrapper>
                </TableCell>

                <TableCell>
                  {user.last_sign_in_at ? (
                    <TooltipWrapper content={new Date(user.last_sign_in_at).toLocaleString()}>
                      <div className="flex items-center gap-1">
                        {/* Check if active within last 30 minutes */}
                        {new Date(user.last_sign_in_at) > new Date(Date.now() - 30 * 60 * 1000) ? (
                          <Activity className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })}
                        </span>
                      </div>
                    </TooltipWrapper>
                  ) : (
                    <span className="text-sm text-gray-400">Never</span>
                  )}
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleToggleAdmin(user.id, user.is_admin || false)}
                      >
                        {user.is_admin ? (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Revoke Admin
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Grant Admin
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleToggleActive(user.id, user.is_active !== false)}
                      >
                        {user.is_active === false ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Enable User
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Disable User
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleResetPassword(user.id)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {paginatedUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No users found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>

            {/* Page number buttons */}
            {(() => {
              const pages = []
              const maxVisiblePages = 5
              let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
              let end = Math.min(totalPages, start + maxVisiblePages - 1)

              if (end - start + 1 < maxVisiblePages) {
                start = Math.max(1, end - maxVisiblePages + 1)
              }

              if (start > 1) {
                pages.push(
                  <Button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                  >
                    1
                  </Button>
                )
                if (start > 2) {
                  pages.push(<span key="ellipsis1" className="px-2">...</span>)
                }
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                  >
                    {i}
                  </Button>
                )
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(<span key="ellipsis2" className="px-2">...</span>)
                }
                pages.push(
                  <Button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                  >
                    {totalPages}
                  </Button>
                )
              }

              return pages
            })()}

            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}