import Link from 'next/link'
import { Sparkles, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-semibold text-white">
                Project Genie
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              AI-powered project management documentation, built by PMs for PMs.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Home
              </Link>
              <Link href="/how-it-works" className="block text-gray-400 hover:text-white transition-colors text-sm">
                How It Works
              </Link>
              <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Pricing
              </Link>
              <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Contact
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Get in Touch</h3>
            <div className="space-y-2">
              <a 
                href="mailto:hello@bigfluffy.ai" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <Mail className="h-4 w-4" />
                hello@bigfluffy.ai
              </a>
              <p className="text-sm text-gray-400">
                We respond to all inquiries within 24 hours
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2025 Project Genie. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}