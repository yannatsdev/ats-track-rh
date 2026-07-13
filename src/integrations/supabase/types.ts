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
      daily_entries: {
        Row: {
          avancement_pct: number
          created_at: string
          day: number
          heure: string | null
          id: string
          motif_report: string | null
          position: number
          resultat: string | null
          sheet_id: string
          statut: Database["public"]["Enums"]["task_status"]
          tache: string
        }
        Insert: {
          avancement_pct?: number
          created_at?: string
          day: number
          heure?: string | null
          id?: string
          motif_report?: string | null
          position?: number
          resultat?: string | null
          sheet_id: string
          statut?: Database["public"]["Enums"]["task_status"]
          tache?: string
        }
        Update: {
          avancement_pct?: number
          created_at?: string
          day?: number
          heure?: string | null
          id?: string
          motif_report?: string | null
          position?: number
          resultat?: string | null
          sheet_id?: string
          statut?: Database["public"]["Enums"]["task_status"]
          tache?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "weekly_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          first_name: string | null
          fonction: string | null
          id: string
          last_name: string | null
          manager_id: string | null
          service: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          fonction?: string | null
          id: string
          last_name?: string | null
          manager_id?: string | null
          service?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          fonction?: string | null
          id?: string
          last_name?: string | null
          manager_id?: string | null
          service?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validations: {
        Row: {
          commentaire: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          sheet_id: string
          statut: string
          validated_at: string | null
          validator_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          sheet_id: string
          statut?: string
          validated_at?: string | null
          validator_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          sheet_id?: string
          statut?: string
          validated_at?: string | null
          validator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validations_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "weekly_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_sheets: {
        Row: {
          avancement_global: number
          bilan_actions: string | null
          bilan_difficultes: string | null
          bilan_dossiers: string | null
          bilan_realisations: string | null
          created_at: string
          difficultes: string | null
          id: string
          observations: string | null
          status: Database["public"]["Enums"]["sheet_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          avancement_global?: number
          bilan_actions?: string | null
          bilan_difficultes?: string | null
          bilan_dossiers?: string | null
          bilan_realisations?: string | null
          created_at?: string
          difficultes?: string | null
          id?: string
          observations?: string | null
          status?: Database["public"]["Enums"]["sheet_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          avancement_global?: number
          bilan_actions?: string | null
          bilan_difficultes?: string | null
          bilan_dossiers?: string | null
          bilan_realisations?: string | null
          created_at?: string
          difficultes?: string | null
          id?: string
          observations?: string | null
          status?: Database["public"]["Enums"]["sheet_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "employee" | "hr" | "direction" | "admin"
      sheet_status:
        | "draft"
        | "submitted"
        | "hr_validated"
        | "direction_validated"
        | "rejected"
      task_status: "done" | "in_progress" | "postponed"
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
      app_role: ["employee", "hr", "direction", "admin"],
      sheet_status: [
        "draft",
        "submitted",
        "hr_validated",
        "direction_validated",
        "rejected",
      ],
      task_status: ["done", "in_progress", "postponed"],
    },
  },
} as const
