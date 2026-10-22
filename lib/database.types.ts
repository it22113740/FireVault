// Mirrors supabase/migrations/ (through 20261026000000_game_updates.sql) in the format
// produced by `supabase gen types typescript`. After applying migrations,
// regenerate with:
//   npx supabase gen types typescript --linked > lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      sales_admin_notifications: {
        Row: { id: string; profile_id: string; reason: "expired" | "admin"; due_at: string; next_attempt_at: string; sent_at: string | null; cancelled_at: string | null };
        Insert: { id?: string; profile_id: string; reason: "expired" | "admin"; due_at: string; next_attempt_at: string; sent_at?: string | null; cancelled_at?: string | null };
        Update: { next_attempt_at?: string; sent_at?: string | null; cancelled_at?: string | null };
        Relationships: [];
      };
      announcements: {
        Row: { id: string; title: string; image_path: string; published: boolean; created_at: string };
        Insert: { id?: string; title: string; image_path: string; published?: boolean; created_at?: string };
        Update: { id?: string; title?: string; image_path?: string; published?: boolean; created_at?: string };
        Relationships: [];
      };
      id_college_samples: {
        Row: { slot: number; image_path: string; price: number };
        Insert: { slot: number; image_path: string; price: number };
        Update: { slot?: number; image_path?: string; price?: number };
        Relationships: [];
      };
      app_settings: {
        Row: {
          admin_whatsapp: string;
          bank_account_name: string;
          bank_account_number: string;
          bank_accounts: Json;
          bank_branch: string;
          bank_name: string;
          binance_name: string;
          binance_pay_id: string;
          sell_contact_seller_ids: string[];
          currency: string;
          ezcash_message_en: string;
          ezcash_message_si: string;
          ezcash_message_ta: string;
          ezcash_number: string;
          id: number;
          inactive_message: string;
          regions: string[];
        };
        Insert: {
          admin_whatsapp?: string;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_accounts?: Json;
          bank_branch?: string;
          bank_name?: string;
          binance_name?: string;
          binance_pay_id?: string;
          sell_contact_seller_ids?: string[];
          currency?: string;
          ezcash_message_en?: string;
          ezcash_message_si?: string;
          ezcash_message_ta?: string;
          ezcash_number?: string;
          id?: number;
          inactive_message?: string;
          regions?: string[];
        };
        Update: {
          admin_whatsapp?: string;
          bank_account_name?: string;
          bank_account_number?: string;
          bank_accounts?: Json;
          bank_branch?: string;
          bank_name?: string;
          binance_name?: string;
          binance_pay_id?: string;
          sell_contact_seller_ids?: string[];
          currency?: string;
          ezcash_message_en?: string;
          ezcash_message_si?: string;
          ezcash_message_ta?: string;
          ezcash_number?: string;
          id?: number;
          inactive_message?: string;
          regions?: string[];
        };
        Relationships: [];
      };
      game_updates: {
        Row: { created_at: string; id: string; image_path: string };
        Insert: { created_at?: string; id?: string; image_path: string };
        Update: { created_at?: string; id?: string; image_path?: string };
        Relationships: [];
      };
      listing_sellers: {
        Row: { listing_id: string; position: number; seller_id: string };
        Insert: { listing_id: string; position?: number; seller_id: string };
        Update: { listing_id?: string; position?: number; seller_id?: string };
        Relationships: [
          {
            foreignKeyName: "listing_sellers_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_sellers_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      topup_orders: {
        Row: {
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          currency: string;
          customer_id: string | null;
          id: string;
          payment_method: Database["public"]["Enums"]["topup_payment_method"];
          player_uid: string;
          quantity: number;
          receipt_path: string;
          status: Database["public"]["Enums"]["topup_order_status"];
          topup_id: string | null;
          topup_name: string;
          total: number;
          unit_price: number;
          whatsapp_number: string;
        };
        Insert: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          currency?: string;
          customer_id: string | null;
          id?: string;
          payment_method?: Database["public"]["Enums"]["topup_payment_method"];
          player_uid: string;
          quantity: number;
          receipt_path: string;
          status?: Database["public"]["Enums"]["topup_order_status"];
          topup_id: string | null;
          topup_name?: string;
          total?: number;
          unit_price?: number;
          whatsapp_number: string;
        };
        Update: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          id?: string;
          payment_method?: Database["public"]["Enums"]["topup_payment_method"];
          player_uid?: string;
          quantity?: number;
          receipt_path?: string;
          status?: Database["public"]["Enums"]["topup_order_status"];
          topup_id?: string | null;
          topup_name?: string;
          total?: number;
          unit_price?: number;
          whatsapp_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topup_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topup_orders_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "topup_orders_topup_id_fkey";
            columns: ["topup_id"];
            isOneToOne: false;
            referencedRelation: "topups";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
          meta: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: number;
          meta?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: number;
          meta?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          availability: Database["public"]["Enums"]["availability"];
          created_at: string;
          created_by: string;
          description: string;
          exchange_available: boolean;
          id: string;
          image_path: string;
          price: number;
          publish_status: Database["public"]["Enums"]["publish_status"];
          published_at: string | null;
          region: string;
          rejection_reason: string | null;
          reviewed_by: string | null;
          submitted_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          availability?: Database["public"]["Enums"]["availability"];
          created_at?: string;
          created_by: string;
          description?: string;
          exchange_available?: boolean;
          id?: string;
          image_path?: string;
          price?: number;
          publish_status?: Database["public"]["Enums"]["publish_status"];
          published_at?: string | null;
          region?: string;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          availability?: Database["public"]["Enums"]["availability"];
          created_at?: string;
          created_by?: string;
          description?: string;
          exchange_available?: boolean;
          id?: string;
          image_path?: string;
          price?: number;
          publish_status?: Database["public"]["Enums"]["publish_status"];
          published_at?: string | null;
          region?: string;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active_until: string | null;
          contact_number: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          listings_need_review: boolean;
          role: Database["public"]["Enums"]["user_role"];
          whatsapp_number: string | null;
        };
        Insert: {
          active_until?: string | null;
          contact_number?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          listings_need_review?: boolean;
          role: Database["public"]["Enums"]["user_role"];
          whatsapp_number?: string | null;
        };
        Update: {
          active_until?: string | null;
          contact_number?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          listings_need_review?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
          whatsapp_number?: string | null;
        };
        Relationships: [];
      };
      sales_admin_applications: {
        Row: {
          contact_number: string;
          created_at: string;
          deny_reason: string | null;
          email: string;
          full_name: string;
          id: string;
          ip_hash: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          screenshot_path: string;
          status: Database["public"]["Enums"]["application_status"];
          user_id: string | null;
          whatsapp_group_url: string | null;
          whatsapp_number: string;
        };
        Insert: {
          contact_number: string;
          created_at?: string;
          deny_reason?: string | null;
          email: string;
          full_name: string;
          id?: string;
          ip_hash?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          screenshot_path: string;
          status?: Database["public"]["Enums"]["application_status"];
          user_id?: string | null;
          whatsapp_group_url?: string | null;
          whatsapp_number: string;
        };
        Update: {
          contact_number?: string;
          created_at?: string;
          deny_reason?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          ip_hash?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          screenshot_path?: string;
          status?: Database["public"]["Enums"]["application_status"];
          user_id?: string | null;
          whatsapp_group_url?: string | null;
          whatsapp_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_admin_applications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_admin_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_feedback: {
        Row: {
          comment: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          rating: number | null;
          reaction: Database["public"]["Enums"]["reaction"] | null;
          reviewer_name: string;
          seller_id: string;
          updated_at: string;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          rating?: number | null;
          reaction?: Database["public"]["Enums"]["reaction"] | null;
          reviewer_name?: string;
          seller_id: string;
          updated_at?: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          rating?: number | null;
          reaction?: Database["public"]["Enums"]["reaction"] | null;
          reviewer_name?: string;
          seller_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_feedback_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_feedback_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_profiles: {
        Row: {
          cover_path: string;
          created_at: string;
          description: string;
          display_name: string;
          facebook_url: string | null;
          id: string;
          logo_path: string;
          slug: string;
          tiktok_url: string | null;
          total_sold: number;
          updated_at: string;
          whatsapp_group_url: string | null;
        };
        Insert: {
          cover_path?: string;
          created_at?: string;
          description?: string;
          display_name: string;
          facebook_url?: string | null;
          id: string;
          logo_path?: string;
          slug: string;
          tiktok_url?: string | null;
          total_sold?: number;
          updated_at?: string;
          whatsapp_group_url?: string | null;
        };
        Update: {
          cover_path?: string;
          created_at?: string;
          description?: string;
          display_name?: string;
          facebook_url?: string | null;
          id?: string;
          logo_path?: string;
          slug?: string;
          tiktok_url?: string | null;
          total_sold?: number;
          updated_at?: string;
          whatsapp_group_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seller_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      topups: {
        Row: {
          category: Database["public"]["Enums"]["topup_category"];
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          image_path: string;
          name: string;
          price: number;
          published_at: string | null;
          sort_order: number;
          status: Database["public"]["Enums"]["topup_status"];
          updated_at: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["topup_category"];
          created_at?: string;
          created_by: string;
          description?: string;
          id?: string;
          image_path?: string;
          name: string;
          price?: number;
          published_at?: string | null;
          sort_order?: number;
          status?: Database["public"]["Enums"]["topup_status"];
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["topup_category"];
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          image_path?: string;
          name?: string;
          price?: number;
          published_at?: string | null;
          sort_order?: number;
          status?: Database["public"]["Enums"]["topup_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      customer_topup_totals: {
        Row: { customer_id: string; currency: string; order_count: number; total_amount: number };
        Relationships: [];
      };
      // Same columns as published_listings: each seller's newest available one
      latest_listing_per_seller: {
        Row: Database["public"]["Views"]["published_listings"]["Row"];
        Relationships: [];
      };
      published_listings: {
        Row: {
          availability: Database["public"]["Enums"]["availability"] | null;
          description: string | null;
          exchange_available: boolean | null;
          id: string | null;
          image_path: string | null;
          price: number | null;
          published_at: string | null;
          region: string | null;
          seller_id: string | null;
          seller_ids: string[] | null;
          seller_logo_path: string | null;
          seller_name: string | null;
          seller_slug: string | null;
          sellers: Json | null;
          title: string | null;
          whatsapp_number: string | null;
        };
        Relationships: [];
      };
      seller_directory: {
        Row: {
          cover_path: string | null;
          created_at: string | null;
          description: string | null;
          dislikes: number | null;
          display_name: string | null;
          facebook_url: string | null;
          id: string | null;
          likes: number | null;
          live_listings: number | null;
          logo_path: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          review_count: number | null;
          slug: string | null;
          tiktok_url: string | null;
          total_sold: number | null;
          whatsapp_group_url: string | null;
          whatsapp_number: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_active_customer: { Args: never; Returns: boolean };
      can_self_publish: { Args: never; Returns: boolean };
      set_shared_listing_availability: {
        Args: { p_availability: Database["public"]["Enums"]["availability"]; p_listing_id: string };
        Returns: boolean;
      };
      is_active_sales_admin: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      application_status: "pending" | "approved" | "denied";
      availability: "available" | "reserved";
      publish_status: "draft" | "pending_review" | "published" | "rejected" | "archived";
      reaction: "like" | "dislike";
      topup_category: "membership" | "vip_bundle" | "diamonds" | "level_up_pass";
      topup_order_status: "open" | "closed";
      topup_payment_method: "bank" | "ezcash" | "binance";
      topup_status: "draft" | "published";
      user_role: "super_admin" | "sales_admin" | "customer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
