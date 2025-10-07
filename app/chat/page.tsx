import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
          {/* Construction Icon */}
          <div className="mb-8">
            <Construction className="w-24 h-24 text-orange-500" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Help Center
          </h1>

          {/* Main Message */}
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-3">
            Documentation coming soon - Stu's aware 😊
          </p>

          {/* Secondary Message */}
          <p className="text-base text-gray-500 dark:text-gray-500 mb-12">
            This feature is being built and will be available soon!
          </p>

          {/* Progress Bar */}
          <div className="w-full max-w-md">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: '50%' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
