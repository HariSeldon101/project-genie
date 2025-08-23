import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function Navigation() {
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
          <Link href="/login">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started Free</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}