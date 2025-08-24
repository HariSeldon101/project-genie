import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  // Simplified version - just redirect to test if the route works
  console.log('Auth callback called with code:', code?.substring(0, 8))
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }
  
  // For now, just redirect to the dashboard to test if the route is working
  // We'll add the Supabase logic back once we confirm the route works
  return NextResponse.redirect(new URL(`/login?info=callback_received&code=${code.substring(0, 8)}`, requestUrl.origin))
}