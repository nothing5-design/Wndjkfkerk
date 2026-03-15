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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bot_buttons: {
        Row: {
          callback_data: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          link_url: string | null
          media_type: string | null
          media_url: string | null
          message_text: string | null
          position_order: number
          row_order: number
          updated_at: string
        }
        Insert: {
          callback_data?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          link_url?: string | null
          media_type?: string | null
          media_url?: string | null
          message_text?: string | null
          position_order?: number
          row_order?: number
          updated_at?: string
        }
        Update: {
          callback_data?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          link_url?: string | null
          media_type?: string | null
          media_url?: string | null
          message_text?: string | null
          position_order?: number
          row_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          bot_name: string | null
          bot_token: string | null
          id: number
          official_site_url: string | null
          tutorial_links: Json | null
          updated_at: string
          welcome_media_type: string | null
          welcome_media_url: string | null
          welcome_message: string
        }
        Insert: {
          bot_name?: string | null
          bot_token?: string | null
          id?: number
          official_site_url?: string | null
          tutorial_links?: Json | null
          updated_at?: string
          welcome_media_type?: string | null
          welcome_media_url?: string | null
          welcome_message?: string
        }
        Update: {
          bot_name?: string | null
          bot_token?: string | null
          id?: number
          official_site_url?: string | null
          tutorial_links?: Json | null
          updated_at?: string
          welcome_media_type?: string | null
          welcome_media_url?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          box_plays: number
          coins: number
          created_at: string
          first_name: string | null
          guess_plays: number
          id: string
          language: string | null
          last_played_at: string | null
          plays_remaining: number
          referral_count: number
          referred_by: number | null
          telegram_id: number
          total_coins_earned: number
          updated_at: string
          username: string | null
          wheel_plays: number
        }
        Insert: {
          box_plays?: number
          coins?: number
          created_at?: string
          first_name?: string | null
          guess_plays?: number
          id?: string
          language?: string | null
          last_played_at?: string | null
          plays_remaining?: number
          referral_count?: number
          referred_by?: number | null
          telegram_id: number
          total_coins_earned?: number
          updated_at?: string
          username?: string | null
          wheel_plays?: number
        }
        Update: {
          box_plays?: number
          coins?: number
          created_at?: string
          first_name?: string | null
          guess_plays?: number
          id?: string
          language?: string | null
          last_played_at?: string | null
          plays_remaining?: number
          referral_count?: number
          referred_by?: number | null
          telegram_id?: number
          total_coins_earned?: number
          updated_at?: string
          username?: string | null
          wheel_plays?: number
        }
        Relationships: []
      }
      force_join_channels: {
        Row: {
          button_name: string
          channel_id: string
          channel_link: string
          created_at: string
          id: string
          is_active: boolean
          position_order: number
          updated_at: string
        }
        Insert: {
          button_name: string
          channel_id: string
          channel_link: string
          created_at?: string
          id?: string
          is_active?: boolean
          position_order?: number
          updated_at?: string
        }
        Update: {
          button_name?: string
          channel_id?: string
          channel_link?: string
          created_at?: string
          id?: string
          is_active?: boolean
          position_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          coins_won: number
          created_at: string
          details: Json | null
          game_type: string
          id: string
          telegram_id: number
        }
        Insert: {
          coins_won?: number
          created_at?: string
          details?: Json | null
          game_type: string
          id?: string
          telegram_id: number
        }
        Update: {
          coins_won?: number
          created_at?: string
          details?: Json | null
          game_type?: string
          id?: string
          telegram_id?: number
        }
        Relationships: []
      }
      redemption_codes: {
        Row: {
          claimed_at: string | null
          claimed_by_telegram_id: number | null
          code: string
          coin_cost: number
          created_at: string
          id: string
          is_claimed: boolean
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_telegram_id?: number | null
          code: string
          coin_cost?: number
          created_at?: string
          id?: string
          is_claimed?: boolean
        }
        Update: {
          claimed_at?: string | null
          claimed_by_telegram_id?: number | null
          code?: string
          coin_cost?: number
          created_at?: string
          id?: string
          is_claimed?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
