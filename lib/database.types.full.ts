export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      permanent_logs: {
        Row: {
          breadcrumbs: Json | null
          category: string
          created_at: string
          data: Json | null
          environment: string | null
          error_details: Json | null
          id: string
          log_level: string
          log_timestamp: string
          message: string
          request_id: string | null
          session_id: string | null
          stack: string | null
          timing: Json | null
          user_id: string | null
        }
        Insert: {
          breadcrumbs?: Json | null
          category: string
          created_at?: string
          data?: Json | null
          environment?: string | null
          error_details?: Json | null
          id?: string
          log_level: string
          log_timestamp?: string
          message: string
          request_id?: string | null
          session_id?: string | null
          stack?: string | null
          timing?: Json | null
          user_id?: string | null
        }
        Update: {
          breadcrumbs?: Json | null
          category?: string
          created_at?: string
          data?: Json | null
          environment?: string | null
          error_details?: Json | null
          id?: string
          log_level?: string
          log_timestamp?: string
          message?: string
          request_id?: string | null
          session_id?: string | null
          stack?: string | null
          timing?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          pdf_hide_attribution: boolean | null
          pdf_watermark_enabled: boolean | null
          pdf_watermark_text: string | null
          role: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          pdf_hide_attribution?: boolean | null
          pdf_watermark_enabled?: boolean | null
          pdf_watermark_text?: string | null
          role?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          pdf_hide_attribution?: boolean | null
          pdf_watermark_enabled?: boolean | null
          pdf_watermark_text?: string | null
          role?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          business_case: string | null
          company_info: Json | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          methodology_type: string
          name: string
          owner_id: string
          progress: number | null
          rag_status: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          vision: string | null
        }
        Insert: {
          business_case?: string | null
          company_info?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          methodology_type: string
          name: string
          owner_id: string
          progress?: number | null
          rag_status?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          vision?: string | null
        }
        Update: {
          business_case?: string | null
          company_info?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          methodology_type?: string
          name?: string
          owner_id?: string
          progress?: number | null
          rag_status?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          vision?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never