'use client'

import { useState, useEffect } from 'react'
import { DocumentGenerator } from '@/components/document-generator'
import { createBrowserClient } from '@supabase/ssr'
import { v4 as uuidv4 } from 'uuid'

export default function TestGenerationPage() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const testProjectData = {
    projectName: 'Digital Transformation Initiative',
    vision: 'To modernize our operations and enhance customer experience',
    businessCase: 'Improve efficiency, reduce costs, and increase customer satisfaction',
    description: 'A comprehensive digital transformation program',
    companyWebsite: 'https://example.com',
    methodology: 'prince2' as const,
    sector: 'Technology',
    stakeholders: [
      { name: 'John Smith', email: 'john@example.com', role: 'Project Sponsor' },
      { name: 'Jane Doe', email: 'jane@example.com', role: 'Business Analyst' }
    ],
    agilometer: {
      flexibility: 70,
      teamExperience: 80,
      riskTolerance: 60,
      documentation: 50,
      governance: 40
    }
  }
  
  useEffect(() => {
    // Create a test project in the database
    const createTestProject = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please log in to test generation')
          setLoading(false)
          return
        }
        
        // Ensure user exists in public.users table
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || 'Test User'
          }, {
            onConflict: 'id'
          })
        
        if (userError) {
          console.error('Failed to ensure user exists:', userError)
        }
        
        // First, try to find an existing test project
        const { data: existingProject } = await supabase
          .from('projects')
          .select('id')
          .eq('name', 'Test Document Generation')
          .eq('owner_id', user.id)
          .single()
        
        if (existingProject) {
          // Use existing test project
          setProjectId(existingProject.id)
          setLoading(false)
          return
        }
        
        // Create a new test project
        const testProjectId = uuidv4()
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            id: testProjectId,
            name: 'Test Document Generation',
            description: 'Testing document generation with AI',
            methodology_type: 'prince2',  // Fixed: use methodology_type
            owner_id: user.id,  // Fixed: use owner_id not created_by
            rag_status: 'amber',
            vision: 'To test AI document generation',
            business_case: 'Validate the document generation system works correctly'
          })
          .select('id')
          .single()
        
        if (projectError) {
          console.error('Failed to create test project:', projectError)
          // Add more detailed error message
          const errorMessage = projectError.message || projectError.details || 'Failed to create test project'
          setError(`Database error: ${errorMessage}`)
        } else {
          setProjectId(testProjectId)
        }
      } catch (err) {
        console.error('Error setting up test:', err)
        setError('Failed to initialize test')
      } finally {
        setLoading(false)
      }
    }
    
    createTestProject()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h1 className="text-3xl font-bold mb-8">Setting up test environment...</h1>
        </div>
      </div>
    )
  }
  
  if (error || !projectId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p className="text-red-400">{error || 'Failed to create test project'}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Test Document Generation</h1>
        <DocumentGenerator 
          projectId={projectId}
          projectData={testProjectData}
          onComplete={(docs) => console.log('Documents generated:', docs)}
        />
      </div>
    </div>
  )
}