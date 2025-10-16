import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto Supabase (obtidas do contexto)
const supabaseUrl = 'https://mdxqiozhqmcriiqspbqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keHFpb3pocW1jcmlpcXNwYnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTc4MzUsImV4cCI6MjA3NTY5MzgzNX0.uweUQXy7OjpIAOOVqIh72QLwk_XRhzfnB_Gs4Pe2DpI';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL e Anon Key devem ser fornecidos. Verifique suas variáveis de ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);