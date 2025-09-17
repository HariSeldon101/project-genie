'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Users, 
  FileText, 
  Server,
  Activity
} from 'lucide-react'

export function AdminStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalDocuments: 0,
    currentProvider: 'Loading...'
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      // Get document count
      const { count: documentCount } = await supabase
        .from('artifacts')
        .select('*', { count: 'exact', head: true })

      // Get current LLM provider
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'llm_config')
        .single()

      const provider = settings?.setting_value?.provider || 'Not configured'
      const model = settings?.setting_value?.model || ''

      setStats({
        totalUsers: userCount || 0,
        totalProjects: projectCount || 0,
        totalDocuments: documentCount || 0,
        currentProvider: model ? `${provider} (${model})` : provider
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold">{stats.totalProjects}</p>
            </div>
            <FileText className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Documents Generated</p>
              <p className="text-2xl font-bold">{stats.totalDocuments}</p>
            </div>
            <Activity className="h-8 w-8 text-purple-500 opacity-20" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Provider</p>
              <p className="text-sm font-bold truncate">{stats.currentProvider}</p>
            </div>
            <Server className="h-8 w-8 text-orange-500 opacity-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}