/**
 * Scraper Scoring Utilities
 *
 * Provides scoring functions for scraper configurations
 * CLAUDE.md Compliant - Extracted from inline component code
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Configuration interface for Playwright stealth settings
 */
interface PlaywrightStealthConfig {
  stealthEnabled: boolean
  fingerprint: boolean
  humanBehavior: boolean
  blockWebRTC: boolean
  blockCanvasFingerprint: boolean
  randomizeTimers: boolean
  randomizeScroll: boolean
  randomDelay: boolean
  stealthEvasions: string[]
}

/**
 * Calculate stealth score based on Playwright configuration
 *
 * Scoring breakdown:
 * - Base stealth enabled: 20 points
 * - Fingerprint protection: 15 points
 * - Human behavior simulation: 15 points
 * - WebRTC blocking: 10 points
 * - Canvas fingerprint blocking: 10 points
 * - Timer randomization: 10 points
 * - Scroll randomization: 5 points
 * - Random delays: 5 points
 * - Each evasion technique: 2 points
 *
 * @param config - Playwright stealth configuration object
 * @returns Score from 0-100 representing stealth effectiveness
 */
export function calculateStealthScore(config: PlaywrightStealthConfig): number {
  try {
    let score = 0

    // Core stealth features
    if (config.stealthEnabled) score += 20
    if (config.fingerprint) score += 15
    if (config.humanBehavior) score += 15

    // Detection prevention features
    if (config.blockWebRTC) score += 10
    if (config.blockCanvasFingerprint) score += 10

    // Behavior randomization
    if (config.randomizeTimers) score += 10
    if (config.randomizeScroll) score += 5
    if (config.randomDelay) score += 5

    // Additional evasions
    if (config.stealthEvasions && Array.isArray(config.stealthEvasions)) {
      score += config.stealthEvasions.length * 2
    }

    // Cap at 100
    const finalScore = Math.min(score, 100)

    permanentLogger.debug('SCRAPER_SCORING', 'Calculated stealth score', {
      config,
      calculatedScore: score,
      finalScore
    })

    return finalScore
  } catch (error) {
    permanentLogger.captureError('SCRAPER_SCORING', error as Error, {
      context: 'calculateStealthScore',
      config
    })
    return 0
  }
}

/**
 * Get stealth score description based on score value
 *
 * @param score - Score value from 0-100
 * @returns Human-readable description of stealth level
 */
export function getStealthScoreDescription(score: number): string {
  if (score >= 90) return 'Excellent - Maximum anti-detection'
  if (score >= 70) return 'Good - Strong stealth protection'
  if (score >= 50) return 'Moderate - Basic protection enabled'
  if (score >= 30) return 'Low - Limited stealth features'
  return 'Minimal - Consider enabling more features'
}

/**
 * Get stealth score color for UI display
 *
 * @param score - Score value from 0-100
 * @returns Tailwind color class for the score
 */
export function getStealthScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500'
  if (score >= 70) return 'text-blue-500'
  if (score >= 50) return 'text-yellow-500'
  if (score >= 30) return 'text-orange-500'
  return 'text-red-500'
}