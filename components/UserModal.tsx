
import React, { useState } from 'react';
import { User, Role } from '../types';

interface UserModalProps {
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (user: User) => void;
}

const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};


const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: user?.id || `user-${Date.now()}`,
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    role: user?.role || Role.CLIENT,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isEditing = !!user;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'O nome completo é obrigatório.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
        newErrors.email = 'O e-mail é obrigatório.';
    } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Formato de e-mail inválido.';
    }

    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Formato inválido. Use (XX) XXXXX-XXXX.';
    }
    
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(formData.cpf)) {
      newErrors.cpf = 'Formato inválido. Use XXX.XXX.XXX-XX.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'phone') {
      value = formatPhone(value);
    } else if (name === 'cpf') {
      value = formatCPF(value);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData as User);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">{isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h2>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            {/* CPF */}
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="XXX.XXX.XXX-XX" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.cpf ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
            </div>
            {/* Role */}
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <select id="role" name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                    <option value={Role.CLIENT}>Cliente</option>
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.STAFF}>Profissional</option>
                </select>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
