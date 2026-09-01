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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          category: string
          created_at: string
          email: string | null
          id: string
          message: string | null
          meta: Json | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          meta?: Json | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          meta?: Json | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          actor: string | null
          actor_email: string | null
          created_at: string
          id: string
          meta: Json
          target: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_email?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_email?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target?: string | null
        }
        Relationships: []
      }
      agents_config: {
        Row: {
          allowed_plans: string[]
          backend_model: string
          created_at: string
          description: string
          enabled: boolean
          icon: string
          id: string
          maintenance: boolean
          name: string
          system_prompt: string
          updated_at: string
          version: string
        }
        Insert: {
          allowed_plans?: string[]
          backend_model?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id: string
          maintenance?: boolean
          name: string
          system_prompt?: string
          updated_at?: string
          version?: string
        }
        Update: {
          allowed_plans?: string[]
          backend_model?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          maintenance?: boolean
          name?: string
          system_prompt?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          scopes: string[]
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          scopes?: string[]
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          allowed_file_types: string[]
          deep_research_status: string
          default_agent: string | null
          default_language: string
          default_theme: string
          global_limits: Json
          google_auth_enabled: boolean
          id: number
          logo_url: string | null
          maintenance_mode: boolean
          max_upload_mb: number
          rate_limits: Json
          registration_enabled: boolean
          site_name: string
          updated_at: string
          web_search_status: string
        }
        Insert: {
          allowed_file_types?: string[]
          deep_research_status?: string
          default_agent?: string | null
          default_language?: string
          default_theme?: string
          global_limits?: Json
          google_auth_enabled?: boolean
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_upload_mb?: number
          rate_limits?: Json
          registration_enabled?: boolean
          site_name?: string
          updated_at?: string
          web_search_status?: string
        }
        Update: {
          allowed_file_types?: string[]
          deep_research_status?: string
          default_agent?: string | null
          default_language?: string
          default_theme?: string
          global_limits?: Json
          google_auth_enabled?: boolean
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean
          max_upload_mb?: number
          rate_limits?: Json
          registration_enabled?: boolean
          site_name?: string
          updated_at?: string
          web_search_status?: string
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_settings: {
        Row: {
          auto_renewal: boolean
          billing_enabled: boolean
          id: number
          tax_percent: number
          trial_days: number
          trial_enabled: boolean
          updated_at: string
        }
        Insert: {
          auto_renewal?: boolean
          billing_enabled?: boolean
          id?: number
          tax_percent?: number
          trial_days?: number
          trial_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auto_renewal?: boolean
          billing_enabled?: boolean
          id?: number
          tax_percent?: number
          trial_days?: number
          trial_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          sent_by: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          sent_by?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          sent_by?: string | null
          title?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          agent: string
          created_at: string
          expires_at: string | null
          id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connected_apps: {
        Row: {
          account_label: string | null
          connected_at: string
          id: string
          last_used_at: string | null
          name: string
          provider: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          account_label?: string | null
          connected_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          provider: string
          scopes?: string[]
          user_id: string
        }
        Update: {
          account_label?: string | null
          connected_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          provider?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      daily_message_quotas: {
        Row: {
          count: number
          day: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          id: string
          mime: string | null
          name: string
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime?: string | null
          name: string
          size_bytes?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string | null
          name?: string
          size_bytes?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      honeytokens: {
        Row: {
          active: boolean
          created_at: string
          hits: number
          id: string
          label: string
          last_hit_at: string | null
          token: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          hits?: number
          id?: string
          label: string
          last_hit_at?: string | null
          token: string
        }
        Update: {
          active?: boolean
          created_at?: string
          hits?: number
          id?: string
          label?: string
          last_hit_at?: string | null
          token?: string
        }
        Relationships: []
      }
      ip_allowlist: {
        Row: {
          cidr: unknown
          created_at: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          cidr: unknown
          created_at?: string
          id?: string
          label?: string | null
          user_id: string
        }
        Update: {
          cidr?: unknown
          created_at?: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          email: string | null
          event: string
          id: string
          ip: string | null
          meta: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event: string
          id?: string
          ip?: string | null
          meta?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      memories: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          agent: string | null
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
          tokens: number | null
          user_id: string
        }
        Insert: {
          agent?: string | null
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          tokens?: number | null
          user_id: string
        }
        Update: {
          agent?: string | null
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      model_assignments: {
        Row: {
          agent_id: string
          model: string
          provider: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          model: string
          provider?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          model?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_global: boolean
          kind: string
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          kind?: string
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          kind?: string
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_providers: {
        Row: {
          credentials: Json
          enabled: boolean
          id: string
          label: string
          test_mode: boolean
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          credentials?: Json
          enabled?: boolean
          id: string
          label: string
          test_mode?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          credentials?: Json
          enabled?: boolean
          id?: string
          label?: string
          test_mode?: boolean
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          features: Json
          id: string
          limits: Json
          name: string
          price_monthly: number
          price_yearly: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          limits?: Json
          name: string
          price_monthly?: number
          price_yearly?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          limits?: Json
          name?: string
          price_monthly?: number
          price_yearly?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          country: string | null
          created_at: string
          custom_limits: Json
          date_format: string | null
          display_name: string | null
          email: string | null
          id: string
          language: string | null
          last_seen_at: string | null
          messages_used: number
          plan: Database["public"]["Enums"]["user_plan"]
          status: Database["public"]["Enums"]["user_status"]
          storage_used_bytes: number
          suspended_until: string | null
          timezone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          country?: string | null
          created_at?: string
          custom_limits?: Json
          date_format?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          language?: string | null
          last_seen_at?: string | null
          messages_used?: number
          plan?: Database["public"]["Enums"]["user_plan"]
          status?: Database["public"]["Enums"]["user_status"]
          storage_used_bytes?: number
          suspended_until?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          country?: string | null
          created_at?: string
          custom_limits?: Json
          date_format?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string | null
          last_seen_at?: string | null
          messages_used?: number
          plan?: Database["public"]["Enums"]["user_plan"]
          status?: Database["public"]["Enums"]["user_status"]
          storage_used_bytes?: number
          suspended_until?: string | null
          timezone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      promotion_redemptions: {
        Row: {
          id: string
          promo_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promo_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promo_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount: number
          duration_days: number | null
          expires_at: string | null
          id: string
          kind: string
          plan_id: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount?: number
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          kind?: string
          plan_id?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount?: number
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          kind?: string
          plan_id?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_prefs: {
        Row: {
          created_at: string
          login_alerts: boolean
          mfa_verified_at: string | null
          passkeys: Json
          recovery_codes: Json
          two_factor_enabled: boolean
          two_factor_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          login_alerts?: boolean
          mfa_verified_at?: string | null
          passkeys?: Json
          recovery_codes?: Json
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          login_alerts?: boolean
          mfa_verified_at?: string | null
          passkeys?: Json
          recovery_codes?: Json
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          kind?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_chats: {
        Row: {
          active_chat_id: string | null
          chats: Json
          ciphertext: string | null
          encrypted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          active_chat_id?: string | null
          chats?: Json
          ciphertext?: string | null
          encrypted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          active_chat_id?: string | null
          chats?: Json
          ciphertext?: string | null
          encrypted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_overrides: {
        Row: {
          created_at: string
          lifetime_premium: boolean
          msg_limit: number | null
          notes: string | null
          plan_override: string | null
          storage_mb: number | null
          trial_until: string | null
          unlimited: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lifetime_premium?: boolean
          msg_limit?: number | null
          notes?: string | null
          plan_override?: string | null
          storage_mb?: number | null
          trial_until?: string | null
          unlimited?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          lifetime_premium?: boolean
          msg_limit?: number | null
          notes?: string | null
          plan_override?: string | null
          storage_mb?: number | null
          trial_until?: string | null
          unlimited?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          id: string
          ip: string | null
          last_seen: string
          os: string | null
          revoked: boolean
          session_token: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          last_seen?: string
          os?: string | null
          revoked?: boolean
          session_token?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          last_seen?: string
          os?: string | null
          revoked?: boolean
          session_token?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          appearance: Json
          general: Json
          intelligence: Json
          notifications: Json
          privacy: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance?: Json
          general?: Json
          intelligence?: Json
          notifications?: Json
          privacy?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          appearance?: Json
          general?: Json
          intelligence?: Json
          notifications?: Json
          privacy?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_promo: {
        Args: { _code: string }
        Returns: {
          code: string
          discount: number
          id: string
          kind: string
          reason: string
          valid: boolean
        }[]
      }
      consume_message_quota: { Args: { _effort?: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_promo_use: { Args: { _promo_id: string }; Returns: undefined }
      list_agents_public: {
        Args: never
        Returns: {
          description: string
          enabled: boolean
          id: string
          maintenance: boolean
          name: string
        }[]
      }
      mfa_ok: { Args: { _user_id: string }; Returns: boolean }
      purge_expired_chats: { Args: never; Returns: number }
      redact_old_activity_log: { Args: never; Returns: number }
      sec_agents_config_leak: { Args: never; Returns: boolean }
      sec_anon_selectable_tables: {
        Args: never
        Returns: {
          tablename: string
        }[]
      }
      sec_definer_executable_by_authenticated: {
        Args: never
        Returns: {
          function_name: string
        }[]
      }
      sec_definers_missing_search_path: {
        Args: never
        Returns: {
          function_name: string
        }[]
      }
      sec_quotas_writable_by_users: { Args: never; Returns: boolean }
      sec_storage_public_buckets: {
        Args: never
        Returns: {
          bucket_id: string
        }[]
      }
      sec_tables_partial_policy_coverage: {
        Args: never
        Returns: {
          missing_verbs: string
          tablename: string
        }[]
      }
      sec_tables_without_policies: {
        Args: never
        Returns: {
          tablename: string
        }[]
      }
      sec_tables_without_rls: {
        Args: never
        Returns: {
          tablename: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      user_plan: "free" | "standard" | "pro" | "proplus"
      user_status: "active" | "suspended" | "banned"
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
      app_role: ["admin", "moderator", "user"],
      user_plan: ["free", "standard", "pro", "proplus"],
      user_status: ["active", "suspended", "banned"],
    },
  },
} as const
