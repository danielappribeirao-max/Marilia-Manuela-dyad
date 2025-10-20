import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, Service, Booking } from '../types';
import { formatCPF, formatPhone } from '../utils/formatters';
import * as api from '../services/api';
import { Calendar, Clock, User as UserIcon, CheckCircle, XCircle } from 'lucide-react';

interface UserModalProps {
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (updatedUser: Partial<User> & { password?: string, avatarUrl?: string }) => void;
  services: Service[];
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, services }) => {
  const [formData, setFormData] = useState({
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone ? formatPhone(user.phone) : '',
    cpf: user?.cpf ? formatCPF(user.cpf) : '',
    role: user?.role || Role.CLIENT,
    avatarUrl: user?.avatarUrl || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const isEditing = !!user;

  useEffect(() => {
    if (isEditing && user?.id) {
      const fetchBookings = async () => {
        setLoadingBookings(true);
        // Busca todos os agendamentos do usuário
        const userBookings = await api.getUserBookings(user.id);
        setBookings(userBookings || []);
        setLoadingBookings(false);
      };
      fetchBookings();
    }
  }, [isEditing, user?.id]);

  // Mapeamento de status para exibição
  const statusMap = {
    confirmed: { text: 'Confirmado', classes: 'bg-blue-100 text-blue-800', icon: <CheckCircle size={14} /> },
    completed: { text: 'Concluído', classes: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} /> },
    canceled: { text: 'Cancelado', classes: 'bg-red-100 text-red-800', icon: <XCircle size={14} /> },
    Agendado: { text: 'Agendado', classes: 'bg-yellow-100 text-yellow-800', icon: <Calendar size={14} /> },
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'O nome completo é obrigatório.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) newErrors.email = 'O e-mail é obrigatório.';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Formato de e-mail inválido.';
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) newErrors.phone = 'Formato inválido. Use (XX) XXXXX-XXXX.';
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (formData.cpf && !cpfRegex.test(formData.cpf)) newErrors.cpf = 'Formato inválido. Use XXX.XXX.XXX-XX.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (validate()) {
      let finalAvatarUrl = formData.avatarUrl;
      if (avatarFile && (user?.id || !isEditing)) {
        const userIdForUpload = user?.id || `new-user-${Date.now()}`;
        const uploadedUrl = await api.uploadAvatar(userIdForUpload, avatarFile);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          alert("Ocorreu um erro ao enviar a foto.");
          return;
        }
      }
      onSave({ ...formData, avatarUrl: finalAvatarUrl });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b"><h2 className="text-2xl font-bold">{isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h2></div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} disabled={isEditing} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.email ? 'border-red-500' : 'border-gray-300'} ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            {!isEditing && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
                <p className="text-xs text-gray-500 mt-1">Opcional. Se deixado em branco, uma senha padrão será usada.</p>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
            )}
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
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <select id="role" name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                    <option value={Role.CLIENT}>Cliente</option>
                    <option value={Role.ADMIN}>Admin</option>
                    <option value={Role.STAFF}>Profissional</option>
                </select>
            </div>
            {isEditing && user && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Histórico de Agendamentos ({bookings.length})</h3>
                {loadingBookings ? (<p className="text-gray-500">Carregando histórico...</p>) : bookings.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {bookings.map((booking, index) => {
                        const service = services.find(s => s.id === booking.serviceId);
                        const statusInfo = statusMap[booking.status as keyof typeof statusMap] || statusMap.Agendado;
                        
                        return (
                            <div key={booking.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{service?.name || 'Serviço Desconhecido'}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(booking.date).toLocaleDateString('pt-BR')}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${statusInfo.classes}`}>
                                    {statusInfo.icon} {statusInfo.text}
                                </span>
                            </div>
                        );
                    })}
                  </div>
                ) : (<p className="text-gray-500 text-sm">Nenhum agendamento registrado para este cliente.</p>)}
              </div>
            )}
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;