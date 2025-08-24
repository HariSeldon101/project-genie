'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function Navigation() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8">
      <div className="flex lg:flex-1">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold text-white">
            Project Genie
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-6">
        <Link href="/how-it-works" className="text-white/80 hover:text-white transition-colors">
          How It Works
        </Link>
        <Link href="/pricing" className="text-white/80 hover:text-white transition-colors">
          Pricing
        </Link>
        <div className="flex gap-4">
          {loading ? (
            <div className="w-24 h-10 bg-white/10 rounded animate-pulse" />
          ) : user ? (
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <User className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started Free</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}