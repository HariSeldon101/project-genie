'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const testSignup = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      setResult({
        success: !error,
        data,
        error,
        message: error ? error.message : 'Signup successful! Check your email.'
      })
    } catch (err: any) {
      setResult({
        success: false,
        error: err,
        message: err.message || 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setResult({
        success: !error,
        data,
        error,
        message: error ? error.message : 'Login successful!'
      })
    } catch (err: any) {
      setResult({
        success: false,
        error: err,
        message: err.message || 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const checkSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    setResult({
      success: !error,
      session,
      error,
      message: session ? `Logged in as: ${session.user.email}` : 'No active session'
    })
  }

  const testSignout = async () => {
    const { error } = await supabase.auth.signOut()
    setResult({
      success: !error,
      error,
      message: error ? error.message : 'Signed out successfully'
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Auth Testing Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testSignup} disabled={loading || !email || !password}>
              Test Signup
            </Button>
            <Button onClick={testLogin} disabled={loading || !email || !password} variant="secondary">
              Test Login
            </Button>
            <Button onClick={checkSession} disabled={loading} variant="outline">
              Check Session
            </Button>
            <Button onClick={testSignout} disabled={loading} variant="destructive">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
              {result.success ? 'Success' : 'Error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 font-medium">{result.message}</p>
            
            <details>
              <summary className="cursor-pointer text-sm text-gray-600 mb-2">
                View Full Response
              </summary>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">Debugging Info</h3>
        <ul className="text-sm space-y-1">
          <li>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
          <li>App URL: {typeof window !== 'undefined' ? window.location.origin : 'loading...'}</li>
          <li>Callback URL: {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'loading...'}</li>
        </ul>
      </div>
    </div>
  )
}