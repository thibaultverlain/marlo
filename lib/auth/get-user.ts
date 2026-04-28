import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Get the current authenticated user's ID.
 * Use in server actions and server components.
 * Throws if not authenticated.
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Non authentifié");
  }
  
  return user.id;
}
