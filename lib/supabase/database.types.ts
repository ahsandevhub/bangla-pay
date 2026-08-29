export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance_poisha: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["account_kind"]
          status: Database["public"]["Enums"]["wallet_status"]
          updated_at: string
          user_id: string | null
          wallet_number: string
        }
        Insert: {
          balance_poisha?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id?: string | null
          wallet_number: string
        }
        Update: {
          balance_poisha?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id?: string | null
          wallet_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fake_nid_records: {
        Row: {
          bangla_name: string
          created_at: string
          date_of_birth: string
          english_name: string
          id: string
          nid_number: string
        }
        Insert: {
          bangla_name: string
          created_at?: string
          date_of_birth: string
          english_name: string
          id?: string
          nid_number: string
        }
        Update: {
          bangla_name?: string
          created_at?: string
          date_of_birth?: string
          english_name?: string
          id?: string
          nid_number?: string
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          created_at: string
          document_path: string
          id: string
          nid_fingerprint: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["kyc_verification_status"]
          submitted_bangla_name: string | null
          submitted_date_of_birth: string
          submitted_english_name: string | null
          submitted_nid_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_path: string
          id?: string
          nid_fingerprint: string
          rejection_reason?: string | null
          status: Database["public"]["Enums"]["kyc_verification_status"]
          submitted_bangla_name?: string | null
          submitted_date_of_birth: string
          submitted_english_name?: string | null
          submitted_nid_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_path?: string
          id?: string
          nid_fingerprint?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["kyc_verification_status"]
          submitted_bangla_name?: string | null
          submitted_date_of_birth?: string
          submitted_english_name?: string | null
          submitted_nid_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount_poisha: number
          balance_after_poisha: number
          created_at: string
          direction: Database["public"]["Enums"]["ledger_direction"]
          id: number
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount_poisha: number
          balance_after_poisha: number
          created_at?: string
          direction: Database["public"]["Enums"]["ledger_direction"]
          id?: never
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount_poisha?: number
          balance_after_poisha?: number
          created_at?: string
          direction?: Database["public"]["Enums"]["ledger_direction"]
          id?: never
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      money_requests: {
        Row: {
          amount_poisha: number
          created_at: string
          expires_at: string
          id: string
          note: string | null
          payer_account_id: string
          requester_account_id: string
          settlement_transaction_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          amount_poisha: number
          created_at?: string
          expires_at: string
          id?: string
          note?: string | null
          payer_account_id: string
          requester_account_id: string
          settlement_transaction_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          amount_poisha?: number
          created_at?: string
          expires_at?: string
          id?: string
          note?: string | null
          payer_account_id?: string
          requester_account_id?: string
          settlement_transaction_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_requests_payer_account_id_fkey"
            columns: ["payer_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_requests_requester_account_id_fkey"
            columns: ["requester_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_requests_settlement_transaction_id_fkey"
            columns: ["settlement_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_challenges: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          inbox_token: string
          phone: string
          purpose: Database["public"]["Enums"]["otp_purpose"]
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          inbox_token?: string
          phone: string
          purpose: Database["public"]["Enums"]["otp_purpose"]
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          inbox_token?: string
          phone?: string
          purpose?: Database["public"]["Enums"]["otp_purpose"]
        }
        Relationships: []
      }
      pin_history: {
        Row: {
          created_at: string
          id: string
          pin_fingerprint: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_fingerprint: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_fingerprint?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bangla_name: string | null
          created_at: string
          english_name: string | null
          id: string
          phone: string
          status: Database["public"]["Enums"]["profile_kyc_status"]
          updated_at: string
        }
        Insert: {
          bangla_name?: string | null
          created_at?: string
          english_name?: string | null
          id: string
          phone: string
          status?: Database["public"]["Enums"]["profile_kyc_status"]
          updated_at?: string
        }
        Update: {
          bangla_name?: string | null
          created_at?: string
          english_name?: string | null
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["profile_kyc_status"]
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempt_count: number
          bucket_key: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          bucket_key: string
          window_start: string
        }
        Update: {
          attempt_count?: number
          bucket_key?: string
          window_start?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_profiles: {
        Row: {
          active_device_id: string | null
          active_session_id: string | null
          created_at: string
          pin_failed_attempts: number
          pin_locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_device_id?: string | null
          active_session_id?: string | null
          created_at?: string
          pin_failed_attempts?: number
          pin_locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_device_id?: string | null
          active_session_id?: string | null
          created_at?: string
          pin_failed_attempts?: number
          pin_locked_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_profiles_active_device_id_fkey"
            columns: ["active_device_id"]
            isOneToOne: false
            referencedRelation: "trusted_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_poisha: number
          created_at: string
          destination_account_id: string
          id: string
          idempotency_key: string
          note: string | null
          source_account_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount_poisha: number
          created_at?: string
          destination_account_id: string
          id?: string
          idempotency_key: string
          note?: string | null
          source_account_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount_poisha?: number
          created_at?: string
          destination_account_id?: string
          id?: string
          idempotency_key?: string
          note?: string | null
          source_account_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          trusted_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          trusted_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          trusted_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
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
      _move_money: {
        Args: {
          p_amount_poisha: number
          p_destination_account_id: string
          p_idempotency_key: string
          p_note: string
          p_source_account_id: string
          p_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: {
          amount_poisha: number
          created_at: string
          destination_account_id: string
          note: string
          replayed: boolean
          source_account_id: string
          transaction_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      _safe_uuid: { Args: { p_value: string }; Returns: string }
      activate_account_after_kyc: {
        Args: {
          p_document_path: string
          p_nid_fingerprint: string
          p_submitted_bangla_name: string
          p_submitted_date_of_birth: string
          p_submitted_english_name: string
          p_submitted_nid_number: string
        }
        Returns: {
          account_id: string
          balance_poisha: number
          status: Database["public"]["Enums"]["kyc_verification_status"]
          wallet_number: string
        }[]
      }
      assert_active_device: {
        Args: { p_device_token: string; p_user_id: string }
        Returns: undefined
      }
      assert_active_session: { Args: never; Returns: string }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      current_session_is_active: { Args: never; Returns: boolean }
      decline_request: {
        Args: { p_request_id: string }
        Returns: {
          amount_poisha: number
          created_at: string
          expires_at: string
          id: string
          note: string | null
          payer_account_id: string
          requester_account_id: string
          settlement_transaction_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "money_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_money_requests: { Args: never; Returns: number }
      settle_request: {
        Args: { p_device_token: string; p_request_id: string }
        Returns: {
          amount_poisha: number
          created_at: string
          destination_account_id: string
          note: string
          replayed: boolean
          source_account_id: string
          transaction_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      transfer_money: {
        Args: {
          p_amount_poisha: number
          p_destination_wallet: string
          p_device_token: string
          p_idempotency_key: string
          p_note: string
          p_transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: {
          amount_poisha: number
          created_at: string
          destination_account_id: string
          note: string
          replayed: boolean
          source_account_id: string
          transaction_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      verify_ledger_integrity: {
        Args: never
        Returns: {
          account_id: string
          cached_balance_poisha: number
          ledger_balance_poisha: number
          ok: boolean
        }[]
      }
    }
    Enums: {
      account_kind: "USER" | "SYSTEM"
      kyc_verification_status: "VERIFIED" | "REJECTED"
      ledger_direction: "DEBIT" | "CREDIT"
      otp_purpose: "REGISTRATION" | "DEVICE_LOGIN" | "PIN_CHANGE"
      profile_kyc_status: "PENDING_KYC" | "ACTIVE"
      request_status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
      transaction_status: "COMPLETED"
      transaction_type: "INITIAL_FUNDING" | "TRANSFER" | "REQUEST_SETTLEMENT"
      wallet_status: "ACTIVE" | "INACTIVE"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_kind: ["USER", "SYSTEM"],
      kyc_verification_status: ["VERIFIED", "REJECTED"],
      ledger_direction: ["DEBIT", "CREDIT"],
      otp_purpose: ["REGISTRATION", "DEVICE_LOGIN", "PIN_CHANGE"],
      profile_kyc_status: ["PENDING_KYC", "ACTIVE"],
      request_status: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"],
      transaction_status: ["COMPLETED"],
      transaction_type: ["INITIAL_FUNDING", "TRANSFER", "REQUEST_SETTLEMENT"],
      wallet_status: ["ACTIVE", "INACTIVE"],
    },
  },
} as const

