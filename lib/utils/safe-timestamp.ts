/**
 * Safe timestamp conversion utility
 * Prevents "Invalid time value" errors by validating timestamps
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'

/**
 * Safely convert a timestamp to ISO string format
 * @param timestamp - The timestamp to convert (number, string, Date, or undefined)
 * @param fallback - Optional fallback ISO string (defaults to current time)
 * @returns A valid ISO string timestamp
 */
export function safeTimestampToISO(
  timestamp: number | string | Date | undefined | null,
  fallback?: string
): string {
  try {
    // If no timestamp provided, use fallback or current time
    if (timestamp === undefined || timestamp === null) {
      return fallback || new Date().toISOString()
    }

    // If already a valid Date object
    if (timestamp instanceof Date) {
      if (!isNaN(timestamp.getTime())) {
        return timestamp.toISOString()
      }
    }

    // Try to create a Date from the timestamp
    const date = new Date(timestamp)

    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }

    // If conversion failed, log warning and use fallback
    permanentLogger.breadcrumb('TIMESTAMP_CONVERSION', 'Invalid timestamp provided', {
      timestamp,
      type: typeof timestamp
    })

    return fallback || new Date().toISOString()
  } catch (error) {
    // Last resort - log error and return fallback
    permanentLogger.breadcrumb('TIMESTAMP_ERROR', 'Failed to convert timestamp', {
      timestamp,
      error: error instanceof Error ? error.message : String(error)
    })

    return fallback || new Date().toISOString()
  }
}

/**
 * Get a numeric timestamp from various input types
 * @param timestamp - The timestamp to convert
 * @returns A numeric timestamp (milliseconds since epoch)
 */
export function safeTimestampToNumber(
  timestamp: number | string | Date | undefined | null
): number {
  try {
    // If no timestamp provided, use current time
    if (timestamp === undefined || timestamp === null) {
      return Date.now()
    }

    // If already a number, return it
    if (typeof timestamp === 'number') {
      // Validate it's a reasonable timestamp
      if (timestamp > 0 && timestamp < Number.MAX_SAFE_INTEGER) {
        return timestamp
      }
    }

    // If a Date object, get its time
    if (timestamp instanceof Date) {
      const time = timestamp.getTime()
      if (!isNaN(time)) {
        return time
      }
    }

    // Try to convert to Date and get time
    const date = new Date(timestamp)
    const time = date.getTime()

    if (!isNaN(time)) {
      return time
    }

    // Fallback to current time
    return Date.now()
  } catch (error) {
    // Return current time as fallback
    return Date.now()
  }
}

/**
 * Format a timestamp for display (with safe fallback)
 * @param timestamp - The timestamp to format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns A formatted date string
 */
export function safeFormatTimestamp(
  timestamp: number | string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const isoString = safeTimestampToISO(timestamp)
  const date = new Date(isoString)

  try {
    return date.toLocaleString(undefined, options)
  } catch (error) {
    // Fallback to ISO string if locale formatting fails
    return isoString
  }
}