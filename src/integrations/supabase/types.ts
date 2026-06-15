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
      activities: {
        Row: {
          cefr_level: Database["public"]["Enums"]["cefr_level"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cefr_level: Database["public"]["Enums"]["cefr_level"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_assignments: {
        Row: {
          activity_id: string
          approved_at: string | null
          assigned_at: string
          assigned_by: string
          created_at: string
          current_reviewer_id: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          approved_at?: string | null
          assigned_at?: string
          assigned_by: string
          created_at?: string
          current_reviewer_id?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          approved_at?: string | null
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          current_reviewer_id?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_assignments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sections: {
        Row: {
          activity_id: string
          config: Json
          created_at: string
          id: string
          instructions: string | null
          order_index: number
          section_type: Database["public"]["Enums"]["activity_section_type"]
          title: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          config?: Json
          created_at?: string
          id?: string
          instructions?: string | null
          order_index?: number
          section_type: Database["public"]["Enums"]["activity_section_type"]
          title: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          config?: Json
          created_at?: string
          id?: string
          instructions?: string | null
          order_index?: number
          section_type?: Database["public"]["Enums"]["activity_section_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sections_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_submissions: {
        Row: {
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          lesson_id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          lesson_id: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          course_id: string | null
          created_at: string
          id: string
          pinned: boolean
          title: string
        }
        Insert: {
          author_id: string
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attempt_number: number
          created_at: string
          id: string
          overall_feedback: string | null
          overall_status: Database["public"]["Enums"]["submission_status"]
          reviewed_at: string | null
          reviewer_id: string | null
          submitted_at: string
          submitted_to: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attempt_number?: number
          created_at?: string
          id?: string
          overall_feedback?: string | null
          overall_status?: Database["public"]["Enums"]["submission_status"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string
          submitted_to: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attempt_number?: number
          created_at?: string
          id?: string
          overall_feedback?: string | null
          overall_status?: Database["public"]["Enums"]["submission_status"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string
          submitted_to?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "activity_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string
          serial: string
          student_id: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string
          serial: string
          student_id: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string
          serial?: string
          student_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          status: string
          teacher_id: string | null
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          teacher_id?: string | null
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          progress: number
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          progress?: number
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          progress?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          invited_by: string
          invitee_id: string
          message: string | null
          responded_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          invited_by: string
          invitee_id: string
          message?: string | null
          responded_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invitee_id?: string
          message?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          lesson_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lesson_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          body: string
          id: string
          lesson_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          id?: string
          lesson_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          lesson_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: Json
          created_at: string
          due_date: string | null
          id: string
          order_index: number
          section_id: string
          title: string
          type: string
        }
        Insert: {
          content?: Json
          created_at?: string
          due_date?: string | null
          id?: string
          order_index?: number
          section_id: string
          title: string
          type: string
        }
        Update: {
          content?: Json
          created_at?: string
          due_date?: string | null
          id?: string
          order_index?: number
          section_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_tasks: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          role_target: Database["public"]["Enums"]["app_role"]
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          role_target?: Database["public"]["Enums"]["app_role"]
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          role_target?: Database["public"]["Enums"]["app_role"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          lesson_id: string
          score: number
          student_id: string
          total_points: number
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          lesson_id: string
          score?: number
          student_id: string
          total_points?: number
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          lesson_id?: string
          score?: number
          student_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_section_responses: {
        Row: {
          created_at: string
          id: string
          response: Json
          reviewed_at: string | null
          section_id: string
          section_status: Database["public"]["Enums"]["section_response_status"]
          submission_id: string
          teacher_comment: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          response?: Json
          reviewed_at?: string | null
          section_id: string
          section_status?: Database["public"]["Enums"]["section_response_status"]
          submission_id: string
          teacher_comment?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          response?: Json
          reviewed_at?: string | null
          section_id?: string
          section_status?: Database["public"]["Enums"]["section_response_status"]
          submission_id?: string
          teacher_comment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_section_responses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "activity_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_section_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_course_teacher: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      teacher_has_student: {
        Args: { _student_id: string; _teacher_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_section_type: "open_text" | "match_pairs" | "order_words"
      app_role: "admin" | "teacher" | "student"
      assignment_status:
        | "pending"
        | "in_review"
        | "changes_requested"
        | "approved"
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      section_response_status:
        | "pending_review"
        | "approved"
        | "changes_requested"
      submission_status: "in_review" | "changes_requested" | "approved"
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
      activity_section_type: ["open_text", "match_pairs", "order_words"],
      app_role: ["admin", "teacher", "student"],
      assignment_status: [
        "pending",
        "in_review",
        "changes_requested",
        "approved",
      ],
      cefr_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      section_response_status: [
        "pending_review",
        "approved",
        "changes_requested",
      ],
      submission_status: ["in_review", "changes_requested", "approved"],
    },
  },
} as const
