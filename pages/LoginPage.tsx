import React, { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabase/client';

export default function LoginPage() {
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuthError = (error: Error) => {
    console.error("Supabase Auth Error:", error);
    setAuthError(error.message || "Ocorreu um erro de autenticação. Tente novamente.");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800">Acesso à Clínica</h1>
        {authError && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-medium text-center">
                {authError}
            </div>
        )}
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          redirectTo={window.location.origin} 
          onError={handleAuthError} // Adicionando tratamento de erro
          localization={{
            variables: {
              sign_in: { email_label: 'Seu e-mail', password_label: 'Sua senha', email_input_placeholder: 'exemplo@email.com', password_input_placeholder: '••••••••', button_label: 'Entrar', social_provider_text: 'Ou entre com', link_text: 'Já tem uma conta? Entrar' },
              sign_up: { email_label: 'Seu e-mail', password_label: 'Crie uma senha', email_input_placeholder: 'exemplo@email.com', password_input_placeholder: '••••••••', button_label: 'Cadastrar', social_provider_text: 'Ou cadastre-se com', link_text: 'Não tem uma conta? Cadastre-se' },
              forgotten_password: { email_label: 'Seu e-mail', email_input_placeholder: 'exemplo@email.com', button_label: 'Enviar instruções de redefinição', link_text: 'Esqueceu sua senha?' },
              update_password: { password_label: 'Nova senha', password_input_placeholder: '••••••••', button_label: 'Atualizar senha' },
              magic_link: { email_input_placeholder: 'exemplo@email.com', button_label: 'Enviar link mágico', link_text: 'Enviar um link mágico' },
            },
          }}
        />
      </div>
    </div>
  );
}