import React, { useState, useEffect } from 'react';
import { formatPhone } from '../utils/formatters';
import { Service } from '../types';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';
import { supabase } from '../supabase/client'; // Importando supabase para verificar o telefone

interface QuickRegistrationModalProps {
  service: Service; // Novo: Recebe o serviço para saber se é consulta gratuita
  onClose: () => void;
  onRegister: (data: { name: string; phone: string; email: string; description: string }) => void; // Adicionando email
}

const QuickRegistrationModal: React.FC<QuickRegistrationModalProps> = ({ service, onClose, onRegister }) => {
  const isFreeConsultation = service.id === FREE_CONSULTATION_SERVICE_ID;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '', // Novo campo
    description: isFreeConsultation ? '' : service.name,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isEmailDisabled, setIsEmailDisabled] = useState(false);

  // Efeito para verificar se o telefone já está cadastrado
  useEffect(() => {
    const checkExistingUser = async () => {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length >= 10) {
        setIsCheckingPhone(true);
        
        // 1. Buscar perfil pelo telefone
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phoneDigits)
            .maybeSingle();
            
        if (profileData) {
            // 2. Se o perfil existe, buscar o email de autenticação
            const { data: { user } } = await supabase.auth.admin.getUserById(profileData.id);
            
            if (user?.email) {
                setFormData(prev => ({ ...prev, email: user.email }));
                setIsEmailDisabled(true);
            } else {
                setIsEmailDisabled(false);
            }
        } else {
            setIsEmailDisabled(false);
            // Limpa o email se o telefone for novo e o campo estava preenchido
            if (isEmailDisabled) {
                setFormData(prev => ({ ...prev, email: '' }));
            }
        }
        setIsCheckingPhone(false);
      } else {
        setIsEmailDisabled(false);
      }
    };
    
    // Debounce para evitar chamadas excessivas
    const timeoutId = setTimeout(checkExistingUser, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.phone]);


  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'O nome é obrigatório.';
    
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      newErrors.phone = 'Telefone inválido. Mínimo de 10 dígitos.';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) newErrors.email = 'O e-mail é obrigatório.';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Formato de e-mail inválido.';
    
    if (isFreeConsultation && !formData.description.trim()) {
        newErrors.description = 'A descrição dos serviços é obrigatória para a consulta gratuita.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'phone') value = formatPhone(value);

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalDescription = isFreeConsultation ? formData.description : service.name;
      onRegister({ ...formData, description: finalDescription });
    }
  };
  
  const modalTitle = isFreeConsultation ? 'Agendar Consulta Gratuita' : `Agendar: ${service.name}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-pink-600">{modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4">
            <p className="text-gray-600 text-sm">
                {isFreeConsultation 
                    ? "Preencha seus dados para agendar sua avaliação gratuita e sem compromisso."
                    : `Preencha seus dados para agendar o serviço "${service.name}".`
                }
            </p>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Seu Nome Completo</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (para contato)</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Seu E-mail</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                disabled={isEmailDisabled || isCheckingPhone}
                placeholder="seu.email@exemplo.com" 
                className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.email ? 'border-red-500' : 'border-gray-300'} ${isEmailDisabled || isCheckingPhone ? 'bg-gray-100 cursor-not-allowed' : ''}`} 
              />
              {isCheckingPhone && <p className="text-xs text-gray-500 mt-1">Verificando telefone...</p>}
              {isEmailDisabled && <p className="text-xs text-green-600 mt-1">E-mail preenchido automaticamente (usuário existente).</p>}
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            
            {isFreeConsultation && (
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Quais serviços você tem interesse?</label>
                  <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Ex: Limpeza de pele, massagem, botox..." className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
            )}
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isCheckingPhone} className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-400">Avançar para Agendamento</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickRegistrationModal;