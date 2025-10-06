'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Settings,
  FileText,
  Server,
  Shield,
  Activity,
  Database,
  Users
} from 'lucide-react'
import { LLMProviderConfig } from '@/components/admin/provider-config'
import { PromptEditor } from '@/components/admin/prompt-editor'
import { AdminStats } from '@/components/admin/admin-stats'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('provider')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage LLM providers, system prompts, and application settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <Users className="mr-2 h-4 w-4" />
              User Management
            </Link>
          </Button>
          <Badge variant="destructive" className="text-sm">
            Admin Access
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <AdminStats />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="provider" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            LLM Provider
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="space-y-4">
          <LLMProviderConfig />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <PromptEditor />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>
                View system health, API usage, and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">API Calls Today</span>
                      <Activity className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2">1,247</p>
                    <p className="text-xs text-muted-foreground">+12% from yesterday</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Response Time</span>
                      <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2">2.3s</p>
                    <p className="text-xs text-muted-foreground">Within normal range</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Error Rate</span>
                      <Activity className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2">0.2%</p>
                    <p className="text-xs text-muted-foreground">3 errors today</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure global application settings and feature flags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable access for non-admin users
                    </p>
                  </div>
                  <Badge variant="outline">Disabled</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Debug Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Enable verbose logging and error details
                    </p>
                  </div>
                  <Badge variant="outline">Disabled</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">API Rate Limiting</p>
                    <p className="text-sm text-muted-foreground">
                      Current limit: 100 requests per minute
                    </p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}