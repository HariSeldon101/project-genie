'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBrowserClient } from '@supabase/ssr'
import { 
  FileText, 
  Save, 
  RotateCcw, 
  Code2,
  Variable,
  History,
  Loader2,
  CheckCircle
} from 'lucide-react'

interface PromptTemplate {
  id: string
  prompt_key: string
  prompt_name: string
  system_prompt: string
  user_prompt: string
  variables: string[]
  version: number
  is_active: boolean
}

const PROMPT_KEYS = [
  { key: 'prince2_pid', name: 'PRINCE2 Project Initiation Document' },
  { key: 'prince2_business_case', name: 'PRINCE2 Business Case' },
  { key: 'prince2_risk_register', name: 'PRINCE2 Risk Register' },
  { key: 'prince2_project_plan', name: 'PRINCE2 Project Plan' },
  { key: 'agile_charter', name: 'Agile Project Charter' },
  { key: 'agile_backlog', name: 'Agile Product Backlog' },
  { key: 'agile_sprint_plan', name: 'Agile Sprint Plan' },
  { key: 'hybrid_overview', name: 'Hybrid Project Overview' }
]

export function PromptEditor() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [editedTemplate, setEditedTemplate] = useState<PromptTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [tokenCount, setTokenCount] = useState({ system: 0, user: 0 })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (editedTemplate) {
      // Simple token estimation (1 token ≈ 4 characters)
      setTokenCount({
        system: Math.ceil((editedTemplate.system_prompt || '').length / 4),
        user: Math.ceil((editedTemplate.user_prompt || '').length / 4)
      })
    }
  }, [editedTemplate])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('prompt_key')

      if (error) throw error

      // If no templates exist, create defaults
      if (!data || data.length === 0) {
        await createDefaultTemplates()
        await loadTemplates() // Reload after creating defaults
        return
      }

      setTemplates(data)
      if (data.length > 0) {
        setSelectedTemplate(data[0])
        setEditedTemplate(data[0])
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      setMessage('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultTemplates = async () => {
    const defaultTemplates = [
      {
        prompt_key: 'prince2_pid',
        prompt_name: 'PRINCE2 Project Initiation Document',
        system_prompt: `You are a certified Prince2 Practitioner creating a Project Initiation Document (PID).
You have extensive experience with Prince2 governance, management products, and best practices.
Generate formal, comprehensive documentation that adheres to Prince2 methodology.
IMPORTANT: Use placeholder tokens for people names (e.g., [EXECUTIVE], [SENIOR_USER], [SENIOR_SUPPLIER]).`,
        user_prompt: `Create a comprehensive Prince2 Project Initiation Document (PID) for:

Project Name: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}
Description: {{description}}
Company Website: {{companyWebsite}}
Industry Sector: {{sector}}

Additional Stakeholders:
{{stakeholders}}`,
        variables: ['projectName', 'vision', 'businessCase', 'description', 'companyWebsite', 'sector', 'stakeholders'],
        is_active: true
      }
    ]

    for (const template of defaultTemplates) {
      await supabase.from('prompt_templates').insert(template)
    }
  }

  const handleTemplateSelect = (promptKey: string) => {
    const template = templates.find(t => t.prompt_key === promptKey)
    if (template) {
      setSelectedTemplate(template)
      setEditedTemplate({ ...template })
      setMessage('')
    }
  }

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const variables = new Set<string>()
    let match
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1])
    }
    return Array.from(variables)
  }

  const saveTemplate = async () => {
    if (!editedTemplate) return

    setSaving(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Extract variables from the prompts
      const systemVars = extractVariables(editedTemplate.system_prompt)
      const userVars = extractVariables(editedTemplate.user_prompt)
      const allVars = Array.from(new Set([...systemVars, ...userVars]))

      const updatedTemplate = {
        ...editedTemplate,
        variables: allVars,
        version: editedTemplate.version + 1,
        updated_by: user?.id
      }

      const { error } = await supabase
        .from('prompt_templates')
        .update({
          system_prompt: updatedTemplate.system_prompt,
          user_prompt: updatedTemplate.user_prompt,
          variables: updatedTemplate.variables,
          version: updatedTemplate.version
        })
        .eq('id', editedTemplate.id)

      if (error) throw error

      // Save to history
      await supabase
        .from('prompt_history')
        .insert({
          prompt_template_id: editedTemplate.id,
          system_prompt: editedTemplate.system_prompt,
          user_prompt: editedTemplate.user_prompt,
          version: editedTemplate.version,
          changed_by: user?.id,
          change_reason: 'Admin update'
        })

      setMessage('Template saved successfully!')
      setSelectedTemplate(updatedTemplate)
      await loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      setMessage('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const resetTemplate = () => {
    if (selectedTemplate) {
      setEditedTemplate({ ...selectedTemplate })
      setMessage('Template reset to last saved version')
    }
  }

  const variables = editedTemplate ? extractVariables(editedTemplate.user_prompt) : []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>System Prompt Editor</CardTitle>
          <CardDescription>
            Edit and manage AI prompts for document generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selector */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={selectedTemplate?.prompt_key}
              onValueChange={handleTemplateSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a prompt template" />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_KEYS.map(prompt => (
                  <SelectItem key={prompt.key} value={prompt.key}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {prompt.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editedTemplate && (
            <>
              {/* Template Info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Version {editedTemplate.version}</Badge>
                  {editedTemplate.is_active && (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code2 className="h-4 w-4" />
                  Tokens: {tokenCount.system + tokenCount.user} total
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>System Prompt</Label>
                  <span className="text-xs text-muted-foreground">
                    {tokenCount.system} tokens
                  </span>
                </div>
                <Textarea
                  value={editedTemplate.system_prompt}
                  onChange={(e) => setEditedTemplate({
                    ...editedTemplate,
                    system_prompt: e.target.value
                  })}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="Enter the system prompt that defines the AI's role and behavior..."
                />
              </div>

              {/* User Prompt Template */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>User Prompt Template</Label>
                  <span className="text-xs text-muted-foreground">
                    {tokenCount.user} tokens
                  </span>
                </div>
                <Textarea
                  value={editedTemplate.user_prompt}
                  onChange={(e) => setEditedTemplate({
                    ...editedTemplate,
                    user_prompt: e.target.value
                  })}
                  rows={12}
                  className="font-mono text-sm"
                  placeholder="Enter the user prompt template with {{variables}}..."
                />
              </div>

              {/* Variables Preview */}
              {variables.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Variable className="h-4 w-4" />
                    Template Variables
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {variables.map(variable => (
                      <Badge key={variable} variant="secondary">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {message && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={saveTemplate}
                  disabled={saving || loading}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={resetTemplate}
                  disabled={saving || loading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Changes
                </Button>

                <Button
                  variant="ghost"
                  disabled
                >
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Template Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">System Prompt</p>
              <p className="text-muted-foreground">
                Defines the AI's role, expertise, and behavior. Keep it focused and specific.
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">User Prompt Template</p>
              <p className="text-muted-foreground">
                The actual request with placeholders. Use {`{{variable}}`} syntax for dynamic content.
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Variables</p>
              <p className="text-muted-foreground">
                Automatically extracted from templates. These will be replaced with actual project data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}