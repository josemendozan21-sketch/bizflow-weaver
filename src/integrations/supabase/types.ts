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
      area_compliance_rules: {
        Row: {
          active: boolean
          area: string
          bonus_amount: number
          bonus_threshold_pct: number
          created_at: string
          id: string
          min_threshold_pct: number
          notes: string | null
          percentage: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          bonus_amount?: number
          bonus_threshold_pct?: number
          created_at?: string
          id?: string
          min_threshold_pct?: number
          notes?: string | null
          percentage?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          bonus_amount?: number
          bonus_threshold_pct?: number
          created_at?: string
          id?: string
          min_threshold_pct?: number
          notes?: string | null
          percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          active: boolean
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_movements: {
        Row: {
          amount: number
          bank_account_id: string
          concept: string
          created_at: string
          direction: string
          id: string
          movement_date: string
          recorded_by: string | null
          recorded_by_name: string | null
          reference_id: string | null
          reference_kind: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          concept: string
          created_at?: string
          direction: string
          id?: string
          movement_date?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference_id?: string | null
          reference_kind?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          concept?: string
          created_at?: string
          direction?: string
          id?: string
          movement_date?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference_id?: string | null
          reference_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_movements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      body_production_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          fabricated_by: string | null
          id: string
          order_id: string | null
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
          fabricated_by?: string | null
          id?: string
          order_id?: string | null
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
          fabricated_by?: string | null
          id?: string
          order_id?: string | null
          production_order_id?: string | null
          referencia?: string
          status?: string
          tipo_plastico?: string
          unidades?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_production_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
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
      budget_entries: {
        Row: {
          amount: number
          bank_account_id: string | null
          budget_id: string
          category: string
          created_at: string
          description: string | null
          entry_date: string
          id: string
          kind: string
          proof_url: string | null
          recorded_by: string | null
          recorded_by_name: string | null
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          budget_id: string
          category: string
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          kind: string
          proof_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          budget_id?: string
          category?: string
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          kind?: string
          proof_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_entries_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budget_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          kind: string
          projected_amount: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          projected_amount?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          projected_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean
          brand: string
          created_at: string
          id: string
          notes: string | null
          percentage: number
          sale_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand: string
          created_at?: string
          id?: string
          notes?: string | null
          percentage?: number
          sale_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string
          created_at?: string
          id?: string
          notes?: string | null
          percentage?: number
          sale_type?: string
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
      feria_dispatch_requests: {
        Row: {
          created_at: string
          dispatch_notes: string | null
          dispatched_at: string | null
          dispatched_by: string | null
          feria_id: string
          furniture_dispatched: boolean
          furniture_items: string[] | null
          id: string
          requested_at: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatch_notes?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          feria_id: string
          furniture_dispatched?: boolean
          furniture_items?: string[] | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatch_notes?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          feria_id?: string
          furniture_dispatched?: boolean
          furniture_items?: string[] | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feria_inventory: {
        Row: {
          brand: string
          created_at: string
          dispatch_status: string
          feria_id: string
          id: string
          notes: string | null
          product_name: string
          quantity_assigned: number
          quantity_dispatched: number
          quantity_returned: number | null
          unit_cost: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          dispatch_status?: string
          feria_id: string
          id?: string
          notes?: string | null
          product_name: string
          quantity_assigned?: number
          quantity_dispatched?: number
          quantity_returned?: number | null
          unit_cost?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          dispatch_status?: string
          feria_id?: string
          id?: string
          notes?: string | null
          product_name?: string
          quantity_assigned?: number
          quantity_dispatched?: number
          quantity_returned?: number | null
          unit_cost?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feria_inventory_feria_id_fkey"
            columns: ["feria_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
        ]
      }
      feria_pos_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          feria_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          feria_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          feria_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feria_sales: {
        Row: {
          brand: string
          client_name: string | null
          created_at: string
          feria_id: string
          id: string
          notes: string | null
          payment_method: string | null
          product_name: string
          quantity: number
          recorded_by: string | null
          sale_date: string
          total_amount: number
          unit_price: number
        }
        Insert: {
          brand: string
          client_name?: string | null
          created_at?: string
          feria_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_name: string
          quantity?: number
          recorded_by?: string | null
          sale_date?: string
          total_amount?: number
          unit_price?: number
        }
        Update: {
          brand?: string
          client_name?: string | null
          created_at?: string
          feria_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          product_name?: string
          quantity?: number
          recorded_by?: string | null
          sale_date?: string
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "feria_sales_feria_id_fkey"
            columns: ["feria_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
        ]
      }
      feria_staff: {
        Row: {
          arl_document_url: string | null
          arl_provider: string | null
          arl_valid_until: string | null
          created_at: string
          document_id: string | null
          emergency_contact: string | null
          feria_id: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          arl_document_url?: string | null
          arl_provider?: string | null
          arl_valid_until?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact?: string | null
          feria_id: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          arl_document_url?: string | null
          arl_provider?: string | null
          arl_valid_until?: string | null
          created_at?: string
          document_id?: string | null
          emergency_contact?: string | null
          feria_id?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feria_staff_feria_id_fkey"
            columns: ["feria_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias: {
        Row: {
          advertising_cost: number | null
          assigned_staff: string[] | null
          city: string
          created_at: string
          created_by: string | null
          employees_cost: number | null
          end_date: string
          food_cost: number | null
          id: string
          lodging_cost: number | null
          materials_needed: string[] | null
          merchandise_cost: number | null
          name: string
          notes: string | null
          other_costs: number | null
          setup_date: string | null
          shipping_cost: number | null
          stand_cost: number | null
          stand_number: string | null
          stand_size: string | null
          start_date: string
          status: string
          tickets_cost: number | null
          transport_cost: number | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          advertising_cost?: number | null
          assigned_staff?: string[] | null
          city: string
          created_at?: string
          created_by?: string | null
          employees_cost?: number | null
          end_date: string
          food_cost?: number | null
          id?: string
          lodging_cost?: number | null
          materials_needed?: string[] | null
          merchandise_cost?: number | null
          name: string
          notes?: string | null
          other_costs?: number | null
          setup_date?: string | null
          shipping_cost?: number | null
          stand_cost?: number | null
          stand_number?: string | null
          stand_size?: string | null
          start_date: string
          status?: string
          tickets_cost?: number | null
          transport_cost?: number | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          advertising_cost?: number | null
          assigned_staff?: string[] | null
          city?: string
          created_at?: string
          created_by?: string | null
          employees_cost?: number | null
          end_date?: string
          food_cost?: number | null
          id?: string
          lodging_cost?: number | null
          materials_needed?: string[] | null
          merchandise_cost?: number | null
          name?: string
          notes?: string | null
          other_costs?: number | null
          setup_date?: string | null
          shipping_cost?: number | null
          stand_cost?: number | null
          stand_number?: string | null
          stand_size?: string | null
          start_date?: string
          status?: string
          tickets_cost?: number | null
          transport_cost?: number | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          area: string
          brand: string
          category: string
          created_at: string
          direction: string
          entry_type: string | null
          feria_id: string | null
          id: string
          item_name: string
          movement_kind: string
          order_id: string | null
          proof_url: string | null
          purpose: string | null
          quantity: number
          reason: string | null
          recorded_at: string
          recorded_by: string | null
          recorded_by_name: string | null
          requested_by_name: string | null
          stock_item_id: string | null
          supplier: string | null
        }
        Insert: {
          area: string
          brand: string
          category: string
          created_at?: string
          direction: string
          entry_type?: string | null
          feria_id?: string | null
          id?: string
          item_name: string
          movement_kind?: string
          order_id?: string | null
          proof_url?: string | null
          purpose?: string | null
          quantity: number
          reason?: string | null
          recorded_at?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          requested_by_name?: string | null
          stock_item_id?: string | null
          supplier?: string | null
        }
        Update: {
          area?: string
          brand?: string
          category?: string
          created_at?: string
          direction?: string
          entry_type?: string | null
          feria_id?: string | null
          id?: string
          item_name?: string
          movement_kind?: string
          order_id?: string | null
          proof_url?: string | null
          purpose?: string | null
          quantity?: number
          reason?: string | null
          recorded_at?: string
          recorded_by?: string | null
          recorded_by_name?: string | null
          requested_by_name?: string | null
          stock_item_id?: string | null
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_requests: {
        Row: {
          brand: string
          category: string
          created_at: string
          id: string
          item_name: string
          item_type: string | null
          order_id: string | null
          quantity: number
          reason: string | null
          rejection_reason: string | null
          requester_area: string
          requester_id: string
          requester_name: string
          requester_person: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          routed_at: string | null
          routed_to: string | null
          status: string
          stock_item_id: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          id?: string
          item_name: string
          item_type?: string | null
          order_id?: string | null
          quantity: number
          reason?: string | null
          rejection_reason?: string | null
          requester_area: string
          requester_id: string
          requester_name: string
          requester_person?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          routed_at?: string | null
          routed_to?: string | null
          status?: string
          stock_item_id?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          item_type?: string | null
          order_id?: string | null
          quantity?: number
          reason?: string | null
          rejection_reason?: string | null
          requester_area?: string
          requester_id?: string
          requester_name?: string
          requester_person?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          routed_at?: string | null
          routed_to?: string | null
          status?: string
          stock_item_id?: string | null
          updated_at?: string
          urgency?: string
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
      monthly_budgets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: number
          notes: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          status?: string
          updated_at?: string
          year?: number
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
          production_completed_at: string | null
          production_due_date: string | null
          production_status: string
          quantity: number
          return_notes: string | null
          returned_at: string | null
          sale_type: string
          shipping_cost: number | null
          silicone_color: string | null
          stamping_completed_at: string | null
          stamping_due_date: string | null
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
          production_completed_at?: string | null
          production_due_date?: string | null
          production_status?: string
          quantity?: number
          return_notes?: string | null
          returned_at?: string | null
          sale_type?: string
          shipping_cost?: number | null
          silicone_color?: string | null
          stamping_completed_at?: string | null
          stamping_due_date?: string | null
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
          production_completed_at?: string | null
          production_due_date?: string | null
          production_status?: string
          quantity?: number
          return_notes?: string | null
          returned_at?: string | null
          sale_type?: string
          shipping_cost?: number | null
          silicone_color?: string | null
          stamping_completed_at?: string | null
          stamping_due_date?: string | null
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
      pos_cash_withdrawals: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          concept: string
          created_at: string
          id: string
          location_id: string
          movement_type: string
          notes: string | null
          proof_url: string | null
          rejection_reason: string | null
          requested_by: string
          requested_by_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          concept: string
          created_at?: string
          id?: string
          location_id: string
          movement_type?: string
          notes?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          requested_by: string
          requested_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          concept?: string
          created_at?: string
          id?: string
          location_id?: string
          movement_type?: string
          notes?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          requested_by?: string
          requested_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pos_central_transfers: {
        Row: {
          brand: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          dispatched_at: string | null
          dispatched_by: string | null
          id: string
          item_name: string
          location_id: string
          notes: string | null
          pos_product_id: string | null
          quantity: number
          received_at: string | null
          received_by: string | null
          status: string
          stock_item_id: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          item_name: string
          location_id: string
          notes?: string | null
          pos_product_id?: string | null
          quantity: number
          received_at?: string | null
          received_by?: string | null
          status?: string
          stock_item_id?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          item_name?: string
          location_id?: string
          notes?: string | null
          pos_product_id?: string | null
          quantity?: number
          received_at?: string | null
          received_by?: string | null
          status?: string
          stock_item_id?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_central_transfers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_central_transfers_pos_product_id_fkey"
            columns: ["pos_product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_inventory_movements: {
        Row: {
          created_at: string
          direction: string
          id: string
          location_id: string
          notes: string | null
          pos_product_id: string | null
          product_name: string
          quantity: number
          recorded_by: string | null
          recorded_by_name: string | null
          reference_id: string | null
          source: string
          supplier: string | null
          unit_cost: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          location_id: string
          notes?: string | null
          pos_product_id?: string | null
          product_name: string
          quantity: number
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference_id?: string | null
          source: string
          supplier?: string | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          location_id?: string
          notes?: string | null
          pos_product_id?: string | null
          product_name?: string
          quantity?: number
          recorded_by?: string | null
          recorded_by_name?: string | null
          reference_id?: string | null
          source?: string
          supplier?: string | null
          unit_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_inventory_movements_pos_product_id_fkey"
            columns: ["pos_product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_location_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_location_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_locations: {
        Row: {
          address: string | null
          city: string
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pos_products: {
        Row: {
          active: boolean
          available: number
          avg_cost: number
          brand: string | null
          category: string | null
          created_at: string
          id: string
          location_id: string
          min_stock: number
          name: string
          notes: string | null
          photo_url: string | null
          sale_price: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          available?: number
          avg_cost?: number
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location_id: string
          min_stock?: number
          name: string
          notes?: string | null
          photo_url?: string | null
          sale_price?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          available?: number
          avg_cost?: number
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location_id?: string
          min_stock?: number
          name?: string
          notes?: string | null
          photo_url?: string | null
          sale_price?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sale_items: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          line_total: number
          pos_product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          line_total: number
          pos_product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_cost?: number
          unit_price: number
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          line_total?: number
          pos_product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_pos_product_id_fkey"
            columns: ["pos_product_id"]
            isOneToOne: false
            referencedRelation: "pos_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          client_document: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          discount: number
          id: string
          location_id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string
          recorded_by_name: string | null
          sale_date: string
          total_amount: number
          total_cost: number
        }
        Insert: {
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          discount?: number
          id?: string
          location_id: string
          notes?: string | null
          payment_method?: string | null
          recorded_by: string
          recorded_by_name?: string | null
          sale_date?: string
          total_amount?: number
          total_cost?: number
        }
        Update: {
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          discount?: number
          id?: string
          location_id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string
          recorded_by_name?: string | null
          sale_date?: string
          total_amount?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
        ]
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
      product_gallery: {
        Row: {
          brand: string
          client_name: string | null
          created_at: string
          gel_color: string | null
          id: string
          ink_color: string | null
          logo_reference: string | null
          notes: string | null
          photo_url: string
          product_name: string
          source_order_id: string | null
          source_production_order_id: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string
          uploaded_by_name: string | null
        }
        Insert: {
          brand: string
          client_name?: string | null
          created_at?: string
          gel_color?: string | null
          id?: string
          ink_color?: string | null
          logo_reference?: string | null
          notes?: string | null
          photo_url: string
          product_name: string
          source_order_id?: string | null
          source_production_order_id?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
          uploaded_by_name?: string | null
        }
        Update: {
          brand?: string
          client_name?: string | null
          created_at?: string
          gel_color?: string | null
          id?: string
          ink_color?: string | null
          logo_reference?: string | null
          notes?: string | null
          photo_url?: string
          product_name?: string
          source_order_id?: string | null
          source_production_order_id?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          uploaded_by_name?: string | null
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
          delivery_date: string | null
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
          delivery_date?: string | null
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
          delivery_date?: string | null
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
      scheduled_payments: {
        Row: {
          bank_account_id: string | null
          bank_movement_id: string | null
          budget_entry_id: string | null
          budget_id: string | null
          budgeted_amount: number
          category: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string | null
          due_date: string
          id: string
          kind: string
          notes: string | null
          paid_amount: number | null
          paid_bank_account_id: string | null
          paid_by: string | null
          paid_by_name: string | null
          paid_date: string | null
          proof_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bank_account_id?: string | null
          bank_movement_id?: string | null
          budget_entry_id?: string | null
          budget_id?: string | null
          budgeted_amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date: string
          id?: string
          kind: string
          notes?: string | null
          paid_amount?: number | null
          paid_bank_account_id?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          paid_date?: string | null
          proof_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bank_account_id?: string | null
          bank_movement_id?: string | null
          budget_entry_id?: string | null
          budget_id?: string | null
          budgeted_amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          due_date?: string
          id?: string
          kind?: string
          notes?: string | null
          paid_amount?: number | null
          paid_bank_account_id?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          paid_date?: string | null
          proof_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_payments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_payments_paid_bank_account_id_fkey"
            columns: ["paid_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          available: number
          brand: string
          category: string
          color: string | null
          created_at: string
          id: string
          in_process: number
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
          in_process?: number
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
          in_process?: number
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
      is_pos_for_feria: { Args: { _feria_id: string }; Returns: boolean }
      is_pos_for_location: { Args: { _location_id: string }; Returns: boolean }
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
        | "feria_pos"
        | "inventarios"
        | "pos_punto"
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
        "feria_pos",
        "inventarios",
        "pos_punto",
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
