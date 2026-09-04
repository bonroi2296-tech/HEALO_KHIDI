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
      _backup_messages_20260720: {
        Row: {
          created_at: string | null
          id: string | null
          message: string | null
          message_encrypted: string | null
          sender_role: string | null
          session_id: string | null
          translated_text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          message?: string | null
          message_encrypted?: string | null
          sender_role?: string | null
          session_id?: string | null
          translated_text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          message?: string | null
          message_encrypted?: string | null
          sender_role?: string | null
          session_id?: string | null
          translated_text?: string | null
        }
        Relationships: []
      }
      _backup_rag_documents_treatments_20260720: {
        Row: {
          checksum: string | null
          chunk_count: number | null
          content: string | null
          created_at: string | null
          embedding_model: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          lang: string | null
          last_ingested_at: string | null
          metadata: Json | null
          source_id: string | null
          source_label: string | null
          source_type: string | null
          source_url: string | null
          title: string | null
          trust_tier: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          checksum?: string | null
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          lang?: string | null
          last_ingested_at?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          source_url?: string | null
          title?: string | null
          trust_tier?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          checksum?: string | null
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          lang?: string | null
          last_ingested_at?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          source_url?: string | null
          title?: string | null
          trust_tier?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      _backup_session_type_20260727: {
        Row: {
          id: string | null
          is_test: boolean | null
          scheduled_at: string | null
          session_type: string | null
        }
        Insert: {
          id?: string | null
          is_test?: boolean | null
          scheduled_at?: string | null
          session_type?: string | null
        }
        Update: {
          id?: string | null
          is_test?: boolean | null
          scheduled_at?: string | null
          session_type?: string | null
        }
        Relationships: []
      }
      _backup_transcripts_20260720: {
        Row: {
          created_at: string | null
          id: string | null
          session_id: string | null
          source_lang: string | null
          source_text: string | null
          source_text_encrypted: string | null
          target_lang: string | null
          translated_text: string | null
          translated_text_encrypted: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          session_id?: string | null
          source_lang?: string | null
          source_text?: string | null
          source_text_encrypted?: string | null
          target_lang?: string | null
          translated_text?: string | null
          translated_text_encrypted?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          session_id?: string | null
          source_lang?: string | null
          source_text?: string | null
          source_text_encrypted?: string | null
          target_lang?: string | null
          translated_text?: string | null
          translated_text_encrypted?: string | null
        }
        Relationships: []
      }
      _backup_treatments_20260720: {
        Row: {
          benefits: string[] | null
          created_at: string | null
          currency: string | null
          description: string | null
          description_en: string | null
          description_ja: string | null
          description_ko: string | null
          description_zh: string | null
          display_order: number | null
          duration: string | null
          full_description: string | null
          full_description_en: string | null
          full_description_ja: string | null
          full_description_ko: string | null
          full_description_zh: string | null
          hospital_id: string | null
          i18n: Json | null
          id: string | null
          images: string[] | null
          is_published: boolean | null
          meta_desc_en: string | null
          meta_desc_ja: string | null
          meta_desc_ko: string | null
          meta_desc_zh: string | null
          meta_title_en: string | null
          meta_title_ja: string | null
          meta_title_ko: string | null
          meta_title_zh: string | null
          name: string | null
          name_en: string | null
          name_ja: string | null
          name_ko: string | null
          name_zh: string | null
          preparation: string | null
          price_max: number | null
          price_min: number | null
          recovery_time: string | null
          risks: string | null
          slug: string | null
          slug_en: string | null
          slug_ja: string | null
          slug_ko: string | null
          slug_zh: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          display_order?: number | null
          duration?: string | null
          full_description?: string | null
          full_description_en?: string | null
          full_description_ja?: string | null
          full_description_ko?: string | null
          full_description_zh?: string | null
          hospital_id?: string | null
          i18n?: Json | null
          id?: string | null
          images?: string[] | null
          is_published?: boolean | null
          meta_desc_en?: string | null
          meta_desc_ja?: string | null
          meta_desc_ko?: string | null
          meta_desc_zh?: string | null
          meta_title_en?: string | null
          meta_title_ja?: string | null
          meta_title_ko?: string | null
          meta_title_zh?: string | null
          name?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_zh?: string | null
          preparation?: string | null
          price_max?: number | null
          price_min?: number | null
          recovery_time?: string | null
          risks?: string | null
          slug?: string | null
          slug_en?: string | null
          slug_ja?: string | null
          slug_ko?: string | null
          slug_zh?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          display_order?: number | null
          duration?: string | null
          full_description?: string | null
          full_description_en?: string | null
          full_description_ja?: string | null
          full_description_ko?: string | null
          full_description_zh?: string | null
          hospital_id?: string | null
          i18n?: Json | null
          id?: string | null
          images?: string[] | null
          is_published?: boolean | null
          meta_desc_en?: string | null
          meta_desc_ja?: string | null
          meta_desc_ko?: string | null
          meta_desc_zh?: string | null
          meta_title_en?: string | null
          meta_title_ja?: string | null
          meta_title_ko?: string | null
          meta_title_zh?: string | null
          name?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_zh?: string | null
          preparation?: string | null
          price_max?: number | null
          price_min?: number | null
          recovery_time?: string | null
          risks?: string | null
          slug?: string | null
          slug_en?: string | null
          slug_ja?: string | null
          slug_ko?: string | null
          slug_zh?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          id: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string | null
          created_at: string
          id: string
          inquiry_ids: number[] | null
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          inquiry_ids?: number[] | null
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          inquiry_ids?: number[] | null
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_audit_logs_archive: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string | null
          created_at: string
          id: string
          inquiry_ids: number[] | null
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          inquiry_ids?: number[] | null
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          inquiry_ids?: number[] | null
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_notification_logs: {
        Row: {
          channel: string
          created_at: string
          dedupe_key: string | null
          delivery_time_ms: number | null
          destination: string
          error: string | null
          id: string
          inquiry_id: number | null
          message_preview: string | null
          normalized_inquiry_id: string | null
          provider_response: Json | null
          recipient_id: string | null
          recipient_label: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          dedupe_key?: string | null
          delivery_time_ms?: number | null
          destination: string
          error?: string | null
          id?: string
          inquiry_id?: number | null
          message_preview?: string | null
          normalized_inquiry_id?: string | null
          provider_response?: Json | null
          recipient_id?: string | null
          recipient_label?: string | null
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          delivery_time_ms?: number | null
          destination?: string
          error?: string | null
          id?: string
          inquiry_id?: number | null
          message_preview?: string | null
          normalized_inquiry_id?: string | null
          provider_response?: Json | null
          recipient_id?: string | null
          recipient_label?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_notification_recipients: {
        Row: {
          channel: string
          created_at: string
          email: string | null
          failed_count: number
          id: string
          is_active: boolean
          label: string
          last_sent_at: string | null
          notes: string | null
          phone_e164: string | null
          sent_count: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          email?: string | null
          failed_count?: number
          id?: string
          is_active?: boolean
          label: string
          last_sent_at?: string | null
          notes?: string | null
          phone_e164?: string | null
          sent_count?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          email?: string | null
          failed_count?: number
          id?: string
          is_active?: boolean
          label?: string
          last_sent_at?: string | null
          notes?: string | null
          phone_e164?: string | null
          sent_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          code: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          partner_type: string
        }
        Insert: {
          code?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          partner_type?: string
        }
        Update: {
          code?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          partner_type?: string
        }
        Relationships: []
      }
      agency_users: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          is_active: boolean
          role: string | null
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_regression_runs: {
        Row: {
          created_at: string | null
          first_token_ms: number | null
          flags: string[] | null
          id: string
          latency_ms: number | null
          overall_score: number | null
          passed: boolean | null
          rag_chunk_count: number | null
          response_text: string | null
          run_date: string
          test_id: string
        }
        Insert: {
          created_at?: string | null
          first_token_ms?: number | null
          flags?: string[] | null
          id?: string
          latency_ms?: number | null
          overall_score?: number | null
          passed?: boolean | null
          rag_chunk_count?: number | null
          response_text?: string | null
          run_date: string
          test_id: string
        }
        Update: {
          created_at?: string | null
          first_token_ms?: number | null
          flags?: string[] | null
          id?: string
          latency_ms?: number | null
          overall_score?: number | null
          passed?: boolean | null
          rag_chunk_count?: number | null
          response_text?: string | null
          run_date?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_regression_runs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ai_regression_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_regression_tests: {
        Row: {
          created_at: string | null
          expected_behavior: string | null
          id: string
          is_active: boolean | null
          language: string | null
          query_text: string
          scenario_category: string | null
          scenario_id: string
        }
        Insert: {
          created_at?: string | null
          expected_behavior?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          query_text: string
          scenario_category?: string | null
          scenario_id: string
        }
        Update: {
          created_at?: string | null
          expected_behavior?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          query_text?: string
          scenario_category?: string | null
          scenario_id?: string
        }
        Relationships: []
      }
      ai_response_evaluations: {
        Row: {
          created_at: string | null
          flags: string[] | null
          hallucination_score: number | null
          id: string
          judge_model: string | null
          judge_reasoning: string | null
          message_id: string | null
          overall_score: number | null
          query_text: string | null
          relevance_score: number | null
          response_text: string | null
          safety_score: number | null
          thread_id: string | null
        }
        Insert: {
          created_at?: string | null
          flags?: string[] | null
          hallucination_score?: number | null
          id?: string
          judge_model?: string | null
          judge_reasoning?: string | null
          message_id?: string | null
          overall_score?: number | null
          query_text?: string | null
          relevance_score?: number | null
          response_text?: string | null
          safety_score?: number | null
          thread_id?: string | null
        }
        Update: {
          created_at?: string | null
          flags?: string[] | null
          hallucination_score?: number | null
          id?: string
          judge_model?: string | null
          judge_reasoning?: string | null
          message_id?: string | null
          overall_score?: number | null
          query_text?: string | null
          relevance_score?: number | null
          response_text?: string | null
          safety_score?: number | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_response_evaluations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_response_evaluations_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          completion_tokens: number | null
          created_at: string
          est_cost_usd: number | null
          id: number
          meta: Json | null
          model: string
          prompt_tokens: number | null
          surface: string
          total_tokens: number | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          est_cost_usd?: number | null
          id?: number
          meta?: Json | null
          model: string
          prompt_tokens?: number | null
          surface: string
          total_tokens?: number | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          est_cost_usd?: number | null
          id?: number
          meta?: Json | null
          model?: string
          prompt_tokens?: number | null
          surface?: string
          total_tokens?: number | null
        }
        Relationships: []
      }
      alert_counter_events: {
        Row: {
          counter_key: string
          created_at: string
          id: number
        }
        Insert: {
          counter_key: string
          created_at?: string
          id?: number
        }
        Update: {
          counter_key?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      attachment_translations: {
        Row: {
          created_at: string
          doc: Json
          edited_at: string | null
          edited_by: string | null
          edited_doc: Json | null
          id: number
          lang: string
          model: string | null
          path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc: Json
          edited_at?: string | null
          edited_by?: string | null
          edited_doc?: Json | null
          id?: never
          lang: string
          model?: string | null
          path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc?: Json
          edited_at?: string | null
          edited_by?: string | null
          edited_doc?: Json | null
          id?: never
          lang?: string
          model?: string | null
          path?: string
          updated_at?: string
        }
        Relationships: []
      }
      auto_job_events: {
        Row: {
          created_at: string | null
          data: Json | null
          duration_ms: number | null
          event_type: string
          id: string
          job_id: string | null
          step: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          duration_ms?: number | null
          event_type: string
          id?: string
          job_id?: string | null
          step?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          duration_ms?: number | null
          event_type?: string
          id?: string
          job_id?: string | null
          step?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "auto_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          input: Json | null
          job_type: string
          output: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          input?: Json | null
          job_type: string
          output?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          input?: Json | null
          job_type?: string
          output?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cancer_patient_intakes: {
        Row: {
          budget_range: Json | null
          cancer_stage: string | null
          cancer_type: string
          created_at: string | null
          current_treatment: string | null
          current_treatment_encrypted: string | null
          diagnosis_date: string | null
          diagnosis_date_encrypted: string | null
          first_name: string | null
          first_name_encrypted: string | null
          id: string
          inquiry_id: number | null
          insurance_info_encrypted: string | null
          insurance_info_iv: string | null
          language_preference: string | null
          medical_records_encrypted: string | null
          medical_records_iv: string | null
          preferred_hospitals: string[] | null
          travel_dates: Json | null
          updated_at: string | null
        }
        Insert: {
          budget_range?: Json | null
          cancer_stage?: string | null
          cancer_type: string
          created_at?: string | null
          current_treatment?: string | null
          current_treatment_encrypted?: string | null
          diagnosis_date?: string | null
          diagnosis_date_encrypted?: string | null
          first_name?: string | null
          first_name_encrypted?: string | null
          id?: string
          inquiry_id?: number | null
          insurance_info_encrypted?: string | null
          insurance_info_iv?: string | null
          language_preference?: string | null
          medical_records_encrypted?: string | null
          medical_records_iv?: string | null
          preferred_hospitals?: string[] | null
          travel_dates?: Json | null
          updated_at?: string | null
        }
        Update: {
          budget_range?: Json | null
          cancer_stage?: string | null
          cancer_type?: string
          created_at?: string | null
          current_treatment?: string | null
          current_treatment_encrypted?: string | null
          diagnosis_date?: string | null
          diagnosis_date_encrypted?: string | null
          first_name?: string | null
          first_name_encrypted?: string | null
          id?: string
          inquiry_id?: number | null
          insurance_info_encrypted?: string | null
          insurance_info_iv?: string | null
          language_preference?: string | null
          medical_records_encrypted?: string | null
          medical_records_iv?: string | null
          preferred_hospitals?: string[] | null
          travel_dates?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancer_patient_intakes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      case_opinions: {
        Row: {
          attribution_note: string | null
          auto_translated_text: string | null
          created_at: string
          doctor_key: string | null
          doctor_name: string
          file_name: string | null
          file_path: string | null
          files: Json | null
          id: string
          inquiry_id: number
          opinion_text: string
          released_at: string | null
          released_by: string | null
          released_text: string | null
          request_id: string | null
          submitted_ip: string | null
        }
        Insert: {
          attribution_note?: string | null
          auto_translated_text?: string | null
          created_at?: string
          doctor_key?: string | null
          doctor_name: string
          file_name?: string | null
          file_path?: string | null
          files?: Json | null
          id?: string
          inquiry_id: number
          opinion_text: string
          released_at?: string | null
          released_by?: string | null
          released_text?: string | null
          request_id?: string | null
          submitted_ip?: string | null
        }
        Update: {
          attribution_note?: string | null
          auto_translated_text?: string | null
          created_at?: string
          doctor_key?: string | null
          doctor_name?: string
          file_name?: string | null
          file_path?: string | null
          files?: Json | null
          id?: string
          inquiry_id?: number
          opinion_text?: string
          released_at?: string | null
          released_by?: string | null
          released_text?: string | null
          request_id?: string | null
          submitted_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_opinions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_opinions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "opinion_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      case_shared_documents: {
        Row: {
          created_at: string
          file_name: string
          id: string
          inquiry_id: number
          lang: string | null
          mime: string | null
          note: string | null
          shared_at: string | null
          size_bytes: number | null
          storage_path: string
          title: string | null
          uploaded_by: string | null
          visible_to_patient: boolean
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          inquiry_id: number
          lang?: string | null
          mime?: string | null
          note?: string | null
          shared_at?: string | null
          size_bytes?: number | null
          storage_path: string
          title?: string | null
          uploaded_by?: string | null
          visible_to_patient?: boolean
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          inquiry_id?: number
          lang?: string | null
          mime?: string | null
          note?: string | null
          shared_at?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string | null
          uploaded_by?: string | null
          visible_to_patient?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_shared_documents_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      case_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          inquiry_id: number | null
          note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          inquiry_id?: number | null
          note?: string | null
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          inquiry_id?: number | null
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_status_history_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      case_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          inquiry_id: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          inquiry_id: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inquiry_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_updates_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      center_menu_items: {
        Row: {
          category_ko: string
          center_name_ko: string
          center_slug: string
          center_summary_ko: string | null
          created_at: string
          display_order: number
          frequency_ko: string | null
          hospital_brand: string
          id: string
          is_active: boolean
          item_name_ko: string
          price_krw: number | null
          revised_on: string
          updated_at: string
        }
        Insert: {
          category_ko: string
          center_name_ko: string
          center_slug: string
          center_summary_ko?: string | null
          created_at?: string
          display_order?: number
          frequency_ko?: string | null
          hospital_brand?: string
          id?: string
          is_active?: boolean
          item_name_ko: string
          price_krw?: number | null
          revised_on: string
          updated_at?: string
        }
        Update: {
          category_ko?: string
          center_name_ko?: string
          center_slug?: string
          center_summary_ko?: string | null
          created_at?: string
          display_order?: number
          frequency_ko?: string | null
          hospital_brand?: string
          id?: string
          is_active?: boolean
          item_name_ko?: string
          price_krw?: number | null
          revised_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          guest_email: string | null
          id: string
          message_id: string | null
          rating: number
          reason_category: string | null
          thread_id: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          guest_email?: string | null
          id?: string
          message_id?: string | null
          rating: number
          reason_category?: string | null
          thread_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          guest_email?: string | null
          id?: string
          message_id?: string | null
          rating?: number
          reason_category?: string | null
          thread_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_feedback_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          attachments: Json
          created_at: string | null
          id: string
          is_internal: boolean | null
          message_text: string | null
          metadata: Json | null
          thread_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          attachments?: Json
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message_text?: string | null
          metadata?: Json | null
          thread_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          attachments?: Json
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message_text?: string | null
          metadata?: Json | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          browser_session_id: string | null
          channel: string | null
          created_at: string | null
          guest_country: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          inquiry_id: number | null
          last_active_at: string | null
          metadata: Json | null
          normalized_inquiry_id: string | null
          public_token: string | null
          resolved_at: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          browser_session_id?: string | null
          channel?: string | null
          created_at?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inquiry_id?: number | null
          last_active_at?: string | null
          metadata?: Json | null
          normalized_inquiry_id?: string | null
          public_token?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          browser_session_id?: string | null
          channel?: string | null
          created_at?: string | null
          guest_country?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inquiry_id?: number | null
          last_active_at?: string | null
          metadata?: Json | null
          normalized_inquiry_id?: string | null
          public_token?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      consultation_admissions: {
        Row: {
          auth_user_id: string | null
          consultation_id: string
          decided_at: string | null
          decided_by: string | null
          display_name: string | null
          display_name_encrypted: string | null
          guest_token_id: string | null
          id: string
          left_at: string | null
          participant_identity: string
          participant_role: string
          requested_at: string
          requester_ip: string | null
          requester_user_agent: string | null
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          consultation_id: string
          decided_at?: string | null
          decided_by?: string | null
          display_name?: string | null
          display_name_encrypted?: string | null
          guest_token_id?: string | null
          id?: string
          left_at?: string | null
          participant_identity: string
          participant_role: string
          requested_at?: string
          requester_ip?: string | null
          requester_user_agent?: string | null
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          consultation_id?: string
          decided_at?: string | null
          decided_by?: string | null
          display_name?: string | null
          display_name_encrypted?: string | null
          guest_token_id?: string | null
          id?: string
          left_at?: string | null
          participant_identity?: string
          participant_role?: string
          requested_at?: string
          requester_ip?: string | null
          requester_user_agent?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_admissions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_admissions_guest_token_id_fkey"
            columns: ["guest_token_id"]
            isOneToOne: false
            referencedRelation: "consultation_guest_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_documents: {
        Row: {
          consultation_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          document_type: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          consultation_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          consultation_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_documents_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_guest_tokens: {
        Row: {
          consultation_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          first_used_at: string | null
          id: string
          invitee_email: string | null
          invitee_name: string | null
          last_used_at: string | null
          last_used_ip: string | null
          last_used_user_agent: string | null
          max_uses: number
          metadata: Json | null
          revoked_at: string | null
          role: string
          token_hash: string
          used_count: number
        }
        Insert: {
          consultation_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          first_used_at?: string | null
          id?: string
          invitee_email?: string | null
          invitee_name?: string | null
          last_used_at?: string | null
          last_used_ip?: string | null
          last_used_user_agent?: string | null
          max_uses?: number
          metadata?: Json | null
          revoked_at?: string | null
          role: string
          token_hash: string
          used_count?: number
        }
        Update: {
          consultation_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          first_used_at?: string | null
          id?: string
          invitee_email?: string | null
          invitee_name?: string | null
          last_used_at?: string | null
          last_used_ip?: string | null
          last_used_user_agent?: string | null
          max_uses?: number
          metadata?: Json | null
          revoked_at?: string | null
          role?: string
          token_hash?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultation_guest_tokens_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          message_encrypted: string | null
          sender_id: string | null
          sender_role: string | null
          session_id: string | null
          translated_text: string | null
          translated_text_encrypted: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          message_encrypted?: string | null
          sender_id?: string | null
          sender_role?: string | null
          session_id?: string | null
          translated_text?: string | null
          translated_text_encrypted?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          message_encrypted?: string | null
          sender_id?: string | null
          sender_role?: string | null
          session_id?: string | null
          translated_text?: string | null
          translated_text_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_recordings: {
        Row: {
          audio_only: boolean
          consultation_id: string
          created_at: string
          duration_sec: number | null
          egress_id: string
          ended_at: string | null
          expires_at: string
          file_path: string | null
          id: string
          started_at: string
          started_by: string | null
          status: string
        }
        Insert: {
          audio_only?: boolean
          consultation_id: string
          created_at?: string
          duration_sec?: number | null
          egress_id: string
          ended_at?: string | null
          expires_at: string
          file_path?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Update: {
          audio_only?: boolean
          consultation_id?: string
          created_at?: string
          duration_sec?: number | null
          egress_id?: string
          ended_at?: string | null
          expires_at?: string
          file_path?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_recordings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_sessions: {
        Row: {
          ai_summary: Json | null
          clinical_summary: string | null
          clinical_summary_encrypted: string | null
          coordinator_id: string | null
          coordinator_user_id: string | null
          created_at: string | null
          doctor_id: string | null
          doctor_language: string | null
          doctor_user_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          hospital_id: string | null
          id: string
          inquiry_id: number | null
          intake_id: string | null
          is_test: boolean
          livekit_duration_seconds: number | null
          livekit_ended_at: string | null
          livekit_room_name: string | null
          livekit_token_doctor: string | null
          livekit_token_patient: string | null
          notes: string | null
          notes_encrypted: string | null
          partner_doctor_id: string | null
          patient_id: string | null
          patient_language: string | null
          patient_timezone: string | null
          patient_user_id: string | null
          recommendations: string | null
          recommendations_encrypted: string | null
          recording_url: string | null
          scheduled_at: string
          session_type: string | null
          started_at: string | null
          status: string | null
          translator_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_summary?: Json | null
          clinical_summary?: string | null
          clinical_summary_encrypted?: string | null
          coordinator_id?: string | null
          coordinator_user_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          doctor_language?: string | null
          doctor_user_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          hospital_id?: string | null
          id?: string
          inquiry_id?: number | null
          intake_id?: string | null
          is_test?: boolean
          livekit_duration_seconds?: number | null
          livekit_ended_at?: string | null
          livekit_room_name?: string | null
          livekit_token_doctor?: string | null
          livekit_token_patient?: string | null
          notes?: string | null
          notes_encrypted?: string | null
          partner_doctor_id?: string | null
          patient_id?: string | null
          patient_language?: string | null
          patient_timezone?: string | null
          patient_user_id?: string | null
          recommendations?: string | null
          recommendations_encrypted?: string | null
          recording_url?: string | null
          scheduled_at: string
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          translator_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_summary?: Json | null
          clinical_summary?: string | null
          clinical_summary_encrypted?: string | null
          coordinator_id?: string | null
          coordinator_user_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          doctor_language?: string | null
          doctor_user_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          hospital_id?: string | null
          id?: string
          inquiry_id?: number | null
          intake_id?: string | null
          is_test?: boolean
          livekit_duration_seconds?: number | null
          livekit_ended_at?: string | null
          livekit_room_name?: string | null
          livekit_token_doctor?: string | null
          livekit_token_patient?: string | null
          notes?: string | null
          notes_encrypted?: string | null
          partner_doctor_id?: string | null
          patient_id?: string | null
          patient_language?: string | null
          patient_timezone?: string | null
          patient_user_id?: string | null
          recommendations?: string | null
          recommendations_encrypted?: string | null
          recording_url?: string | null
          scheduled_at?: string
          session_type?: string | null
          started_at?: string | null
          status?: string | null
          translator_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_sessions_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_sessions_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "cancer_patient_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_sessions_partner_doctor_id_fkey"
            columns: ["partner_doctor_id"]
            isOneToOne: false
            referencedRelation: "partner_doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_translations: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          is_partial: boolean
          session_id: string | null
          source_lang: string
          source_text: string | null
          source_text_encrypted: string | null
          speaker_name: string | null
          speaker_name_encrypted: string | null
          speaker_role: string | null
          stt_engine: string | null
          target_lang: string
          translated_text: string | null
          translated_text_encrypted: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_partial?: boolean
          session_id?: string | null
          source_lang: string
          source_text?: string | null
          source_text_encrypted?: string | null
          speaker_name?: string | null
          speaker_name_encrypted?: string | null
          speaker_role?: string | null
          stt_engine?: string | null
          target_lang: string
          translated_text?: string | null
          translated_text_encrypted?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_partial?: boolean
          session_id?: string | null
          source_lang?: string
          source_text?: string | null
          source_text_encrypted?: string | null
          speaker_name?: string | null
          speaker_name_encrypted?: string | null
          speaker_role?: string | null
          stt_engine?: string | null
          target_lang?: string
          translated_text?: string | null
          translated_text_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_translations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_change_log: {
        Row: {
          changed_at: string
          content_key: string
          editor_email: string | null
          id: string
          lang: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          content_key: string
          editor_email?: string | null
          id?: string
          lang: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          content_key?: string
          editor_email?: string | null
          id?: string
          lang?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      content_overrides: {
        Row: {
          content_key: string
          id: string
          lang: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          content_key: string
          id?: string
          lang: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          content_key?: string
          id?: string
          lang?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      coordinator_responses: {
        Row: {
          content: string | null
          coordinator_id: string | null
          created_at: string | null
          currency: string | null
          hospital_id: string | null
          id: string
          inquiry_id: number | null
          is_final: boolean | null
          metadata: Json | null
          quoted_price: number | null
          response_type: string | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          coordinator_id?: string | null
          created_at?: string | null
          currency?: string | null
          hospital_id?: string | null
          id?: string
          inquiry_id?: number | null
          is_final?: boolean | null
          metadata?: Json | null
          quoted_price?: number | null
          response_type?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          coordinator_id?: string | null
          created_at?: string | null
          currency?: string | null
          hospital_id?: string | null
          id?: string
          inquiry_id?: number | null
          is_final?: boolean | null
          metadata?: Json | null
          quoted_price?: number | null
          response_type?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_estimate_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          estimate_id: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          estimate_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          estimate_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimate_history_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "cost_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimates: {
        Row: {
          ai_personalization: string | null
          auto_max_krw: number | null
          auto_median_krw: number | null
          auto_min_krw: number | null
          cancer_type: string | null
          consultation_id: string | null
          coordinator_notes_encrypted: string | null
          coordinator_user_id: string | null
          created_at: string | null
          expires_at: string | null
          hospital_id: string | null
          id: string
          intake_id: string | null
          patient_accepted_at: string | null
          patient_accepted_ip: string | null
          patient_user_id: string
          quotation_issued_at: string | null
          quotation_issued_by: string | null
          quotation_items: Json | null
          quotation_no: string | null
          quotation_pdf_url: string | null
          stage: string | null
          status: string
          total_krw: number | null
          total_usd: number | null
          updated_at: string | null
        }
        Insert: {
          ai_personalization?: string | null
          auto_max_krw?: number | null
          auto_median_krw?: number | null
          auto_min_krw?: number | null
          cancer_type?: string | null
          consultation_id?: string | null
          coordinator_notes_encrypted?: string | null
          coordinator_user_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          hospital_id?: string | null
          id?: string
          intake_id?: string | null
          patient_accepted_at?: string | null
          patient_accepted_ip?: string | null
          patient_user_id: string
          quotation_issued_at?: string | null
          quotation_issued_by?: string | null
          quotation_items?: Json | null
          quotation_no?: string | null
          quotation_pdf_url?: string | null
          stage?: string | null
          status?: string
          total_krw?: number | null
          total_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_personalization?: string | null
          auto_max_krw?: number | null
          auto_median_krw?: number | null
          auto_min_krw?: number | null
          cancer_type?: string | null
          consultation_id?: string | null
          coordinator_notes_encrypted?: string | null
          coordinator_user_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          hospital_id?: string | null
          id?: string
          intake_id?: string | null
          patient_accepted_at?: string | null
          patient_accepted_ip?: string | null
          patient_user_id?: string
          quotation_issued_at?: string | null
          quotation_issued_by?: string | null
          quotation_items?: Json | null
          quotation_no?: string | null
          quotation_pdf_url?: string | null
          stage?: string | null
          status?: string
          total_krw?: number | null
          total_usd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimates_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "cancer_patient_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotreatment_referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          from_hospital_id: string | null
          id: number
          inquiry_id: number | null
          reason: string | null
          requested_at: string
          responded_at: string | null
          result_note: string | null
          status: string
          to_hospital_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_hospital_id?: string | null
          id?: never
          inquiry_id?: number | null
          reason?: string | null
          requested_at?: string
          responded_at?: string | null
          result_note?: string | null
          status?: string
          to_hospital_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_hospital_id?: string | null
          id?: never
          inquiry_id?: number | null
          reason?: string | null
          requested_at?: string
          responded_at?: string | null
          result_note?: string | null
          status?: string
          to_hospital_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotreatment_referrals_from_hospital_id_fkey"
            columns: ["from_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotreatment_referrals_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotreatment_referrals_to_hospital_id_fkey"
            columns: ["to_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          error_message: string | null
          hospital_id: string | null
          id: string
          item_count: number | null
          metadata: Json | null
          params: Json
          progress_current: number
          progress_total: number
          source: string | null
          source_id: string | null
          started_at: string | null
          stats: Json
          status: string | null
          url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          error_message?: string | null
          hospital_id?: string | null
          id?: string
          item_count?: number | null
          metadata?: Json | null
          params?: Json
          progress_current?: number
          progress_total?: number
          source?: string | null
          source_id?: string | null
          started_at?: string | null
          stats?: Json
          status?: string | null
          url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          error_message?: string | null
          hospital_id?: string | null
          id?: string
          item_count?: number | null
          metadata?: Json | null
          params?: Json
          progress_current?: number
          progress_total?: number
          source?: string | null
          source_id?: string | null
          started_at?: string | null
          stats?: Json
          status?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_raw_items: {
        Row: {
          change_diff: Json | null
          content: string | null
          content_hash: string | null
          created_at: string | null
          data: Json
          extracted_data: Json | null
          hospital_id: string | null
          id: string
          job_id: string | null
          lang: string | null
          metadata: Json | null
          raw_html: string | null
          review_action: string | null
          reviewed_at: string | null
          source_id: string | null
          source_type: string | null
          source_unique_id: string | null
          status: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          change_diff?: Json | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          data?: Json
          extracted_data?: Json | null
          hospital_id?: string | null
          id?: string
          job_id?: string | null
          lang?: string | null
          metadata?: Json | null
          raw_html?: string | null
          review_action?: string | null
          reviewed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          source_unique_id?: string | null
          status?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          change_diff?: Json | null
          content?: string | null
          content_hash?: string | null
          created_at?: string | null
          data?: Json
          extracted_data?: Json | null
          hospital_id?: string | null
          id?: string
          job_id?: string | null
          lang?: string | null
          metadata?: Json | null
          raw_html?: string | null
          review_action?: string | null
          reviewed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          source_unique_id?: string | null
          status?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_raw_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_raw_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crawl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      doc_glossary_terms: {
        Row: {
          created_at: string
          created_by: string | null
          en: string | null
          id: number
          ko: string | null
          note: string | null
          ru: string | null
          src: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          en?: string | null
          id?: never
          ko?: string | null
          note?: string | null
          ru?: string | null
          src: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          en?: string | null
          id?: never
          ko?: string | null
          note?: string | null
          ru?: string | null
          src?: string
        }
        Relationships: []
      }
      education_contents: {
        Row: {
          body_en: string | null
          body_ja: string | null
          body_ko: string | null
          body_kz: string | null
          body_ru: string | null
          body_zh: string | null
          cancer_type: string
          content_type: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          media_url: string | null
          send_at_phase: string | null
          title_en: string | null
          title_ja: string | null
          title_ko: string
          title_kz: string | null
          title_ru: string | null
          title_zh: string | null
        }
        Insert: {
          body_en?: string | null
          body_ja?: string | null
          body_ko?: string | null
          body_kz?: string | null
          body_ru?: string | null
          body_zh?: string | null
          cancer_type: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          media_url?: string | null
          send_at_phase?: string | null
          title_en?: string | null
          title_ja?: string | null
          title_ko: string
          title_kz?: string | null
          title_ru?: string | null
          title_zh?: string | null
        }
        Update: {
          body_en?: string | null
          body_ja?: string | null
          body_ko?: string | null
          body_kz?: string | null
          body_ru?: string | null
          body_zh?: string | null
          cancer_type?: string
          content_type?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          media_url?: string | null
          send_at_phase?: string | null
          title_en?: string | null
          title_ja?: string | null
          title_ko?: string
          title_kz?: string | null
          title_ru?: string | null
          title_zh?: string | null
        }
        Relationships: []
      }
      followup_schedules: {
        Row: {
          cancer_type: string
          created_at: string | null
          current_phase: string | null
          id: string
          inquiry_id: number | null
          next_action_at: string | null
          patient_user_id: string | null
          schedule: Json
          status: string | null
          treatment_completed_at: string | null
        }
        Insert: {
          cancer_type: string
          created_at?: string | null
          current_phase?: string | null
          id?: string
          inquiry_id?: number | null
          next_action_at?: string | null
          patient_user_id?: string | null
          schedule: Json
          status?: string | null
          treatment_completed_at?: string | null
        }
        Update: {
          cancer_type?: string
          created_at?: string | null
          current_phase?: string | null
          id?: string
          inquiry_id?: number | null
          next_action_at?: string | null
          patient_user_id?: string | null
          schedule?: Json
          status?: string | null
          treatment_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_schedules_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          country: string | null
          created_at: string | null
          drop_reason: string | null
          duration: number | null
          id: number
          language: string | null
          page: string | null
          session_id: string | null
          stage: string
          treatment_type: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          drop_reason?: string | null
          duration?: number | null
          id?: number
          language?: string | null
          page?: string | null
          session_id?: string | null
          stage: string
          treatment_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          drop_reason?: string | null
          duration?: number | null
          id?: number
          language?: string | null
          page?: string | null
          session_id?: string | null
          stage?: string
          treatment_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      hospital_cancer_capabilities: {
        Row: {
          annual_cases: number | null
          avg_duration_days: number | null
          avg_treatment_cost_usd: number | null
          cancer_type: string
          certifications: string[] | null
          hospital_id: string | null
          id: string
          is_verified: boolean | null
          specialized_doctors: Json | null
          success_rate: number | null
          treatment_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          annual_cases?: number | null
          avg_duration_days?: number | null
          avg_treatment_cost_usd?: number | null
          cancer_type: string
          certifications?: string[] | null
          hospital_id?: string | null
          id?: string
          is_verified?: boolean | null
          specialized_doctors?: Json | null
          success_rate?: number | null
          treatment_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          annual_cases?: number | null
          avg_duration_days?: number | null
          avg_treatment_cost_usd?: number | null
          cancer_type?: string
          certifications?: string[] | null
          hospital_id?: string | null
          id?: string
          is_verified?: boolean | null
          specialized_doctors?: Json | null
          success_rate?: number | null
          treatment_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_cancer_capabilities_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_leads: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          currency: string | null
          first_response_at: string | null
          hospital_id: string | null
          id: string
          inquiry_id: number | null
          last_status_at: string | null
          metadata: Json | null
          normalized_inquiry_id: string | null
          notes: string | null
          priority: number | null
          quoted_price: number | null
          quoted_price_max: number | null
          quoted_price_min: number | null
          responded_at: string | null
          response_notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          currency?: string | null
          first_response_at?: string | null
          hospital_id?: string | null
          id?: string
          inquiry_id?: number | null
          last_status_at?: string | null
          metadata?: Json | null
          normalized_inquiry_id?: string | null
          notes?: string | null
          priority?: number | null
          quoted_price?: number | null
          quoted_price_max?: number | null
          quoted_price_min?: number | null
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          currency?: string | null
          first_response_at?: string | null
          hospital_id?: string | null
          id?: string
          inquiry_id?: number | null
          last_status_at?: string | null
          metadata?: Json | null
          normalized_inquiry_id?: string | null
          notes?: string | null
          priority?: number | null
          quoted_price?: number | null
          quoted_price_max?: number | null
          quoted_price_min?: number | null
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_leads_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_leads_normalized_inquiry_id_fkey"
            columns: ["normalized_inquiry_id"]
            isOneToOne: false
            referencedRelation: "normalized_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_offer_enrich_jobs: {
        Row: {
          created_at: string
          error: string | null
          hospital_id: string
          id: string
          payload: Json | null
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          hospital_id: string
          id?: string
          payload?: Json | null
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          hospital_id?: string
          id?: string
          payload?: Json | null
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_offer_enrich_jobs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_offer_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          debug: Json
          error: string | null
          hospital_id: string | null
          id: string
          metadata: Json | null
          progress: number
          result_offers: Json
          source_url: string | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          debug?: Json
          error?: string | null
          hospital_id?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          result_offers?: Json
          source_url?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          debug?: Json
          error?: string | null
          hospital_id?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          result_offers?: Json
          source_url?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_offer_jobs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_users: {
        Row: {
          created_at: string | null
          hospital_id: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_users_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          address_detail: string | null
          address_en: string | null
          address_ja: string | null
          address_ko: string | null
          address_zh: string | null
          amenities: string[]
          annual_surgery_count: number | null
          certifications: string[] | null
          contact_email: string | null
          created_at: string | null
          data_source: string | null
          description: string | null
          description_en: string | null
          description_ja: string | null
          description_ko: string | null
          description_zh: string | null
          display_order: number | null
          doctor_count: number | null
          doctor_profile: Json | null
          enrichment_log: Json | null
          establishment_date: string | null
          external_ratings: Json | null
          faq: Json
          gallery_images: string[] | null
          google_maps_url: string | null
          google_place_id: string | null
          i18n: Json | null
          id: string
          images: string[] | null
          insurance_accepted: boolean | null
          insurance_details: Json | null
          is_active: boolean
          is_partner: boolean
          is_published: boolean
          last_crawled_at: string | null
          latitude: number | null
          location_en: string | null
          location_ja: string | null
          location_kr: string | null
          location_zh: string | null
          longitude: number | null
          medical_equipment: string[] | null
          medical_institution_grade: string | null
          meta_desc_en: string | null
          meta_desc_ja: string | null
          meta_desc_ko: string | null
          meta_desc_zh: string | null
          meta_title_en: string | null
          meta_title_ja: string | null
          meta_title_ko: string | null
          meta_title_zh: string | null
          name: string | null
          name_en: string | null
          name_ja: string | null
          name_ko: string | null
          name_kz: string | null
          name_ru: string | null
          name_zh: string | null
          naver_place_id: string | null
          offers_auto_fail_reason: string | null
          offers_auto_failed_at: string | null
          offers_auto_skip: boolean
          operating_hours: Json | null
          phone: string | null
          rating: number | null
          reviews_count: number | null
          slug: string | null
          slug_en: string | null
          slug_ja: string | null
          slug_ko: string | null
          slug_zh: string | null
          source_unique_id: string | null
          specialties: string[]
          supported_languages: string[]
          tags: string[]
          thumbnail: string | null
          thumbnail_image: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          address_en?: string | null
          address_ja?: string | null
          address_ko?: string | null
          address_zh?: string | null
          amenities?: string[]
          annual_surgery_count?: number | null
          certifications?: string[] | null
          contact_email?: string | null
          created_at?: string | null
          data_source?: string | null
          description?: string | null
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          display_order?: number | null
          doctor_count?: number | null
          doctor_profile?: Json | null
          enrichment_log?: Json | null
          establishment_date?: string | null
          external_ratings?: Json | null
          faq?: Json
          gallery_images?: string[] | null
          google_maps_url?: string | null
          google_place_id?: string | null
          i18n?: Json | null
          id?: string
          images?: string[] | null
          insurance_accepted?: boolean | null
          insurance_details?: Json | null
          is_active?: boolean
          is_partner?: boolean
          is_published?: boolean
          last_crawled_at?: string | null
          latitude?: number | null
          location_en?: string | null
          location_ja?: string | null
          location_kr?: string | null
          location_zh?: string | null
          longitude?: number | null
          medical_equipment?: string[] | null
          medical_institution_grade?: string | null
          meta_desc_en?: string | null
          meta_desc_ja?: string | null
          meta_desc_ko?: string | null
          meta_desc_zh?: string | null
          meta_title_en?: string | null
          meta_title_ja?: string | null
          meta_title_ko?: string | null
          meta_title_zh?: string | null
          name?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_kz?: string | null
          name_ru?: string | null
          name_zh?: string | null
          naver_place_id?: string | null
          offers_auto_fail_reason?: string | null
          offers_auto_failed_at?: string | null
          offers_auto_skip?: boolean
          operating_hours?: Json | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          slug?: string | null
          slug_en?: string | null
          slug_ja?: string | null
          slug_ko?: string | null
          slug_zh?: string | null
          source_unique_id?: string | null
          specialties?: string[]
          supported_languages?: string[]
          tags?: string[]
          thumbnail?: string | null
          thumbnail_image?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          address_en?: string | null
          address_ja?: string | null
          address_ko?: string | null
          address_zh?: string | null
          amenities?: string[]
          annual_surgery_count?: number | null
          certifications?: string[] | null
          contact_email?: string | null
          created_at?: string | null
          data_source?: string | null
          description?: string | null
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          display_order?: number | null
          doctor_count?: number | null
          doctor_profile?: Json | null
          enrichment_log?: Json | null
          establishment_date?: string | null
          external_ratings?: Json | null
          faq?: Json
          gallery_images?: string[] | null
          google_maps_url?: string | null
          google_place_id?: string | null
          i18n?: Json | null
          id?: string
          images?: string[] | null
          insurance_accepted?: boolean | null
          insurance_details?: Json | null
          is_active?: boolean
          is_partner?: boolean
          is_published?: boolean
          last_crawled_at?: string | null
          latitude?: number | null
          location_en?: string | null
          location_ja?: string | null
          location_kr?: string | null
          location_zh?: string | null
          longitude?: number | null
          medical_equipment?: string[] | null
          medical_institution_grade?: string | null
          meta_desc_en?: string | null
          meta_desc_ja?: string | null
          meta_desc_ko?: string | null
          meta_desc_zh?: string | null
          meta_title_en?: string | null
          meta_title_ja?: string | null
          meta_title_ko?: string | null
          meta_title_zh?: string | null
          name?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_kz?: string | null
          name_ru?: string | null
          name_zh?: string | null
          naver_place_id?: string | null
          offers_auto_fail_reason?: string | null
          offers_auto_failed_at?: string | null
          offers_auto_skip?: boolean
          operating_hours?: Json | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          slug?: string | null
          slug_en?: string | null
          slug_ja?: string | null
          slug_ko?: string | null
          slug_zh?: string | null
          source_unique_id?: string | null
          specialties?: string[]
          supported_languages?: string[]
          tags?: string[]
          thumbnail?: string | null
          thumbnail_image?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          access_log: Json
          agency_id: string | null
          ai_chat_thread_id: string | null
          attachment: string | null
          attachments: Json
          cancer_type: string | null
          case_status: string | null
          case_status_note: string | null
          case_status_updated_at: string | null
          case_substeps: Json | null
          contact_id: string | null
          contact_method: string | null
          coordinator_brief: string | null
          coordinator_brief_sig: string | null
          created_at: string
          email: string | null
          encrypted_contact: Json | null
          encrypted_email: Json | null
          encrypted_name: Json | null
          encryption_version: number | null
          first_name: string | null
          follow_ups: Json | null
          followup_started_at: string | null
          icd_code: string | null
          icd_code_updated_at: string | null
          icd_code_updated_by: string | null
          id: number
          info_requested_at: string | null
          insurance_coverage: string | null
          insurance_policy_no_encrypted: string | null
          insurance_provider: string | null
          insurance_status: string | null
          intake: Json
          intake_data: Json
          intake_step: string | null
          is_test: boolean
          landing_path: string | null
          last_name: string | null
          lead_quality: string | null
          lead_quality_factors: Json | null
          lead_quality_score: number | null
          lead_tags: Json
          match_accuracy: number | null
          message: string | null
          nationality: string | null
          outcome: string | null
          outcome_note: string | null
          outcome_updated_at: string | null
          outcome_updated_by: string | null
          phone: string | null
          preferred_date: string | null
          preferred_date_flex: boolean
          preferred_language: string | null
          priority_score: number | null
          public_token: string
          public_token_rotated_at: string | null
          quality_evaluated_at: string | null
          quality_signals: Json
          referrer_host: string | null
          short_memo: string | null
          source: string | null
          source_locale: string | null
          spoken_language: string | null
          status: string | null
          status_reason: string | null
          status_updated_at: string | null
          step1_completed_at: string | null
          step2_completed_at: string | null
          treatment_type: string | null
          user_id: string | null
          utm: Json | null
        }
        Insert: {
          access_log?: Json
          agency_id?: string | null
          ai_chat_thread_id?: string | null
          attachment?: string | null
          attachments?: Json
          cancer_type?: string | null
          case_status?: string | null
          case_status_note?: string | null
          case_status_updated_at?: string | null
          case_substeps?: Json | null
          contact_id?: string | null
          contact_method?: string | null
          coordinator_brief?: string | null
          coordinator_brief_sig?: string | null
          created_at?: string
          email?: string | null
          encrypted_contact?: Json | null
          encrypted_email?: Json | null
          encrypted_name?: Json | null
          encryption_version?: number | null
          first_name?: string | null
          follow_ups?: Json | null
          followup_started_at?: string | null
          icd_code?: string | null
          icd_code_updated_at?: string | null
          icd_code_updated_by?: string | null
          id?: never
          info_requested_at?: string | null
          insurance_coverage?: string | null
          insurance_policy_no_encrypted?: string | null
          insurance_provider?: string | null
          insurance_status?: string | null
          intake?: Json
          intake_data?: Json
          intake_step?: string | null
          is_test?: boolean
          landing_path?: string | null
          last_name?: string | null
          lead_quality?: string | null
          lead_quality_factors?: Json | null
          lead_quality_score?: number | null
          lead_tags?: Json
          match_accuracy?: number | null
          message?: string | null
          nationality?: string | null
          outcome?: string | null
          outcome_note?: string | null
          outcome_updated_at?: string | null
          outcome_updated_by?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_date_flex?: boolean
          preferred_language?: string | null
          priority_score?: number | null
          public_token?: string
          public_token_rotated_at?: string | null
          quality_evaluated_at?: string | null
          quality_signals?: Json
          referrer_host?: string | null
          short_memo?: string | null
          source?: string | null
          source_locale?: string | null
          spoken_language?: string | null
          status?: string | null
          status_reason?: string | null
          status_updated_at?: string | null
          step1_completed_at?: string | null
          step2_completed_at?: string | null
          treatment_type?: string | null
          user_id?: string | null
          utm?: Json | null
        }
        Update: {
          access_log?: Json
          agency_id?: string | null
          ai_chat_thread_id?: string | null
          attachment?: string | null
          attachments?: Json
          cancer_type?: string | null
          case_status?: string | null
          case_status_note?: string | null
          case_status_updated_at?: string | null
          case_substeps?: Json | null
          contact_id?: string | null
          contact_method?: string | null
          coordinator_brief?: string | null
          coordinator_brief_sig?: string | null
          created_at?: string
          email?: string | null
          encrypted_contact?: Json | null
          encrypted_email?: Json | null
          encrypted_name?: Json | null
          encryption_version?: number | null
          first_name?: string | null
          follow_ups?: Json | null
          followup_started_at?: string | null
          icd_code?: string | null
          icd_code_updated_at?: string | null
          icd_code_updated_by?: string | null
          id?: never
          info_requested_at?: string | null
          insurance_coverage?: string | null
          insurance_policy_no_encrypted?: string | null
          insurance_provider?: string | null
          insurance_status?: string | null
          intake?: Json
          intake_data?: Json
          intake_step?: string | null
          is_test?: boolean
          landing_path?: string | null
          last_name?: string | null
          lead_quality?: string | null
          lead_quality_factors?: Json | null
          lead_quality_score?: number | null
          lead_tags?: Json
          match_accuracy?: number | null
          message?: string | null
          nationality?: string | null
          outcome?: string | null
          outcome_note?: string | null
          outcome_updated_at?: string | null
          outcome_updated_by?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_date_flex?: boolean
          preferred_language?: string | null
          priority_score?: number | null
          public_token?: string
          public_token_rotated_at?: string | null
          quality_evaluated_at?: string | null
          quality_signals?: Json
          referrer_host?: string | null
          short_memo?: string | null
          source?: string | null
          source_locale?: string | null
          spoken_language?: string | null
          status?: string | null
          status_reason?: string | null
          status_updated_at?: string | null
          step1_completed_at?: string | null
          step2_completed_at?: string | null
          treatment_type?: string | null
          user_id?: string | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_ai_chat_thread_id_fkey"
            columns: ["ai_chat_thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          inquiry_id: number | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          inquiry_id?: number | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          inquiry_id?: number | null
          metadata?: Json | null
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          computed_at: string | null
          countries: Json | null
          follow_up_count: number | null
          patient_attraction_count: number | null
          pre_consultation_count: number | null
          satisfaction_avg: number | null
          satisfaction_response_count: number | null
          snapshot_date: string
          unique_patients_count: number | null
        }
        Insert: {
          computed_at?: string | null
          countries?: Json | null
          follow_up_count?: number | null
          patient_attraction_count?: number | null
          pre_consultation_count?: number | null
          satisfaction_avg?: number | null
          satisfaction_response_count?: number | null
          snapshot_date: string
          unique_patients_count?: number | null
        }
        Update: {
          computed_at?: string | null
          countries?: Json | null
          follow_up_count?: number | null
          patient_attraction_count?: number | null
          pre_consultation_count?: number | null
          satisfaction_avg?: number | null
          satisfaction_response_count?: number | null
          snapshot_date?: string
          unique_patients_count?: number | null
        }
        Relationships: []
      }
      normalized_inquiries: {
        Row: {
          client_meta: Json | null
          constraints: Json
          contact: Json | null
          country: string | null
          created_at: string
          deleted_at: string | null
          extraction_confidence: number | null
          id: string
          landing_path: string | null
          language: string
          missing_fields: string[] | null
          objective: string | null
          raw_message: string | null
          referrer: string | null
          source_inquiry_id: number | null
          source_type: string
          treatment_id: string | null
          treatment_slug: string | null
          utm: Json | null
        }
        Insert: {
          client_meta?: Json | null
          constraints?: Json
          contact?: Json | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          extraction_confidence?: number | null
          id?: string
          landing_path?: string | null
          language: string
          missing_fields?: string[] | null
          objective?: string | null
          raw_message?: string | null
          referrer?: string | null
          source_inquiry_id?: number | null
          source_type: string
          treatment_id?: string | null
          treatment_slug?: string | null
          utm?: Json | null
        }
        Update: {
          client_meta?: Json | null
          constraints?: Json
          contact?: Json | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          extraction_confidence?: number | null
          id?: string
          landing_path?: string | null
          language?: string
          missing_fields?: string[] | null
          objective?: string | null
          raw_message?: string | null
          referrer?: string | null
          source_inquiry_id?: number | null
          source_type?: string
          treatment_id?: string | null
          treatment_slug?: string | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "normalized_inquiries_source_inquiry_id_fkey"
            columns: ["source_inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_inquiries_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      note_translations: {
        Row: {
          created_at: string
          id: number
          model: string | null
          source_hash: string
          source_lang: string | null
          target_lang: string
          translated: string
        }
        Insert: {
          created_at?: string
          id?: never
          model?: string | null
          source_hash: string
          source_lang?: string | null
          target_lang: string
          translated: string
        }
        Update: {
          created_at?: string
          id?: never
          model?: string | null
          source_hash?: string
          source_lang?: string | null
          target_lang?: string
          translated?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          link: string | null
          payload: Json | null
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          payload?: Json | null
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          payload?: Json | null
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opinion_requests: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          inquiry_id: number
          note: string | null
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          inquiry_id: number
          note?: string | null
          revoked?: boolean
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          inquiry_id?: number
          note?: string | null
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_requests_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_branches: {
        Row: {
          address_en: string | null
          address_ko: string | null
          branch_code: string
          created_at: string
          display_order: number
          i18n: Json
          id: string
          name_en: string | null
          name_ko: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address_en?: string | null
          address_ko?: string | null
          branch_code: string
          created_at?: string
          display_order?: number
          i18n?: Json
          id?: string
          name_en?: string | null
          name_ko: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address_en?: string | null
          address_ko?: string | null
          branch_code?: string
          created_at?: string
          display_order?: number
          i18n?: Json
          id?: string
          name_en?: string | null
          name_ko?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_doctors: {
        Row: {
          activities: string[]
          branch_id: string
          career: string[]
          created_at: string
          display_order: number
          education: string[]
          i18n: Json
          id: string
          is_active: boolean
          keywords: string[]
          listing_photo_url: string | null
          name_en: string | null
          name_ko: string
          photo_url: string | null
          position_en: string | null
          position_ko: string | null
          publications: string[]
          subspecialty: string | null
          updated_at: string
        }
        Insert: {
          activities?: string[]
          branch_id: string
          career?: string[]
          created_at?: string
          display_order?: number
          education?: string[]
          i18n?: Json
          id?: string
          is_active?: boolean
          keywords?: string[]
          listing_photo_url?: string | null
          name_en?: string | null
          name_ko: string
          photo_url?: string | null
          position_en?: string | null
          position_ko?: string | null
          publications?: string[]
          subspecialty?: string | null
          updated_at?: string
        }
        Update: {
          activities?: string[]
          branch_id?: string
          career?: string[]
          created_at?: string
          display_order?: number
          education?: string[]
          i18n?: Json
          id?: string
          is_active?: boolean
          keywords?: string[]
          listing_photo_url?: string | null
          name_en?: string | null
          name_ko?: string
          photo_url?: string | null
          position_en?: string | null
          position_ko?: string | null
          publications?: string[]
          subspecialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_doctors_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "partner_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_outreach: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          first_contact_at: string | null
          id: string
          last_contact_at: string | null
          next_followup_at: string | null
          notes: string | null
          org_name: string
          org_type: string | null
          priority: number
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          first_contact_at?: string | null
          id?: string
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          org_name: string
          org_type?: string | null
          priority?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          first_contact_at?: string | null
          id?: string
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          org_name?: string
          org_type?: string | null
          priority?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_visa_checklist: {
        Row: {
          checked: Json
          updated_at: string
          user_id: string
          visa_type: string
        }
        Insert: {
          checked?: Json
          updated_at?: string
          user_id: string
          visa_type: string
        }
        Update: {
          checked?: Json
          updated_at?: string
          user_id?: string
          visa_type?: string
        }
        Relationships: []
      }
      playbook_patterns: {
        Row: {
          ab_bucket: string | null
          approved_at: string | null
          approved_by: string | null
          auto_parent_id: string | null
          auto_score: number
          auto_status: string
          auto_version: number
          canonical_id: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          key_questions: string[]
          language: string
          last_auto_action_at: string | null
          last_evaluated_at: string | null
          merged_at: string | null
          merged_by: string | null
          metadata: Json
          quality_gate: Json
          quality_score: number
          rag_document_id: string | null
          reject_reason: string | null
          response_structure: Json
          response_template: string
          safety_notes: string[]
          scope: string
          source_message_ids: string[]
          source_thread_id: string | null
          status: string
          traffic_split: number
          treatment_slug: string | null
          trigger: Json
          updated_at: string
          usage_count: number
          user_intent: string
        }
        Insert: {
          ab_bucket?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_parent_id?: string | null
          auto_score?: number
          auto_status?: string
          auto_version?: number
          canonical_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_questions?: string[]
          language?: string
          last_auto_action_at?: string | null
          last_evaluated_at?: string | null
          merged_at?: string | null
          merged_by?: string | null
          metadata?: Json
          quality_gate?: Json
          quality_score?: number
          rag_document_id?: string | null
          reject_reason?: string | null
          response_structure?: Json
          response_template?: string
          safety_notes?: string[]
          scope?: string
          source_message_ids?: string[]
          source_thread_id?: string | null
          status?: string
          traffic_split?: number
          treatment_slug?: string | null
          trigger?: Json
          updated_at?: string
          usage_count?: number
          user_intent: string
        }
        Update: {
          ab_bucket?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_parent_id?: string | null
          auto_score?: number
          auto_status?: string
          auto_version?: number
          canonical_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_questions?: string[]
          language?: string
          last_auto_action_at?: string | null
          last_evaluated_at?: string | null
          merged_at?: string | null
          merged_by?: string | null
          metadata?: Json
          quality_gate?: Json
          quality_score?: number
          rag_document_id?: string | null
          reject_reason?: string | null
          response_structure?: Json
          response_template?: string
          safety_notes?: string[]
          scope?: string
          source_message_ids?: string[]
          source_thread_id?: string | null
          status?: string
          traffic_split?: number
          treatment_slug?: string | null
          trigger?: Json
          updated_at?: string
          usage_count?: number
          user_intent?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_patterns_auto_parent_id_fkey"
            columns: ["auto_parent_id"]
            isOneToOne: false
            referencedRelation: "playbook_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_patterns_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "playbook_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_patterns_rag_document_id_fkey"
            columns: ["rag_document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_patterns_source_thread_id_fkey"
            columns: ["source_thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_responses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          case_tags: string[]
          created_at: string
          id: string
          language: string
          metadata: Json
          normalized_inquiry_id: string | null
          quality_score: number
          rag_document_id: string | null
          response_text_raw: string
          response_text_sanitized: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          case_tags?: string[]
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          normalized_inquiry_id?: string | null
          quality_score?: number
          rag_document_id?: string | null
          response_text_raw: string
          response_text_sanitized: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          case_tags?: string[]
          created_at?: string
          id?: string
          language?: string
          metadata?: Json
          normalized_inquiry_id?: string | null
          quality_score?: number
          rag_document_id?: string | null
          response_text_raw?: string
          response_text_sanitized?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_responses_normalized_inquiry_id_fkey"
            columns: ["normalized_inquiry_id"]
            isOneToOne: false
            referencedRelation: "normalized_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_responses_rag_document_id_fkey"
            columns: ["rag_document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_usage_events: {
        Row: {
          created_at: string
          handoff_requested: boolean
          id: string
          language: string
          latency_ms: number | null
          message_id: string | null
          metadata: Json
          model: string | null
          query_len: number
          query_text_hash: string
          rag_scoring: string | null
          retrieved_count: number
          retrieved_pattern_ids: string[]
          thread_id: string | null
          used: boolean
          used_pattern_id: string | null
        }
        Insert: {
          created_at?: string
          handoff_requested?: boolean
          id?: string
          language?: string
          latency_ms?: number | null
          message_id?: string | null
          metadata?: Json
          model?: string | null
          query_len?: number
          query_text_hash?: string
          rag_scoring?: string | null
          retrieved_count?: number
          retrieved_pattern_ids?: string[]
          thread_id?: string | null
          used?: boolean
          used_pattern_id?: string | null
        }
        Update: {
          created_at?: string
          handoff_requested?: boolean
          id?: string
          language?: string
          latency_ms?: number | null
          message_id?: string | null
          metadata?: Json
          model?: string | null
          query_len?: number
          query_text_hash?: string
          rag_scoring?: string | null
          retrieved_count?: number
          retrieved_pattern_ids?: string[]
          thread_id?: string | null
          used?: boolean
          used_pattern_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_usage_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_usage_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_records: {
        Row: {
          agency_id: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          id: number
          inquiry_id: number
          note: string | null
          record_type: string
          storage_path: string | null
          uploader_role: string
          uploader_user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: number
          inquiry_id: number
          note?: string | null
          record_type?: string
          storage_path?: string | null
          uploader_role?: string
          uploader_user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: number
          inquiry_id?: number
          note?: string | null
          record_type?: string
          storage_path?: string | null
          uploader_role?: string
          uploader_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_records_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_chunks: {
        Row: {
          chunk_index: number | null
          content: string | null
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          token_count: number | null
        }
        Insert: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          checksum: string | null
          chunk_count: number | null
          content: string | null
          created_at: string | null
          embedding_model: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          lang: string | null
          last_ingested_at: string | null
          metadata: Json | null
          source_id: string | null
          source_label: string | null
          source_type: string
          source_url: string | null
          title: string | null
          trust_tier: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          checksum?: string | null
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          lang?: string | null
          last_ingested_at?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_label?: string | null
          source_type: string
          source_url?: string | null
          title?: string | null
          trust_tier?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          checksum?: string | null
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          lang?: string | null
          last_ingested_at?: string | null
          metadata?: Json | null
          source_id?: string | null
          source_label?: string | null
          source_type?: string
          source_url?: string | null
          title?: string | null
          trust_tier?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      rag_query_events: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          lang: string | null
          latency_ms: number | null
          message_id: string | null
          query_text_hash: string | null
          result_count: number | null
          source: string
          status: string
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          lang?: string | null
          latency_ms?: number | null
          message_id?: string | null
          query_text_hash?: string | null
          result_count?: number | null
          source: string
          status: string
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          lang?: string | null
          latency_ms?: number | null
          message_id?: string | null
          query_text_hash?: string | null
          result_count?: number | null
          source?: string
          status?: string
          thread_id?: string | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      reminders_scheduled: {
        Row: {
          attempts: number | null
          channel: string
          consultation_session_id: string | null
          created_at: string | null
          fire_at: string
          id: string
          last_error: string | null
          payload: Json | null
          recipient_address: string | null
          recipient_user_id: string | null
          reminder_type: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          channel: string
          consultation_session_id?: string | null
          created_at?: string | null
          fire_at: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          recipient_address?: string | null
          recipient_user_id?: string | null
          reminder_type: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          channel?: string
          consultation_session_id?: string | null
          created_at?: string | null
          fire_at?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          recipient_address?: string | null
          recipient_user_id?: string | null
          reminder_type?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_scheduled_consultation_session_id_fkey"
            columns: ["consultation_session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          country: string | null
          created_at: string
          helpful_count: number
          id: string
          rating: number | null
          treatment_id: string | null
          user_name: string | null
        }
        Insert: {
          content?: string | null
          country?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          rating?: number | null
          treatment_id?: string | null
          user_name?: string | null
        }
        Update: {
          content?: string | null
          country?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          rating?: number | null
          treatment_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          hero_background_url: string | null
          id: string
          key: string
          logo_url: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          hero_background_url?: string | null
          id?: string
          key: string
          logo_url?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          hero_background_url?: string | null
          id?: string
          key?: string
          logo_url?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      staff_requests: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          reply: string | null
          resolved_at: string | null
          screen_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          reply?: string | null
          resolved_at?: string | null
          screen_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          reply?: string | null
          resolved_at?: string | null
          screen_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          comment: string | null
          id: string
          ip_hash: string | null
          q1_score: number | null
          q2_score: number | null
          q3_score: number | null
          q4_score: number | null
          q5_score: number | null
          submitted_at: string | null
          survey_id: string
          user_agent: string | null
        }
        Insert: {
          comment?: string | null
          id?: string
          ip_hash?: string | null
          q1_score?: number | null
          q2_score?: number | null
          q3_score?: number | null
          q4_score?: number | null
          q5_score?: number | null
          submitted_at?: string | null
          survey_id: string
          user_agent?: string | null
        }
        Update: {
          comment?: string | null
          id?: string
          ip_hash?: string | null
          q1_score?: number | null
          q2_score?: number | null
          q3_score?: number | null
          q4_score?: number | null
          q5_score?: number | null
          submitted_at?: string | null
          survey_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          consultation_session_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          inquiry_id: number | null
          patient_id: string | null
          reminder_sent_at: string | null
          responded: boolean | null
          sent_at: string | null
          survey_type: string
          token: string
        }
        Insert: {
          consultation_session_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          inquiry_id?: number | null
          patient_id?: string | null
          reminder_sent_at?: string | null
          responded?: boolean | null
          sent_at?: string | null
          survey_type?: string
          token: string
        }
        Update: {
          consultation_session_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          inquiry_id?: number | null
          patient_id?: string | null
          reminder_sent_at?: string | null
          responded?: boolean | null
          sent_at?: string | null
          survey_type?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_consultation_session_id_fkey"
            columns: ["consultation_session_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          data: Json | null
          detected_at: string | null
          detected_by: string | null
          id: string
          inquiry_id: number | null
          patient_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          symptom_entry_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          data?: Json | null
          detected_at?: string | null
          detected_by?: string | null
          id?: string
          inquiry_id?: number | null
          patient_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          symptom_entry_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          data?: Json | null
          detected_at?: string | null
          detected_by?: string | null
          id?: string
          inquiry_id?: number | null
          patient_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          symptom_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_alerts_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_reports: {
        Row: {
          action_taken: string | null
          ai_assessment: string | null
          ai_risk_score: number | null
          created_at: string | null
          followup_id: string | null
          human_notes: string | null
          human_reviewed: boolean | null
          human_reviewer_id: string | null
          id: string
          inquiry_id: number | null
          patient_user_id: string | null
          report_type: string | null
          symptoms: Json
        }
        Insert: {
          action_taken?: string | null
          ai_assessment?: string | null
          ai_risk_score?: number | null
          created_at?: string | null
          followup_id?: string | null
          human_notes?: string | null
          human_reviewed?: boolean | null
          human_reviewer_id?: string | null
          id?: string
          inquiry_id?: number | null
          patient_user_id?: string | null
          report_type?: string | null
          symptoms: Json
        }
        Update: {
          action_taken?: string | null
          ai_assessment?: string | null
          ai_risk_score?: number | null
          created_at?: string | null
          followup_id?: string | null
          human_notes?: string | null
          human_reviewed?: boolean | null
          human_reviewer_id?: string | null
          id?: string
          inquiry_id?: number | null
          patient_user_id?: string | null
          report_type?: string | null
          symptoms?: Json
        }
        Relationships: [
          {
            foreignKeyName: "symptom_reports_followup_id_fkey"
            columns: ["followup_id"]
            isOneToOne: false
            referencedRelation: "followup_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_cost_benchmarks: {
        Row: {
          cancer_type: string
          confidence: string | null
          created_at: string | null
          id: string
          max_krw: number
          max_usd: number | null
          median_krw: number
          median_usd: number | null
          min_krw: number
          min_usd: number | null
          notes: string | null
          procedures: Json | null
          sample_size: number | null
          source: string | null
          stage: string
          treatment_phase: string
          updated_at: string | null
        }
        Insert: {
          cancer_type: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          max_krw: number
          max_usd?: number | null
          median_krw: number
          median_usd?: number | null
          min_krw: number
          min_usd?: number | null
          notes?: string | null
          procedures?: Json | null
          sample_size?: number | null
          source?: string | null
          stage: string
          treatment_phase: string
          updated_at?: string | null
        }
        Update: {
          cancer_type?: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          max_krw?: number
          max_usd?: number | null
          median_krw?: number
          median_usd?: number | null
          min_krw?: number
          min_usd?: number | null
          notes?: string | null
          procedures?: Json | null
          sample_size?: number | null
          source?: string | null
          stage?: string
          treatment_phase?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      treatment_sources: {
        Row: {
          captured_at: string
          created_at: string | null
          evidence: Json
          extracted_data: Json | null
          hospital_id: string | null
          id: string
          source_type: string | null
          source_url: string | null
          sources: Json
          treatment_id: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          captured_at?: string
          created_at?: string | null
          evidence?: Json
          extracted_data?: Json | null
          hospital_id?: string | null
          id?: string
          source_type?: string | null
          source_url?: string | null
          sources?: Json
          treatment_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          captured_at?: string
          created_at?: string | null
          evidence?: Json
          extracted_data?: Json | null
          hospital_id?: string | null
          id?: string
          source_type?: string | null
          source_url?: string | null
          sources?: Json
          treatment_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_sources_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_sources_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          benefits: string[]
          created_at: string | null
          currency: string | null
          description: string | null
          description_en: string | null
          description_ja: string | null
          description_ko: string | null
          description_zh: string | null
          display_order: number | null
          duration: string | null
          full_description: string | null
          full_description_en: string | null
          full_description_ja: string | null
          full_description_ko: string | null
          full_description_zh: string | null
          hospital_id: string | null
          i18n: Json | null
          id: string
          images: string[] | null
          is_published: boolean
          meta_desc_en: string | null
          meta_desc_ja: string | null
          meta_desc_ko: string | null
          meta_desc_zh: string | null
          meta_title_en: string | null
          meta_title_ja: string | null
          meta_title_ko: string | null
          meta_title_zh: string | null
          name: string | null
          name_en: string | null
          name_ja: string | null
          name_ko: string | null
          name_zh: string | null
          preparation: string | null
          price_max: number | null
          price_min: number | null
          recovery_time: string | null
          risks: string | null
          slug: string | null
          slug_en: string | null
          slug_ja: string | null
          slug_ko: string | null
          slug_zh: string | null
          tags: string[]
          updated_at: string | null
        }
        Insert: {
          benefits?: string[]
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          display_order?: number | null
          duration?: string | null
          full_description?: string | null
          full_description_en?: string | null
          full_description_ja?: string | null
          full_description_ko?: string | null
          full_description_zh?: string | null
          hospital_id?: string | null
          i18n?: Json | null
          id?: string
          images?: string[] | null
          is_published?: boolean
          meta_desc_en?: string | null
          meta_desc_ja?: string | null
          meta_desc_ko?: string | null
          meta_desc_zh?: string | null
          meta_title_en?: string | null
          meta_title_ja?: string | null
          meta_title_ko?: string | null
          meta_title_zh?: string | null
          name?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_zh?: string | null
          preparation?: string | null
          price_max?: number | null
          price_min?: number | null
          recovery_time?: string | null
          risks?: string | null
          slug?: string | null
          slug_en?: string | null
          slug_ja?: string | null
          slug_ko?: string | null
          slug_zh?: string | null
          tags?: string[]
          updated_at?: string | null
        }
        Update: {
          benefits?: string[]
          created_at?: string | null
          currency?: string | null
          description?: string | null
          description_en?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_zh?: string | null
          display_order?: number | null
          duration?: string | null
          full_description?: string | null
          full_description_en?: string | null
          full_description_ja?: string | null
          full_description_ko?: string | null
          full_description_zh?: string | null
          hospital_id?: string | null
          i18n?: Json | null
          id?: string
          images?: string[] | null
          is_published?: boolean
          meta_desc_en?: string | null
          meta_desc_ja?: string | null
          meta_desc_ko?: string | null
          meta_desc_zh?: string | null
          meta_title_en?: string | null
          meta_title_ja?: string | null
          meta_title_ko?: string | null
          meta_title_zh?: string | null
          name?: string | null
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string | null
          name_zh?: string | null
          preparation?: string | null
          price_max?: number | null
          price_min?: number | null
          recovery_time?: string | null
          risks?: string | null
          slug?: string | null
          slug_en?: string | null
          slug_ja?: string | null
          slug_ko?: string | null
          slug_zh?: string | null
          tags?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          language_preference: string | null
          organization_id: string | null
          organization_name: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_preference?: string | null
          organization_id?: string | null
          organization_name?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language_preference?: string | null
          organization_id?: string | null
          organization_name?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visa_applications: {
        Row: {
          consultation_id: string | null
          coordinator_notes_encrypted: string | null
          coordinator_user_id: string | null
          created_at: string | null
          duration_days: number | null
          embassy_decision_date: string | null
          embassy_submission_date: string | null
          hospital_id: string | null
          id: string
          intake_id: string | null
          invitation_issued_at: string | null
          invitation_issued_by: string | null
          invitation_letter_url: string | null
          nationality: string
          patient_user_id: string
          planned_arrival_date: string | null
          planned_departure_date: string | null
          purpose: string | null
          status: string
          updated_at: string | null
          visa_number: string | null
          visa_type: string
        }
        Insert: {
          consultation_id?: string | null
          coordinator_notes_encrypted?: string | null
          coordinator_user_id?: string | null
          created_at?: string | null
          duration_days?: number | null
          embassy_decision_date?: string | null
          embassy_submission_date?: string | null
          hospital_id?: string | null
          id?: string
          intake_id?: string | null
          invitation_issued_at?: string | null
          invitation_issued_by?: string | null
          invitation_letter_url?: string | null
          nationality: string
          patient_user_id: string
          planned_arrival_date?: string | null
          planned_departure_date?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string | null
          visa_number?: string | null
          visa_type: string
        }
        Update: {
          consultation_id?: string | null
          coordinator_notes_encrypted?: string | null
          coordinator_user_id?: string | null
          created_at?: string | null
          duration_days?: number | null
          embassy_decision_date?: string | null
          embassy_submission_date?: string | null
          hospital_id?: string | null
          id?: string
          intake_id?: string | null
          invitation_issued_at?: string | null
          invitation_issued_by?: string | null
          invitation_letter_url?: string | null
          nationality?: string
          patient_user_id?: string
          planned_arrival_date?: string | null
          planned_departure_date?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string | null
          visa_number?: string | null
          visa_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applications_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_applications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_applications_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "cancer_patient_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_documents: {
        Row: {
          application_id: string
          created_at: string | null
          document_label: string | null
          document_type: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          document_label?: string | null
          document_type: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          document_label?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "visa_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string | null
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "visa_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_notes: {
        Row: {
          ask_next: Json
          byte_size: number | null
          created_at: string
          created_by: string | null
          duration_sec: number | null
          fields: Json
          file_name: string
          glossary: Json
          id: string
          inquiry_id: number | null
          language: string | null
          source_label_encrypted: string | null
          storage_path: string
          summary_encrypted: string | null
          transcript_encrypted: string | null
          uncertain: Json
        }
        Insert: {
          ask_next?: Json
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          fields?: Json
          file_name: string
          glossary?: Json
          id?: string
          inquiry_id?: number | null
          language?: string | null
          source_label_encrypted?: string | null
          storage_path: string
          summary_encrypted?: string | null
          transcript_encrypted?: string | null
          uncertain?: Json
        }
        Update: {
          ask_next?: Json
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          fields?: Json
          file_name?: string
          glossary?: Json
          id?: string
          inquiry_id?: number | null
          language?: string | null
          source_label_encrypted?: string | null
          storage_path?: string
          summary_encrypted?: string | null
          transcript_encrypted?: string | null
          uncertain?: Json
        }
        Relationships: [
          {
            foreignKeyName: "voice_notes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_today_funnel_stats: {
        Row: {
          conversion_rate: number | null
          count: number | null
          stage: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      alert_counter_increment: {
        Args: { p_key: string; p_window_ms: number }
        Returns: number
      }
      alert_counter_reset: { Args: { p_key: string }; Returns: undefined }
      archive_old_audit_logs: {
        Args: { p_older_than_days?: number }
        Returns: number
      }
      chat_thread_merge_meta: {
        Args: { p_only_if_absent?: string; p_patch: Json; p_thread_id: string }
        Returns: number
      }
      check_rate_limit: {
        Args: { p_key: string; p_max_requests: number; p_window_ms: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_rate_limit_buckets: {
        Args: { p_older_than_ms?: number }
        Returns: number
      }
      conversion_funnel: {
        Args: {
          p_from: string
          p_include_test?: boolean
          p_nationality?: string
          p_to: string
        }
        Returns: {
          admitted: number
          followup: number
          lost: number
          pre_consult: number
          total_inquiries: number
          visa_or_quote: number
        }[]
      }
      conversion_funnel_by_arrival: {
        Args: {
          p_axis?: string
          p_from: string
          p_include_test?: boolean
          p_to: string
        }
        Returns: {
          admitted: number
          bucket: string
          followup: number
          pre_consult: number
          total: number
        }[]
      }
      conversion_funnel_by_country: {
        Args: { p_from: string; p_include_test?: boolean; p_to: string }
        Returns: {
          admitted: number
          followup: number
          nationality: string
          pre_consult: number
          total: number
        }[]
      }
      conversion_funnel_by_org: {
        Args: { p_from: string; p_include_test?: boolean; p_to: string }
        Returns: {
          completed: number
          followup: number
          hospital_id: string
          hospital_name: string
          kind: string
          pre_consult: number
          total_sessions: number
        }[]
      }
      conversion_funnel_by_source: {
        Args: { p_from: string; p_include_test?: boolean; p_to: string }
        Returns: {
          admitted: number
          followup: number
          pre_consult: number
          source: string
          total: number
        }[]
      }
      decrypt_text: {
        Args: { ciphertext: string; encryption_key: string }
        Returns: string
      }
      email_hash: { Args: { email: string }; Returns: string }
      encrypt_text: {
        Args: { encryption_key: string; plaintext: string }
        Returns: string
      }
      get_external_db_usage: { Args: never; Returns: Json }
      increment_pattern_usage: {
        Args: { p_pattern_id: string }
        Returns: undefined
      }
      io_top_queries: {
        Args: { row_limit?: number }
        Returns: {
          calls: number
          disk_read_blocks: number
          query_shape: string
          total_ms: number
        }[]
      }
      rag_health_aggregates: { Args: { p_since: string }; Returns: Json }
      rag_search_chunks_v1: {
        Args: {
          match_count?: number
          p_lang?: string
          p_source_type?: string
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          doc_lang: string
          doc_source_id: string
          doc_source_type: string
          doc_title: string
          document_id: string
          metadata: Json
          score: number
        }[]
      }
      rag_search_chunks_v1_1: {
        Args: {
          match_count?: number
          p_ab_enabled?: boolean
          p_lang?: string
          p_partner_only?: boolean
          p_source_type?: string
          p_thread_hash?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          doc_lang: string
          doc_source_id: string
          doc_source_type: string
          doc_title: string
          document_id: string
          metadata: Json
          similarity_score: number
          source_label: string
          source_url: string
          trust_tier: number
        }[]
      }
      update_recipient_stats: {
        Args: { p_recipient_id: string; p_success: boolean }
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
