import React, { useState } from 'react';
import * as api from '../services/api'; // Import API functions

interface LoginPageProps {
  onLogin: (email: string, password?: string) => Promise<{ user: any; error: any }>;
}

type FormMode = 'login' | 'register' | 'forgot';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<FormMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (mode === 'register' && !name.trim()) {
      newErrors.name = 'O nome completo é obrigatório.';
    }

    if (!email.trim()) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Formato de e-mail inválido.';
    }

    if ((mode === 'login' || mode === 'register') && !password) {
        newErrors.password = 'A senha é obrigatória.';
    } else if (mode === 'register' && password.length < 6) {
        newErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const { error } = await onLogin(email, password);
    if (error) {
      setErrors({ form: 'E-mail ou senha inválidos.' });
    }
    setLoading(false);
  };
  
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const { error } = await api.signUp(email, password, name);
    if (error) {
      setErrors({ form: error.message });
    } else {
      setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação e depois faça o login.');
      setMode('login');
    }
    setLoading(false);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    const { error } = await api.sendPasswordResetEmail(email);
    if (error) {
       setErrors({ form: error.message });
    } else {
        setMessage('Um link para redefinição de senha foi enviado para seu e-mail.');
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            setMode('login');
            setMessage('');
        }, 4000);
    }
    setLoading(false);
  };


  const renderForm = () => {
    if (showSuccess) {
      return (
          <div className="text-center p-4">
              <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h3 className="text-2xl font-bold mt-4">Link Enviado!</h3>
              <p className="text-gray-600 mt-2">{message}</p>
          </div>
      );
    }

    switch (mode) {
      case 'login':
        return (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <h2 className="text-3xl font-bold text-center">Acesse sua Conta</h2>
            {errors.form && <p className="bg-red-100 text-red-700 text-center p-3 rounded-md text-sm">{errors.form}</p>}
            <div>
              <label htmlFor="email_login" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" id="email_login" value={email} onChange={handleInputChange(setEmail, 'email')} className={`mt-1 block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="password_login" className="block text-sm font-medium text-gray-700">Senha</label>
              <input type="password" id="password_login" value={password} onChange={handleInputChange(setPassword, 'password')} className={`mt-1 block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span onClick={() => { setMode('forgot'); setErrors({}); }} className="font-medium text-pink-600 hover:text-pink-500 cursor-pointer">Esqueceu sua senha?</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300">
                {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <p className="text-center text-sm">Não tem uma conta? <span onClick={() => { setMode('register'); setErrors({}); }} className="font-medium text-pink-600 hover:text-pink-500 cursor-pointer">Cadastre-se</span></p>
          </form>
        );
      case 'register':
        return (
           <form onSubmit={handleRegisterSubmit} className="space-y-4">
             <h2 className="text-3xl font-bold text-center">Crie sua Conta</h2>
             {errors.form && <p className="bg-red-100 text-red-700 text-center p-3 rounded-md text-sm">{errors.form}</p>}
             <div>
                <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input type="text" value={name} onChange={handleInputChange(setName, 'name')} className={`mt-1 block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={email} onChange={handleInputChange(setEmail, 'email')} className={`mt-1 block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                 {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <input type="password" value={password} onChange={handleInputChange(setPassword, 'password')} className={`mt-1 block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
                 {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
             <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300">
                {loading ? 'Cadastrando...' : 'Cadastrar'}
             </button>
             <p className="text-center text-sm">Já tem uma conta? <span onClick={() => { setMode('login'); setErrors({}); }} className="font-medium text-pink-600 hover:text-pink-500 cursor-pointer">Faça login</span></p>
           </form>
        );
      case 'forgot':
         return (
           <form onSubmit={handleForgotSubmit} className="space-y-6">
             <h2 className="text-3xl font-bold text-center">Recuperar Senha</h2>
             {errors.form && <p className="bg-red-100 text-red-700 text-center p-3 rounded-md text-sm">{errors.form}</p>}
             <p className="text-center text-sm text-gray-600">Insira seu e-mail e enviaremos um link para você voltar a acessar sua conta.</p>
             <div>
               <label className="block text-sm font-medium text-gray-700">Email</label>
               <input type="email" value={email} onChange={handleInputChange(setEmail, 'email')} className={`mt-1 block w-full px-3 py-2 border bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
             </div>
             <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300">
                {loading ? 'Enviando...' : 'Enviar Link'}
            </button>
             <p className="text-center text-sm"><span onClick={() => { setMode('login'); setErrors({}); }} className="font-medium text-pink-600 hover:text-pink-500 cursor-pointer">Voltar para o Login</span></p>
           </form>
         );
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        {message && !showSuccess && <p className="bg-blue-100 text-blue-800 text-center p-3 rounded-md">{message}</p>}
        {renderForm()}
      </div>
    </div>
  );
}
