'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Star, Eye, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface BugReport {
  id: string
  title: string
  description: string
  severity: number
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  user_id: string
  project_id?: string
  screenshot_url?: string
  screenshot2_url?: string
  resolution_notes?: string
  resolved_by?: string
  resolved_at?: string
  confirmed_by_user?: boolean
  project?: {
    name: string
  }
  profiles?: {
    email: string
    full_name: string
  }
}

interface BugListProps {
  projectId?: string
  showAllProjects?: boolean
  onSelectBug?: (bug: BugReport) => void
}

export function BugList({ projectId, showAllProjects = false, onSelectBug }: BugListProps) {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchBugs()
  }, [projectId, statusFilter, severityFilter])

  const fetchBugs = async () => {
    try {
      // Fetch bug reports without foreign key syntax
      let query = supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (!showAllProjects && projectId) {
        query = query.eq('project_id', projectId)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', parseInt(severityFilter))
      }

      const { data: bugsData, error: bugsError } = await query

      console.log('Bug fetch result:', { bugsData, bugsError })
      
      if (bugsError) {
        console.error('Error fetching bugs:', bugsError)
        setBugs([])
        return
      }

      // If we have bugs, manually fetch related data
      if (bugsData && bugsData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(bugsData.map(b => b.user_id).filter(Boolean))]
        
        // Fetch profiles separately
        const profilesMap: Record<string, any> = {}
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds)
          
          console.log('Profiles fetch:', { profilesData, profilesError })
          
          if (profilesData && !profilesError) {
            profilesData.forEach(p => {
              profilesMap[p.id] = p
            })
          }
        }
        
        // Get unique project IDs
        const projectIds = [...new Set(bugsData.map(b => b.project_id).filter(Boolean))]
        
        // Fetch projects separately
        const projectsMap: Record<string, any> = {}
        if (projectIds.length > 0) {
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
          
          console.log('Projects fetch:', { projectsData, projectsError })
          
          if (projectsData && !projectsError) {
            projectsData.forEach(p => {
              projectsMap[p.id] = p
            })
          }
        }
        
        // Combine the data
        const enrichedBugs = bugsData.map(bug => ({
          ...bug,
          profiles: profilesMap[bug.user_id] || null,
          project: projectsMap[bug.project_id] || null
        }))
        
        console.log('Enriched bugs:', enrichedBugs)
        setBugs(enrichedBugs)
      } else {
        console.log('No bugs found or empty result')
        setBugs([])
      }
    } catch (error) {
      console.error('Error fetching bugs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'investigating':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive'
      case 'investigating':
        return 'outline'
      case 'resolved':
        return 'secondary'
      case 'closed':
        return 'default'
      default:
        return 'default'
    }
  }

  const getSeverityStars = (severity: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= severity
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Loading bug reports...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="5">Critical (5)</SelectItem>
            <SelectItem value="4">High (4)</SelectItem>
            <SelectItem value="3">Medium (3)</SelectItem>
            <SelectItem value="2">Low (2)</SelectItem>
            <SelectItem value="1">Minor (1)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {bugs.length} {bugs.length === 1 ? 'issue' : 'issues'}
        </div>
      </div>

      {bugs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No bug reports found</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                {showAllProjects && <TableHead>Project</TableHead>}
                <TableHead>Reporter</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bugs.map((bug) => (
                <TableRow key={bug.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(bug.status)}
                      <Badge variant={getStatusBadgeVariant(bug.status) as any}>
                        {bug.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{bug.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                        {bug.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getSeverityStars(bug.severity)}</TableCell>
                  {showAllProjects && (
                    <TableCell>{bug.project?.name || 'No project'}</TableCell>
                  )}
                  <TableCell className="text-sm">
                    {bug.profiles?.full_name || bug.profiles?.email || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(bug.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectBug?.(bug)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}