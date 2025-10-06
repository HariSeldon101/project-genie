'use client'

import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComparisonRow {
  feature: string
  adhoc: string | boolean
  ourPlatform: string | boolean
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Consistency",
    adhoc: "Varies by user skill",
    ourPlatform: "Refined by qualified PMs + industry standards"
  },
  {
    feature: "Compliance",
    adhoc: "No guarantee",
    ourPlatform: "Outputs benchmarked against PMI/PRINCE2/Agile"
  },
  {
    feature: "Privacy",
    adhoc: "Manual, error-prone",
    ourPlatform: "Multi-stage sanitisation across the workflow"
  },
  {
    feature: "Context",
    adhoc: "Generic outputs",
    ourPlatform: "Researches your industry + lessons learned"
  },
  {
    feature: "Quality",
    adhoc: "Depends on phrasing",
    ourPlatform: "Trained on thousands of practitioner-reviewed reports"
  },
  {
    feature: "Versioning",
    adhoc: "Manual copies",
    ourPlatform: "Built-in version control & doc history"
  },
  {
    feature: "Risk Management",
    adhoc: "Not included",
    ourPlatform: "Proactive PM 'agents' assess risks"
  },
  {
    feature: "Human Role",
    adhoc: "Risk of being sidelined",
    ourPlatform: "PM empowered to lead and add unique value"
  }
]

export function ComparisonTable() {
  const [visibleRows, setVisibleRows] = useState<number[]>([])

  useEffect(() => {
    // Animate rows appearing one by one
    const timer = setTimeout(() => {
      comparisonData.forEach((_, index) => {
        setTimeout(() => {
          setVisibleRows(prev => [...prev, index])
        }, index * 150)
      })
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-blue-500/20">
            <th className="text-left py-4 px-4 text-lg font-semibold text-white">
              Feature
            </th>
            <th className="text-left py-4 px-4 text-lg font-semibold text-gray-400">
              Ad-hoc AI Prompts
            </th>
            <th className="text-left py-4 px-4 text-lg font-semibold text-blue-400">
              Our SaaS Framework
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((row, index) => (
            <tr 
              key={row.feature}
              className={cn(
                "border-b border-white/5 transition-all duration-500",
                visibleRows.includes(index) 
                  ? "opacity-100 translate-x-0" 
                  : "opacity-0 -translate-x-4",
                index % 2 === 0 ? "bg-white/[0.02]" : ""
              )}
            >
              <td className="py-4 px-4 font-medium text-white">
                {row.feature}
              </td>
              <td className="py-4 px-4 text-gray-400">
                <div className="flex items-start gap-2">
                  {typeof row.adhoc === 'boolean' ? (
                    row.adhoc ? (
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <span className="text-sm">{row.adhoc}</span>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-start gap-2">
                  {typeof row.ourPlatform === 'boolean' ? (
                    row.ourPlatform ? (
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <span className="text-sm text-blue-300 font-medium">
                      {row.ourPlatform}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}