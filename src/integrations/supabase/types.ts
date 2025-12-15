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
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          priority: string
          published_date: string | null
          target_audience: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          published_date?: string | null
          target_audience?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          published_date?: string | null
          target_audience?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          duration_minutes: number | null
          id: string
          meeting_type: string | null
          notes: string | null
          parent_id: string | null
          purpose: string | null
          status: string
          student_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_type?: string | null
          notes?: string | null
          parent_id?: string | null
          purpose?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_type?: string | null
          notes?: string | null
          parent_id?: string | null
          purpose?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_notes: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string
          id: string
          is_private: boolean | null
          note_type: string
          recorded_by: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          is_private?: boolean | null
          note_type: string
          recorded_by?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_private?: boolean | null
          note_type?: string
          recorded_by?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_notes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string | null
          class_teacher_id: string | null
          created_at: string | null
          id: string
          level_id: string | null
          max_students: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          level_id?: string | null
          max_students?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_teacher_id?: string | null
          created_at?: string | null
          id?: string
          level_id?: string | null
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
          {
            foreignKeyName: "classes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
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
      levels: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "levels_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      library_fines: {
        Row: {
          amount: number
          borrower_id: string | null
          created_at: string
          description: string | null
          fine_type: string
          id: string
          is_paid: boolean | null
          paid_date: string | null
          transaction_id: string | null
          updated_at: string
          waived_by: string | null
          waived_date: string | null
        }
        Insert: {
          amount: number
          borrower_id?: string | null
          created_at?: string
          description?: string | null
          fine_type: string
          id?: string
          is_paid?: boolean | null
          paid_date?: string | null
          transaction_id?: string | null
          updated_at?: string
          waived_by?: string | null
          waived_date?: string | null
        }
        Update: {
          amount?: number
          borrower_id?: string | null
          created_at?: string
          description?: string | null
          fine_type?: string
          id?: string
          is_paid?: boolean | null
          paid_date?: string | null
          transaction_id?: string | null
          updated_at?: string
          waived_by?: string | null
          waived_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_fines_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_fines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "library_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_fines_waived_by_fkey"
            columns: ["waived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          author: string | null
          available_copies: number
          barcode: string | null
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          edition: string | null
          id: string
          is_active: boolean | null
          isbn: string | null
          item_type: string
          language: string | null
          location: string | null
          publication_year: number | null
          publisher: string | null
          subject: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author?: string | null
          available_copies?: number
          barcode?: string | null
          category: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          edition?: string | null
          id?: string
          is_active?: boolean | null
          isbn?: string | null
          item_type: string
          language?: string | null
          location?: string | null
          publication_year?: number | null
          publisher?: string | null
          subject?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string | null
          available_copies?: number
          barcode?: string | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          edition?: string | null
          id?: string
          is_active?: boolean | null
          isbn?: string | null
          item_type?: string
          language?: string | null
          location?: string | null
          publication_year?: number | null
          publisher?: string | null
          subject?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      library_reservations: {
        Row: {
          created_at: string
          expiry_date: string
          id: string
          library_item_id: string | null
          notes: string | null
          reservation_date: string | null
          reserver_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiry_date: string
          id?: string
          library_item_id?: string | null
          notes?: string | null
          reservation_date?: string | null
          reserver_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string
          id?: string
          library_item_id?: string | null
          notes?: string | null
          reservation_date?: string | null
          reserver_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_reservations_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_reservations_reserver_id_fkey"
            columns: ["reserver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_transactions: {
        Row: {
          borrower_id: string | null
          created_at: string
          due_date: string
          fine_amount: number | null
          id: string
          is_overdue: boolean | null
          issue_date: string | null
          library_item_id: string | null
          notes: string | null
          processed_by: string | null
          return_date: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          borrower_id?: string | null
          created_at?: string
          due_date: string
          fine_amount?: number | null
          id?: string
          is_overdue?: boolean | null
          issue_date?: string | null
          library_item_id?: string | null
          notes?: string | null
          processed_by?: string | null
          return_date?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          borrower_id?: string | null
          created_at?: string
          due_date?: string
          fine_amount?: number | null
          id?: string
          is_overdue?: boolean | null
          issue_date?: string | null
          library_item_id?: string | null
          notes?: string | null
          processed_by?: string | null
          return_date?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_transactions_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_transactions_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_enrollments: {
        Row: {
          academic_year_id: string | null
          authorized_pickup: boolean | null
          contact_preferences: Json | null
          created_at: string
          emergency_contact_priority: number | null
          enrollment_date: string
          id: string
          notes: string | null
          parent_id: string
          status: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          authorized_pickup?: boolean | null
          contact_preferences?: Json | null
          created_at?: string
          emergency_contact_priority?: number | null
          enrollment_date?: string
          id?: string
          notes?: string | null
          parent_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          authorized_pickup?: boolean | null
          contact_preferences?: Json | null
          created_at?: string
          emergency_contact_priority?: number | null
          enrollment_date?: string
          id?: string
          notes?: string | null
          parent_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_enrollments_academic_year_id"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_enrollments_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      parents: {
        Row: {
          address: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          national_id: string | null
          occupation: string | null
          preferred_contact_method: string | null
          profile_id: string
          updated_at: string
          workplace: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          national_id?: string | null
          occupation?: string | null
          preferred_contact_method?: string | null
          profile_id: string
          updated_at?: string
          workplace?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          national_id?: string | null
          occupation?: string | null
          preferred_contact_method?: string | null
          profile_id?: string
          updated_at?: string
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          user_id?: string
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
      report_cards: {
        Row: {
          academic_year_id: string | null
          created_at: string
          id: string
          is_published: boolean | null
          issued_date: string | null
          overall_grade: string | null
          overall_percentage: number | null
          principal_comments: string | null
          student_id: string | null
          teacher_comments: string | null
          term: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          issued_date?: string | null
          overall_grade?: string | null
          overall_percentage?: number | null
          principal_comments?: string | null
          student_id?: string | null
          teacher_comments?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          issued_date?: string | null
          overall_grade?: string | null
          overall_percentage?: number | null
          principal_comments?: string | null
          student_id?: string | null
          teacher_comments?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      school_settings: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          email: string | null
          established_year: string | null
          id: string
          logo_url: string | null
          motto: string | null
          phone: string | null
          school_name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          established_year?: string | null
          id?: string
          logo_url?: string | null
          motto?: string | null
          phone?: string | null
          school_name?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          established_year?: string | null
          id?: string
          logo_url?: string | null
          motto?: string | null
          phone?: string | null
          school_name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      streams: {
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
            foreignKeyName: "sections_section_teacher_id_fkey"
            columns: ["section_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_emergency_contacts: {
        Row: {
          can_pickup: boolean | null
          contact_name: string
          contact_phone: string
          contact_relationship: string | null
          created_at: string
          id: string
          is_primary_contact: boolean | null
          student_id: string
          updated_at: string
        }
        Insert: {
          can_pickup?: boolean | null
          contact_name: string
          contact_phone: string
          contact_relationship?: string | null
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          student_id: string
          updated_at?: string
        }
        Update: {
          can_pickup?: boolean | null
          contact_name?: string
          contact_phone?: string
          contact_relationship?: string | null
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_enrollments: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string | null
          enrollment_date: string
          id: string
          status: string | null
          stream_id: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          enrollment_date?: string
          id?: string
          status?: string | null
          stream_id?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          enrollment_date?: string
          id?: string
          status?: string | null
          stream_id?: string | null
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
            foreignKeyName: "student_enrollments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
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
      student_medical_info: {
        Row: {
          allergies: string | null
          created_at: string
          dietary_requirements: string | null
          id: string
          medical_conditions: string | null
          medications: string | null
          special_needs: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          dietary_requirements?: string | null
          id?: string
          medical_conditions?: string | null
          medications?: string | null
          special_needs?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          created_at?: string
          dietary_requirements?: string | null
          id?: string
          medical_conditions?: string | null
          medications?: string | null
          special_needs?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
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
      student_subject_enrollments: {
        Row: {
          academic_year_id: string | null
          created_at: string
          enrollment_date: string
          id: string
          status: string
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string
          enrollment_date?: string
          id?: string
          status?: string
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string
          enrollment_date?: string
          id?: string
          status?: string
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          enrollment_status: string | null
          gender: string | null
          id: string
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
          enrollment_status?: string | null
          gender?: string | null
          id?: string
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
          enrollment_status?: string | null
          gender?: string | null
          id?: string
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
      subjects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_core: boolean | null
          level_id: string | null
          name: string
          sub_level: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          level_id?: string | null
          name: string
          sub_level?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          level_id?: string | null
          name?: string
          sub_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subjects_level_id"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_enrollments: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          role_type: string
          start_date: string
          status: string
          subject_id: string | null
          teacher_id: string
          updated_at: string
          workload_hours: number | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          role_type?: string
          start_date?: string
          status?: string
          subject_id?: string | null
          teacher_id: string
          updated_at?: string
          workload_hours?: number | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          role_type?: string
          start_date?: string
          status?: string
          subject_id?: string | null
          teacher_id?: string
          updated_at?: string
          workload_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_teacher_enrollments_academic_year_id"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teacher_enrollments_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teacher_enrollments_subject_id"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teacher_enrollments_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_specializations: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_specializations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_specializations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_specializations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          department: string | null
          employee_id: string | null
          experience_years: number | null
          id: string
          is_class_teacher: boolean | null
          joining_date: string | null
          profile_id: string
          qualification: string | null
          salary: number | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_id?: string | null
          experience_years?: number | null
          id?: string
          is_class_teacher?: boolean | null
          joining_date?: string | null
          profile_id: string
          qualification?: string | null
          salary?: number | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_id?: string | null
          experience_years?: number | null
          id?: string
          is_class_teacher?: boolean | null
          joining_date?: string | null
          profile_id?: string
          qualification?: string | null
          salary?: number | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room_number: string | null
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room_number?: string | null
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room_number?: string | null
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetables_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
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
      delete_academic_year: { Args: { year_id: string }; Returns: boolean }
      delete_class: { Args: { class_id: string }; Returns: boolean }
      delete_level: { Args: { level_id: string }; Returns: boolean }
      delete_stream: { Args: { stream_id: string }; Returns: boolean }
      generate_invoice_number: { Args: never; Returns: string }
      is_admin_user: { Args: never; Returns: boolean }
      is_staff_admin: { Args: never; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      is_teacher_of_student: {
        Args: { student_profile_id: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_activity_type: string
          p_description: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: string
      }
      teacher_can_view_enrollment: {
        Args: { enrollment_class_id: string; enrollment_stream_id: string }
        Returns: boolean
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
