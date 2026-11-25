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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          changed_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          changed_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          product_id: string
          quantity: number
          sort: number
        }
        Insert: {
          bundle_id: string
          product_id: string
          quantity?: number
          sort?: number
        }
        Update: {
          bundle_id?: string
          product_id?: string
          quantity?: number
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_tag_weights: {
        Row: {
          bundle_id: string
          tag_slug: string
          weight: number
        }
        Insert: {
          bundle_id: string
          tag_slug: string
          weight?: number
        }
        Update: {
          bundle_id?: string
          tag_slug?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_tag_weights_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_tag_weights_tag_slug_fkey"
            columns: ["tag_slug"]
            isOneToOne: false
            referencedRelation: "trigger_tags"
            referencedColumns: ["slug"]
          },
        ]
      }
      bundles: {
        Row: {
          claims_reviewed: boolean
          created_at: string
          description: string | null
          description_es: string | null
          discount_code: string | null
          hero_image_key: string | null
          id: string
          pillar: string | null
          price_cents: number | null
          slug: string
          sort: number
          status: string
          title: string
          title_es: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          claims_reviewed?: boolean
          created_at?: string
          description?: string | null
          description_es?: string | null
          discount_code?: string | null
          hero_image_key?: string | null
          id?: string
          pillar?: string | null
          price_cents?: number | null
          slug: string
          sort?: number
          status?: string
          title: string
          title_es?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          claims_reviewed?: boolean
          created_at?: string
          description?: string | null
          description_es?: string | null
          discount_code?: string | null
          hero_image_key?: string | null
          id?: string
          pillar?: string | null
          price_cents?: number | null
          slug?: string
          sort?: number
          status?: string
          title?: string
          title_es?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundles_pillar_fkey"
            columns: ["pillar"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["slug"]
          },
        ]
      }
      outbound_clicks: {
        Row: {
          bundle_id: string | null
          created_at: string
          id: number
          platform: string
          product_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string
          id?: never
          platform: string
          product_id?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          bundle_id?: string | null
          created_at?: string
          id?: never
          platform?: string
          product_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_clicks_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_deals: {
        Row: {
          affiliate_base_url: string | null
          affiliate_network: string | null
          commission_type: string
          commission_value: number | null
          contact_email: string | null
          contact_name: string | null
          contract_url: string | null
          notes: string | null
          partner_id: string
          updated_at: string
        }
        Insert: {
          affiliate_base_url?: string | null
          affiliate_network?: string | null
          commission_type?: string
          commission_value?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contract_url?: string | null
          notes?: string | null
          partner_id: string
          updated_at?: string
        }
        Update: {
          affiliate_base_url?: string | null
          affiliate_network?: string | null
          commission_type?: string
          commission_value?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contract_url?: string | null
          notes?: string | null
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_deals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          id: string
          logo_key: string | null
          name: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_key?: string | null
          name: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_key?: string | null
          name?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pillars: {
        Row: {
          description: string | null
          description_es: string | null
          icon: string | null
          slug: string
          sort: number
          title: string
          title_es: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          description_es?: string | null
          icon?: string | null
          slug: string
          sort?: number
          title: string
          title_es?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          description_es?: string | null
          icon?: string | null
          slug?: string
          sort?: number
          title?: string
          title_es?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      presales: {
        Row: {
          amount_cents: number
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          stripe_session_id: string
          utm: Json | null
        }
        Insert: {
          amount_cents: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          stripe_session_id: string
          utm?: Json | null
        }
        Update: {
          amount_cents?: number
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          stripe_session_id?: string
          utm?: Json | null
        }
        Relationships: []
      }
      products: {
        Row: {
          claims_reviewed: boolean
          created_at: string
          currency: string
          description: string | null
          description_es: string | null
          id: string
          image_key: string | null
          name: string
          name_es: string | null
          partner_id: string
          pillar: string | null
          price_cents: number | null
          slug: string
          sort: number
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          claims_reviewed?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          description_es?: string | null
          id?: string
          image_key?: string | null
          name: string
          name_es?: string | null
          partner_id: string
          pillar?: string | null
          price_cents?: number | null
          slug: string
          sort?: number
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          claims_reviewed?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          description_es?: string | null
          id?: string
          image_key?: string | null
          name?: string
          name_es?: string | null
          partner_id?: string
          pillar?: string | null
          price_cents?: number | null
          slug?: string
          sort?: number
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_pillar_fkey"
            columns: ["pillar"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          tags_sync_consent: boolean
          tags_sync_consent_at: string | null
          timezone: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          tags_sync_consent?: boolean
          tags_sync_consent_at?: string | null
          timezone?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          tags_sync_consent?: boolean
          tags_sync_consent_at?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          bundle_id: string
          computed_at: string
          score: number
          user_id: string
        }
        Insert: {
          bundle_id: string
          computed_at?: string
          score: number
          user_id: string
        }
        Update: {
          bundle_id?: string
          computed_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          price_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          price_id?: string | null
          provider: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          price_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_events: {
        Row: {
          created_at: string
          id: number
          occurred_at: string
          tag_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          occurred_at: string
          tag_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          occurred_at?: string
          tag_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_events_tag_slug_fkey"
            columns: ["tag_slug"]
            isOneToOne: false
            referencedRelation: "trigger_tags"
            referencedColumns: ["slug"]
          },
        ]
      }
      trigger_tags: {
        Row: {
          active: boolean
          label: string
          label_es: string | null
          pillar: string
          slug: string
          sort: number
        }
        Insert: {
          active?: boolean
          label: string
          label_es?: string | null
          pillar: string
          slug: string
          sort?: number
        }
        Update: {
          active?: boolean
          label?: string
          label_es?: string | null
          pillar?: string
          slug?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "trigger_tags_pillar_fk"
            columns: ["pillar"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["slug"]
          },
        ]
      }
      video_tags: {
        Row: {
          tag_slug: string
          video_id: string
        }
        Insert: {
          tag_slug: string
          video_id: string
        }
        Update: {
          tag_slug?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tags_tag_slug_fkey"
            columns: ["tag_slug"]
            isOneToOne: false
            referencedRelation: "trigger_tags"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "video_tags_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          access: string
          captions_es_key: string | null
          captions_key: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          needs_medical_review: boolean
          pillar: string
          poster_key: string | null
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          sort: number
          status: string
          summary: string | null
          summary_es: string | null
          title: string
          title_es: string | null
          updated_at: string
          video_key: string | null
        }
        Insert: {
          access?: string
          captions_es_key?: string | null
          captions_key?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          needs_medical_review?: boolean
          pillar: string
          poster_key?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          sort?: number
          status?: string
          summary?: string | null
          summary_es?: string | null
          title: string
          title_es?: string | null
          updated_at?: string
          video_key?: string | null
        }
        Update: {
          access?: string
          captions_es_key?: string | null
          captions_key?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          needs_medical_review?: boolean
          pillar?: string
          poster_key?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          sort?: number
          status?: string
          summary?: string | null
          summary_es?: string | null
          title?: string
          title_es?: string | null
          updated_at?: string
          video_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_pillar_fkey"
            columns: ["pillar"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["slug"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          utm: Json | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          utm?: Json | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          utm?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_role: { Args: never; Returns: string }
      approve_video: { Args: { p_video: string }; Returns: undefined }
      can_edit: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
      recompute_recommendations: {
        Args: { p_user: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
