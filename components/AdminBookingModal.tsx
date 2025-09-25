
import React, { useState, useMemo } from 'react';
import { Booking, User, Service, Role } from '../types';
import { useApp } from '../App';
import * as api from '../services/api';

interface AdminBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  onSave: (booking: Partial<Booking>) => Promise<void>;
  defaultDate?: Date;
  users: User[];
  professionals: User[];
}

const AdminBookingModal: React.FC<AdminBookingModalProps> = ({ booking, onClose, onSave, defaultDate, users, professionals }) => {
  const { services } = useApp();
  const isEditing = !!booking;
  
  const getInitialFormData = () => {
    const service = booking?.serviceId ? services.find(s => s.id === booking.serviceId) : null;
    return {
      userId: booking?.userId || '',
      serviceId: booking?.serviceId || '',
      professionalId: booking?.professionalId || '',
      date: booking ? new Date(booking.date).toISOString().split('T')[0] : (defaultDate ? defaultDate.toISOString().split('T')[0] : ''),
      time: booking ? new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : (defaultDate ? defaultDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : ''),
      status: booking?.status || 'confirmed',
      duration: booking?.duration || service?.duration || 0,
      quantity: 1,
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const selectedService = useMemo(() => services.find(s => s.id === formData.serviceId), [formData.serviceId, services]);
  const sessionsPerPackage = selectedService?.sessions || 1;
  const isPackageSale = !isEditing && (sessionsPerPackage > 1 || Number(formData.quantity) > 1);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.userId) newErrors.userId = 'Selecione um cliente.';
    if (!formData.serviceId) newErrors.serviceId = 'Selecione um serviço.';

    if (isPackageSale) {
        if (!formData.quantity || formData.quantity < 1) newErrors.quantity = 'A quantidade deve ser de pelo menos 1.';
    } else {
        if (!formData.professionalId) newErrors.professionalId = 'Selecione um profissional.';
        if (!formData.date) newErrors.date = 'Selecione uma data.';
        if (!formData.time) newErrors.time = 'Selecione um horário.';
        if (!formData.duration || formData.duration <= 0) newErrors.duration = 'A duração deve ser maior que zero.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };
      if (name === 'serviceId' && !isPackageSale) {
        newFormData.duration = services.find(s => s.id === value)?.duration || 0;
      }
      return newFormData;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isPackageSale) {
        const user = users.find(u => u.id === formData.userId);
        if (!user || !selectedService) return;
        
        await api.addCreditsToUser(user.id, selectedService.id, formData.quantity, selectedService.sessions);
        const totalCreditsToAdd = sessionsPerPackage * Number(formData.quantity);
        alert(`${totalCreditsToAdd} créditos de "${selectedService?.name}" adicionados com sucesso para ${user.name}.`);
        onClose();
        return;
    } 
    
    const [hours, minutes] = formData.time.split(':').map(Number);
    const bookingDate = new Date(formData.date);
    bookingDate.setMinutes(bookingDate.getMinutes() + bookingDate.getTimezoneOffset());
    bookingDate.setHours(hours, minutes, 0, 0);

    const newBooking: Partial<Booking> = {
      id: booking?.id,
      userId: formData.userId,
      serviceId: formData.serviceId,
      professionalId: formData.professionalId,
      date: bookingDate,
      status: formData.status as Booking['status'],
      duration: Number(formData.duration),
    };
    await onSave(newBooking);
  };

  const modalTitle = isPackageSale ? 'Vender Pacote de Serviços' : (isEditing ? 'Editar Agendamento' : 'Novo Agendamento');
  const submitButtonText = isPackageSale ? 'Adicionar Créditos' : 'Salvar Agendamento';

  const clientUsers = useMemo(() => users.filter(u => u.role === Role.CLIENT), [users]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b"><h2 className="text-2xl font-bold">{modalTitle}</h2></div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select id="userId" name="userId" value={formData.userId} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.userId ? 'border-red-500' : 'border-gray-300'}`}>
                <option value="" disabled>Selecione um cliente</option>
                {clientUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
              {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                <select id="serviceId" name="serviceId" value={formData.serviceId} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.serviceId ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="" disabled>Selecione um serviço</option>
                  {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
                {errors.serviceId && <p className="text-red-500 text-xs mt-1">{errors.serviceId}</p>}
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} min="1" disabled={isEditing} title={isEditing ? 'Não é possível alterar a quantidade ao editar.' : ''} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.quantity ? 'border-red-500' : 'border-gray-300'} ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
              </div>
            </div>
            {isPackageSale ? (
                <div className="bg-pink-50 text-pink-800 p-3 rounded-md text-sm">
                    <p>Você está vendendo um pacote. Ao confirmar, <strong>{sessionsPerPackage * Number(formData.quantity)} créditos</strong> serão adicionados à conta do cliente.</p>
                </div>
            ) : (
              <>
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
                    <input type="number" id="duration" name="duration" value={formData.duration || ''} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
                </div>
                <div>
                  <label htmlFor="professionalId" className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                  <select id="professionalId" name="professionalId" value={formData.professionalId} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.professionalId ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="" disabled>Selecione um profissional</option>
                    {professionals.map(prof => <option key={prof.id} value={prof.id}>{prof.name}</option>)}
                  </select>
                  {errors.professionalId && <p className="text-red-500 text-xs mt-1">{errors.professionalId}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.date ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <input type="time" id="time" name="time" value={formData.time} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.time ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Concluído</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600">{submitButtonText}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminBookingModal;
