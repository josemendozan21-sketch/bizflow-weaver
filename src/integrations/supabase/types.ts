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
      body_production_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          production_order_id: string | null
          referencia: string
          status: string
          tipo_plastico: string
          unidades: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          production_order_id?: string | null
          referencia: string
          status?: string
          tipo_plastico: string
          unidades?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          production_order_id?: string | null
          referencia?: string
          status?: string
          tipo_plastico?: string
          unidades?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_production_tasks_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      body_stock: {
        Row: {
          available: number
          brand: string
          created_at: string
          id: string
          referencia: string
          updated_at: string
        }
        Insert: {
          available?: number
          brand: string
          created_at?: string
          id?: string
          referencia: string
          updated_at?: string
        }
        Update: {
          available?: number
          brand?: string
          created_at?: string
          id?: string
          referencia?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"]
          target_user_id?: string | null
          title?: string
          type?: string
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
          dispatch_notes: string | null
          dispatched_at: string | null
          gel_color: string | null
          id: string
          ink_color: string | null
          invoice_amount: number | null
          invoice_date: string | null
          invoice_file_url: string | null
          invoice_notes: string | null
          invoice_number: string | null
          invoice_status: string
          is_recompra: boolean
          logo_url: string | null
          numero_guia: string | null
          observations: string | null
          payment_complete: boolean | null
          payment_method: string | null
          payment_proof_url: string | null
          personalization: string | null
          product: string
          production_status: string
          quantity: number
          sale_type: string
          shipping_cost: number | null
          silicone_color: string | null
          total_amount: number | null
          transportadora: string | null
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
          dispatch_notes?: string | null
          dispatched_at?: string | null
          gel_color?: string | null
          id?: string
          ink_color?: string | null
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_file_url?: string | null
          invoice_notes?: string | null
          invoice_number?: string | null
          invoice_status?: string
          is_recompra?: boolean
          logo_url?: string | null
          numero_guia?: string | null
          observations?: string | null
          payment_complete?: boolean | null
          payment_method?: string | null
          payment_proof_url?: string | null
          personalization?: string | null
          product: string
          production_status?: string
          quantity?: number
          sale_type?: string
          shipping_cost?: number | null
          silicone_color?: string | null
          total_amount?: number | null
          transportadora?: string | null
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
          dispatch_notes?: string | null
          dispatched_at?: string | null
          gel_color?: string | null
          id?: string
          ink_color?: string | null
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_file_url?: string | null
          invoice_notes?: string | null
          invoice_number?: string | null
          invoice_status?: string
          is_recompra?: boolean
          logo_url?: string | null
          numero_guia?: string | null
          observations?: string | null
          payment_complete?: boolean | null
          payment_method?: string | null
          payment_proof_url?: string | null
          personalization?: string | null
          product?: string
          production_status?: string
          quantity?: number
          sale_type?: string
          shipping_cost?: number | null
          silicone_color?: string | null
          total_amount?: number | null
          transportadora?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      petty_cash_expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          fund_id: string
          id: string
          proof_url: string | null
          recorded_by: string
          recorded_by_name: string
          requested_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          fund_id: string
          id?: string
          proof_url?: string | null
          recorded_by: string
          recorded_by_name: string
          requested_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          fund_id?: string
          id?: string
          proof_url?: string | null
          recorded_by?: string
          recorded_by_name?: string
          requested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_expenses_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_funds: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          set_by: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          set_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          set_by?: string
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
      production_orders: {
        Row: {
          advisor_id: string | null
          brand: string
          client_name: string
          completed_at: string | null
          created_at: string
          current_stage: string
          final_count: number | null
          finished_photo_url: string | null
          gel_color: string | null
          has_stock: boolean | null
          id: string
          ink_color: string | null
          logo_file: string | null
          logo_type: string | null
          molde: string | null
          needs_cuerpos: boolean | null
          observations: string | null
          order_id: string | null
          packager_name: string | null
          quantity: number
          silicone_color: string | null
          stage_status: string
          stages: string[]
          stamp_advisor_feedback: string | null
          stamp_inkgel_approved_at: string | null
          stamp_inkgel_photo_url: string | null
          stamp_inkgel_status: string
          stamp_size_approved_at: string | null
          stamp_size_photo_url: string | null
          stamp_size_status: string
          thermo_size: string | null
          updated_at: string
          workflow_type: string
        }
        Insert: {
          advisor_id?: string | null
          brand: string
          client_name: string
          completed_at?: string | null
          created_at?: string
          current_stage?: string
          final_count?: number | null
          finished_photo_url?: string | null
          gel_color?: string | null
          has_stock?: boolean | null
          id?: string
          ink_color?: string | null
          logo_file?: string | null
          logo_type?: string | null
          molde?: string | null
          needs_cuerpos?: boolean | null
          observations?: string | null
          order_id?: string | null
          packager_name?: string | null
          quantity?: number
          silicone_color?: string | null
          stage_status?: string
          stages?: string[]
          stamp_advisor_feedback?: string | null
          stamp_inkgel_approved_at?: string | null
          stamp_inkgel_photo_url?: string | null
          stamp_inkgel_status?: string
          stamp_size_approved_at?: string | null
          stamp_size_photo_url?: string | null
          stamp_size_status?: string
          thermo_size?: string | null
          updated_at?: string
          workflow_type?: string
        }
        Update: {
          advisor_id?: string | null
          brand?: string
          client_name?: string
          completed_at?: string | null
          created_at?: string
          current_stage?: string
          final_count?: number | null
          finished_photo_url?: string | null
          gel_color?: string | null
          has_stock?: boolean | null
          id?: string
          ink_color?: string | null
          logo_file?: string | null
          logo_type?: string | null
          molde?: string | null
          needs_cuerpos?: boolean | null
          observations?: string | null
          order_id?: string | null
          packager_name?: string | null
          quantity?: number
          silicone_color?: string | null
          stage_status?: string
          stages?: string[]
          stamp_advisor_feedback?: string | null
          stamp_inkgel_approved_at?: string | null
          stamp_inkgel_photo_url?: string | null
          stamp_inkgel_status?: string
          stamp_size_approved_at?: string | null
          stamp_size_photo_url?: string | null
          stamp_size_status?: string
          thermo_size?: string | null
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_supply_orders: {
        Row: {
          brand: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          item_name: string
          item_type: string
          notes: string | null
          quantity_requested: number
          requested_by: string
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          brand: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item_name: string
          item_type?: string
          notes?: string | null
          quantity_requested: number
          requested_by: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          brand?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          quantity_requested?: number
          requested_by?: string
          status?: string
          unit?: string
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
      stock_items: {
        Row: {
          available: number
          brand: string
          category: string
          color: string | null
          created_at: string
          id: string
          logo: string | null
          min_stock: number
          name: string
          product_type: string | null
          sweatspot_category: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          available?: number
          brand: string
          category: string
          color?: string | null
          created_at?: string
          id?: string
          logo?: string | null
          min_stock?: number
          name: string
          product_type?: string | null
          sweatspot_category?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          available?: number
          brand?: string
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          logo?: string | null
          min_stock?: number
          name?: string
          product_type?: string | null
          sweatspot_category?: string | null
          unit?: string
          updated_at?: string
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
      get_all_deliveries: {
        Args: never
        Returns: {
          advisor_name: string
          brand: string
          client_name: string
          delivery_date: string
          id: string
          product: string
          production_status: string
          quantity: number
          sale_type: string
        }[]
      }
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
        | "disenador"
        | "logistica"
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
        "disenador",
        "logistica",
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
