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
      asset_checkouts: {
        Row: {
          asset_id: string
          checked_out_at: string
          checked_out_by: string | null
          checked_out_by_email: string | null
          checked_out_to: string | null
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          returned_at: string | null
          returned_by: string | null
          returned_by_email: string | null
          space_id: string
        }
        Insert: {
          asset_id: string
          checked_out_at?: string
          checked_out_by?: string | null
          checked_out_by_email?: string | null
          checked_out_to?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          returned_at?: string | null
          returned_by?: string | null
          returned_by_email?: string | null
          space_id: string
        }
        Update: {
          asset_id?: string
          checked_out_at?: string
          checked_out_by?: string | null
          checked_out_by_email?: string | null
          checked_out_to?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          returned_at?: string | null
          returned_by?: string | null
          returned_by_email?: string | null
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_checkouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_checkouts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_notes: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          organization_id: string
          space_id: string
          text: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          organization_id: string
          space_id: string
          text: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          organization_id?: string
          space_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_notes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          created_by_role: string | null
          documents: Json
          id: string
          location: string | null
          name: string
          notes: string | null
          organization_id: string
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          space_id: string
          status: string | null
          updated_at: string
          updated_by: string | null
          updated_by_email: string | null
          updated_by_name: string | null
          updated_by_role: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          documents?: Json
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          organization_id: string
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          space_id: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
          updated_by_role?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          documents?: Json
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          space_id?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
          updated_by_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          id: string
          module: string | null
          new_value: Json | null
          old_value: Json | null
          organization_id: string | null
          record_id: string | null
          role: string | null
          space_id: string
          timestamp: string
          transfer_mode: boolean | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          id?: string
          module?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          record_id?: string | null
          role?: string | null
          space_id: string
          timestamp?: string
          transfer_mode?: boolean | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          id?: string
          module?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          record_id?: string | null
          role?: string | null
          space_id?: string
          timestamp?: string
          transfer_mode?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      backend_logs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          id: string
          level: string | null
          method: string | null
          organization_id: string | null
          organization_name: string | null
          path: string | null
          request_summary: string | null
          response_summary: string | null
          role: string | null
          status_code: number | null
          timestamp: string
          user_display_name: string | null
          user_id: string | null
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          level?: string | null
          method?: string | null
          organization_id?: string | null
          organization_name?: string | null
          path?: string | null
          request_summary?: string | null
          response_summary?: string | null
          role?: string | null
          status_code?: number | null
          timestamp?: string
          user_display_name?: string | null
          user_id?: string | null
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          level?: string | null
          method?: string | null
          organization_id?: string | null
          organization_name?: string | null
          path?: string | null
          request_summary?: string | null
          response_summary?: string | null
          role?: string | null
          status_code?: number | null
          timestamp?: string
          user_display_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_sales: {
        Row: {
          asset_count: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          ip: string | null
          last_name: string | null
          name: string | null
          notes: string | null
          organization_name: string | null
          phone: string | null
        }
        Insert: {
          asset_count?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          ip?: string | null
          last_name?: string | null
          name?: string | null
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
        }
        Update: {
          asset_count?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          ip?: string | null
          last_name?: string | null
          name?: string | null
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          organization_id: string
          record_id: string
          record_type: string
          space_id: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          organization_id: string
          record_id: string
          record_type: string
          space_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          organization_id?: string
          record_id?: string
          record_type?: string
          space_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          field_key: string
          id: string
          is_active: boolean
          label: string
          label_ar: string | null
          module: string
          options: Json | null
          organization_id: string
          placeholder: string | null
          placeholder_ar: string | null
          required: boolean
          sort_order: number
          space_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          id?: string
          is_active?: boolean
          label: string
          label_ar?: string | null
          module: string
          options?: Json | null
          organization_id: string
          placeholder?: string | null
          placeholder_ar?: string | null
          required?: boolean
          sort_order?: number
          space_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          id?: string
          is_active?: boolean
          label?: string
          label_ar?: string | null
          module?: string
          options?: Json | null
          organization_id?: string
          placeholder?: string | null
          placeholder_ar?: string | null
          required?: boolean
          sort_order?: number
          space_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      early_access: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          ip: string | null
          last_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          ip?: string | null
          last_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          ip?: string | null
          last_name?: string | null
        }
        Relationships: []
      }
      fawtara_counters: {
        Row: {
          last_sequence: number
          organization_id: string
          updated_at: string
          year: number | null
        }
        Insert: {
          last_sequence?: number
          organization_id: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          last_sequence?: number
          organization_id?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fawtara_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_card_charges: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          organization_id: string
          provider_ref: string | null
          reference: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          organization_id: string
          provider_ref?: string | null
          reference: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          organization_id?: string
          provider_ref?: string | null
          reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_card_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_card_terminal_config: {
        Row: {
          api_key_enc: string | null
          bridge_url: string | null
          currency: string
          enabled: boolean
          mode: string
          organization_id: string
          provider: string | null
          terminal_id: string | null
          timeout_seconds: number
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
        }
        Insert: {
          api_key_enc?: string | null
          bridge_url?: string | null
          currency?: string
          enabled?: boolean
          mode?: string
          organization_id: string
          provider?: string | null
          terminal_id?: string | null
          timeout_seconds?: number
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Update: {
          api_key_enc?: string | null
          bridge_url?: string | null
          currency?: string
          enabled?: boolean
          mode?: string
          organization_id?: string
          provider?: string | null
          terminal_id?: string | null
          timeout_seconds?: number
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_card_terminal_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_cash_drawer_config: {
        Row: {
          auto_open_on_cash: boolean
          drawer_port: number
          enabled: boolean
          off_time_ms: number
          on_time_ms: number
          organization_id: string
          pin_hash: string | null
          require_pin: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_open_on_cash?: boolean
          drawer_port?: number
          enabled?: boolean
          off_time_ms?: number
          on_time_ms?: number
          organization_id: string
          pin_hash?: string | null
          require_pin?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_open_on_cash?: boolean
          drawer_port?: number
          enabled?: boolean
          off_time_ms?: number
          on_time_ms?: number
          organization_id?: string
          pin_hash?: string | null
          require_pin?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_cash_drawer_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_delivery_agents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_delivery_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_invoice_counters: {
        Row: {
          last_sequence: number
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          last_sequence?: number
          organization_id: string
          updated_at?: string
          year: number
        }
        Update: {
          last_sequence?: number
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "haraka_invoice_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_order_counters: {
        Row: {
          last_order_number: number
          organization_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          last_order_number?: number
          organization_id: string
          space_id?: string
          updated_at?: string
        }
        Update: {
          last_order_number?: number
          organization_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_order_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_order_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          organization_id: string
          paid_at: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          organization_id: string
          paid_at?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          organization_id?: string
          paid_at?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "haraka_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_order_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_orders: {
        Row: {
          amount_paid: number
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_address: Json | null
          delivery_agent_id: string | null
          delivery_agent_member_id: string | null
          delivery_agent_name: string | null
          delivery_token: string | null
          delivery_token_expires_at: string | null
          delivery_token_revoked_at: string | null
          discount_amount: number
          fulfillment_type: string
          id: string
          invoice_number: string | null
          items: Json
          notes: string | null
          order_number: string
          organization_id: string
          payment_method: string | null
          payment_status: string
          sales_agent_id: string
          sales_agent_name: string
          scheduled_at: string | null
          space_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_paid?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_agent_id?: string | null
          delivery_agent_member_id?: string | null
          delivery_agent_name?: string | null
          delivery_token?: string | null
          delivery_token_expires_at?: string | null
          delivery_token_revoked_at?: string | null
          discount_amount?: number
          fulfillment_type?: string
          id?: string
          invoice_number?: string | null
          items?: Json
          notes?: string | null
          order_number: string
          organization_id: string
          payment_method?: string | null
          payment_status?: string
          sales_agent_id: string
          sales_agent_name: string
          scheduled_at?: string | null
          space_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_paid?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_agent_id?: string | null
          delivery_agent_member_id?: string | null
          delivery_agent_name?: string | null
          delivery_token?: string | null
          delivery_token_expires_at?: string | null
          delivery_token_revoked_at?: string | null
          discount_amount?: number
          fulfillment_type?: string
          id?: string
          invoice_number?: string | null
          items?: Json
          notes?: string | null
          order_number?: string
          organization_id?: string
          payment_method?: string | null
          payment_status?: string
          sales_agent_id?: string
          sales_agent_name?: string
          scheduled_at?: string | null
          space_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "haraka_delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_reception_ticket_counters: {
        Row: {
          last_ticket_number: number
          organization_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          last_ticket_number?: number
          organization_id: string
          space_id?: string
          updated_at?: string
        }
        Update: {
          last_ticket_number?: number
          organization_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_reception_ticket_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_reception_tickets: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          grand_total: number
          id: string
          items: Json
          notes: string | null
          organization_id: string
          paid_at: string | null
          pos_transaction_id: string | null
          products_discount: number
          products_subtotal: number
          products_tax: number
          products_total: number
          service_job_id: string | null
          services_total: number
          space_id: string | null
          status: string
          ticket_number: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          grand_total?: number
          id?: string
          items?: Json
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          pos_transaction_id?: string | null
          products_discount?: number
          products_subtotal?: number
          products_tax?: number
          products_total?: number
          service_job_id?: string | null
          services_total?: number
          space_id?: string | null
          status?: string
          ticket_number: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          grand_total?: number
          id?: string
          items?: Json
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          pos_transaction_id?: string | null
          products_discount?: number
          products_subtotal?: number
          products_tax?: number
          products_total?: number
          service_job_id?: string | null
          services_total?: number
          space_id?: string | null
          status?: string
          ticket_number?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_reception_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_reception_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_reception_tickets_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_reception_tickets_service_job_id_fkey"
            columns: ["service_job_id"]
            isOneToOne: false
            referencedRelation: "haraka_service_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_retainer_counters: {
        Row: {
          last_retainer_number: number
          organization_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          last_retainer_number?: number
          organization_id: string
          space_id?: string
          updated_at?: string
        }
        Update: {
          last_retainer_number?: number
          organization_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_retainer_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_retainer_invoice_counters: {
        Row: {
          last_sequence: number
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          last_sequence?: number
          organization_id: string
          updated_at?: string
          year: number
        }
        Update: {
          last_sequence?: number
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "haraka_retainer_invoice_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_retainer_invoices: {
        Row: {
          amount: number
          amount_paid: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          retainer_id: string
          tax_amount: number
          total: number
        }
        Insert: {
          amount: number
          amount_paid?: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          retainer_id: string
          tax_amount?: number
          total: number
        }
        Update: {
          amount?: number
          amount_paid?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          retainer_id?: string
          tax_amount?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "haraka_retainer_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_retainer_invoices_retainer_id_fkey"
            columns: ["retainer_id"]
            isOneToOne: false
            referencedRelation: "haraka_retainers"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_retainers: {
        Row: {
          amount_per_cycle: number
          billing_cycle: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          end_date: string | null
          id: string
          name: string
          next_billing_date: string | null
          notes: string | null
          organization_id: string
          retainer_number: string
          space_id: string | null
          staff_member_id: string | null
          staff_member_name: string | null
          start_date: string
          status: string
          tax_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_per_cycle: number
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          end_date?: string | null
          id?: string
          name: string
          next_billing_date?: string | null
          notes?: string | null
          organization_id: string
          retainer_number: string
          space_id?: string | null
          staff_member_id?: string | null
          staff_member_name?: string | null
          start_date: string
          status?: string
          tax_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_per_cycle?: number
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_date?: string | null
          id?: string
          name?: string
          next_billing_date?: string | null
          notes?: string | null
          organization_id?: string
          retainer_number?: string
          space_id?: string | null
          staff_member_id?: string | null
          staff_member_name?: string | null
          start_date?: string
          status?: string
          tax_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_retainers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_retainers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_service_invoice_counters: {
        Row: {
          last_sequence: number
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          last_sequence?: number
          organization_id: string
          updated_at?: string
          year: number
        }
        Update: {
          last_sequence?: number
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "haraka_service_invoice_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_service_job_counters: {
        Row: {
          last_job_number: number
          organization_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          last_job_number?: number
          organization_id: string
          space_id?: string
          updated_at?: string
        }
        Update: {
          last_job_number?: number
          organization_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_service_job_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_service_job_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          note: string | null
          organization_id: string
          paid_at: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          note?: string | null
          organization_id: string
          paid_at?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          note?: string | null
          organization_id?: string
          paid_at?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_service_job_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "haraka_service_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_service_job_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_service_jobs: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          id: string
          invoice_number: string | null
          items: Json
          job_number: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          payment_status: string
          scheduled_at: string | null
          service_address: Json | null
          service_type: string | null
          space_id: string | null
          staff_member_id: string | null
          staff_member_name: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string | null
          items?: Json
          job_number: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          payment_status?: string
          scheduled_at?: string | null
          service_address?: Json | null
          service_type?: string | null
          space_id?: string | null
          staff_member_id?: string | null
          staff_member_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string | null
          items?: Json
          job_number?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          payment_status?: string
          scheduled_at?: string | null
          service_address?: Json | null
          service_type?: string | null
          space_id?: string | null
          staff_member_id?: string | null
          staff_member_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_service_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_service_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_warranty_certs: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          organization_id: string
          source_type: string
          space_id: string | null
          transaction_id: string | null
          updated_at: string
          updated_by: string | null
          warranty_end_date: string
          warranty_number: string
          warranty_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          organization_id: string
          source_type: string
          space_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warranty_end_date: string
          warranty_number: string
          warranty_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          organization_id?: string
          source_type?: string
          space_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warranty_end_date?: string
          warranty_number?: string
          warranty_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_warranty_certs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "haraka_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_warranty_certs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haraka_warranty_certs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_warranty_configs: {
        Row: {
          accent_color: string
          default_duration_days: number
          footer_text: string | null
          footer_text_ar: string | null
          header_text: string | null
          header_text_ar: string | null
          language: string
          organization_id: string
          show_logo: boolean
          show_qr: boolean
          template: string
          terms_text: string | null
          terms_text_ar: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          default_duration_days?: number
          footer_text?: string | null
          footer_text_ar?: string | null
          header_text?: string | null
          header_text_ar?: string | null
          language?: string
          organization_id: string
          show_logo?: boolean
          show_qr?: boolean
          template?: string
          terms_text?: string | null
          terms_text_ar?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          default_duration_days?: number
          footer_text?: string | null
          footer_text_ar?: string | null
          header_text?: string | null
          header_text_ar?: string | null
          language?: string
          organization_id?: string
          show_logo?: boolean
          show_qr?: boolean
          template?: string
          terms_text?: string | null
          terms_text_ar?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haraka_warranty_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      haraka_warranty_counters: {
        Row: {
          last_number: number
          organization_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          last_number?: number
          organization_id: string
          space_id?: string
          updated_at?: string
        }
        Update: {
          last_number?: number
          organization_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "haraka_warranty_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_items: {
        Row: {
          asset_assigned_to: string | null
          asset_category: string | null
          asset_id: string | null
          asset_location: string | null
          asset_name: string | null
          asset_serial: string | null
          audit_id: string
          checked_at: string | null
          checked_by: string | null
          checked_by_name: string | null
          id: string
          note: string | null
          organization_id: string
          space_id: string
          status: string
        }
        Insert: {
          asset_assigned_to?: string | null
          asset_category?: string | null
          asset_id?: string | null
          asset_location?: string | null
          asset_name?: string | null
          asset_serial?: string | null
          audit_id: string
          checked_at?: string | null
          checked_by?: string | null
          checked_by_name?: string | null
          id?: string
          note?: string | null
          organization_id: string
          space_id: string
          status?: string
        }
        Update: {
          asset_assigned_to?: string | null
          asset_category?: string | null
          asset_id?: string | null
          asset_location?: string | null
          asset_name?: string | null
          asset_serial?: string | null
          audit_id?: string
          checked_at?: string | null
          checked_by?: string | null
          checked_by_name?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          space_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audits: {
        Row: {
          completed_at: string | null
          created_at: string
          found_count: number
          id: string
          missing_count: number
          notes: string | null
          organization_id: string
          pending_count: number
          space_id: string
          started_by: string | null
          started_by_name: string | null
          status: string
          title: string | null
          total_assets: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          found_count?: number
          id?: string
          missing_count?: number
          notes?: string | null
          organization_id: string
          pending_count?: number
          space_id: string
          started_by?: string | null
          started_by_name?: string | null
          status?: string
          title?: string | null
          total_assets?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          found_count?: number
          id?: string
          missing_count?: number
          notes?: string | null
          organization_id?: string
          pending_count?: number
          space_id?: string
          started_by?: string | null
          started_by_name?: string | null
          status?: string
          title?: string | null
          total_assets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audits_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          documents: Json
          expiry_date: string | null
          id: string
          location: string | null
          minimum_threshold: number
          name: string
          notes: string | null
          organization_id: string
          pos_enabled: boolean
          pos_price: number | null
          quantity_on_hand: number
          reorder_quantity: number | null
          sku: string | null
          space_id: string
          stock_status: string
          supplier: string | null
          tax_rate_id: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
          updated_by: string | null
          updated_by_email: string | null
          updated_by_name: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          documents?: Json
          expiry_date?: string | null
          id?: string
          location?: string | null
          minimum_threshold?: number
          name: string
          notes?: string | null
          organization_id: string
          pos_enabled?: boolean
          pos_price?: number | null
          quantity_on_hand?: number
          reorder_quantity?: number | null
          sku?: string | null
          space_id: string
          stock_status?: string
          supplier?: string | null
          tax_rate_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          documents?: Json
          expiry_date?: string | null
          id?: string
          location?: string | null
          minimum_threshold?: number
          name?: string
          notes?: string | null
          organization_id?: string
          pos_enabled?: boolean
          pos_price?: number | null
          quantity_on_hand?: number
          reorder_quantity?: number | null
          sku?: string | null
          space_id?: string
          stock_status?: string
          supplier?: string | null
          tax_rate_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          id: string
          item_id: string
          item_name: string | null
          note: string | null
          organization_id: string
          performed_at: string
          performed_by: string | null
          performed_by_email: string | null
          performed_by_name: string | null
          performed_by_role: string | null
          pos_transaction_id: string | null
          purchase_id: string | null
          quantity: number
          quantity_after: number
          quantity_before: number
          reason: string | null
          source: string | null
          space_id: string
          type: string
        }
        Insert: {
          id?: string
          item_id: string
          item_name?: string | null
          note?: string | null
          organization_id: string
          performed_at?: string
          performed_by?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          pos_transaction_id?: string | null
          purchase_id?: string | null
          quantity: number
          quantity_after: number
          quantity_before: number
          reason?: string | null
          source?: string | null
          space_id: string
          type: string
        }
        Update: {
          id?: string
          item_id?: string
          item_name?: string | null
          note?: string | null
          organization_id?: string
          performed_at?: string
          performed_by?: string | null
          performed_by_email?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          pos_transaction_id?: string | null
          purchase_id?: string | null
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reason?: string | null
          source?: string | null
          space_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          display_name: string | null
          email: string | null
          expires_at: string
          id: string
          invited_by: string | null
          invited_by_email: string | null
          invited_by_name: string | null
          organization_id: string
          permissions: Json | null
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          token: string
          username: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          expires_at: string
          id?: string
          invited_by?: string | null
          invited_by_email?: string | null
          invited_by_name?: string | null
          organization_id: string
          permissions?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          token: string
          username?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_by_email?: string | null
          invited_by_name?: string | null
          organization_id?: string
          permissions?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          date: string
          description: string | null
          id: string
          organization_id: string
          performed_by: string | null
          space_id: string
          type: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          date: string
          description?: string | null
          id?: string
          organization_id: string
          performed_by?: string | null
          space_id: string
          type?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          date?: string
          description?: string | null
          id?: string
          organization_id?: string
          performed_by?: string | null
          space_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_org_defaults: {
        Row: {
          email_enabled: boolean
          event_type: string
          in_app_enabled: boolean
          notify_roles: string[]
          organization_id: string
        }
        Insert: {
          email_enabled?: boolean
          event_type: string
          in_app_enabled?: boolean
          notify_roles?: string[]
          organization_id: string
        }
        Update: {
          email_enabled?: boolean
          event_type?: string
          in_app_enabled?: boolean
          notify_roles?: string[]
          organization_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email: boolean
          event_type: string
          in_app: boolean
          organization_id: string
          user_id: string
        }
        Insert: {
          email?: boolean
          event_type: string
          in_app?: boolean
          organization_id: string
          user_id: string
        }
        Update: {
          email?: boolean
          event_type?: string
          in_app?: boolean
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          event_type: string
          id: string
          is_read: boolean
          link: string | null
          organization_id: string
          read_at: string | null
          recipient_id: string
          space_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          event_type: string
          id?: string
          is_read?: boolean
          link?: string | null
          organization_id: string
          read_at?: string | null
          recipient_id: string
          space_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          event_type?: string
          id?: string
          is_read?: boolean
          link?: string | null
          organization_id?: string
          read_at?: string | null
          recipient_id?: string
          space_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_list_items: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          is_custom: boolean
          label: string | null
          label_ar: string | null
          list_key: string
          organization_id: string
          sort_order: number | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          is_custom?: boolean
          label?: string | null
          label_ar?: string | null
          list_key: string
          organization_id: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          is_custom?: boolean
          label?: string | null
          label_ar?: string | null
          list_key?: string
          organization_id?: string
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_list_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_configs: {
        Row: {
          asset_statuses: Json
          categories: Json
          created_at: string
          created_by: string | null
          locations: Json
          order_document_config: Json | null
          organization_id: string
          receipt_config: Json
          service_job_document_config: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_statuses?: Json
          categories?: Json
          created_at?: string
          created_by?: string | null
          locations?: Json
          order_document_config?: Json | null
          organization_id: string
          receipt_config?: Json
          service_job_document_config?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_statuses?: Json
          categories?: Json
          created_at?: string
          created_by?: string | null
          locations?: Json
          order_document_config?: Json | null
          organization_id?: string
          receipt_config?: Json
          service_job_document_config?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          assigned_member_id: string | null
          category: string | null
          contact_email: string
          created_at: string
          created_by: string | null
          description: string | null
          fawtara: Json | null
          id: string
          name: string
          package_details: Json
          subdomain: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_member_id?: string | null
          category?: string | null
          contact_email: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fawtara?: Json | null
          id?: string
          name: string
          package_details?: Json
          subdomain: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_member_id?: string | null
          category?: string | null
          contact_email?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fawtara?: Json | null
          id?: string
          name?: string
          package_details?: Json
          subdomain?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      organizations_private: {
        Row: {
          fawtara: Json | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          fawtara?: Json | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          fawtara?: Json | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_private_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          annual_price: number | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          features: Json
          id: string
          inclusions: Json
          is_active: boolean
          is_custom_pricing: boolean
          limits: Json
          monthly_price: number | null
          name: string
          sort_order: number
          trial_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          annual_price?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          features?: Json
          id?: string
          inclusions?: Json
          is_active?: boolean
          is_custom_pricing?: boolean
          limits?: Json
          monthly_price?: number | null
          name: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          annual_price?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          features?: Json
          id?: string
          inclusions?: Json
          is_active?: boolean
          is_custom_pricing?: boolean
          limits?: Json
          monthly_price?: number | null
          name?: string
          sort_order?: number
          trial_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          hashed_token: string
          uid: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          hashed_token: string
          uid: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hashed_token?: string
          uid?: string
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          id: string
          method: string | null
          notes: string | null
          organization_id: string
          paid_at: string
          reference: string | null
          subscription_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          organization_id: string
          paid_at: string
          reference?: string | null
          subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string
          reference?: string | null
          subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_list_items: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          is_system: boolean
          label: string
          label_ar: string | null
          list_key: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          is_system?: boolean
          label: string
          label_ar?: string | null
          list_key: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          is_system?: boolean
          label?: string
          label_ar?: string | null
          list_key?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      pos_customers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          space_id: string
          tax_number: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          space_id: string
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          space_id?: string
          tax_number?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_customers_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_receipt_counters: {
        Row: {
          last_receipt_number: number
          organization_id: string
          space_id: string
          updated_at: string
        }
        Insert: {
          last_receipt_number?: number
          organization_id: string
          space_id: string
          updated_at?: string
        }
        Update: {
          last_receipt_number?: number
          organization_id?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_receipt_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_receipt_counters_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          cashier_id: string | null
          cashier_name: string | null
          close_notes: string | null
          closed_at: string | null
          closing_float: number | null
          created_at: string
          discrepancy: number | null
          expected_float: number | null
          id: string
          location_id: string
          opened_at: string
          opening_float: number
          organization_id: string
          space_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cashier_id?: string | null
          cashier_name?: string | null
          close_notes?: string | null
          closed_at?: string | null
          closing_float?: number | null
          created_at?: string
          discrepancy?: number | null
          expected_float?: number | null
          id?: string
          location_id?: string
          opened_at?: string
          opening_float?: number
          organization_id: string
          space_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cashier_id?: string | null
          cashier_name?: string | null
          close_notes?: string | null
          closed_at?: string | null
          closing_float?: number | null
          created_at?: string
          discrepancy?: number | null
          expected_float?: number | null
          id?: string
          location_id?: string
          opened_at?: string
          opening_float?: number
          organization_id?: string
          space_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          cashier_id: string | null
          cashier_name: string | null
          change: number
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount_amount: number
          fawtara: Json | null
          id: string
          items: Json
          location_id: string
          offline_id: string | null
          organization_id: string
          parent_transaction_id: string | null
          payments: Json
          receipt_number: string | null
          refund_reason: string | null
          session_id: string | null
          space_id: string
          status: string
          subtotal: number
          synced_at: string | null
          tax_amount: number
          total: number
          updated_at: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          cashier_id?: string | null
          cashier_name?: string | null
          change?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number
          fawtara?: Json | null
          id?: string
          items?: Json
          location_id?: string
          offline_id?: string | null
          organization_id: string
          parent_transaction_id?: string | null
          payments?: Json
          receipt_number?: string | null
          refund_reason?: string | null
          session_id?: string | null
          space_id: string
          status?: string
          subtotal?: number
          synced_at?: string | null
          tax_amount?: number
          total?: number
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          cashier_id?: string | null
          cashier_name?: string | null
          change?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number
          fawtara?: Json | null
          id?: string
          items?: Json
          location_id?: string
          offline_id?: string | null
          organization_id?: string
          parent_transaction_id?: string | null
          payments?: Json
          receipt_number?: string | null
          refund_reason?: string | null
          session_id?: string | null
          space_id?: string
          status?: string
          subtotal?: number
          synced_at?: string | null
          tax_amount?: number
          total?: number
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          documents: Json
          id: string
          invoice_date: string
          invoice_number: string | null
          lines: Json
          notes: string | null
          organization_id: string
          received_by: string | null
          received_by_name: string | null
          received_date: string | null
          space_id: string
          status: string
          subtotal: number
          supplier_contact: string | null
          supplier_name: string
          tax_total: number
          total: number
          update_item_unit_cost: boolean
          updated_at: string
          updated_by: string | null
          updated_by_email: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          documents?: Json
          id?: string
          invoice_date: string
          invoice_number?: string | null
          lines?: Json
          notes?: string | null
          organization_id: string
          received_by?: string | null
          received_by_name?: string | null
          received_date?: string | null
          space_id: string
          status?: string
          subtotal?: number
          supplier_contact?: string | null
          supplier_name: string
          tax_total?: number
          total?: number
          update_item_unit_cost?: boolean
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          documents?: Json
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          lines?: Json
          notes?: string | null
          organization_id?: string
          received_by?: string | null
          received_by_name?: string | null
          received_date?: string | null
          space_id?: string
          status?: string
          subtotal?: number
          supplier_contact?: string | null
          supplier_name?: string
          tax_total?: number
          total?: number
          update_item_unit_cost?: boolean
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          asset_id: string | null
          created_at: string
          created_by: string | null
          decision_at: string | null
          decision_by: string | null
          description: string | null
          id: string
          inventory_item_id: string | null
          inventory_item_name: string | null
          organization_id: string
          space_id: string
          status: string | null
          type: string | null
          updated_at: string
          updated_by: string | null
          warranty_id: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_at?: string | null
          decision_by?: string | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          inventory_item_name?: string | null
          organization_id: string
          space_id: string
          status?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
          warranty_id?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_at?: string | null
          decision_by?: string | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          inventory_item_name?: string | null
          organization_id?: string
          space_id?: string
          status?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      revoked_sessions: {
        Row: {
          expires_at: string
          revoked_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          expires_at: string
          revoked_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          expires_at?: string
          revoked_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      space_members: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string
          slug: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          slug: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          slug?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_audit_items: {
        Row: {
          audit_id: string
          checked_at: string | null
          checked_by: string | null
          checked_by_name: string | null
          counted_quantity: number | null
          expected_quantity: number
          id: string
          inventory_item_id: string | null
          item_category: string | null
          item_location: string | null
          item_name: string
          item_sku: string | null
          item_unit: string | null
          note: string | null
          organization_id: string
          space_id: string
          status: string
        }
        Insert: {
          audit_id: string
          checked_at?: string | null
          checked_by?: string | null
          checked_by_name?: string | null
          counted_quantity?: number | null
          expected_quantity?: number
          id?: string
          inventory_item_id?: string | null
          item_category?: string | null
          item_location?: string | null
          item_name: string
          item_sku?: string | null
          item_unit?: string | null
          note?: string | null
          organization_id: string
          space_id: string
          status?: string
        }
        Update: {
          audit_id?: string
          checked_at?: string | null
          checked_by?: string | null
          checked_by_name?: string | null
          counted_quantity?: number | null
          expected_quantity?: number
          id?: string
          inventory_item_id?: string | null
          item_category?: string | null
          item_location?: string | null
          item_name?: string
          item_sku?: string | null
          item_unit?: string | null
          note?: string | null
          organization_id?: string
          space_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "stock_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audit_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audit_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audit_items_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_audits: {
        Row: {
          completed_at: string | null
          counted_count: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          pending_count: number
          space_id: string
          started_by: string | null
          started_by_name: string | null
          status: string
          title: string
          total_items: number
          updated_at: string
          updated_by: string | null
          variance_total: number
        }
        Insert: {
          completed_at?: string | null
          counted_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pending_count?: number
          space_id: string
          started_by?: string | null
          started_by_name?: string | null
          status?: string
          title: string
          total_items?: number
          updated_at?: string
          updated_by?: string | null
          variance_total?: number
        }
        Update: {
          completed_at?: string | null
          counted_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pending_count?: number
          space_id?: string
          started_by?: string | null
          started_by_name?: string | null
          status?: string
          title?: string
          total_items?: number
          updated_at?: string
          updated_by?: string | null
          variance_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_audits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_audits_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          features: Json
          id: string
          notes: string | null
          organization_id: string
          package_details: Json
          package_id: string | null
          start_date: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          features?: Json
          id?: string
          notes?: string | null
          organization_id: string
          package_details?: Json
          package_id?: string | null
          start_date: string
          status: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          features?: Json
          id?: string
          notes?: string | null
          organization_id?: string
          package_details?: Json
          package_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_users: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          permissions: Json | null
          role: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email: string
          id: string
          permissions?: Json | null
          role: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string
          rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          author_name: string | null
          author_role: string | null
          body: string | null
          created_at: string
          id: string
          organization_id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          body?: string | null
          created_at?: string
          id?: string
          organization_id: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          body?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          all_spaces: boolean
          avatar_url: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          organization_id: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
          updated_by: string | null
          username: string | null
        }
        Insert: {
          all_spaces?: boolean
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email: string
          id: string
          organization_id?: string | null
          permissions?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Update: {
          all_spaces?: boolean
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          organization_id?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          asset_id: string | null
          created_at: string
          created_by: string | null
          documents: Json
          end_date: string
          id: string
          inventory_item_id: string | null
          notes: string | null
          organization_id: string
          reminder: boolean
          space_id: string
          start_date: string
          updated_at: string
          updated_by: string | null
          vendor: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          documents?: Json
          end_date: string
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          organization_id: string
          reminder?: boolean
          space_id: string
          start_date: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          created_by?: string | null
          documents?: Json
          end_date?: string
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          organization_id?: string
          reminder?: boolean
          space_id?: string
          start_date?: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_org: { Args: never; Returns: string }
      app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      belongs_to_org: { Args: { org: string }; Returns: boolean }
      can_access_space: { Args: { s: string }; Returns: boolean }
      increment_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      inventory_apply_stock_out: {
        Args: {
          p_by: string
          p_by_email: string
          p_by_name: string
          p_by_role: string
          p_item: string
          p_item_name: string
          p_note: string
          p_org: string
          p_pos_tx: string
          p_qty: number
          p_reason: string
          p_source: string
          p_space: string
        }
        Returns: number
      }
      inventory_latest_quantities: {
        Args: { item_ids: string[] }
        Returns: {
          item_id: string
          quantity: number
        }[]
      }
      is_org_manager: { Args: { org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      purge_expired_rate_limits: { Args: never; Returns: undefined }
      purge_expired_sessions: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      user_role:
        | "super_admin"
        | "makhzoon_admin"
        | "makhzoon_support"
        | "org_owner"
        | "admin"
        | "staff"
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
      user_role: [
        "super_admin",
        "makhzoon_admin",
        "makhzoon_support",
        "org_owner",
        "admin",
        "staff",
      ],
    },
  },
} as const
