import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Without these the app runs as the local-only prototype described in the spec.
export const supabase = url && key ? createClient(url, key) : null;
export const backendEnabled = !!supabase;

export type ProfileRow = {
  id: string;
  role: 'client' | 'coach';
  full_name: string | null;
  email: string | null;
  access: 'invited' | 'active' | 'paused';
  session_date: string | null;
};
