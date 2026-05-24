// Manually maintained DB types (mirrors supabase/schema.sql).
// Once you have Supabase credentials, replace with:
//   npx supabase gen types typescript --project-id <id> > lib/database.types.ts

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string; role: string; phone: string | null; cnic: string | null; address: string | null; created_at: string; updated_at: string };
        Insert: { id: string; name: string; role?: string; phone?: string; cnic?: string; address?: string; created_at?: string; updated_at?: string };
        Update: { name?: string; role?: string; phone?: string; cnic?: string; address?: string; updated_at?: string };
      };
      graves: {
        Row: { id: string; grave_number: string; section: string; row: number; grave_col: number; latitude: number | null; longitude: number | null; status: string; size: string; price: number; occupied_by: string | null; burial_id: string | null; last_maintenance_date: string | null; notes: string | null; created_at: string };
        Insert: { id: string; grave_number: string; section: string; row: number; grave_col: number; latitude?: number; longitude?: number; status?: string; size?: string; price: number; occupied_by?: string; burial_id?: string; last_maintenance_date?: string; notes?: string; created_at?: string };
        Update: { grave_number?: string; section?: string; row?: number; grave_col?: number; latitude?: number; longitude?: number; status?: string; size?: string; price?: number; occupied_by?: string | null; burial_id?: string | null; last_maintenance_date?: string | null; notes?: string };
      };
      burials: {
        Row: { id: string; grave_id: string; deceased: Record<string, unknown>; burial_date: string; burial_time: string; conducted_by: string | null; status: string; notes: string | null; booking_user_id: string; qr_code: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; grave_id: string; deceased: Record<string, unknown>; burial_date: string; burial_time: string; conducted_by?: string; status?: string; notes?: string; booking_user_id: string; qr_code?: string; created_at?: string; updated_at?: string };
        Update: { grave_id?: string; deceased?: Record<string, unknown>; burial_date?: string; burial_time?: string; conducted_by?: string; status?: string; notes?: string; booking_user_id?: string; updated_at?: string };
      };
      payments: {
        Row: { id: string; burial_id: string; grave_id: string; user_id: string; amount: number; method: string; status: string; transaction_ref: string | null; paid_at: string | null; due_date: string | null; receipt_number: string; notes: string | null; created_at: string };
        Insert: { id?: string; burial_id: string; grave_id: string; user_id: string; amount: number; method?: string; status?: string; transaction_ref?: string; paid_at?: string; due_date?: string; receipt_number: string; notes?: string; created_at?: string };
        Update: { status?: string; transaction_ref?: string; method?: string; paid_at?: string };
      };
      certificates: {
        Row: { id: string; burial_id: string; deceased_name: string; issued_to: string; requested_by: string; certificate_number: string; status: string; issued_at: string | null; notes: string | null; created_at: string };
        Insert: { id?: string; burial_id: string; deceased_name: string; issued_to: string; requested_by: string; certificate_number: string; status?: string; issued_at?: string | null; notes?: string; created_at?: string };
        Update: { status?: string; issued_at?: string; notes?: string };
      };
      maintenance: {
        Row: { id: string; grave_id: string | null; grave_number: string | null; section: string | null; title: string; description: string; priority: string; status: string; reported_by: string; assigned_to: string | null; resolved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; grave_id?: string | null; grave_number?: string | null; section?: string | null; title: string; description: string; priority?: string; status?: string; reported_by: string; assigned_to?: string; resolved_at?: string; created_at?: string; updated_at?: string };
        Update: { status?: string; assigned_to?: string; resolved_at?: string; updated_at?: string };
      };
      notifications: {
        Row: { id: string; user_id: string; title: string; message: string; type: string; read: boolean; created_at: string };
        Insert: { id?: string; user_id: string; title: string; message: string; type?: string; read?: boolean; created_at?: string };
        Update: { read?: boolean };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
