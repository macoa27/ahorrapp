// =============================================================
// AHORRAPP — src/types/database.ts
// Tipos TypeScript del schema de Supabase.
// GENERADO: supabase gen types typescript --project-id TU_ID > src/types/database.ts
// No editar manualmente. Regenerar con: npm run gen:types
// =============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          whatsapp_number: string | null
          whatsapp_verified: boolean
          gmail_connected: boolean
          gmail_refresh_token: string | null  // NUNCA exponer en API pública
          onboarding_completed: boolean
          timezone: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          icon: string
          color: string
          is_system: boolean
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          name: string
          last_four: string | null
          bank: string | null
          email_origin: string | null
          is_default: boolean
          color: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payment_methods']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payment_methods']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          merchant: string
          category_id: string | null
          payment_method_id: string | null
          date: string
          source: 'manual' | 'email' | 'whatsapp' | 'csv' | 'import'
          notes: string | null
          raw_email_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          alert_pct: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
      }
      whatsapp_sessions: {
        Row: {
          id: string
          user_id: string
          phone_number: string
          pending_data: Json
          expires_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['whatsapp_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['whatsapp_sessions']['Insert']>
      }
      schema_migrations: {
        Row: {
          version: string
          name: string
          applied_at: string
          checksum: string | null
        }
        Insert: Database['public']['Tables']['schema_migrations']['Row']
        Update: Partial<Database['public']['Tables']['schema_migrations']['Row']>
      }
    }
    Functions: {
      get_monthly_summary: {
        Args: { p_user_id: string; p_month: string }
        Returns: {
          category_id: string
          category_name: string
          category_icon: string
          category_color: string
          total: number
          tx_count: number
          budget_amount: number | null
          budget_pct: number | null
        }[]
      }
    }
  }
}

// ─── TIPOS DE APLICACIÓN ────────────────────────────────────
// Tipos derivados para uso en componentes y API routes

export type Profile = Database['public']['Tables']['profiles']['Row']
// Nunca exponer gmail_refresh_token al cliente
export type PublicProfile = Omit<Profile, 'gmail_refresh_token'>

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export type Category = Database['public']['Tables']['categories']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']

export type TransactionSource = Transaction['source']

export type MonthlySummary = Database['public']['Functions']['get_monthly_summary']['Returns'][0]

// ─── TIPOS DE API ─────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface DashboardData {
  month: string
  totalSpent: number
  txCount: number
  avgTicket: number
  totalBudget: number
  budgetUsedPct: number
  byCategory: MonthlySummary[]
  monthlyEvolution: { month: string; total: number }[]
  recentTransactions: Transaction[]
}

// ─── VALIDACIÓN ──────────────────────────────────────────
// Para usar con zod en las API routes
export const TRANSACTION_SOURCES: TransactionSource[] = [
  'manual', 'email', 'whatsapp', 'csv', 'import'
]