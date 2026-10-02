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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          amount: number
          created_at: string | null
          from_user_id: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_program: {
        Row: {
          active_subscriptions: number | null
          balance_available: number | null
          created_at: string | null
          referral_code: string
          total_earned: number | null
          total_referrals: number | null
          user_id: string
        }
        Insert: {
          active_subscriptions?: number | null
          balance_available?: number | null
          created_at?: string | null
          referral_code: string
          total_earned?: number | null
          total_referrals?: number | null
          user_id: string
        }
        Update: {
          active_subscriptions?: number | null
          balance_available?: number | null
          created_at?: string | null
          referral_code?: string
          total_earned?: number | null
          total_referrals?: number | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      ai_analysis_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          id: string
          lottery_id: string
          result: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string
          function_name: string
          id?: string
          lottery_id: string
          result: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          id?: string
          lottery_id?: string
          result?: Json
        }
        Relationships: []
      }
      ai_strategy_performance: {
        Row: {
          avg_hits: number
          avg_score: number
          best_hits: number
          consistency: number
          created_at: string
          id: string
          last_used_at: string
          lottery_id: string
          strategy: string
          total_games: number
          total_simulations: number
          updated_at: string
          user_id: string
          win_rate: number
        }
        Insert: {
          avg_hits?: number
          avg_score?: number
          best_hits?: number
          consistency?: number
          created_at?: string
          id?: string
          last_used_at?: string
          lottery_id: string
          strategy: string
          total_games?: number
          total_simulations?: number
          updated_at?: string
          user_id: string
          win_rate?: number
        }
        Update: {
          avg_hits?: number
          avg_score?: number
          best_hits?: number
          consistency?: number
          created_at?: string
          id?: string
          last_used_at?: string
          lottery_id?: string
          strategy?: string
          total_games?: number
          total_simulations?: number
          updated_at?: string
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      ai_user_memory: {
        Row: {
          confidence: number
          created_at: string
          id: string
          key: string
          lottery_id: string
          memory_type: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          key: string
          lottery_id: string
          memory_type: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          key?: string
          lottery_id?: string
          memory_type?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      backtest_runs: {
        Row: {
          after_metrics: Json
          before_metrics: Json
          created_at: string
          delta: Json
          draws_evaluated: number
          id: string
          improved: boolean
          lookback: number
          lottery_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          after_metrics: Json
          before_metrics: Json
          created_at?: string
          delta: Json
          draws_evaluated: number
          id?: string
          improved: boolean
          lookback: number
          lottery_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          after_metrics?: Json
          before_metrics?: Json
          created_at?: string
          delta?: Json
          draws_evaluated?: number
          id?: string
          improved?: boolean
          lookback?: number
          lottery_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      closing_history: {
        Row: {
          base_numbers: number[]
          cost: number
          created_at: string
          elapsed_ms: number | null
          game_count: number
          games: Json
          id: string
          lottery_id: string
          lottery_name: string | null
          lower_bound: number | null
          max_games: number | null
          min_hits: number
          notes: string[] | null
          parent_id: string | null
          score: Json
          share_id: string | null
          source: string
          strategy: string
          user_id: string
          validation: Json
          version: number
        }
        Insert: {
          base_numbers: number[]
          cost?: number
          created_at?: string
          elapsed_ms?: number | null
          game_count: number
          games: Json
          id?: string
          lottery_id: string
          lottery_name?: string | null
          lower_bound?: number | null
          max_games?: number | null
          min_hits: number
          notes?: string[] | null
          parent_id?: string | null
          score?: Json
          share_id?: string | null
          source?: string
          strategy: string
          user_id: string
          validation?: Json
          version?: number
        }
        Update: {
          base_numbers?: number[]
          cost?: number
          created_at?: string
          elapsed_ms?: number | null
          game_count?: number
          games?: Json
          id?: string
          lottery_id?: string
          lottery_name?: string | null
          lower_bound?: number | null
          max_games?: number | null
          min_hits?: number
          notes?: string[] | null
          parent_id?: string | null
          score?: Json
          share_id?: string | null
          source?: string
          strategy?: string
          user_id?: string
          validation?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "closing_history_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "closing_history"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_performance_log: {
        Row: {
          avg_hits: number | null
          config: Json
          created_at: string
          evaluated_at: string | null
          evaluated_concurso: number | null
          games: Json
          generated_at: string
          id: string
          lottery_id: string
          max_hits: number | null
          preset_hash: string
          preset_label: string | null
          tiers_hit: Json | null
          user_id: string
        }
        Insert: {
          avg_hits?: number | null
          config?: Json
          created_at?: string
          evaluated_at?: string | null
          evaluated_concurso?: number | null
          games?: Json
          generated_at?: string
          id?: string
          lottery_id: string
          max_hits?: number | null
          preset_hash: string
          preset_label?: string | null
          tiers_hit?: Json | null
          user_id: string
        }
        Update: {
          avg_hits?: number | null
          config?: Json
          created_at?: string
          evaluated_at?: string | null
          evaluated_concurso?: number | null
          games?: Json
          generated_at?: string
          id?: string
          lottery_id?: string
          max_hits?: number | null
          preset_hash?: string
          preset_label?: string | null
          tiers_hit?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      generation_history: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lottery_id: string
          numbers: number[]
          pipeline: Json | null
          score: number
          strategy: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lottery_id: string
          numbers: number[]
          pipeline?: Json | null
          score: number
          strategy: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lottery_id?: string
          numbers?: number[]
          pipeline?: Json | null
          score?: number
          strategy?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_simulations: {
        Row: {
          created_at: string | null
          duration_months: number
          estimated_return: number | null
          id: string
          lottery_id: string
          monthly_budget: number
          recommended_strategy_id: string | null
          risk_level: string
          simulation_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_months: number
          estimated_return?: number | null
          id?: string
          lottery_id: string
          monthly_budget: number
          recommended_strategy_id?: string | null
          risk_level: string
          simulation_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_months?: number
          estimated_return?: number | null
          id?: string
          lottery_id?: string
          monthly_budget?: number
          recommended_strategy_id?: string | null
          risk_level?: string
          simulation_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_name: string | null
          consent_given: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
        }
        Insert: {
          company_name?: string | null
          consent_given?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          job_title?: string | null
          phone?: string | null
        }
        Update: {
          company_name?: string | null
          consent_given?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      lottery_draws: {
        Row: {
          concurso: number
          created_at: string
          draw_date: string | null
          id: string
          lottery_id: string
          numbers: number[]
          prize_tiers: Json | null
        }
        Insert: {
          concurso: number
          created_at?: string
          draw_date?: string | null
          id?: string
          lottery_id: string
          numbers: number[]
          prize_tiers?: Json | null
        }
        Update: {
          concurso?: number
          created_at?: string
          draw_date?: string | null
          id?: string
          lottery_id?: string
          numbers?: number[]
          prize_tiers?: Json | null
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string | null
          description: string
          icon: string
          id: string
          requirement_count: number
          requirement_type: string
          title: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          icon: string
          id?: string
          requirement_count: number
          requirement_type: string
          title: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          requirement_count?: number
          requirement_type?: string
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string | null
          icon_url: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          created_at: string
          currency_format: string
          email: string | null
          full_name: string | null
          id: string
          language: string
          phone_number: string | null
          plan: string
          theme_preference: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          currency_format?: string
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          phone_number?: string | null
          plan?: string
          theme_preference?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          currency_format?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          phone_number?: string | null
          plan?: string
          theme_preference?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          categories: Json
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          categories?: Json
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          categories?: Json
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pwa_tracking: {
        Row: {
          created_at: string
          event_type: string
          id: string
          platform: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          platform?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      saved_bets: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          label: string | null
          lottery_id: string
          numbers: number[]
          score: number | null
          strategy: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          label?: string | null
          lottery_id: string
          numbers: number[]
          score?: number | null
          strategy?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          label?: string | null
          lottery_id?: string
          numbers?: number[]
          score?: number | null
          strategy?: string | null
          user_id?: string
        }
        Relationships: []
      }
      signup_ip_registry: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      simulation_scenarios: {
        Row: {
          created_at: string
          id: string
          lottery_id: string
          name: string
          regime_stability: number
          result_metrics: Json | null
          risk_profile: string
          updated_at: string
          user_id: string
          volatility: number
          weights: Json
        }
        Insert: {
          created_at?: string
          id?: string
          lottery_id: string
          name: string
          regime_stability: number
          result_metrics?: Json | null
          risk_profile: string
          updated_at?: string
          user_id: string
          volatility: number
          weights: Json
        }
        Update: {
          created_at?: string
          id?: string
          lottery_id?: string
          name?: string
          regime_stability?: number
          result_metrics?: Json | null
          risk_profile?: string
          updated_at?: string
          user_id?: string
          volatility?: number
          weights?: Json
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          protocol: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          protocol: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          protocol?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_insights: {
        Row: {
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          insight_type: string
          lottery_id: string
          score: number | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type: string
          lottery_id: string
          score?: number | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          insight_type?: string
          lottery_id?: string
          score?: number | null
          title?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_type: string
          id: string
          metadata: Json | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_alert_configs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_concurso: number
          lottery_id: string
          triggers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_concurso?: number
          lottery_id: string
          triggers?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_concurso?: number
          lottery_id?: string
          triggers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string | null
          level: number | null
          rank_position: number | null
          total_games_generated: number | null
          total_games_won: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          level?: number | null
          rank_position?: number | null
          total_games_generated?: number | null
          total_games_won?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          level?: number | null
          rank_position?: number | null
          total_games_generated?: number | null
          total_games_won?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roi_tracking: {
        Row: {
          amount_spent: number
          amount_won: number | null
          bet_date: string
          created_at: string | null
          game_ids: string[] | null
          id: string
          lottery_id: string
          user_id: string
        }
        Insert: {
          amount_spent: number
          amount_won?: number | null
          bet_date: string
          created_at?: string | null
          game_ids?: string[] | null
          id?: string
          lottery_id: string
          user_id: string
        }
        Update: {
          amount_spent?: number
          amount_won?: number | null
          bet_date?: string
          created_at?: string | null
          game_ids?: string[] | null
          id?: string
          lottery_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_phone_exists: { Args: { _phone: string }; Returns: boolean }
      ensure_affiliate_program: {
        Args: never
        Returns: {
          active_subscriptions: number | null
          balance_available: number | null
          created_at: string | null
          referral_code: string
          total_earned: number | null
          total_referrals: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "affiliate_program"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_user_gamification: {
        Args: never
        Returns: {
          created_at: string | null
          level: number | null
          rank_position: number | null
          total_games_generated: number | null
          total_games_won: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        SetofOptions: {
          from: "*"
          to: "user_gamification"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_shared_closing: {
        Args: { _share_id: string }
        Returns: {
          base_numbers: number[]
          cost: number
          created_at: string
          elapsed_ms: number | null
          game_count: number
          games: Json
          id: string
          lottery_id: string
          lottery_name: string | null
          lower_bound: number | null
          max_games: number | null
          min_hits: number
          notes: string[] | null
          parent_id: string | null
          score: Json
          share_id: string | null
          source: string
          strategy: string
          user_id: string
          validation: Json
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "closing_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_top_numbers: {
        Args: { p_limit?: number; p_lottery_id: string }
        Returns: {
          frequency: number
          number: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_games_generated: {
        Args: { _user_id: string }
        Returns: undefined
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_full_access_email: { Args: { _email: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      send_notification: {
        Args: {
          _action_url?: string
          _category?: string
          _message: string
          _priority?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      track_user_action: {
        Args: { _action: string; _user_id: string }
        Returns: undefined
      }
      update_mission_progress: {
        Args: { _increment?: number; _type: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
