import { createClient } from '@supabase/supabase-js';

// These environment variables are expected to be set in the deployment environment.
const supabaseUrl = 'https://cyqulktexjergwxmlntv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cXVsa3RleGplcmd3eG1sbnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU4MTAxMjcsImV4cCI6MjAxMTM4NjEyN30.20j2edTwn24_2-BEl-0N3H3I6s6pL4K2i0JdxQat4wA';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL and Anon Key must be provided. Check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);