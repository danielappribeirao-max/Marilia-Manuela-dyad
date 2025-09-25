import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabase/client'; // Import the Supabase client

interface LoginPageProps {
  // onLogin prop is no longer directly used by this component,
  // as Supabase Auth component handles its own login flow.
  // The App.tsx's onAuthStateChange listener will pick up successful logins.
}

export default function LoginPage({}: LoginPageProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // No third-party providers unless specified
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Seu e-mail',
                password_label: 'Sua senha',
                email_input_placeholder: 'exemplo@email.com',
                password_input_placeholder: '••••••••',
                button_label: 'Entrar',
                social_provider_text: 'Ou entre com',
                link_text: 'Já tem uma conta? Entrar',
              },
              sign_up: {
                email_label: 'Seu e-mail',
                password_label: 'Crie uma senha',
                email_input_placeholder: 'exemplo@email.com',
                password_input_placeholder: '••••••••',
                button_label: 'Cadastrar',
                social_provider_text: 'Ou cadastre-se com',
                link_text: 'Não tem uma conta? Cadastre-se',
              },
              forgotten_password: {
                email_label: 'Seu e-mail',
                email_input_placeholder: 'exemplo@email.com',
                button_label: 'Enviar instruções de redefinição',
                link_text: 'Esqueceu sua senha?',
              },
              update_password: {
                password_label: 'Nova senha',
                password_input_placeholder: '••••••••',
                button_label: 'Atualizar senha',
              },
              magic_link: {
                email_input_placeholder: 'exemplo@email.com',
                button_label: 'Enviar link mágico',
                link_text: 'Enviar um link mágico',
              },
            },
          }}
        />
      </div>
    </div>
  );
}