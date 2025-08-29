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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_year_id: string | null
          class_teacher_id: string | null
          created_at: string | null
          id: string
          level: number
          max_students: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          level: number
          max_students?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          level?: number
          max_students?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year_id: string | null
          amount: number
          class_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          fee_type: string
          id: string
          is_active: boolean | null
          name: string
          payment_schedule: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          amount: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          fee_type: string
          id?: string
          is_active?: boolean | null
          name: string
          payment_schedule: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          amount?: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          fee_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          payment_schedule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          student_fee_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          student_fee_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          student_fee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_student_fee_id_fkey"
            columns: ["student_fee_id"]
            isOneToOne: false
            referencedRelation: "student_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          academic_year_id: string | null
          balance_amount: number
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          paid_amount: number | null
          status: string
          student_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          balance_amount: number
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          status?: string
          student_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          balance_amount?: number
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          status?: string
          student_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_relationships: {
        Row: {
          created_at: string | null
          id: string
          is_primary_contact: boolean | null
          parent_id: string | null
          relationship_type: string
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary_contact?: boolean | null
          parent_id?: string | null
          relationship_type: string
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary_contact?: boolean | null
          parent_id?: string | null
          relationship_type?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_relationships_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string
          payment_reference: string
          processed_by: string | null
          status: string
          student_id: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method: string
          payment_reference: string
          processed_by?: string | null
          status?: string
          student_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          payment_reference?: string
          processed_by?: string | null
          status?: string
          student_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          academic_year_id: string | null
          created_at: string
          criteria: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_recipients: number | null
          name: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          criteria?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_recipients?: number | null
          name: string
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          criteria?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_recipients?: number | null
          name?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          max_students: number | null
          name: string
          section_teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          max_students?: number | null
          name: string
          section_teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          max_students?: number | null
          name?: string
          section_teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_section_teacher_id_fkey"
            columns: ["section_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string | null
          enrollment_date: string
          id: string
          section_id: string | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          enrollment_date?: string
          id?: string
          section_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          enrollment_date?: string
          id?: string
          section_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          amount: number
          created_at: string
          discount_amount: number | null
          due_date: string
          fee_structure_id: string | null
          final_amount: number
          id: string
          scholarship_amount: number | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount_amount?: number | null
          due_date: string
          fee_structure_id?: string | null
          final_amount: number
          id?: string
          scholarship_amount?: number | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount_amount?: number | null
          due_date?: string
          fee_structure_id?: string | null
          final_amount?: number
          id?: string
          scholarship_amount?: number | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_scholarships: {
        Row: {
          academic_year_id: string | null
          amount: number
          awarded_date: string | null
          created_at: string
          id: string
          notes: string | null
          scholarship_id: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          amount: number
          awarded_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scholarship_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          amount?: number
          awarded_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scholarship_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_scholarships_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scholarships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string
          admission_number: string | null
          created_at: string | null
          date_of_birth: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          enrollment_status: string | null
          gender: string | null
          id: string
          medical_conditions: string | null
          profile_id: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admission_date: string
          admission_number?: string | null
          created_at?: string | null
          date_of_birth: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_status?: string | null
          gender?: string | null
          id?: string
          medical_conditions?: string | null
          profile_id?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string
          admission_number?: string | null
          created_at?: string | null
          date_of_birth?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          enrollment_status?: string | null
          gender?: string | null
          id?: string
          medical_conditions?: string | null
          profile_id?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role:
        | "admin"
        | "principal"
        | "head_teacher"
        | "teacher"
        | "bursar"
        | "librarian"
        | "student"
        | "parent"
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
        "admin",
        "principal",
        "head_teacher",
        "teacher",
        "bursar",
        "librarian",
        "student",
        "parent",
      ],
    },
  },
} as const
