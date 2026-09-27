export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          active?: boolean;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          about_text: string | null;
          address: string | null;
          city: string | null;
          dealership_name: string;
          email: string | null;
          facebook_url: string | null;
          google_maps_url: string | null;
          hours: Json;
          id: boolean;
          phone: string | null;
          price_disclaimer: string;
          sms_phone: string | null;
          state: string | null;
          zip: string | null;
        };
        Insert: {
          about_text?: string | null;
          address?: string | null;
          city?: string | null;
          dealership_name?: string;
          email?: string | null;
          facebook_url?: string | null;
          google_maps_url?: string | null;
          hours?: Json;
          id?: boolean;
          phone?: string | null;
          price_disclaimer?: string;
          sms_phone?: string | null;
          state?: string | null;
          zip?: string | null;
        };
        Update: {
          about_text?: string | null;
          address?: string | null;
          city?: string | null;
          dealership_name?: string;
          email?: string | null;
          facebook_url?: string | null;
          google_maps_url?: string | null;
          hours?: Json;
          id?: boolean;
          phone?: string | null;
          price_disclaimer?: string;
          sms_phone?: string | null;
          state?: string | null;
          zip?: string | null;
        };
        Relationships: [];
      };
      vehicle_photos: {
        Row: {
          created_at: string;
          height: number | null;
          id: string;
          sort_order: number;
          storage_path: string;
          vehicle_id: string;
          width: number | null;
        };
        Insert: {
          created_at?: string;
          height?: number | null;
          id?: string;
          sort_order?: number;
          storage_path: string;
          vehicle_id: string;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          height?: number | null;
          id?: string;
          sort_order?: number;
          storage_path?: string;
          vehicle_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          body_type: Database["public"]["Enums"]["vehicle_body_type"] | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          drivetrain: Database["public"]["Enums"]["vehicle_drivetrain"] | null;
          engine: string | null;
          exterior_color: string | null;
          featured: boolean;
          features: string[];
          fuel_type: Database["public"]["Enums"]["vehicle_fuel_type"] | null;
          id: string;
          interior_color: string | null;
          make: string;
          mileage: number | null;
          model: string;
          price: number | null;
          published_at: string | null;
          slug: string;
          sold_at: string | null;
          status: Database["public"]["Enums"]["vehicle_status"];
          stock_no: string;
          title_status: Database["public"]["Enums"]["vehicle_title_status"] | null;
          transmission: Database["public"]["Enums"]["vehicle_transmission"] | null;
          trim: string | null;
          updated_at: string;
          vin: string | null;
          year: number;
        };
        Insert: {
          body_type?: Database["public"]["Enums"]["vehicle_body_type"] | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          drivetrain?: Database["public"]["Enums"]["vehicle_drivetrain"] | null;
          engine?: string | null;
          exterior_color?: string | null;
          featured?: boolean;
          features?: string[];
          fuel_type?: Database["public"]["Enums"]["vehicle_fuel_type"] | null;
          id?: string;
          interior_color?: string | null;
          make: string;
          mileage?: number | null;
          model: string;
          price?: number | null;
          published_at?: string | null;
          slug: string;
          sold_at?: string | null;
          status?: Database["public"]["Enums"]["vehicle_status"];
          stock_no?: string;
          title_status?: Database["public"]["Enums"]["vehicle_title_status"] | null;
          transmission?: Database["public"]["Enums"]["vehicle_transmission"] | null;
          trim?: string | null;
          updated_at?: string;
          vin?: string | null;
          year: number;
        };
        Update: {
          body_type?: Database["public"]["Enums"]["vehicle_body_type"] | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          drivetrain?: Database["public"]["Enums"]["vehicle_drivetrain"] | null;
          engine?: string | null;
          exterior_color?: string | null;
          featured?: boolean;
          features?: string[];
          fuel_type?: Database["public"]["Enums"]["vehicle_fuel_type"] | null;
          id?: string;
          interior_color?: string | null;
          make?: string;
          mileage?: number | null;
          model?: string;
          price?: number | null;
          published_at?: string | null;
          slug?: string;
          sold_at?: string | null;
          status?: Database["public"]["Enums"]["vehicle_status"];
          stock_no?: string;
          title_status?: Database["public"]["Enums"]["vehicle_title_status"] | null;
          transmission?: Database["public"]["Enums"]["vehicle_transmission"] | null;
          trim?: string | null;
          updated_at?: string;
          vin?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      user_role: "admin" | "poster";
      vehicle_body_type:
        | "sedan"
        | "suv"
        | "truck"
        | "coupe"
        | "hatchback"
        | "van"
        | "wagon"
        | "convertible"
        | "other";
      vehicle_drivetrain: "fwd" | "rwd" | "awd" | "4wd";
      vehicle_fuel_type: "gas" | "diesel" | "hybrid" | "electric" | "other";
      vehicle_status: "draft" | "available" | "pending" | "sold";
      vehicle_title_status: "clean" | "rebuilt" | "salvage" | "other";
      vehicle_transmission: "automatic" | "manual" | "cvt";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "poster"],
      vehicle_body_type: [
        "sedan",
        "suv",
        "truck",
        "coupe",
        "hatchback",
        "van",
        "wagon",
        "convertible",
        "other",
      ],
      vehicle_drivetrain: ["fwd", "rwd", "awd", "4wd"],
      vehicle_fuel_type: ["gas", "diesel", "hybrid", "electric", "other"],
      vehicle_status: ["draft", "available", "pending", "sold"],
      vehicle_title_status: ["clean", "rebuilt", "salvage", "other"],
      vehicle_transmission: ["automatic", "manual", "cvt"],
    },
  },
} as const;
