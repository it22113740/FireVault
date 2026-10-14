// Mirrors supabase/migrations/20261015000000_store_schema.sql in the format
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
      app_settings: {
        Row: {
          admin_whatsapp: string;
          currency: string;
          id: number;
          inactive_message: string;
          regions: string[];
        };
        Insert: {
          admin_whatsapp?: string;
          currency?: string;
          id?: number;
          inactive_message?: string;
          regions?: string[];
        };
        Update: {
          admin_whatsapp?: string;
          currency?: string;
          id?: number;
          inactive_message?: string;
          regions?: string[];
        };
        Relationships: [];
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
          contact_number: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["user_role"];
          whatsapp_number: string | null;
        };
        Insert: {
          contact_number?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          role: Database["public"]["Enums"]["user_role"];
          whatsapp_number?: string | null;
        };
        Update: {
          contact_number?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
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
      published_listings: {
        Row: {
          availability: Database["public"]["Enums"]["availability"] | null;
          description: string | null;
          id: string | null;
          image_path: string | null;
          price: number | null;
          published_at: string | null;
          region: string | null;
          title: string | null;
          whatsapp_number: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_active_sales_admin: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      application_status: "pending" | "approved" | "denied";
      availability: "available" | "reserved";
      publish_status: "draft" | "pending_review" | "published" | "rejected" | "archived";
      topup_category: "membership" | "vip_bundle" | "diamonds";
      topup_status: "draft" | "published";
      user_role: "super_admin" | "sales_admin";
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
