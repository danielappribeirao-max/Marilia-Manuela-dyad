import React, { useState } from 'react';
import { formatPhone } from '../utils/formatters';
import { User } from '../types';

interface QuickRegistrationFormProps {
  onSuccess: (userData: Partial<User> & { description: string }) => void;
  isSubmitting: boolean;
}

const QuickRegistrationForm: React.FC<QuickRegistrationFormProps> = ({ onSuccess, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'O nome é obrigatório.';
    
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Formato de telefone inválido. Use (XX) XXXXX-XXXX.';
    }
    
    if (!formData.description.trim()) newErrors.description = 'A descrição é obrigatória.';
    
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
      onSuccess({
        name: formData.name,
        phone: formData.phone,
        description: formData.description,
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-2xl border border-pink-100">
      <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">Cadastro Rápido</h2>
      <p className="text-gray-600 mb-6 text-center">Preencha seus dados para prosseguir com o agendamento da sua consulta gratuita.</p>
      
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`w-full p-3 border bg-white text-gray-900 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone (WhatsApp)</label>
          <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className={`w-full p-3 border bg-white text-gray-900 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Serviços de Interesse/Descrição</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Ex: Tenho interesse em tratamentos faciais e corporais." className={`w-full p-3 border bg-white text-gray-900 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`} />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-pink-500 text-white rounded-full font-bold text-lg hover:bg-pink-600 transition-colors disabled:bg-gray-300"
        >
          {isSubmitting ? 'Processando...' : 'Continuar para Agendamento'}
        </button>
      </form>
    </div>
  );
};

export default QuickRegistrationForm;