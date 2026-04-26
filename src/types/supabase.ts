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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          accepted_at: string | null
          base_amount: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          duration_hours: number | null
          event_date: string | null
          event_description: string | null
          event_duration: number | null
          event_location: string | null
          event_type: string | null
          hirer_id: string
          hourly_rate: number | null
          hours_booked: number | null
          id: string
          location: string | null
          musician_id: string
          musician_payout: number | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          payout_date: string | null
          payout_released: boolean | null
          payout_released_at: string | null
          platform_fee: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          requirements: string | null
          service_confirmed_at: string | null
          service_confirmed_by_hirer: boolean | null
          service_confirmed_by_musician: boolean | null
          special_requirements: string | null
          status: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          base_amount?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          duration_hours?: number | null
          event_date?: string | null
          event_description?: string | null
          event_duration?: number | null
          event_location?: string | null
          event_type?: string | null
          hirer_id: string
          hourly_rate?: number | null
          hours_booked?: number | null
          id?: string
          location?: string | null
          musician_id: string
          musician_payout?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payout_date?: string | null
          payout_released?: boolean | null
          payout_released_at?: string | null
          platform_fee?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          requirements?: string | null
          service_confirmed_at?: string | null
          service_confirmed_by_hirer?: boolean | null
          service_confirmed_by_musician?: boolean | null
          special_requirements?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          base_amount?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          duration_hours?: number | null
          event_date?: string | null
          event_description?: string | null
          event_duration?: number | null
          event_location?: string | null
          event_type?: string | null
          hirer_id?: string
          hourly_rate?: number | null
          hours_booked?: number | null
          id?: string
          location?: string | null
          musician_id?: string
          musician_payout?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payout_date?: string | null
          payout_released?: boolean | null
          payout_released_at?: string | null
          platform_fee?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"] | null
          requirements?: string | null
          service_confirmed_at?: string | null
          service_confirmed_by_hirer?: boolean | null
          service_confirmed_by_musician?: boolean | null
          special_requirements?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_hirer_id_fkey"
            columns: ["hirer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant1_id: string
          participant2_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant1_id: string
          participant2_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant1_id?: string
          participant2_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          created_at: string | null
          description: string | null
          dispute_id: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dispute_id: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dispute_id?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          created_at: string | null
          dispute_id: string
          id: string
          is_admin: boolean | null
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          dispute_id: string
          id?: string
          is_admin?: boolean | null
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          dispute_id?: string
          id?: string
          is_admin?: boolean | null
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          booking_id: string
          created_at: string | null
          description: string | null
          filed_against: string
          filed_by: string
          id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"] | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          description?: string | null
          filed_against: string
          filed_by: string
          id?: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          description?: string | null
          filed_against?: string
          filed_by?: string
          id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          musician_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          musician_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          musician_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          booking_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          risk_score: number | null
          severity: string | null
          status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_score?: number | null
          severity?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_score?: number | null
          severity?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          points: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          booking_id: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          edited_at: string | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          read: boolean | null
          read_at: string | null
          receiver_id: string
          reply_to: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          booking_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          read?: boolean | null
          read_at?: string | null
          receiver_id: string
          reply_to?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          booking_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          read?: boolean | null
          read_at?: string | null
          receiver_id?: string
          reply_to?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          content: string
          created_at: string | null
          data: Json | null
          icon: string | null
          id: string
          link: string | null
          metadata: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          content: string
          created_at?: string | null
          data?: Json | null
          icon?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          content?: string
          created_at?: string | null
          data?: Json | null
          icon?: string | null
          id?: string
          link?: string | null
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      package_addons: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          musician_user_id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          musician_user_id: string
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          musician_user_id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      payment_analytics: {
        Row: {
          active_hirers: number | null
          active_musicians: number | null
          average_booking_value: number | null
          completed_transactions: number | null
          created_at: string | null
          date: string
          failed_transactions: number | null
          id: string
          musician_payouts: number | null
          new_users: number | null
          pending_transactions: number | null
          platform_fees: number | null
          refund_count: number | null
          refunded_amount: number | null
          total_bookings: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          active_hirers?: number | null
          active_musicians?: number | null
          average_booking_value?: number | null
          completed_transactions?: number | null
          created_at?: string | null
          date: string
          failed_transactions?: number | null
          id?: string
          musician_payouts?: number | null
          new_users?: number | null
          pending_transactions?: number | null
          platform_fees?: number | null
          refund_count?: number | null
          refunded_amount?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          active_hirers?: number | null
          active_musicians?: number | null
          average_booking_value?: number | null
          completed_transactions?: number | null
          created_at?: string | null
          date?: string
          failed_transactions?: number | null
          id?: string
          musician_payouts?: number | null
          new_users?: number | null
          pending_transactions?: number | null
          platform_fees?: number | null
          refund_count?: number | null
          refunded_amount?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_milestones: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          milestone_number: number
          paid_at: string | null
          paystack_reference: string | null
          percentage: number
          released_at: string | null
          status: Database["public"]["Enums"]["milestone_status"] | null
          title: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_number: number
          paid_at?: string | null
          paystack_reference?: string | null
          percentage: number
          released_at?: string | null
          status?: Database["public"]["Enums"]["milestone_status"] | null
          title: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          milestone_number?: number
          paid_at?: string | null
          paystack_reference?: string | null
          percentage?: number
          released_at?: string | null
          status?: Database["public"]["Enums"]["milestone_status"] | null
          title?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_splits: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
          paid_at: string | null
          paystack_reference: string | null
          percentage: number
          split_type: string
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          paystack_reference?: string | null
          percentage: number
          split_type: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          paystack_reference?: string | null
          percentage?: number
          split_type?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          media_type: string | null
          media_url: string
          musician_user_id: string
          thumbnail_url: string | null
          title: string
          views: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          media_type?: string | null
          media_url: string
          musician_user_id: string
          thumbnail_url?: string | null
          title: string
          views?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          media_type?: string | null
          media_url?: string
          musician_user_id?: string
          thumbnail_url?: string | null
          title?: string
          views?: number | null
        }
        Relationships: []
      }
      pricing_packages: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_hours: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          musician_user_id: string
          name: string
          price: number
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_hours?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          musician_user_id: string
          name: string
          price: number
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_hours?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          musician_user_id?: string
          name?: string
          price?: number
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          available_days: string[] | null
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          base_price: number | null
          bio: string | null
          completion_rate: number | null
          created_at: string | null
          documents_submitted: boolean | null
          documents_verified: boolean | null
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          genres: string[] | null
          hourly_rate: number | null
          instruments: string[] | null
          is_active: boolean | null
          last_active_at: string | null
          location: string | null
          mobile_money_name: string | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          phone: string | null
          phone_verified: boolean | null
          pricing_model: string | null
          profile_complete: boolean | null
          profile_completion_percentage: number | null
          rating: number | null
          required_documents: string[] | null
          role: string
          status: string
          total_bookings: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_days?: string[] | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          base_price?: number | null
          bio?: string | null
          completion_rate?: number | null
          created_at?: string | null
          documents_submitted?: boolean | null
          documents_verified?: boolean | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          genres?: string[] | null
          hourly_rate?: number | null
          instruments?: string[] | null
          is_active?: boolean | null
          last_active_at?: string | null
          location?: string | null
          mobile_money_name?: string | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          pricing_model?: string | null
          profile_complete?: boolean | null
          profile_completion_percentage?: number | null
          rating?: number | null
          required_documents?: string[] | null
          role?: string
          status?: string
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_days?: string[] | null
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          base_price?: number | null
          bio?: string | null
          completion_rate?: number | null
          created_at?: string | null
          documents_submitted?: boolean | null
          documents_verified?: boolean | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          genres?: string[] | null
          hourly_rate?: number | null
          instruments?: string[] | null
          is_active?: boolean | null
          last_active_at?: string | null
          location?: string | null
          mobile_money_name?: string | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          pricing_model?: string | null
          profile_complete?: boolean | null
          profile_completion_percentage?: number | null
          rating?: number | null
          required_documents?: string[] | null
          role?: string
          status?: string
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          reward_given: boolean | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          reward_given?: boolean | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_email?: string
          referred_user_id?: string | null
          referrer_id?: string
          reward_given?: boolean | null
          status?: string | null
        }
        Relationships: []
      }
      refund_policies: {
        Row: {
          created_at: string | null
          days_before_event: number
          description: string | null
          id: string
          is_active: boolean | null
          refund_percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_before_event: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          refund_percentage: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_before_event?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          refund_percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          error_message: string | null
          id: string
          paystack_reference: string | null
          processed_at: string | null
          reason: string | null
          refund_percentage: number
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"] | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          paystack_reference?: string | null
          processed_at?: string | null
          reason?: string | null
          refund_percentage: number
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          paystack_reference?: string | null
          processed_at?: string | null
          reason?: string | null
          refund_percentage?: number
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          communication_rating: number | null
          content: string | null
          created_at: string | null
          flag_reason: string | null
          id: string
          is_flagged: boolean | null
          is_public: boolean | null
          performance_rating: number | null
          professionalism_rating: number | null
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          comment?: string | null
          communication_rating?: number | null
          content?: string | null
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_public?: boolean | null
          performance_rating?: number | null
          professionalism_rating?: number | null
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          comment?: string | null
          communication_rating?: number | null
          content?: string | null
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_public?: boolean | null
          performance_rating?: number | null
          professionalism_rating?: number | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          reward_type: string | null
          reward_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          reward_type?: string | null
          reward_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          reward_type?: string | null
          reward_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          channel: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          gateway_reference: string | null
          gateway_response: Json | null
          id: string
          ip_address: string | null
          metadata: Json | null
          payment_gateway: string | null
          payment_method: string | null
          paystack_authorization: Json | null
          paystack_reference: string | null
          platform_fee: number | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          payment_gateway?: string | null
          payment_method?: string | null
          paystack_authorization?: Json | null
          paystack_reference?: string | null
          platform_fee?: number | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          payment_gateway?: string | null
          payment_method?: string | null
          paystack_authorization?: Json | null
          paystack_reference?: string | null
          platform_fee?: number | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          availability_schedule: Json | null
          booking_reminders: boolean | null
          created_at: string | null
          currency: string | null
          email_notifications: boolean | null
          language: string | null
          marketing_emails: boolean | null
          message_notifications: boolean | null
          push_notifications: boolean | null
          review_notifications: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability_schedule?: Json | null
          booking_reminders?: boolean | null
          created_at?: string | null
          currency?: string | null
          email_notifications?: boolean | null
          language?: string | null
          marketing_emails?: boolean | null
          message_notifications?: boolean | null
          push_notifications?: boolean | null
          review_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability_schedule?: Json | null
          booking_reminders?: boolean | null
          created_at?: string | null
          currency?: string | null
          email_notifications?: boolean | null
          language?: string | null
          marketing_emails?: boolean | null
          message_notifications?: boolean | null
          push_notifications?: boolean | null
          review_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      analytics_summary: {
        Row: {
          avg_booking_value: number | null
          bookings_last_30_days: number | null
          bookings_last_7_days: number | null
          revenue_last_30_days: number | null
          revenue_last_7_days: number | null
          total_bookings: number | null
          total_payouts: number | null
          total_platform_fees: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      bookings_with_profiles: {
        Row: {
          accepted_at: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          base_amount: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          duration_hours: number | null
          event_date: string | null
          event_description: string | null
          event_duration: number | null
          event_location: string | null
          event_type: string | null
          hirer_email: string | null
          hirer_id: string | null
          hirer_name: string | null
          hirer_phone: string | null
          hourly_rate: number | null
          hours_booked: number | null
          id: string | null
          location: string | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          musician_email: string | null
          musician_id: string | null
          musician_name: string | null
          musician_payout: number | null
          musician_phone: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          payout_date: string | null
          payout_released: boolean | null
          payout_released_at: string | null
          platform_fee: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          requirements: string | null
          service_confirmed_at: string | null
          service_confirmed_by_hirer: boolean | null
          service_confirmed_by_musician: boolean | null
          special_requirements: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_hirer_id_fkey"
            columns: ["hirer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_musician_id_fkey"
            columns: ["musician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      auto_expire_pending_bookings: { Args: never; Returns: number }
      calculate_booking_amount: {
        Args: {
          p_fixed_amount: number
          p_hourly_rate: number
          p_hours_booked: number
          p_pricing_type: Database["public"]["Enums"]["pricing_type"]
        }
        Returns: number
      }
      calculate_daily_analytics: {
        Args: { target_date: string }
        Returns: undefined
      }
      calculate_payment_split: {
        Args: { deposit_percentage: number; total_amount: number }
        Returns: {
          balance_amount: number
          deposit_amount: number
        }[]
      }
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_refund_amount: {
        Args: { booking_id: string; cancellation_date: string }
        Returns: {
          policy_description: string
          refund_amount: number
          refund_percentage: number
        }[]
      }
      can_users_message: {
        Args: { hirer_user_id: string; musician_user_id: string }
        Returns: boolean
      }
      check_and_expire_bookings: {
        Args: never
        Returns: {
          expired_count: number
          message: string
        }[]
      }
      confirm_service: {
        Args: { booking_id: string; confirming_role: string }
        Returns: Json
      }
      create_default_milestones: {
        Args: { p_booking_id: string; p_milestone_count?: number }
        Returns: undefined
      }
      increment_portfolio_views: {
        Args: { portfolio_id: string }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_message_read: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: undefined
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_file_name?: string
          p_file_size?: number
          p_file_type?: string
          p_file_url?: string
          p_message_type?: string
          p_reply_to_id?: string
          p_sender_id: string
        }
        Returns: string
      }
      validate_milestone_percentages: {
        Args: { p_booking_id: string }
        Returns: boolean
      }
      complete_referral_signup: {
        Args: { p_email: string; p_new_user_id: string; p_referral_code: string }
        Returns: Json
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "accepted"
        | "completed"
        | "cancelled"
        | "rejected"
        | "expired"
      dispute_status:
        | "open"
        | "under_review"
        | "resolved"
        | "closed"
        | "escalated"
      milestone_status: "pending" | "paid" | "released" | "cancelled"
      notification_type:
        | "system"
        | "booking"
        | "payment"
        | "message"
        | "review"
        | "payout"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_paid"
      payment_type: "full" | "split" | "milestone"
      pricing_type: "hourly" | "fixed"
      refund_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "rejected"
      transaction_type:
        | "booking_payment"
        | "payout"
        | "refund"
        | "fee"
        | "milestone_payment"
      user_role: "admin" | "musician" | "hirer"
      user_status: "active" | "inactive" | "suspended" | "pending"
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
      booking_status: [
        "pending",
        "accepted",
        "completed",
        "cancelled",
        "rejected",
        "expired",
      ],
      dispute_status: [
        "open",
        "under_review",
        "resolved",
        "closed",
        "escalated",
      ],
      milestone_status: ["pending", "paid", "released", "cancelled"],
      notification_type: [
        "system",
        "booking",
        "payment",
        "message",
        "review",
        "payout",
      ],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_paid",
      ],
      payment_type: ["full", "split", "milestone"],
      pricing_type: ["hourly", "fixed"],
      refund_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "rejected",
      ],
      transaction_type: [
        "booking_payment",
        "payout",
        "refund",
        "fee",
        "milestone_payment",
      ],
      user_role: ["admin", "musician", "hirer"],
      user_status: ["active", "inactive", "suspended", "pending"],
    },
  },
} as const
