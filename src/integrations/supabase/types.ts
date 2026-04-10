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
      event_products: {
        Row: {
          brand: string
          created_at: string
          event_id: string
          id: string
          product_name: string
          quantity_needed: number
        }
        Insert: {
          brand?: string
          created_at?: string
          event_id: string
          id?: string
          product_name: string
          quantity_needed?: number
        }
        Update: {
          brand?: string
          created_at?: string
          event_id?: string
          id?: string
          product_name?: string
          quantity_needed?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string
          created_at: string
          created_by: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          created_by?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      logo_requests: {
        Row: {
          additional_instructions: string | null
          adjusted_logo_url: string | null
          advisor_feedback: string | null
          advisor_id: string
          advisor_name: string
          approved_at: string | null
          brand: string
          client_comments: string | null
          client_name: string
          created_at: string
          design_notes: string | null
          designer_id: string | null
          designer_name: string | null
          id: string
          original_logo_url: string
          product: string
          status: Database["public"]["Enums"]["logo_request_status"]
          updated_at: string
        }
        Insert: {
          additional_instructions?: string | null
          adjusted_logo_url?: string | null
          advisor_feedback?: string | null
          advisor_id: string
          advisor_name: string
          approved_at?: string | null
          brand: string
          client_comments?: string | null
          client_name: string
          created_at?: string
          design_notes?: string | null
          designer_id?: string | null
          designer_name?: string | null
          id?: string
          original_logo_url: string
          product: string
          status?: Database["public"]["Enums"]["logo_request_status"]
          updated_at?: string
        }
        Update: {
          additional_instructions?: string | null
          adjusted_logo_url?: string | null
          advisor_feedback?: string | null
          advisor_id?: string
          advisor_name?: string
          approved_at?: string | null
          brand?: string
          client_comments?: string | null
          client_name?: string
          created_at?: string
          design_notes?: string | null
          designer_id?: string | null
          designer_name?: string | null
          id?: string
          original_logo_url?: string
          product?: string
          status?: Database["public"]["Enums"]["logo_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          abono: number | null
          advisor_id: string
          advisor_name: string
          brand: string
          client_address: string | null
          client_city: string | null
          client_email: string | null
          client_name: string
          client_nit: string | null
          client_phone: string | null
          created_at: string
          delivery_date: string | null
          gel_color: string | null
          id: string
          ink_color: string | null
          logo_url: string | null
          observations: string | null
          personalization: string | null
          product: string
          production_status: string
          quantity: number
          sale_type: string
          silicone_color: string | null
          total_amount: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          abono?: number | null
          advisor_id: string
          advisor_name: string
          brand: string
          client_address?: string | null
          client_city?: string | null
          client_email?: string | null
          client_name: string
          client_nit?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_date?: string | null
          gel_color?: string | null
          id?: string
          ink_color?: string | null
          logo_url?: string | null
          observations?: string | null
          personalization?: string | null
          product: string
          production_status?: string
          quantity?: number
          sale_type?: string
          silicone_color?: string | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          abono?: number | null
          advisor_id?: string
          advisor_name?: string
          brand?: string
          client_address?: string | null
          client_city?: string | null
          client_email?: string | null
          client_name?: string
          client_nit?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_date?: string | null
          gel_color?: string | null
          id?: string
          ink_color?: string | null
          logo_url?: string | null
          observations?: string | null
          personalization?: string | null
          product?: string
          production_status?: string
          quantity?: number
          sale_type?: string
          silicone_color?: string | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          brand: string
          created_at: string
          id: string
          product_name: string
          production_cost: number
          raw_material_cost: number
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          product_name: string
          production_cost?: number
          raw_material_cost?: number
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          product_name?: string
          production_cost?: number
          raw_material_cost?: number
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "asesor_comercial"
        | "produccion"
        | "contabilidad"
        | "estampacion"
        | "usuario_visual"
      event_type: "feria" | "carrera" | "activacion"
      logo_request_status:
        | "pendiente_diseno"
        | "en_revision"
        | "ajustado"
        | "listo_aprobacion"
        | "ajustes_solicitados"
        | "aprobado"
        | "finalizado"
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
      app_role: [
        "admin",
        "asesor_comercial",
        "produccion",
        "contabilidad",
        "estampacion",
        "usuario_visual",
      ],
      event_type: ["feria", "carrera", "activacion"],
      logo_request_status: [
        "pendiente_diseno",
        "en_revision",
        "ajustado",
        "listo_aprobacion",
        "ajustes_solicitados",
        "aprobado",
        "finalizado",
      ],
    },
  },
} as const
