'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  items: FAQItem[]
  className?: string
}

export function FAQ({ items, className }: FAQProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => {
        const isOpen = openItems.has(index)
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.1,
              duration: 0.5,
              ease: [0.23, 1, 0.32, 1]
            }}
            className="group"
          >
            <motion.div
              className={cn(
                "backdrop-blur-md border rounded-lg transition-all duration-300",
                isOpen 
                  ? "bg-white/10 border-blue-500/50 shadow-lg shadow-blue-500/20" 
                  : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
              )}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="text-lg font-medium text-white pr-4">
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-shrink-0"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                    isOpen 
                      ? "bg-blue-500/20 text-blue-400" 
                      : "bg-white/10 text-gray-400 group-hover:bg-white/20 group-hover:text-white"
                  )}>
                    {isOpen ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>
                </motion.div>
              </button>
              
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-answer-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: "auto", 
                      opacity: 1,
                      transition: {
                        height: {
                          duration: 0.4,
                          ease: [0.23, 1, 0.32, 1]
                        },
                        opacity: {
                          duration: 0.25,
                          delay: 0.1
                        }
                      }
                    }}
                    exit={{ 
                      height: 0, 
                      opacity: 0,
                      transition: {
                        height: {
                          duration: 0.3,
                          ease: [0.23, 1, 0.32, 1]
                        },
                        opacity: {
                          duration: 0.2
                        }
                      }
                    }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5">
                      <div className="border-t border-white/10 pt-4">
                        <motion.p 
                          initial={{ y: -10 }}
                          animate={{ y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="text-gray-300 leading-relaxed"
                        >
                          {item.answer}
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

// Compound component for more control
export function FAQSection({ 
  title, 
  subtitle, 
  items, 
  className 
}: { 
  title: string
  subtitle?: string
  items: FAQItem[]
  className?: string 
}) {
  return (
    <div className={className}>
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
        {subtitle && (
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">{subtitle}</p>
        )}
      </div>
      <FAQ items={items} />
    </div>
  )
}