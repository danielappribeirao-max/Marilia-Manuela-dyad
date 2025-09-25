import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto Supabase (obtidas do contexto)
const supabaseUrl = 'https://klsrqngtvbbejhoqkqli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc3Jxbmd0dmJiZWpob3FrcWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzI2MjYsImV4cCI6MjA3Mzk0ODYyNn0.62RBQTOBDft8ZnK9qB2urfboVl3aj0BwlPl2KYSPq_w';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL e Anon Key devem ser fornecidos. Verifique suas variáveis de ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);