export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
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
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          content: Json
          created_at: string | null
          created_by: string
          generation_cost: number | null
          generation_input_tokens: number | null
          generation_max_tokens: number | null
          generation_metadata: Json | null
          generation_model: string | null
          generation_output_tokens: number | null
          generation_provider: string | null
          generation_reasoning_level: string | null
          generation_reasoning_tokens: number | null
          generation_temperature: number | null
          generation_time_ms: number | null
          generation_tokens: number | null
          id: string
          project_id: string
          title: string
          type: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          created_by: string
          generation_cost?: number | null
          generation_input_tokens?: number | null
          generation_max_tokens?: number | null
          generation_metadata?: Json | null
          generation_model?: string | null
          generation_output_tokens?: number | null
          generation_provider?: string | null
          generation_reasoning_level?: string | null
          generation_reasoning_tokens?: number | null
          generation_temperature?: number | null
          generation_time_ms?: number | null
          generation_tokens?: number | null
          id?: string
          project_id: string
          title: string
          type: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          created_by?: string
          generation_cost?: number | null
          generation_input_tokens?: number | null
          generation_max_tokens?: number | null
          generation_metadata?: Json | null
          generation_model?: string | null
          generation_output_tokens?: number | null
          generation_provider?: string | null
          generation_reasoning_level?: string | null
          generation_reasoning_tokens?: number | null
          generation_temperature?: number | null
          generation_time_ms?: number | null
          generation_tokens?: number | null
          id?: string
          project_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          confirmed_by_user: boolean | null
          created_at: string | null
          description: string
          id: string
          project_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          screenshot2_url: string | null
          severity: number
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confirmed_by_user?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          project_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          screenshot2_url?: string | null
          severity: number
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confirmed_by_user?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          screenshot2_url?: string | null
          severity?: number
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_financial_data: {
        Row: {
          beta: number | null
          confidence: number | null
          created_at: string | null
          currency: string | null
          day_high: number | null
          day_low: number | null
          dividend_yield: number | null
          eps: number | null
          exchange: string | null
          fetched_at: string | null
          fifty_two_week_high: number | null
          fifty_two_week_low: number | null
          id: string
          is_public: boolean | null
          last_updated: string | null
          market_cap: number | null
          metadata: Json | null
          pe_ratio: number | null
          price_change: number | null
          price_change_percent: number | null
          session_id: string | null
          share_price: number | null
          ticker: string | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          beta?: number | null
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          day_high?: number | null
          day_low?: number | null
          dividend_yield?: number | null
          eps?: number | null
          exchange?: string | null
          fetched_at?: string | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          id?: string
          is_public?: boolean | null
          last_updated?: string | null
          market_cap?: number | null
          metadata?: Json | null
          pe_ratio?: number | null
          price_change?: number | null
          price_change_percent?: number | null
          session_id?: string | null
          share_price?: number | null
          ticker?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          beta?: number | null
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          day_high?: number | null
          day_low?: number | null
          dividend_yield?: number | null
          eps?: number | null
          exchange?: string | null
          fetched_at?: string | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          id?: string
          is_public?: boolean | null
          last_updated?: string | null
          market_cap?: number | null
          metadata?: Json | null
          pe_ratio?: number | null
          price_change?: number | null
          price_change_percent?: number | null
          session_id?: string | null
          share_price?: number | null
          ticker?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      company_google_business: {
        Row: {
          address: string | null
          attributes: string[] | null
          business_name: string
          category: string | null
          confidence: number | null
          created_at: string | null
          current_status: string | null
          fetched_at: string | null
          hours: Json | null
          id: string
          location: Json | null
          metadata: Json | null
          phone: string | null
          photos: Json | null
          place_id: string | null
          popular_times: Json | null
          price_level: string | null
          rating: number | null
          review_count: number | null
          reviews: Json | null
          session_id: string | null
          subcategories: string[] | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          attributes?: string[] | null
          business_name: string
          category?: string | null
          confidence?: number | null
          created_at?: string | null
          current_status?: string | null
          fetched_at?: string | null
          hours?: Json | null
          id?: string
          location?: Json | null
          metadata?: Json | null
          phone?: string | null
          photos?: Json | null
          place_id?: string | null
          popular_times?: Json | null
          price_level?: string | null
          rating?: number | null
          review_count?: number | null
          reviews?: Json | null
          session_id?: string | null
          subcategories?: string[] | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          attributes?: string[] | null
          business_name?: string
          category?: string | null
          confidence?: number | null
          created_at?: string | null
          current_status?: string | null
          fetched_at?: string | null
          hours?: Json | null
          id?: string
          location?: Json | null
          metadata?: Json | null
          phone?: string | null
          photos?: Json | null
          place_id?: string | null
          popular_times?: Json | null
          price_level?: string | null
          rating?: number | null
          review_count?: number | null
          reviews?: Json | null
          session_id?: string | null
          subcategories?: string[] | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      company_intelligence_sessions: {
        Row: {
          company_name: string
          created_at: string
          deprecated_discovered_urls_do_not_use: Json | null
          domain: string
          execution_history: Json | null
          id: string
          last_lock_id: string | null
          merged_data: Json | null
          phase: number
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          company_name: string
          created_at?: string
          deprecated_discovered_urls_do_not_use?: Json | null
          domain: string
          execution_history?: Json | null
          id?: string
          last_lock_id?: string | null
          merged_data?: Json | null
          phase?: number
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          company_name?: string
          created_at?: string
          deprecated_discovered_urls_do_not_use?: Json | null
          domain?: string
          execution_history?: Json | null
          id?: string
          last_lock_id?: string | null
          merged_data?: Json | null
          phase?: number
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      company_investor_relations: {
        Row: {
          annual_reports: Json | null
          created_at: string | null
          financial_calendar: Json | null
          id: string
          investor_presentations: Json | null
          ir_page_url: string | null
          latest_earnings_date: string | null
          latest_earnings_url: string | null
          next_earnings_date: string | null
          press_releases: Json | null
          quarterly_reports: Json | null
          regulatory_filings: Json | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          annual_reports?: Json | null
          created_at?: string | null
          financial_calendar?: Json | null
          id?: string
          investor_presentations?: Json | null
          ir_page_url?: string | null
          latest_earnings_date?: string | null
          latest_earnings_url?: string | null
          next_earnings_date?: string | null
          press_releases?: Json | null
          quarterly_reports?: Json | null
          regulatory_filings?: Json | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_reports?: Json | null
          created_at?: string | null
          financial_calendar?: Json | null
          id?: string
          investor_presentations?: Json | null
          ir_page_url?: string | null
          latest_earnings_date?: string | null
          latest_earnings_url?: string | null
          next_earnings_date?: string | null
          press_releases?: Json | null
          quarterly_reports?: Json | null
          regulatory_filings?: Json | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_linkedin_data: {
        Row: {
          company_id: string | null
          company_size: string | null
          company_type: string | null
          company_url: string
          confidence: number | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          employee_count: number | null
          employee_growth: number | null
          fetched_at: string | null
          followers: number | null
          founded: number | null
          headquarters: Json | null
          id: string
          industry: string | null
          job_openings: number | null
          locations: Json | null
          logo: string | null
          metadata: Json | null
          name: string
          recent_posts: Json | null
          session_id: string | null
          specialties: string[] | null
          tagline: string | null
          updated_at: string | null
          verified: boolean | null
          website_url: string | null
        }
        Insert: {
          company_id?: string | null
          company_size?: string | null
          company_type?: string | null
          company_url: string
          confidence?: number | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          employee_growth?: number | null
          fetched_at?: string | null
          followers?: number | null
          founded?: number | null
          headquarters?: Json | null
          id?: string
          industry?: string | null
          job_openings?: number | null
          locations?: Json | null
          logo?: string | null
          metadata?: Json | null
          name: string
          recent_posts?: Json | null
          session_id?: string | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website_url?: string | null
        }
        Update: {
          company_id?: string | null
          company_size?: string | null
          company_type?: string | null
          company_url?: string
          confidence?: number | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          employee_growth?: number | null
          fetched_at?: string | null
          followers?: number | null
          founded?: number | null
          headquarters?: Json | null
          id?: string
          industry?: string | null
          job_openings?: number | null
          locations?: Json | null
          logo?: string | null
          metadata?: Json | null
          name?: string
          recent_posts?: Json | null
          session_id?: string | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website_url?: string | null
        }
        Relationships: []
      }
      company_news: {
        Row: {
          author: string | null
          categories: string[] | null
          confidence: number | null
          created_at: string | null
          entities: string[] | null
          fetched_at: string | null
          full_text: string | null
          id: string
          images: Json | null
          is_regulatory: boolean | null
          metadata: Json | null
          published_date: string | null
          regulatory_type: string | null
          relevance_score: number | null
          sentiment: string | null
          sentiment_score: number | null
          session_id: string | null
          source: string | null
          source_type: string
          summary: string | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          author?: string | null
          categories?: string[] | null
          confidence?: number | null
          created_at?: string | null
          entities?: string[] | null
          fetched_at?: string | null
          full_text?: string | null
          id?: string
          images?: Json | null
          is_regulatory?: boolean | null
          metadata?: Json | null
          published_date?: string | null
          regulatory_type?: string | null
          relevance_score?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          session_id?: string | null
          source?: string | null
          source_type: string
          summary?: string | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          author?: string | null
          categories?: string[] | null
          confidence?: number | null
          created_at?: string | null
          entities?: string[] | null
          fetched_at?: string | null
          full_text?: string | null
          id?: string
          images?: Json | null
          is_regulatory?: boolean | null
          metadata?: Json | null
          published_date?: string | null
          regulatory_type?: string | null
          relevance_score?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          session_id?: string | null
          source?: string | null
          source_type?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      company_social_profiles: {
        Row: {
          bio: string | null
          confidence: number | null
          created_at: string | null
          display_name: string | null
          engagement_metrics: Json | null
          fetched_at: string | null
          followers: number | null
          following: number | null
          id: string
          joined_date: string | null
          last_post_date: string | null
          metadata: Json | null
          platform: string
          posts: number | null
          profile_image: string | null
          profile_url: string
          recent_activity: Json | null
          session_id: string | null
          updated_at: string | null
          username: string | null
          verified: boolean | null
        }
        Insert: {
          bio?: string | null
          confidence?: number | null
          created_at?: string | null
          display_name?: string | null
          engagement_metrics?: Json | null
          fetched_at?: string | null
          followers?: number | null
          following?: number | null
          id?: string
          joined_date?: string | null
          last_post_date?: string | null
          metadata?: Json | null
          platform: string
          posts?: number | null
          profile_image?: string | null
          profile_url: string
          recent_activity?: Json | null
          session_id?: string | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          bio?: string | null
          confidence?: number | null
          created_at?: string | null
          display_name?: string | null
          engagement_metrics?: Json | null
          fetched_at?: string | null
          followers?: number | null
          following?: number | null
          id?: string
          joined_date?: string | null
          last_post_date?: string | null
          metadata?: Json | null
          platform?: string
          posts?: number | null
          profile_image?: string | null
          profile_url?: string
          recent_activity?: Json | null
          session_id?: string | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      content_sync_log: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          notion_database_id: string | null
          pages_synced: number | null
          status: string | null
          sync_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          notion_database_id?: string | null
          pages_synced?: number | null
          status?: string | null
          sync_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          notion_database_id?: string | null
          pages_synced?: number | null
          status?: string | null
          sync_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      corporate_entities: {
        Row: {
          additional_domains: string[] | null
          brand_assets: Json | null
          created_at: string | null
          created_by: string | null
          employee_count: string | null
          entity_type: Database["public"]["Enums"]["company_relationship_type"]
          founded_year: number | null
          headquarters_location: string | null
          id: string
          industry: string | null
          legal_name: string | null
          name: string
          parent_entity_id: string | null
          primary_domain: string | null
          revenue_range: string | null
          search_vector: unknown | null
          social_profiles: Json | null
          stock_symbol: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          additional_domains?: string[] | null
          brand_assets?: Json | null
          created_at?: string | null
          created_by?: string | null
          employee_count?: string | null
          entity_type?: Database["public"]["Enums"]["company_relationship_type"]
          founded_year?: number | null
          headquarters_location?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          name: string
          parent_entity_id?: string | null
          primary_domain?: string | null
          revenue_range?: string | null
          search_vector?: unknown | null
          social_profiles?: Json | null
          stock_symbol?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          additional_domains?: string[] | null
          brand_assets?: Json | null
          created_at?: string | null
          created_by?: string | null
          employee_count?: string | null
          entity_type?: Database["public"]["Enums"]["company_relationship_type"]
          founded_year?: number | null
          headquarters_location?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          name?: string
          parent_entity_id?: string | null
          primary_domain?: string | null
          revenue_range?: string | null
          search_vector?: unknown | null
          social_profiles?: Json | null
          stock_symbol?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corporate_entities_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "corporate_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string | null
          decision_date: string
          description: string
          id: string
          made_by: string
          outcome: string | null
          project_id: string
          rationale: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          decision_date: string
          description: string
          id?: string
          made_by: string
          outcome?: string | null
          project_id: string
          rationale?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          decision_date?: string
          description?: string
          id?: string
          made_by?: string
          outcome?: string | null
          project_id?: string
          rationale?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_brand_assets: {
        Row: {
          asset_data: Json
          asset_type: string
          created_at: string | null
          created_by: string | null
          entity_id: string
          id: string
          is_current: boolean | null
          valid_from: string | null
          valid_to: string | null
          version: string | null
        }
        Insert: {
          asset_data: Json
          asset_type: string
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          id?: string
          is_current?: boolean | null
          valid_from?: string | null
          valid_to?: string | null
          version?: string | null
        }
        Update: {
          asset_data?: Json
          asset_type?: string
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          id?: string
          is_current?: boolean | null
          valid_from?: string | null
          valid_to?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_brand_assets_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "corporate_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          child_entity_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          ownership_percentage: number | null
          parent_entity_id: string
          relationship_end_date: string | null
          relationship_start_date: string | null
          relationship_type: Database["public"]["Enums"]["company_relationship_type"]
          updated_at: string | null
        }
        Insert: {
          child_entity_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          ownership_percentage?: number | null
          parent_entity_id: string
          relationship_end_date?: string | null
          relationship_start_date?: string | null
          relationship_type: Database["public"]["Enums"]["company_relationship_type"]
          updated_at?: string | null
        }
        Update: {
          child_entity_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          ownership_percentage?: number | null
          parent_entity_id?: string
          relationship_end_date?: string | null
          relationship_start_date?: string | null
          relationship_type?: Database["public"]["Enums"]["company_relationship_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_relationships_child_entity_id_fkey"
            columns: ["child_entity_id"]
            isOneToOne: false
            referencedRelation: "corporate_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_relationships_parent_entity_id_fkey"
            columns: ["parent_entity_id"]
            isOneToOne: false
            referencedRelation: "corporate_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_locks: {
        Row: {
          acquired_at: string
          created_at: string
          expires_at: string
          id: string
          lock_key: string
          released: boolean | null
          released_at: string | null
          scraper_id: string
          session_id: string
        }
        Insert: {
          acquired_at?: string
          created_at?: string
          expires_at: string
          id?: string
          lock_key: string
          released?: boolean | null
          released_at?: string | null
          scraper_id: string
          session_id: string
        }
        Update: {
          acquired_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          lock_key?: string
          released?: boolean | null
          released_at?: string | null
          scraper_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_locks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "company_intelligence_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_metrics: {
        Row: {
          completed_at: string | null
          created_at: string
          data_points: number | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          metadata: Json | null
          pages_scraped: number | null
          scraper_id: string
          session_id: string
          started_at: string
          success: boolean | null
          url_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data_points?: number | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          metadata?: Json | null
          pages_scraped?: number | null
          scraper_id: string
          session_id: string
          started_at: string
          success?: boolean | null
          url_count: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data_points?: number | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          metadata?: Json | null
          pages_scraped?: number | null
          scraper_id?: string
          session_id?: string
          started_at?: string
          success?: boolean | null
          url_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "execution_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "company_intelligence_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_intelligence_summary: {
        Row: {
          company_name: string
          completeness: number | null
          created_at: string | null
          domain: string
          enrichment_duration: number | null
          has_financial_data: boolean | null
          has_google_business: boolean | null
          has_investor_relations: boolean | null
          has_linkedin_data: boolean | null
          id: string
          last_updated: string | null
          news_count: number | null
          session_id: string | null
          social_profiles_count: number | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          completeness?: number | null
          created_at?: string | null
          domain: string
          enrichment_duration?: number | null
          has_financial_data?: boolean | null
          has_google_business?: boolean | null
          has_investor_relations?: boolean | null
          has_linkedin_data?: boolean | null
          id?: string
          last_updated?: string | null
          news_count?: number | null
          session_id?: string | null
          social_profiles_count?: number | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          completeness?: number | null
          created_at?: string | null
          domain?: string
          enrichment_duration?: number | null
          has_financial_data?: boolean | null
          has_google_business?: boolean | null
          has_investor_relations?: boolean | null
          has_linkedin_data?: boolean | null
          id?: string
          last_updated?: string | null
          news_count?: number | null
          session_id?: string | null
          social_profiles_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      generation_analytics: {
        Row: {
          created_at: string | null
          document_type: string
          error_message: string | null
          generation_time_ms: number | null
          id: string
          metadata: Json | null
          model: string
          project_id: string
          provider: string
          success: boolean | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          metadata?: Json | null
          model: string
          project_id: string
          provider: string
          success?: boolean | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          metadata?: Json | null
          model?: string
          project_id?: string
          provider?: string
          success?: boolean | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_analytics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_call_logs: {
        Row: {
          completion_tokens: number
          cost_usd: number
          created_at: string | null
          duration_ms: number
          error_details: Json | null
          id: string
          model: string
          phase: string
          prompt_tokens: number
          reasoning_tokens: number | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          completion_tokens: number
          cost_usd: number
          created_at?: string | null
          duration_ms: number
          error_details?: Json | null
          id?: string
          model: string
          phase: string
          prompt_tokens: number
          reasoning_tokens?: number | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number
          created_at?: string | null
          duration_ms?: number
          error_details?: Json | null
          id?: string
          model?: string
          phase?: string
          prompt_tokens?: number
          reasoning_tokens?: number | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string | null
          filename: string
          id: string
          mime_type: string | null
          notion_id: string | null
          size: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          filename: string
          id?: string
          mime_type?: string | null
          notion_id?: string | null
          size?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          filename?: string
          id?: string
          mime_type?: string | null
          notion_id?: string | null
          size?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      page_intelligence: {
        Row: {
          analysis_errors: string[] | null
          analysis_warnings: string[] | null
          classification_data: Json
          confidence_score: number | null
          created_at: string
          id: string
          meta_data: Json
          page_type: string
          processing_time_ms: number
          session_id: string | null
          structured_data: Json
          updated_at: string
          url: string
        }
        Insert: {
          analysis_errors?: string[] | null
          analysis_warnings?: string[] | null
          classification_data?: Json
          confidence_score?: number | null
          created_at?: string
          id?: string
          meta_data?: Json
          page_type: string
          processing_time_ms?: number
          session_id?: string | null
          structured_data?: Json
          updated_at?: string
          url: string
        }
        Update: {
          analysis_errors?: string[] | null
          analysis_warnings?: string[] | null
          classification_data?: Json
          confidence_score?: number | null
          created_at?: string
          id?: string
          meta_data?: Json
          page_type?: string
          processing_time_ms?: number
          session_id?: string | null
          structured_data?: Json
          updated_at?: string
          url?: string
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
      project_members: {
        Row: {
          added_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          business_case: string | null
          company_info: Json | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          methodology_type: Database["public"]["Enums"]["methodology_type"]
          name: string
          owner_id: string
          progress: number | null
          rag_status: Database["public"]["Enums"]["rag_status"] | null
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
          methodology_type: Database["public"]["Enums"]["methodology_type"]
          name: string
          owner_id: string
          progress?: number | null
          rag_status?: Database["public"]["Enums"]["rag_status"] | null
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
          methodology_type?: Database["public"]["Enums"]["methodology_type"]
          name?: string
          owner_id?: string
          progress?: number | null
          rag_status?: Database["public"]["Enums"]["rag_status"] | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          prompt_key: string
          prompt_name: string
          system_prompt: string | null
          updated_at: string | null
          user_prompt: string | null
          variables: Json | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          prompt_key: string
          prompt_name: string
          system_prompt?: string | null
          updated_at?: string | null
          user_prompt?: string | null
          variables?: Json | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          prompt_key?: string
          prompt_name?: string
          system_prompt?: string | null
          updated_at?: string | null
          user_prompt?: string | null
          variables?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_status: {
        Row: {
          consecutive_429s: number | null
          day_start: string | null
          last_429_at: string | null
          minute_start: string | null
          model: string
          requests_this_minute: number | null
          total_requests_today: number | null
        }
        Insert: {
          consecutive_429s?: number | null
          day_start?: string | null
          last_429_at?: string | null
          minute_start?: string | null
          model: string
          requests_this_minute?: number | null
          total_requests_today?: number | null
        }
        Update: {
          consecutive_429s?: number | null
          day_start?: string | null
          last_429_at?: string | null
          minute_start?: string | null
          model?: string
          requests_this_minute?: number | null
          total_requests_today?: number | null
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          impact: Database["public"]["Enums"]["risk_impact"]
          mitigation_plan: string | null
          owner_id: string | null
          probability: Database["public"]["Enums"]["risk_probability"]
          project_id: string
          risk_score: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          impact: Database["public"]["Enums"]["risk_impact"]
          mitigation_plan?: string | null
          owner_id?: string | null
          probability: Database["public"]["Enums"]["risk_probability"]
          project_id: string
          risk_score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          impact?: Database["public"]["Enums"]["risk_impact"]
          mitigation_plan?: string | null
          owner_id?: string | null
          probability?: Database["public"]["Enums"]["risk_probability"]
          project_id?: string
          risk_score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_registry: {
        Row: {
          capabilities: string[] | null
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          speed: string | null
          strategy: string
          updated_at: string
        }
        Insert: {
          capabilities?: string[] | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id: string
          name: string
          speed?: string | null
          strategy: string
          updated_at?: string
        }
        Update: {
          capabilities?: string[] | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          speed?: string | null
          strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
      scraping_results_cache: {
        Row: {
          created_at: string
          execution_id: string
          expires_at: string
          formatted_data: Json
          id: string
          session_id: string
          stats: Json
          suggestions: Json | null
        }
        Insert: {
          created_at?: string
          execution_id: string
          expires_at: string
          formatted_data: Json
          id?: string
          session_id: string
          stats: Json
          suggestions?: Json | null
        }
        Update: {
          created_at?: string
          execution_id?: string
          expires_at?: string
          formatted_data?: Json
          id?: string
          session_id?: string
          stats?: Json
          suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scraping_results_cache_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "company_intelligence_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string | null
          end_date: string
          goal: string | null
          id: string
          name: string
          project_id: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          goal?: string | null
          id?: string
          name: string
          project_id: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_id: string
          sequence: number
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_id: string
          sequence: number
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string
          sequence?: number
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          influence_level: string | null
          interest_level: string | null
          name: string
          notes: string | null
          phone: string | null
          project_id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          influence_level?: string | null
          interest_level?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          project_id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          influence_level?: string | null
          interest_level?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
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
      tasks: {
        Row: {
          artifact_id: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          priority: number | null
          project_id: string
          reporter_id: string
          sprint_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          story_points: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artifact_id?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: number | null
          project_id: string
          reporter_id: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          story_points?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artifact_id?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: number | null
          project_id?: string
          reporter_id?: string
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          story_points?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          processed: boolean | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          source?: string | null
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          content_hash: string | null
          created_at: string | null
          description: string | null
          id: string
          last_synced: string | null
          notion_page_id: string | null
          page_url: string
          sync_status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_synced?: string | null
          notion_page_id?: string | null
          page_url: string
          sync_status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_synced?: string | null
          notion_page_id?: string | null
          page_url?: string
          sync_status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_locks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_old_permanent_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      delete_all_permanent_logs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_all_logs: {
        Args: {
          p_category?: string
          p_level?: string
          p_limit?: number
          p_since?: string
        }
        Returns: {
          breadcrumbs: Json
          category: string
          created_at: string
          data: Json
          environment: string
          error_details: Json
          id: string
          level: string
          log_timestamp: string
          message: string
          request_id: string
          session_id: string
          stack: string
          timing: Json
          user_id: string
        }[]
      }
      get_all_permanent_logs: {
        Args:
          | {
              p_category?: string
              p_level?: string
              p_limit?: number
              p_offset?: number
              p_since?: string
              p_user_id?: string
            }
          | {
              p_category?: string
              p_level?: string
              p_limit?: number
              p_search?: string
            }
        Returns: {
          breadcrumbs: Json
          category: string
          data: Json
          environment: string
          error_details: Json
          id: string
          log_level: string
          log_timestamp: string
          message: string
          request_id: string
          session_id: string
          stack: string
          timing: Json
          user_id: string
        }[]
      }
      get_all_permanent_logs_jsonb: {
        Args:
          | {
              p_category?: string
              p_level?: string
              p_limit?: number
              p_offset?: number
              p_since?: string
              p_user_id?: string
            }
          | {
              p_category?: string
              p_level?: string
              p_limit?: number
              p_search?: string
            }
        Returns: Json
      }
      get_compact_db_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          info_type: string
          value: string
        }[]
      }
      get_logs_paginated_v2: {
        Args:
          | {
              cursor_ts?: string
              filter_category?: string
              filter_level?: string
              filter_search?: string
              page_offset?: number
              page_size?: number
            }
          | {
              p_category?: string
              p_end_date?: string
              p_level?: string
              p_limit?: number
              p_offset?: number
              p_request_id?: string
              p_search?: string
              p_session_id?: string
              p_start_date?: string
              p_user_id?: string
            }
        Returns: Json
      }
      get_logs_paginated_v3: {
        Args: {
          cursor_ts?: string
          filter_categories?: string[]
          filter_levels?: string[]
          filter_search?: string
          page_offset?: number
          page_size?: number
        }
        Returns: Json
      }
      get_paginated_permanent_logs: {
        Args:
          | {
              p_category?: string
              p_cursor?: string
              p_level?: string
              p_offset?: number
              p_page_size?: number
              p_search?: string
            }
          | {
              p_category?: string
              p_level?: string
              p_limit?: number
              p_offset?: number
              p_search?: string
            }
        Returns: Json
      }
      get_permanent_log_stats: {
        Args: Record<PropertyKey, never> | { p_since?: string }
        Returns: {
          categories: Json
          error_count: number
          hourly_distribution: Json
          total_logs: number
          warn_count: number
        }[]
      }
      get_security_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          count: number
          status: string
        }[]
      }
      get_top_tables_compact: {
        Args: { limit_count?: number }
        Returns: {
          has_gin: boolean
          rows: number
          size: string
          table_name: string
        }[]
      }
    }
    Enums: {
      company_relationship_type:
        | "parent"
        | "subsidiary"
        | "sub_brand"
        | "division"
        | "joint_venture"
        | "franchise"
        | "affiliate"
      methodology_type: "agile" | "prince2" | "hybrid"
      project_role: "owner" | "manager" | "member" | "viewer"
      rag_status: "green" | "amber" | "red"
      risk_impact: "very_low" | "low" | "medium" | "high" | "very_high"
      risk_probability: "very_low" | "low" | "medium" | "high" | "very_high"
      session_status: "active" | "paused" | "completed" | "failed" | "aborted"
      task_status: "todo" | "in_progress" | "done" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      company_relationship_type: [
        "parent",
        "subsidiary",
        "sub_brand",
        "division",
        "joint_venture",
        "franchise",
        "affiliate",
      ],
      methodology_type: ["agile", "prince2", "hybrid"],
      project_role: ["owner", "manager", "member", "viewer"],
      rag_status: ["green", "amber", "red"],
      risk_impact: ["very_low", "low", "medium", "high", "very_high"],
      risk_probability: ["very_low", "low", "medium", "high", "very_high"],
      session_status: ["active", "paused", "completed", "failed", "aborted"],
      task_status: ["todo", "in_progress", "done", "blocked"],
    },
  },
} as const