/**
 * User Credits API - Simple Next.js Pattern
 *
 * This is the STANDARD Next.js pattern - client components call API routes.
 * No repositories, no complex inheritance, just simple database queries.
 *
 * GET: Fetch user's credit balance
 * POST: Update user's credit balance
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Standard server-side Supabase client (needs await in server context)
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Simple direct query - no repository needed
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Failed to fetch credits:', error)
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      credits: profile?.credits_balance || 0,
      userId: user.id
    })

  } catch (error) {
    console.error('Credits API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { credits } = await req.json()

    if (typeof credits !== 'number' || credits < 0) {
      return NextResponse.json(
        { error: 'Invalid credits value' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Simple direct update - no repository needed
    const { error } = await supabase
      .from('profiles')
      .update({ credits_balance: credits })
      .eq('id', user.id)

    if (error) {
      console.error('Failed to update credits:', error)
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      credits
    })

  } catch (error) {
    console.error('Credits API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}