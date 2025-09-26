/**
 * Type-Safe Query Helpers for Supabase
 *
 * PROBLEM: Supabase's .select() accepts any string, allowing typos like 'level' instead of 'log_level'
 * SOLUTION: These helpers enforce compile-time validation of column names
 *
 * This prevents runtime errors from column name mismatches by validating against
 * the generated database types at compile time.
 */

import type { Database } from '@/lib/database.types'

// Extract column names from a table's Row type
type TableColumns<T> = T extends { Row: infer R } ? keyof R : never

// Extract the Row type from a table
type TableRow<T> = T extends { Row: infer R } ? R : never

/**
 * Type-safe column selector for Supabase queries
 *
 * Usage:
 * ```typescript
 * const columns = typedColumns<Database['public']['Tables']['permanent_logs']>([
 *   'log_level',  // ✅ Valid
 *   'category',   // ✅ Valid
 *   'invalid'     // ❌ TypeScript error!
 * ])
 *
 * const query = supabase.from('permanent_logs').select(columns)
 * ```
 */
export function typedColumns<T>(
  columns: TableColumns<T>[]
): string {
  return columns.join(', ')
}

/**
 * Type-safe column selector with '*' support
 *
 * Usage:
 * ```typescript
 * // Select all columns
 * const allColumns = typedSelect<Database['public']['Tables']['permanent_logs']>('*')
 *
 * // Select specific columns
 * const someColumns = typedSelect<Database['public']['Tables']['permanent_logs']>([
 *   'log_level',
 *   'message'
 * ])
 * ```
 */
export function typedSelect<T>(
  columns: '*' | TableColumns<T>[]
): string {
  if (columns === '*') return '*'
  return columns.join(', ')
}

/**
 * Type-safe filter helper for .eq(), .in(), etc.
 *
 * Usage:
 * ```typescript
 * const column = typedColumn<Database['public']['Tables']['permanent_logs']>('log_level')
 * const query = supabase.from('permanent_logs').select('*').eq(column, 'error')
 * ```
 */
export function typedColumn<T>(
  column: TableColumns<T>
): string {
  return String(column)
}

/**
 * Type-safe query builder for repositories
 *
 * Usage in a repository:
 * ```typescript
 * const query = buildTypedQuery<Database['public']['Tables']['permanent_logs']>(
 *   supabase.from('permanent_logs'),
 *   ['log_level', 'message', 'created_at']
 * )
 * ```
 */
export function buildTypedQuery<T>(
  query: any,
  columns: '*' | TableColumns<T>[]
) {
  const selectString = columns === '*' ? '*' : columns.join(', ')
  return query.select(selectString)
}

/**
 * Type guard to validate column names at runtime
 * Useful for dynamic column names from user input
 *
 * Usage:
 * ```typescript
 * const userColumn = 'some_column' // from user input
 * if (isValidColumn<Database['public']['Tables']['permanent_logs']>(userColumn, validColumns)) {
 *   // userColumn is now typed as a valid column name
 *   query.select(userColumn)
 * }
 * ```
 */
export function isValidColumn<T>(
  column: string,
  validColumns: TableColumns<T>[]
): column is TableColumns<T> {
  return validColumns.includes(column as TableColumns<T>)
}

/**
 * Helper to get all column names as a typed array
 * Useful for validation and autocomplete
 *
 * Note: This requires the actual column names to be passed in
 * since TypeScript types are erased at runtime
 */
export function getTableColumns<T>(
  ...columns: TableColumns<T>[]
): TableColumns<T>[] {
  return columns
}

// Export types for use in other files
export type { TableColumns, TableRow }

/**
 * Example usage for permanent_logs table:
 *
 * ```typescript
 * import { typedColumns, typedColumn } from '@/lib/repositories/type-safe-query'
 * import type { Database } from '@/lib/database.types'
 *
 * type LogsTable = Database['public']['Tables']['permanent_logs']
 *
 * // In your repository:
 * const columnsToSelect = typedColumns<LogsTable>([
 *   'log_level',   // ✅ Valid
 *   'category',    // ✅ Valid
 *   'message',     // ✅ Valid
 *   'created_at'   // ✅ Valid
 *   // 'level'     // ❌ Would cause TypeScript error!
 * ])
 *
 * const { data, error } = await supabase
 *   .from('permanent_logs')
 *   .select(columnsToSelect)
 *   .eq(typedColumn<LogsTable>('log_level'), 'error')
 * ```
 */