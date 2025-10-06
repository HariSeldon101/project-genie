/**
 * Session Selector Component
 * Dropdown for loading previously scraped website sessions
 */

import React, { useState, useEffect } from 'react'
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Clock, 
  Globe,
  Database,
  Plus,
  Search,
  Filter
} from 'lucide-react'
// import { useSessionManager } from '@/lib/company-intelligence/hooks/use-session-manager' // Archived
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { formatDistanceToNow } from 'date-fns'
import { TooltipWrapper } from './tooltip-wrapper'

// Temporary placeholder for archived hook
// TODO: Implement with CompanyIntelligenceRepository
const useSessionManager = () => ({
  state: {
    sessions: [],
    currentSession: null,
    loading: false,
    error: null
  },
  actions: {
    listSessions: async () => {},
    loadSession: async (id: string) => false,
    saveSession: async (name: string, data: any) => null,
    deleteSession: async (id: string) => false,
    createSession: async () => null
  }
})

interface SessionSelectorProps {
  currentDomain?: string
  onSessionLoad?: (session: any) => void
  onSessionSave?: () => void
  onNewSession?: () => void
  className?: string
}

export function SessionSelector({
  currentDomain,
  onSessionLoad,
  onSessionSave,
  onNewSession,
  className
}: SessionSelectorProps) {
  const { state, actions } = useSessionManager()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  // Load sessions on mount and filter changes
  useEffect(() => {
    actions.listSessions(filterDomain ? { domain: filterDomain } : undefined)
  }, [filterDomain])

  // Handle session selection
  const handleSessionSelect = async (sessionId: string) => {
    if (sessionId === 'new') {
      if (onNewSession) {
        onNewSession()
      }
      return
    }

    if (sessionId === 'save') {
      setSaveDialogOpen(true)
      return
    }

    // Load the selected session
    const success = await actions.loadSession(sessionId)
    if (success && state.currentSession && onSessionLoad) {
      onSessionLoad(state.currentSession)
      permanentLogger.info('SESSION_SELECTOR', 'Session loaded', {
        sessionId,
        companyName: state.currentSession.company_name || state.currentSession.session_name
      })
    }
  }

  // Handle save session
  const handleSaveSession = async () => {
    if (!sessionName || !currentDomain) {
      return
    }

    const sessionId = await actions.createNewSession(sessionName, currentDomain)
    if (sessionId) {
      setSaveDialogOpen(false)
      setSessionName('')
      
      if (onSessionSave) {
        onSessionSave()
      }

      permanentLogger.info('SESSION_SELECTOR', 'Session saved', {
        sessionId,
        sessionName,
        domain: currentDomain
      })
    }
  }

  // Handle delete session
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return

    const success = await actions.deleteSession(sessionToDelete)
    if (success) {
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
      
      permanentLogger.info('SESSION_SELECTOR', 'Session deleted', {
        sessionId: sessionToDelete
      })
    }
  }

  // Group sessions by domain
  const groupedSessions = state.sessions.reduce((acc, session) => {
    const domain = session.domain || 'Unknown'
    if (!acc[domain]) {
      acc[domain] = []
    }
    acc[domain].push(session)
    return acc
  }, {} as Record<string, typeof state.sessions>)

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'active': return 'bg-blue-500'
      case 'paused': return 'bg-yellow-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Select
          value={state.currentSession?.id}
          onValueChange={handleSessionSelect}
        >
          <SelectTrigger className="w-full sm:w-[250px] lg:w-[300px]">
            <SelectValue placeholder="Select a session or save current">
              {state.currentSession ? (
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="truncate max-w-[150px] lg:max-w-[200px]">{state.currentSession.company_name || state.currentSession.session_name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">No session loaded</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Actions</SelectLabel>
              <SelectItem value="new">
                <TooltipWrapper content="Start a new research session from scratch">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-500" />
                    <span>New Session</span>
                  </div>
                </TooltipWrapper>
              </SelectItem>
              {currentDomain && (
                <SelectItem value="save">
                  <TooltipWrapper content="Save the current research session for later use">
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4 text-blue-500" />
                      <span>Save Current Session</span>
                    </div>
                  </TooltipWrapper>
                </SelectItem>
              )}
            </SelectGroup>
            
            {state.sessions.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="flex items-center justify-between">
                    <span>Recent Sessions</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowFilter(!showFilter)
                      }}
                    >
                      <Filter className="w-3 h-3" />
                    </Button>
                  </SelectLabel>
                  
                  {showFilter && (
                    <div className="px-2 pb-2">
                      <Input
                        type="text"
                        placeholder="Filter by domain..."
                        value={filterDomain}
                        onChange={(e) => setFilterDomain(e.target.value)}
                        className="h-7 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {Object.entries(groupedSessions).map(([domain, sessions]) => (
                    <div key={domain}>
                      <SelectLabel className="text-xs text-muted-foreground pl-6">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {domain}
                        </div>
                      </SelectLabel>
                      {sessions.map((session) => (
                        <SelectItem 
                          key={session.id} 
                          value={session.id}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-4 h-4" />
                              <div className="flex flex-col">
                                <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">{session.company_name || session.session_name}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                  {session.pages_scraped > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="hidden sm:inline">{session.pages_scraped} pages</span>
                                      <span className="sm:hidden">{session.pages_scraped}p</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div 
                                className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`}
                                title={session.status}
                              />
                              <TooltipWrapper content="Delete this session">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSessionToDelete(session.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </TooltipWrapper>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectGroup>
              </>
            )}

            {state.sessions.length === 0 && (
              <SelectGroup>
                <SelectLabel className="text-center text-muted-foreground py-4">
                  No sessions available
                </SelectLabel>
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        {state.loading && (
          <Badge variant="secondary">
            Loading...
          </Badge>
        )}
      </div>

      {/* Save Session Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Research Session</DialogTitle>
            <DialogDescription>
              Save the current research session for {currentDomain} to load it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Name</label>
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Initial research, Competitor analysis..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveSession()
                  }
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Domain: <Badge variant="outline">{currentDomain}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSession} 
              disabled={!sessionName || state.loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The session and all its data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}