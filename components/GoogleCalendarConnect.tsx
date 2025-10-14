import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useApp } from '../App';
import { supabase } from '../supabase/client';

const GoogleCalendarConnect: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verifica se o usuário já tem um refresh_token, indicando que está conectado
    const checkConnectionStatus = async () => {
      if (currentUser?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('google_refresh_token')
          .eq('id', currentUser.id)
          .single();
        
        if (data && data.google_refresh_token) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      }
      setIsLoading(false);
    };
    checkConnectionStatus();
  }, [currentUser]);

  const handleSuccess = async (codeResponse: any) => {
    const { code } = codeResponse;
    try {
      const { data, error } = await supabase.functions.invoke('exchange-google-code', {
        body: { code },
      });

      if (error) throw error;

      alert(data.message || 'Conectado com sucesso!');
      setIsConnected(true);
      // Atualiza o estado local do usuário se necessário
      if (currentUser) {
        setCurrentUser({ ...currentUser }); 
      }
    } catch (err) {
      console.error("Erro ao conectar com Google Calendar:", err);
      alert(`Falha ao conectar: ${err.message}`);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleSuccess,
    flow: 'auth-code',
    scope: 'https://www.googleapis.com/auth/calendar',
  });

  const handleDisconnect = async () => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        google_access_token: null,
        google_refresh_token: null,
      })
      .eq('id', currentUser.id);

    if (error) {
      alert(`Erro ao desconectar: ${error.message}`);
    } else {
      alert('Conta Google desconectada com sucesso.');
      setIsConnected(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Verificando status da conexão...</div>;
  }

  return (
    <div>
      {isConnected ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">✓ Conectado ao Google Calendar</p>
          <button 
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-full hover:bg-red-600"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <button
          onClick={() => login()}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google icon" className="w-6 h-6" />
          Conectar com Google Calendar
        </button>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;