'use client'

import { motion } from 'framer-motion'
import { Construction, Hammer, Wrench, HardHat } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface UnderConstructionProps {
  title?: string
  message?: string
}

export function UnderConstruction({ 
  title = "Under Construction",
  message = "Stu's aware 😊"
}: UnderConstructionProps) {
  const tools = [
    { Icon: Hammer, delay: 0 },
    { Icon: Wrench, delay: 0.2 },
    { Icon: HardHat, delay: 0.4 }
  ]

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-lg w-full p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20 
          }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <Construction className="h-24 w-24 text-orange-500" />
            
            {/* Animated tools */}
            <div className="absolute inset-0 flex items-center justify-center">
              {tools.map(({ Icon, delay }, index) => (
                <motion.div
                  key={index}
                  className="absolute"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1, 1, 0],
                    x: [0, (index - 1) * 40, (index - 1) * 40, 0],
                    y: [0, -30, -30, 0],
                    rotate: [0, 15 * (index % 2 ? 1 : -1), 15 * (index % 2 ? 1 : -1), 0]
                  }}
                  transition={{
                    delay,
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "loop",
                    times: [0, 0.2, 0.8, 1]
                  }}
                >
                  <Icon className="h-6 w-6 text-gray-600" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
            {message}
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-500">
            This feature is being built and will be available soon!
          </p>
        </motion.div>

        {/* Animated progress bar */}
        <motion.div 
          className="mt-8 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "60%", "30%", "80%", "45%"] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </Card>
    </div>
  )
}