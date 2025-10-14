import React, { useState, useMemo } from 'react';
import { User, Service, Role } from '../types';
import * as api from '../services/api';
import { useApp } from '../App';
import BookingModal from './BookingModal';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';
import { Mail, Lock, User as UserIcon, CheckCircle } from 'lucide-react';

interface FreeConsultationFlowProps {
  onClose: () => void;
}

const FreeConsultationFlow: React.FC<FreeConsultationFlowProps> = ({ onClose }) => {
  const { setCurrentUser, setCurrentPage, services, professionals, clinicSettings } = useApp();
  const [step, setStep] = useState<'signup' | 'schedule' | 'success'>('signup');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);

  const freeConsultationService = useMemo(() => 
    services.find(s => s.id === FREE_CONSULTATION_SERVICE_ID), 
  [services]);

  const validateSignup = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'E-mail inválido.';
    if (formData.password.length < 6) newErrors.password = 'A senha deve ter no mínimo 6 caracteres.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;

    setLoading(true);
    // 1. Tenta cadastrar o usuário
    const { user: newUser, error: signupError } = await api.signUp(formData.email, formData.password, formData.name);
    
    if (signupError) {
        setLoading(false);
        alert(`Erro ao cadastrar: ${signupError.message}`);
        return;
    }
    
    // 2. Tenta logar o usuário (o signUp já faz o login automático no Supabase, mas precisamos do perfil completo)
    const userProfile = await api.getUserProfile(newUser!.id);

    if (userProfile) {
        setCurrentUser(userProfile);
        setTempUser(userProfile);
        setStep('schedule');
    } else {
        alert("Cadastro realizado, mas falha ao carregar perfil. Tente fazer login.");
        onClose();
        setCurrentPage(Page.LOGIN);
    }
    setLoading(false);
  };
  
  const handleConfirmBooking = async (details: { date: Date, professionalId: string }): Promise<boolean> => {
    if (!tempUser || !freeConsultationService) return false;
    
    const newBooking: Omit<Booking, 'id'> = { 
        userId: tempUser.id, 
        serviceId: freeConsultationService.id, 
        professionalId: details.professionalId, 
        date: details.date, 
        status: 'confirmed', 
        duration: freeConsultationService.duration 
    };
    
    const result = await api.addOrUpdateBooking(newBooking);
    
    if (result) {
        setStep('success');
        return true;
    }
    return false;
  };

  const renderContent = () => {
    if (!freeConsultationService) {
        return <div className="text-center text-red-500">Serviço de consulta gratuita não encontrado.</div>;
    }

    switch (step) {
      case 'signup':
        return (
          <form onSubmit={handleSignup} className="space-y-4">
            <h3 className="text-xl font-bold text-center mb-4">Crie sua Conta Gratuita</h3>
            <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" name="name" placeholder="Seu Nome Completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`w-full pl-10 p-3 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" name="email" placeholder="Seu Melhor E-mail" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full pl-10 p-3 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" name="password" placeholder="Crie uma Senha (mín. 6 caracteres)" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className={`w-full pl-10 p-3 border rounded-lg ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-colors disabled:bg-gray-400">
              {loading ? 'Cadastrando...' : 'Cadastrar e Agendar Consulta'}
            </button>
          </form>
        );
      case 'schedule':
        return (
            <BookingModal
                service={freeConsultationService}
                onClose={onClose}
                isCreditBooking={false} // Não usa crédito, é gratuito
                onConfirmBooking={handleConfirmBooking}
                professionals={professionals}
                clinicOperatingHours={clinicSettings?.operatingHours}
                clinicHolidayExceptions={clinicSettings?.holidayExceptions}
            />
        );
      case 'success':
        return (
          <div className="text-center p-8">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <h3 className="text-2xl font-bold mt-4">Consulta Agendada com Sucesso!</h3>
            <p className="text-gray-600 mt-2">Você receberá os detalhes da sua consulta gratuita por e-mail.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600">
              Fechar
            </button>
          </div>
        );
    }
  };

  // Se estiver no passo de agendamento, o BookingModal já é o conteúdo principal,
  // então não precisamos do modal wrapper aqui.
  if (step === 'schedule') {
      return renderContent();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Consulta Gratuita</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FreeConsultationFlow;