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
      accounting_accounts: {
        Row: {
          active: boolean
          created_at: string
          group_code: string
          id: string
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_code: string
          id?: string
          kind?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_code?: string
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      accounting_monthly_amounts: {
        Row: {
          account_id: string
          amount: number
          amount_kind: string
          created_at: string
          created_by: string | null
          id: string
          month: number
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          account_id: string
          amount?: number
          amount_kind?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          account_id?: string
          amount?: number
          amount_kind?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_monthly_amounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
          brand: string
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
          brand?: string
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
          brand?: string
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
          expected_date: string | null
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
          expected_date?: string | null
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
          expected_date?: string | null
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
      company_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          updated_at: string
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: []
      }
      customer_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          customer_id: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          uses_count: number
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          customer_id?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          uses_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          customer_id?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          uses_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_coupons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty_movements: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          movement_type: string
          points: number
          reason: string | null
          sale_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          movement_type: string
          points: number
          reason?: string | null
          sale_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          movement_type?: string
          points?: number
          reason?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          avg_ticket: number
          birth_date: string | null
          city: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          first_purchase_at: string | null
          full_name: string
          id: string
          last_purchase_at: string | null
          last_redemption_at: string | null
          notes: string | null
          phone: string | null
          points_accumulated: number
          points_current: number
          purchase_count: number
          referral_code: string | null
          referred_by: string | null
          sport: string | null
          status: string
          tags: string[]
          tier: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          avg_ticket?: number
          birth_date?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          first_purchase_at?: string | null
          full_name: string
          id?: string
          last_purchase_at?: string | null
          last_redemption_at?: string | null
          notes?: string | null
          phone?: string | null
          points_accumulated?: number
          points_current?: number
          purchase_count?: number
          referral_code?: string | null
          referred_by?: string | null
          sport?: string | null
          status?: string
          tags?: string[]
          tier?: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          avg_ticket?: number
          birth_date?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          first_purchase_at?: string | null
          full_name?: string
          id?: string
          last_purchase_at?: string | null
          last_redemption_at?: string | null
          notes?: string | null
          phone?: string | null
          points_accumulated?: number
          points_current?: number
          purchase_count?: number
          referral_code?: string | null
          referred_by?: string | null
          sport?: string | null
          status?: string
          tags?: string[]
          tier?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      feria_commissions: {
        Row: {
          advisor_id: string | null
          advisor_name: string
          applied_pct: number
          approved_at: string | null
          approved_by: string | null
          commission_amount: number
          created_at: string
          excedente: number
          feria_id: string
          id: string
          notes: string | null
          sales_with_iva: number
          sales_without_iva: number
          status: string
          updated_at: string
        }
        Insert: {
          advisor_id?: string | null
          advisor_name: string
          applied_pct?: number
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          created_at?: string
          excedente?: number
          feria_id: string
          id?: string
          notes?: string | null
          sales_with_iva?: number
          sales_without_iva?: number
          status?: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string | null
          advisor_name?: string
          applied_pct?: number
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          created_at?: string
          excedente?: number
          feria_id?: string
          id?: string
          notes?: string | null
          sales_with_iva?: number
          sales_without_iva?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feria_commissions_feria_id_fkey"
            columns: ["feria_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
        ]
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
          client_address: string | null
          client_city: string | null
          client_document: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
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
          client_address?: string | null
          client_city?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
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
          client_address?: string | null
          client_city?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
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
      feria_shipment_items: {
        Row: {
          brand: string
          created_at: string
          id: string
          item_name: string
          logo: string | null
          quantity: number
          shipment_id: string
          stock_item_id: string | null
          unit_cost: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          item_name: string
          logo?: string | null
          quantity: number
          shipment_id: string
          stock_item_id?: string | null
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          item_name?: string
          logo?: string | null
          quantity?: number
          shipment_id?: string
          stock_item_id?: string | null
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feria_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "feria_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      feria_shipments: {
        Row: {
          confirmed_at: string
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string
          direction: string
          feria_id: string
          id: string
          notes: string | null
          shipment_number: number
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          direction: string
          feria_id: string
          id?: string
          notes?: string | null
          shipment_number: number
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          direction?: string
          feria_id?: string
          id?: string
          notes?: string | null
          shipment_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feria_shipments_feria_id_fkey"
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
          brand: string | null
          budget_advertising_cost: number | null
          budget_employees_cost: number | null
          budget_food_cost: number | null
          budget_lodging_cost: number | null
          budget_merchandise_cost: number | null
          budget_other_costs: number | null
          budget_shipping_cost: number | null
          budget_stand_cost: number | null
          budget_tickets_cost: number | null
          budget_transport_cost: number | null
          city: string
          commission_tier_1_pct: number
          commission_tier_1_to_pct: number
          commission_tier_2_pct: number
          commission_tier_2_to_pct: number
          commission_tier_3_pct: number
          contact_phone: string | null
          created_at: string
          created_by: string | null
          employees_cost: number | null
          end_date: string
          estimated_athletes: number | null
          food_cost: number | null
          id: string
          iva_pct: number
          lodging_cost: number | null
          materials_needed: string[] | null
          merchandise_cost: number | null
          name: string
          notes: string | null
          other_costs: number | null
          scenarios: Json
          setup_date: string | null
          shipping_cost: number | null
          stand_cost: number | null
          stand_number: string | null
          stand_size: string | null
          start_date: string
          status: string
          target_margin_pct: number
          tickets_cost: number | null
          transport_cost: number | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          advertising_cost?: number | null
          assigned_staff?: string[] | null
          brand?: string | null
          budget_advertising_cost?: number | null
          budget_employees_cost?: number | null
          budget_food_cost?: number | null
          budget_lodging_cost?: number | null
          budget_merchandise_cost?: number | null
          budget_other_costs?: number | null
          budget_shipping_cost?: number | null
          budget_stand_cost?: number | null
          budget_tickets_cost?: number | null
          budget_transport_cost?: number | null
          city: string
          commission_tier_1_pct?: number
          commission_tier_1_to_pct?: number
          commission_tier_2_pct?: number
          commission_tier_2_to_pct?: number
          commission_tier_3_pct?: number
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          employees_cost?: number | null
          end_date: string
          estimated_athletes?: number | null
          food_cost?: number | null
          id?: string
          iva_pct?: number
          lodging_cost?: number | null
          materials_needed?: string[] | null
          merchandise_cost?: number | null
          name: string
          notes?: string | null
          other_costs?: number | null
          scenarios?: Json
          setup_date?: string | null
          shipping_cost?: number | null
          stand_cost?: number | null
          stand_number?: string | null
          stand_size?: string | null
          start_date: string
          status?: string
          target_margin_pct?: number
          tickets_cost?: number | null
          transport_cost?: number | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          advertising_cost?: number | null
          assigned_staff?: string[] | null
          brand?: string | null
          budget_advertising_cost?: number | null
          budget_employees_cost?: number | null
          budget_food_cost?: number | null
          budget_lodging_cost?: number | null
          budget_merchandise_cost?: number | null
          budget_other_costs?: number | null
          budget_shipping_cost?: number | null
          budget_stand_cost?: number | null
          budget_tickets_cost?: number | null
          budget_transport_cost?: number | null
          city?: string
          commission_tier_1_pct?: number
          commission_tier_1_to_pct?: number
          commission_tier_2_pct?: number
          commission_tier_2_to_pct?: number
          commission_tier_3_pct?: number
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          employees_cost?: number | null
          end_date?: string
          estimated_athletes?: number | null
          food_cost?: number | null
          id?: string
          iva_pct?: number
          lodging_cost?: number | null
          materials_needed?: string[] | null
          merchandise_cost?: number | null
          name?: string
          notes?: string | null
          other_costs?: number | null
          scenarios?: Json
          setup_date?: string | null
          shipping_cost?: number | null
          stand_cost?: number | null
          stand_number?: string | null
          stand_size?: string | null
          start_date?: string
          status?: string
          target_margin_pct?: number
          tickets_cost?: number | null
          transport_cost?: number | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      inventory_audit_log: {
        Row: {
          action: string
          brand: string | null
          category: string | null
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          field: string | null
          id: string
          item_name: string | null
          logo: string | null
          new_value: string | null
          old_value: string | null
          product_type: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          brand?: string | null
          category?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          field?: string | null
          id?: string
          item_name?: string | null
          logo?: string | null
          new_value?: string | null
          old_value?: string | null
          product_type?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          brand?: string | null
          category?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          field?: string | null
          id?: string
          item_name?: string | null
          logo?: string | null
          new_value?: string | null
          old_value?: string | null
          product_type?: string | null
          record_id?: string | null
          table_name?: string
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
          logo: string | null
          movement_kind: string
          order_id: string | null
          proof_url: string | null
          purpose: string | null
          quantity: number
          reason: string | null
          reception_confirmed: boolean
          reception_confirmed_at: string | null
          reception_confirmed_by: string | null
          reception_confirmed_by_name: string | null
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
          logo?: string | null
          movement_kind?: string
          order_id?: string | null
          proof_url?: string | null
          purpose?: string | null
          quantity: number
          reason?: string | null
          reception_confirmed?: boolean
          reception_confirmed_at?: string | null
          reception_confirmed_by?: string | null
          reception_confirmed_by_name?: string | null
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
          logo?: string | null
          movement_kind?: string
          order_id?: string | null
          proof_url?: string | null
          purpose?: string | null
          quantity?: number
          reason?: string | null
          reception_confirmed?: boolean
          reception_confirmed_at?: string | null
          reception_confirmed_by?: string | null
          reception_confirmed_by_name?: string | null
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
      logo_request_status_log: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          logo_request_id: string
          new_status: string
          note: string | null
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          logo_request_id: string
          new_status: string
          note?: string | null
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          logo_request_id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logo_request_status_log_logo_request_id_fkey"
            columns: ["logo_request_id"]
            isOneToOne: false
            referencedRelation: "logo_requests"
            referencedColumns: ["id"]
          },
        ]
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
          logo_name: string | null
          order_id: string | null
          original_logo_url: string
          original_logo_url_2: string | null
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
          logo_name?: string | null
          order_id?: string | null
          original_logo_url: string
          original_logo_url_2?: string | null
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
          logo_name?: string | null
          order_id?: string | null
          original_logo_url?: string
          original_logo_url_2?: string | null
          product?: string
          status?: Database["public"]["Enums"]["logo_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logo_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          benefits: string | null
          created_at: string
          display_order: number
          id: string
          min_total_spent: number
          name: string
          points_multiplier: number
        }
        Insert: {
          benefits?: string | null
          created_at?: string
          display_order?: number
          id?: string
          min_total_spent?: number
          name: string
          points_multiplier?: number
        }
        Update: {
          benefits?: string | null
          created_at?: string
          display_order?: number
          id?: string
          min_total_spent?: number
          name?: string
          points_multiplier?: number
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          name: string
          segment_filter: Json | null
          starts_at: string | null
          status: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          name: string
          segment_filter?: Json | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          segment_filter?: Json | null
          starts_at?: string | null
          status?: string
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
      order_change_log: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          order_code: string | null
          order_id: string
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_code?: string | null
          order_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_code?: string | null
          order_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      order_charges: {
        Row: {
          amount: number
          concept: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          notes: string | null
          order_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          concept: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          notes?: string | null
          order_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_charges_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_deliveries: {
        Row: {
          created_at: string
          delivered_at: string
          delivered_by: string | null
          delivered_by_name: string | null
          id: string
          notes: string | null
          order_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string
          delivered_by?: string | null
          delivered_by_name?: string | null
          id?: string
          notes?: string | null
          order_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string
          delivered_by?: string | null
          delivered_by_name?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          notes: string | null
          order_id: string
          payment_date: string
          proof_url: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          order_id: string
          payment_date?: string
          proof_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          order_id?: string
          payment_date?: string
          proof_url?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requirements: {
        Row: {
          brand: string
          category: string
          color: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_by_name: string | null
          created_at: string
          id: string
          item_name: string
          logo: string | null
          notes: string | null
          order_code: string | null
          order_id: string
          product_type: string | null
          quantity_covered: number
          quantity_missing: number
          quantity_required: number
          ref_key: string
          status: string
          stock_item_id: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          category?: string
          color?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          id?: string
          item_name: string
          logo?: string | null
          notes?: string | null
          order_code?: string | null
          order_id: string
          product_type?: string | null
          quantity_covered?: number
          quantity_missing?: number
          quantity_required?: number
          ref_key: string
          status?: string
          stock_item_id?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          color?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          id?: string
          item_name?: string
          logo?: string | null
          notes?: string | null
          order_code?: string | null
          order_id?: string
          product_type?: string | null
          quantity_covered?: number
          quantity_missing?: number
          quantity_required?: number
          ref_key?: string
          status?: string
          stock_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requirements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          abono: number | null
          advisor_code: string | null
          advisor_id: string
          advisor_name: string
          brand: string
          brand_code: string | null
          client_address: string | null
          client_city: string | null
          client_email: string | null
          client_name: string
          client_nit: string | null
          client_phone: string | null
          created_at: string
          credit_dispatched_pending_payment: boolean
          delivered_quantity: number
          delivery_date: string | null
          dispatch_notes: string | null
          dispatched_at: string | null
          external_order_id: string | null
          gel_color: string | null
          glitter_color: string | null
          group_number: number | null
          id: string
          ink_color: string | null
          ink_color_2: string | null
          ink_color_3: string | null
          ink_count: number
          inventory_archived_at: string | null
          inventory_archived_by: string | null
          invoice_amount: number | null
          invoice_date: string | null
          invoice_file_url: string | null
          invoice_notes: string | null
          invoice_number: string | null
          invoice_status: string
          is_credit: boolean
          is_recompra: boolean
          line_count: number | null
          line_index: number | null
          logo_count: number
          logo_name: string | null
          logo_name_2: string | null
          logo_url: string | null
          logo_url_2: string | null
          numero_guia: string | null
          observations: string | null
          order_code: string | null
          order_number: number
          payment_complete: boolean | null
          payment_date: string | null
          payment_due_date: string | null
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
          submission_id: string | null
          total_amount: number | null
          transportadora: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          abono?: number | null
          advisor_code?: string | null
          advisor_id: string
          advisor_name: string
          brand: string
          brand_code?: string | null
          client_address?: string | null
          client_city?: string | null
          client_email?: string | null
          client_name: string
          client_nit?: string | null
          client_phone?: string | null
          created_at?: string
          credit_dispatched_pending_payment?: boolean
          delivered_quantity?: number
          delivery_date?: string | null
          dispatch_notes?: string | null
          dispatched_at?: string | null
          external_order_id?: string | null
          gel_color?: string | null
          glitter_color?: string | null
          group_number?: number | null
          id?: string
          ink_color?: string | null
          ink_color_2?: string | null
          ink_color_3?: string | null
          ink_count?: number
          inventory_archived_at?: string | null
          inventory_archived_by?: string | null
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_file_url?: string | null
          invoice_notes?: string | null
          invoice_number?: string | null
          invoice_status?: string
          is_credit?: boolean
          is_recompra?: boolean
          line_count?: number | null
          line_index?: number | null
          logo_count?: number
          logo_name?: string | null
          logo_name_2?: string | null
          logo_url?: string | null
          logo_url_2?: string | null
          numero_guia?: string | null
          observations?: string | null
          order_code?: string | null
          order_number?: number
          payment_complete?: boolean | null
          payment_date?: string | null
          payment_due_date?: string | null
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
          submission_id?: string | null
          total_amount?: number | null
          transportadora?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          abono?: number | null
          advisor_code?: string | null
          advisor_id?: string
          advisor_name?: string
          brand?: string
          brand_code?: string | null
          client_address?: string | null
          client_city?: string | null
          client_email?: string | null
          client_name?: string
          client_nit?: string | null
          client_phone?: string | null
          created_at?: string
          credit_dispatched_pending_payment?: boolean
          delivered_quantity?: number
          delivery_date?: string | null
          dispatch_notes?: string | null
          dispatched_at?: string | null
          external_order_id?: string | null
          gel_color?: string | null
          glitter_color?: string | null
          group_number?: number | null
          id?: string
          ink_color?: string | null
          ink_color_2?: string | null
          ink_color_3?: string | null
          ink_count?: number
          inventory_archived_at?: string | null
          inventory_archived_by?: string | null
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_file_url?: string | null
          invoice_notes?: string | null
          invoice_number?: string | null
          invoice_status?: string
          is_credit?: boolean
          is_recompra?: boolean
          line_count?: number | null
          line_index?: number | null
          logo_count?: number
          logo_name?: string | null
          logo_name_2?: string | null
          logo_url?: string | null
          logo_url_2?: string | null
          numero_guia?: string | null
          observations?: string | null
          order_code?: string | null
          order_number?: number
          payment_complete?: boolean | null
          payment_date?: string | null
          payment_due_date?: string | null
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
          submission_id?: string | null
          total_amount?: number | null
          transportadora?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      petty_cash_counts: {
        Row: {
          count_date: string
          counted_amount: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          difference: number
          expected_amount: number
          id: string
          notes: string | null
          sede: string
          updated_at: string
        }
        Insert: {
          count_date?: string
          counted_amount?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          difference?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          sede?: string
          updated_at?: string
        }
        Update: {
          count_date?: string
          counted_amount?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          difference?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          sede?: string
          updated_at?: string
        }
        Relationships: []
      }
      petty_cash_expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          fund_id: string | null
          id: string
          origin: string
          proof_url: string | null
          recorded_by: string
          recorded_by_name: string
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          sede: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          fund_id?: string | null
          id?: string
          origin?: string
          proof_url?: string | null
          recorded_by: string
          recorded_by_name: string
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          sede?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          fund_id?: string | null
          id?: string
          origin?: string
          proof_url?: string | null
          recorded_by?: string
          recorded_by_name?: string
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          sede?: string
          status?: string
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
          movement_kind: string
          notes: string | null
          sede: string
          set_by: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          movement_kind?: string
          notes?: string | null
          sede?: string
          set_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          movement_kind?: string
          notes?: string | null
          sede?: string
          set_by?: string
        }
        Relationships: []
      }
      pos_calendar_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          location_id: string
          notes: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          end_time?: string | null
          event_date: string
          event_type: string
          id?: string
          location_id: string
          notes?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          location_id?: string
          notes?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_calendar_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
        ]
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
          cash_base: number
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
          cash_base?: number
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
          cash_base?: number
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
          client_address: string | null
          client_city: string | null
          client_document: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          location_id: string
          merchandise_photo_url: string | null
          notes: string | null
          payment_method: string | null
          payment_proof_url: string | null
          recorded_by: string
          recorded_by_name: string | null
          sale_date: string
          total_amount: number
          total_cost: number
        }
        Insert: {
          client_address?: string | null
          client_city?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          location_id: string
          merchandise_photo_url?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          recorded_by: string
          recorded_by_name?: string | null
          sale_date?: string
          total_amount?: number
          total_cost?: number
        }
        Update: {
          client_address?: string | null
          client_city?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          location_id?: string
          merchandise_photo_url?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          recorded_by?: string
          recorded_by_name?: string | null
          sale_date?: string
          total_amount?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pos_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      process_audit_log: {
        Row: {
          action: string
          area: string
          brand: string | null
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          entity_name: string | null
          field: string | null
          id: string
          new_value: string | null
          old_value: string | null
          order_code: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          area: string
          brand?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          entity_name?: string | null
          field?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_code?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          area?: string
          brand?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          entity_name?: string | null
          field?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_code?: string | null
          record_id?: string | null
          table_name?: string
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
      production_batch_items: {
        Row: {
          batch_id: string
          client_name: string | null
          created_at: string
          id: string
          order_code: string | null
          order_id: string | null
          quantity: number
          requirement_id: string | null
        }
        Insert: {
          batch_id: string
          client_name?: string | null
          created_at?: string
          id?: string
          order_code?: string | null
          order_id?: string | null
          quantity?: number
          requirement_id?: string | null
        }
        Update: {
          batch_id?: string
          client_name?: string | null
          created_at?: string
          id?: string
          order_code?: string | null
          order_id?: string | null
          quantity?: number
          requirement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batch_items_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "order_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          batch_number: number
          brand: string
          category: string
          color: string | null
          created_at: string
          finished_at: string | null
          finished_by: string | null
          finished_by_name: string | null
          id: string
          item_name: string
          logo: string | null
          notes: string | null
          produced_quantity: number | null
          product_type: string | null
          received_at: string | null
          received_by: string | null
          received_by_name: string | null
          received_quantity: number | null
          ref_key: string
          return_count: number
          return_reason: string | null
          returned_at: string | null
          returned_by: string | null
          returned_by_name: string | null
          started_at: string | null
          started_by: string | null
          started_by_name: string | null
          status: string
          stock_item_id: string | null
          target_quantity: number
          updated_at: string
        }
        Insert: {
          batch_number?: number
          brand: string
          category?: string
          color?: string | null
          created_at?: string
          finished_at?: string | null
          finished_by?: string | null
          finished_by_name?: string | null
          id?: string
          item_name: string
          logo?: string | null
          notes?: string | null
          produced_quantity?: number | null
          product_type?: string | null
          received_at?: string | null
          received_by?: string | null
          received_by_name?: string | null
          received_quantity?: number | null
          ref_key: string
          return_count?: number
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          returned_by_name?: string | null
          started_at?: string | null
          started_by?: string | null
          started_by_name?: string | null
          status?: string
          stock_item_id?: string | null
          target_quantity?: number
          updated_at?: string
        }
        Update: {
          batch_number?: number
          brand?: string
          category?: string
          color?: string | null
          created_at?: string
          finished_at?: string | null
          finished_by?: string | null
          finished_by_name?: string | null
          id?: string
          item_name?: string
          logo?: string | null
          notes?: string | null
          produced_quantity?: number | null
          product_type?: string | null
          received_at?: string | null
          received_by?: string | null
          received_by_name?: string | null
          received_quantity?: number | null
          ref_key?: string
          return_count?: number
          return_reason?: string | null
          returned_at?: string | null
          returned_by?: string | null
          returned_by_name?: string | null
          started_at?: string | null
          started_by?: string | null
          started_by_name?: string | null
          status?: string
          stock_item_id?: string | null
          target_quantity?: number
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
          delivery_date: string | null
          final_count: number | null
          finished_photo_url: string | null
          gel_color: string | null
          glitter_color: string | null
          has_stock: boolean | null
          id: string
          ink_color: string | null
          ink_color_2: string | null
          ink_color_3: string | null
          ink_count: number
          logo_file: string | null
          logo_type: string | null
          molde: string | null
          needs_cuerpos: boolean | null
          observations: string | null
          order_code: string | null
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
          glitter_color?: string | null
          has_stock?: boolean | null
          id?: string
          ink_color?: string | null
          ink_color_2?: string | null
          ink_color_3?: string | null
          ink_count?: number
          logo_file?: string | null
          logo_type?: string | null
          molde?: string | null
          needs_cuerpos?: boolean | null
          observations?: string | null
          order_code?: string | null
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
          glitter_color?: string | null
          has_stock?: boolean | null
          id?: string
          ink_color?: string | null
          ink_color_2?: string | null
          ink_color_3?: string | null
          ink_count?: number
          logo_file?: string | null
          logo_type?: string | null
          molde?: string | null
          needs_cuerpos?: boolean | null
          observations?: string | null
          order_code?: string | null
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
      production_stage_logs: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          operator_name: string
          production_order_id: string
          recorded_by: string | null
          stage: string
          started_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          operator_name: string
          production_order_id: string
          recorded_by?: string | null
          stage: string
          started_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          operator_name?: string
          production_order_id?: string
          recorded_by?: string | null
          stage?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stage_logs_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
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
          advisor_code: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advisor_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advisor_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roll_cuts: {
        Row: {
          code: string
          cortado_at: string
          cortado_por: string
          created_at: string
          finalizado_at: string | null
          finalizado_por: string | null
          id: string
          medida_cm: number
          montado_at: string | null
          montado_por: string | null
          notas_final: string | null
          notas_inicio: string | null
          peso_final_g: number | null
          peso_inicial_g: number
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          code: string
          cortado_at?: string
          cortado_por: string
          created_at?: string
          finalizado_at?: string | null
          finalizado_por?: string | null
          id?: string
          medida_cm: number
          montado_at?: string | null
          montado_por?: string | null
          notas_final?: string | null
          notas_inicio?: string | null
          peso_final_g?: number | null
          peso_inicial_g: number
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          code?: string
          cortado_at?: string
          cortado_por?: string
          created_at?: string
          finalizado_at?: string | null
          finalizado_por?: string | null
          id?: string
          medida_cm?: number
          montado_at?: string | null
          montado_por?: string | null
          notas_final?: string | null
          notas_inicio?: string | null
          peso_final_g?: number | null
          peso_inicial_g?: number
          status?: string
          tipo?: string
          updated_at?: string
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
      social_events: {
        Row: {
          brand: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_ideas: {
        Row: {
          brand: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          asset_path: string | null
          asset_url: string | null
          brand: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string | null
          hashtags: string | null
          id: string
          is_special_date: boolean
          networks: string[]
          scheduled_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_path?: string | null
          asset_url?: string | null
          brand: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          hashtags?: string | null
          id?: string
          is_special_date?: boolean
          networks?: string[]
          scheduled_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_path?: string | null
          asset_url?: string | null
          brand?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          hashtags?: string | null
          id?: string
          is_special_date?: boolean
          networks?: string[]
          scheduled_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_attendance: {
        Row: {
          check_in_at: string | null
          check_in_photo_url: string | null
          check_out_at: string | null
          check_out_photo_url: string | null
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          staff_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in_at?: string | null
          check_in_photo_url?: string | null
          check_out_at?: string | null
          check_out_photo_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          staff_id: string
          updated_at?: string
          work_date?: string
        }
        Update: {
          check_in_at?: string | null
          check_in_photo_url?: string | null
          check_out_at?: string | null
          check_out_photo_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          staff_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          area: string
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          area: string
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      build_ref_key: {
        Args: {
          _brand: string
          _color: string
          _logo: string
          _name: string
          _type: string
        }
        Returns: string
      }
      canonical_reference_name: { Args: { _name: string }; Returns: string }
      confirm_order_requirement: {
        Args: { _confirm_quantity?: number; _requirement_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      finish_production_batch: {
        Args: { _batch_id: string; _produced: number }
        Returns: Json
      }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalc_customer_metrics: {
        Args: { _customer_id: string }
        Returns: undefined
      }
      receive_production_batch: {
        Args: { _batch_id: string; _received: number }
        Returns: Json
      }
      revert_production_batch_reception: {
        Args: { _batch_id: string; _reason: string }
        Returns: Json
      }
      start_production_batch: { Args: { _batch_id: string }; Returns: Json }
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
        | "community_manager"
        | "visualizador"
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
        "community_manager",
        "visualizador",
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
