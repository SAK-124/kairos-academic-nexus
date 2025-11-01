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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          model: string | null
          note_id: string | null
          prompt: string
          response: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          model?: string | null
          note_id?: string | null
          prompt: string
          response: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          model?: string | null
          note_id?: string | null
          prompt?: string
          response?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      animation_settings: {
        Row: {
          id: string
          setting_name: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          setting_name: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          id?: string
          setting_name?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      button_mappings: {
        Row: {
          button_id: string
          enabled: boolean | null
          hover_text: string | null
          id: string
          route: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          button_id: string
          enabled?: boolean | null
          hover_text?: string | null
          id?: string
          route?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          button_id?: string
          enabled?: boolean | null
          hover_text?: string | null
          id?: string
          route?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          resolved: boolean | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          resolved?: boolean | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          resolved?: boolean | null
          subject?: string | null
        }
        Relationships: []
      }
      content_sections: {
        Row: {
          content: Json
          id: string
          section_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content?: Json
          id?: string
          section_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: Json
          id?: string
          section_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      early_access_signups: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          graduation_year: string | null
          id: string
          interest_level: string | null
          notified: boolean | null
          phone_number: string | null
          university: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          graduation_year?: string | null
          id?: string
          interest_level?: string | null
          notified?: boolean | null
          phone_number?: string | null
          university?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          graduation_year?: string | null
          id?: string
          interest_level?: string | null
          notified?: boolean | null
          phone_number?: string | null
          university?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_signups: {
        Row: {
          email: string
          full_name: string | null
          id: string
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          full_name?: string | null
          id?: string
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          full_name?: string | null
          id?: string
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          character_count: number | null
          content: Json
          course_id: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          is_archived: boolean | null
          is_favorite: boolean | null
          last_edited_at: string | null
          plain_text: string | null
          plain_text_search: unknown
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          character_count?: number | null
          content?: Json
          course_id?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          last_edited_at?: string | null
          plain_text?: string | null
          plain_text_search?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          character_count?: number | null
          content?: Json
          course_id?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          last_edited_at?: string | null
          plain_text?: string | null
          plain_text_search?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_schedules: {
        Row: {
          conflicts: Json | null
          courses: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          schedule_name: string
          semester: string | null
          summary: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conflicts?: Json | null
          courses: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          schedule_name: string
          semester?: string | null
          summary?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conflicts?: Json | null
          courses?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          schedule_name?: string
          semester?: string | null
          summary?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      schedule_courses: {
        Row: {
          class_number: string | null
          course_code: string
          course_title: string
          created_at: string | null
          credits: number | null
          days: string[]
          display_order: number | null
          end_time: string
          id: string
          instructor: string | null
          location: string | null
          notes: string | null
          schedule_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          class_number?: string | null
          course_code: string
          course_title: string
          created_at?: string | null
          credits?: number | null
          days: string[]
          display_order?: number | null
          end_time: string
          id?: string
          instructor?: string | null
          location?: string | null
          notes?: string | null
          schedule_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          class_number?: string | null
          course_code?: string
          course_title?: string
          created_at?: string | null
          credits?: number | null
          days?: string[]
          display_order?: number | null
          end_time?: string
          id?: string
          instructor?: string | null
          location?: string | null
          notes?: string | null
          schedule_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_courses_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "saved_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          content: Json
          course_id: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          last_reviewed_at: string | null
          note_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: Json
          course_id?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          last_reviewed_at?: string | null
          note_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: Json
          course_id?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          last_reviewed_at?: string | null
          note_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string | null
          expires_at: string
          id: string
          type: string
        }
        Insert: {
          challenge: string
          created_at?: string | null
          expires_at: string
          id?: string
          type?: string
        }
        Update: {
          challenge?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number | null
          created_at: string | null
          credential_id: string
          id: string
          last_used_at: string | null
          public_key: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          counter?: number | null
          created_at?: string | null
          credential_id: string
          id?: string
          last_used_at?: string | null
          public_key: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          counter?: number | null
          created_at?: string | null
          credential_id?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
