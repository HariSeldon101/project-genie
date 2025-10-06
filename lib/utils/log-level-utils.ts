/**
 * Centralized Log Level Utility Module
 * 
 * DRY Principle: Single source of truth for all log level handling
 * - Database uses lowercase (debug, info, warn, error, critical)
 * - Display uses uppercase (DEBUG, INFO, WARN, ERROR, CRITICAL)
 * - All conversions happen through these utilities
 */

// Lowercase values matching database constraints
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'metric'

// For display in UI (uppercase)
export const formatLevelForDisplay = (level: string): string => {
  return level.toUpperCase()
}

// For database storage (lowercase) 
export const formatLevelForDatabase = (level: string): string => {
  return level.toLowerCase()
}

// Type guard for valid log levels
export const isValidLogLevel = (level: string): level is LogLevel => {
  const validLevels = ['debug', 'info', 'warn', 'error', 'fatal', 'metric']
  return validLevels.includes(level.toLowerCase())
}

// Get level emoji for console output
export const getLevelEmoji = (level: LogLevel): string => {
  const emojis: Record<LogLevel, string> = {
    debug: '🐛',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '💀',
    metric: '📊'
  }
  return emojis[level] || '📝'
}

// Get level color for console output (ANSI color codes)
export const getLevelColor = (level: LogLevel): string => {
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m',    // Cyan
    info: '\x1b[37m',     // White
    warn: '\x1b[33m',     // Yellow
    error: '\x1b[31m',    // Red
    fatal: '\x1b[91m',    // Bright Red
    metric: '\x1b[34m'    // Blue
  }
  return colors[level] || '\x1b[37m'
}

// Get numeric priority for level (higher = more severe)
export const getLevelPriority = (level: LogLevel): number => {
  const priorities: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 60,
    metric: 15
  }
  return priorities[level] || 0
}

// Compare two log levels
export const isLevelHigherOrEqual = (level1: LogLevel, level2: LogLevel): boolean => {
  return getLevelPriority(level1) >= getLevelPriority(level2)
}

// Normalize any case input to valid LogLevel
export const normalizeLogLevel = (level: string): LogLevel => {
  const normalized = level.toLowerCase()
  if (isValidLogLevel(normalized)) {
    return normalized
  }
  // Map common alternatives
  const mappings: Record<string, LogLevel> = {
    'err': 'error',
    'warning': 'warn',
    'crit': 'fatal',
    'critical': 'fatal',  // Map critical to fatal
    'dbg': 'debug',
    'information': 'info'
  }
  const mapped = mappings[normalized]
  if (mapped) {
    return mapped
  }
  // Default to info if invalid
  return 'info'
}