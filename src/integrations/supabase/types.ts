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
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          key: string
          last_used_at: string | null
          name: string
          owner: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          last_used_at?: string | null
          name: string
          owner?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          last_used_at?: string | null
          name?: string
          owner?: string | null
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          changelog: string | null
          current_version: string
          force_update: boolean
          minimum_version: string
          platform: string
          update_url: string
          updated_at: string
        }
        Insert: {
          changelog?: string | null
          current_version: string
          force_update?: boolean
          minimum_version: string
          platform: string
          update_url: string
          updated_at?: string
        }
        Update: {
          changelog?: string | null
          current_version?: string
          force_update?: boolean
          minimum_version?: string
          platform?: string
          update_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_registry: {
        Row: {
          anilist_id: string | null
          created_at: string | null
          dverse_description: string | null
          dverse_id: string
          gifted_id: string | null
          moviebox_id: string | null
          provider: string
          provider_id: string
          title: string
          tmdb_id: string | null
          type: string
        }
        Insert: {
          anilist_id?: string | null
          created_at?: string | null
          dverse_description?: string | null
          dverse_id: string
          gifted_id?: string | null
          moviebox_id?: string | null
          provider: string
          provider_id: string
          title: string
          tmdb_id?: string | null
          type: string
        }
        Update: {
          anilist_id?: string | null
          created_at?: string | null
          dverse_description?: string | null
          dverse_id?: string
          gifted_id?: string | null
          moviebox_id?: string | null
          provider?: string
          provider_id?: string
          title?: string
          tmdb_id?: string | null
          type?: string
        }
        Relationships: []
      }
      continue_watching: {
        Row: {
          content_id: string
          content_type: string
          current_time_sec: number | null
          duration_sec: number | null
          dverse_id: string | null
          episode: number | null
          id: string
          last_channel: number | null
          poster: string | null
          progress: number
          season: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          current_time_sec?: number | null
          duration_sec?: number | null
          dverse_id?: string | null
          episode?: number | null
          id?: string
          last_channel?: number | null
          poster?: string | null
          progress?: number
          season?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          current_time_sec?: number | null
          duration_sec?: number | null
          dverse_id?: string | null
          episode?: number | null
          id?: string
          last_channel?: number | null
          poster?: string | null
          progress?: number
          season?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          file_url: string | null
          id: string
          poster: string | null
          title: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          file_url?: string | null
          id?: string
          poster?: string | null
          title: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          poster?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          added_at: string | null
          dverse_id: string
          id: string
          poster: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          dverse_id: string
          id?: string
          poster?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          dverse_id?: string
          id?: string
          poster?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_config: Json | null
          created_at: string
          email: string
          id: string
          name: string
          onboarding_done: boolean | null
          onboarding_genres: string[] | null
          onboarding_step: string | null
          username: string
        }
        Insert: {
          avatar_config?: Json | null
          created_at?: string
          email: string
          id: string
          name: string
          onboarding_done?: boolean | null
          onboarding_genres?: string[] | null
          onboarding_step?: string | null
          username: string
        }
        Update: {
          avatar_config?: Json | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          onboarding_done?: boolean | null
          onboarding_genres?: string[] | null
          onboarding_step?: string | null
          username?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          dverse_id: string
          id: string
          poster: string | null
          title: string
          type: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          dverse_id: string
          id?: string
          poster?: string | null
          title: string
          type: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          dverse_id?: string
          id?: string
          poster?: string | null
          title?: string
          type?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string
          created_at: string | null
          dverse_id: string
          id: string
          rating: number | null
          status: string | null
          user_id: string
          user_name: string | null
          vee_confidence: number | null
          vee_reason: string | null
          vee_verdict: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          dverse_id: string
          id?: string
          rating?: number | null
          status?: string | null
          user_id: string
          user_name?: string | null
          vee_confidence?: number | null
          vee_reason?: string | null
          vee_verdict?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          dverse_id?: string
          id?: string
          rating?: number | null
          status?: string | null
          user_id?: string
          user_name?: string | null
          vee_confidence?: number | null
          vee_reason?: string | null
          vee_verdict?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          query: string
          searched_at: string
          user_id: string
        }
        Insert: {
          id?: string
          query: string
          searched_at?: string
          user_id: string
        }
        Update: {
          id?: string
          query?: string
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_registry: {
        Row: {
          anilist_id: number | null
          category: string
          created_at: string | null
          description: string | null
          dverse_studio_id: string
          name: string
          provider: string
          tmdb_id: string | null
        }
        Insert: {
          anilist_id?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          dverse_studio_id: string
          name: string
          provider: string
          tmdb_id?: string | null
        }
        Update: {
          anilist_id?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          dverse_studio_id?: string
          name?: string
          provider?: string
          tmdb_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          autoplay_next: boolean
          preferred_quality: string | null
          preferred_subtitle_lang: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autoplay_next?: boolean
          preferred_quality?: string | null
          preferred_subtitle_lang?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autoplay_next?: boolean
          preferred_quality?: string | null
          preferred_subtitle_lang?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          content_id: string
          content_type: string
          dverse_id: string | null
          episode: number | null
          genres: string[] | null
          id: string
          poster: string | null
          season: number | null
          title: string
          type: string | null
          user_id: string
          watched_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          dverse_id?: string | null
          episode?: number | null
          genres?: string[] | null
          id?: string
          poster?: string | null
          season?: number | null
          title: string
          type?: string | null
          user_id: string
          watched_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          dverse_id?: string | null
          episode?: number | null
          genres?: string[] | null
          id?: string
          poster?: string | null
          season?: number | null
          title?: string
          type?: string | null
          user_id?: string
          watched_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string
          content_id: string
          content_type: string
          id: string
          poster: string | null
          title: string
          user_id: string
        }
        Insert: {
          added_at?: string
          content_id: string
          content_type: string
          id?: string
          poster?: string | null
          title: string
          user_id: string
        }
        Update: {
          added_at?: string
          content_id?: string
          content_type?: string
          id?: string
          poster?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: {
        Args: { lookup_username: string }
        Returns: string
      }
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
