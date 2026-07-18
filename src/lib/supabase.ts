import { createClient } from '@supabase/supabase-js';

// Legacy/unused: HealingMonk's real auth is the JWT role API under /api. This is
// kept only so old screens still compile; it stays null unless env is provided.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : (null as any);
