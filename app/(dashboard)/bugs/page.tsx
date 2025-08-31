'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BugReportForm } from '@/components/bug-tracker/bug-report-form'
import { BugList } from '@/components/bug-tracker/bug-list'
import { BugDetailModal } from '@/components/bug-tracker/bug-detail-modal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Bug, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function BugTrackerPage() {
  const [showReportForm, setShowReportForm] = useState(false)
  const [selectedBug, setSelectedBug] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState({
    open: 0,
    investigating: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
    high: 0
  })
  const [isAdmin, setIsAdmin] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchStats()
    checkAdminStatus()
  }, [refreshKey])

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
  }

  const fetchStats = async () => {
    const { data } = await supabase
      .from('bug_reports')
      .select('status, severity')

    if (data) {
      const newStats = {
        open: data.filter(b => b.status === 'open').length,
        investigating: data.filter(b => b.status === 'investigating').length,
        resolved: data.filter(b => b.status === 'resolved').length,
        closed: data.filter(b => b.status === 'closed').length,
        critical: data.filter(b => b.severity === 5).length,
        high: data.filter(b => b.severity === 4).length
      }
      setStats(newStats)
    }
  }

  const handleReportSuccess = () => {
    setShowReportForm(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleBugUpdate = () => {
    setSelectedBug(null)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8 text-red-500" />
            Bug Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Report issues, track bugs, and monitor resolutions
          </p>
        </div>
        <Button onClick={() => setShowReportForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Report Bug
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{stats.open}</span>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Investigating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-yellow-600">{stats.investigating}</span>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">{stats.resolved}</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-600">{stats.closed}</span>
              <CheckCircle className="h-5 w-5 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-700">{stats.critical}</span>
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{stats.high}</span>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bug List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bug Reports</CardTitle>
          <CardDescription>
            Click on a bug to view details and update its status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BugList 
            key={refreshKey}
            showAllProjects={true}
            onSelectBug={setSelectedBug}
          />
        </CardContent>
      </Card>

      {/* New Bug Report Dialog */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report a Bug</DialogTitle>
          </DialogHeader>
          <BugReportForm
            onSuccess={handleReportSuccess}
            onCancel={() => setShowReportForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Bug Detail Modal */}
      {selectedBug && (
        <BugDetailModal
          bug={selectedBug}
          isOpen={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          onUpdate={handleBugUpdate}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}