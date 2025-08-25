import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'nodejs',
    env: {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      groqKeyPrefix: process.env.GROQ_API_KEY?.substring(0, 10),
      hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    }
  })
}

// Also support POST for testing
export async function POST() {
  return GET()
}