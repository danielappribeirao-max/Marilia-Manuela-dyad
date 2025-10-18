import React, { useState } from 'react';
import { User } from '../types';
import { formatCPF, formatPhone } from '../utils/formatters';
import * as api from '../services/api';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updatedUser: Partial<User>) => Promise<boolean>; // Alterado para retornar Promise<boolean>
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: formatPhone(user.phone),
    cpf: formatCPF(user.cpf),
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl || null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'O nome completo é obrigatório.';
    }
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Formato de telefone inválido. Use (XX) XXXXX-XXXX.';
    }
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
     if (!cpfRegex.test(formData.cpf)) {
      newErrors.cpf = 'Formato de CPF inválido. Use XXX.XXX.XXX-XX.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'phone') value = formatPhone(value);
    else if (name === 'cpf') value = formatCPF(value);

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSaving(true);

    let updatedData: Partial<User> = { ...formData };
    let success = false;
    
    try {
        // 1. Se não houver novo arquivo, mantém a URL existente
        if (!avatarFile) {
            updatedData.avatarUrl = user.avatarUrl;
        }
        
        // 2. Se houver novo arquivo, faz o upload e atualiza a URL
        if (avatarFile) {
            const uploadedUrl = await api.uploadAvatar(user.id, avatarFile);
            if (uploadedUrl) {
                updatedData.avatarUrl = uploadedUrl;
            } else {
                alert("Ocorreu um erro ao enviar a foto.");
                return; // Sai se o upload falhar
            }
        }
        
        // 3. Salva os dados e verifica o sucesso
        success = await onSave(updatedData);
        
        if (success) {
            onClose(); // Fecha o modal apenas se o salvamento for bem-sucedido
            alert('Perfil atualizado com sucesso!');
        } else {
            alert('Ocorreu um erro ao atualizar o perfil. Verifique os dados e tente novamente.');
        }
        
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        alert("Ocorreu um erro inesperado ao salvar o perfil.");
    } finally {
        setIsSaving(false); // Garante que o estado de salvamento seja resetado
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b"><h2 className="text-2xl font-bold">Editar Perfil</h2></div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-4">
              <img src={avatarPreview || `https://ui-avatars.com/api/?name=${formData.name.replace(/\s/g, '+')}&background=e9d5ff&color=7c3aed`} alt="Avatar" className="w-20 h-20 rounded-full object-cover bg-gray-200" />
              <div>
                <label htmlFor="avatar-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span>Alterar Foto</span>
                  <input id="avatar-upload" name="avatar-upload" type="file" className="sr-only" accept="image/*" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF até 2MB.</p>
              </div>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
             <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="XXX.XXX.XXX-XX" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.cpf ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={user.email} disabled className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;