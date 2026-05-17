import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// The publishable key (replaces legacy anon key in Supabase SSR projects)
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Service role key — server-only, never sent to the browser
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Admin client with elevated privileges for API routes.
 * Falls back to the publishable key when the service role key is not set
 * (safe for demo; set SUPABASE_SERVICE_ROLE_KEY in production).
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey ?? supabasePublishableKey
);
