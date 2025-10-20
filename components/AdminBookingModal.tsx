import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Booking, User, Service, Role } from '../types';
import { useApp } from '../App';
import * as api from '../services/api';
import { useAvailability } from '../hooks/useAvailability';

interface AdminBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  onSave: (booking: Partial<Booking>) => Promise<void>;
  defaultDate?: Date;
  users: User[];
  professionals: User[];
}

const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const AdminBookingModal: React.FC<AdminBookingModalProps> = ({ booking, onClose, onSave, defaultDate, users, professionals }) => {
  const { services, clinicSettings } = useApp();
  const isEditing = !!booking;
  
  const getInitialFormData = () => {
    const service = booking?.serviceId ? services.find(s => s.id === booking.serviceId) : null;
    
    // 1. Determinar a data inicial
    let initialDate: Date;
    if (booking) {
        // Usa a data do agendamento existente
        const d = new Date(booking.date);
        initialDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    } else if (defaultDate) {
        // Usa a data padrão (clique na agenda)
        initialDate = new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate());
    } else {
        // Usa a data de hoje
        const today = new Date();
        initialDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    
    // 2. Determinar a hora inicial
    const initialTime = booking ? new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : (defaultDate ? defaultDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : '');
    
    return {
      userId: booking?.userId || '',
      serviceId: booking?.serviceId || '',
      professionalId: booking?.professionalId || '',
      date: initialDate.toISOString().split('T')[0],
      time: initialTime,
      status: booking?.status || 'Agendado', // Usando 'Agendado' como padrão para novos agendamentos
      duration: booking?.duration || service?.duration || 30,
      quantity: 1,
      notes: booking?.comment || '', // Adicionando notas/comentários
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const selectedService = useMemo(() => services.find(s => s.id === formData.serviceId), [formData.serviceId, services]);
  const sessionsPerPackage = selectedService?.sessions || 1;
  
  // Determina se o modal está no modo de Venda de Pacote/Crédito
  // Isso só acontece se NÃO estiver editando E o serviço tiver mais de 1 sessão (indicando pacote)
  const isPackageSaleMode = !isEditing && (sessionsPerPackage > 1 || Number(formData.quantity) > 1);
  
  const selectedDate = useMemo(() => {
      if (!formData.date) return null;
      const [year, month, day] = formData.date.split('-').map(Number);
      // Usamos o construtor (year, monthIndex, day) que cria a data no fuso horário local
      return new Date(year, month - 1, day);
  }, [formData.date]);

  const { availableTimes, isClinicOpen, currentDaySettings, loadingAvailability } = useAvailability({
      selectedDate,
      selectedProfessionalId: formData.professionalId,
      serviceDuration: Number(formData.duration),
      clinicOperatingHours: clinicSettings?.operatingHours,
      clinicHolidayExceptions: clinicSettings?.holidayExceptions,
      bookingToIgnoreId: booking?.id,
  });
  
  // Obtém o horário original do agendamento (se estiver editando)
  const originalBookingTime = useMemo(() => {
      if (isEditing && booking?.date) {
          return new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
      }
      return null;
  }, [isEditing, booking?.date]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.userId) newErrors.userId = 'Selecione um cliente.';
    if (!formData.serviceId) newErrors.serviceId = 'Selecione um serviço.';

    if (isPackageSaleMode) {
        if (!formData.quantity || Number(formData.quantity) < 1) newErrors.quantity = 'A quantidade deve ser de pelo menos 1.';
    } else {
        // Validação para Agendamento
        if (!formData.professionalId) newErrors.professionalId = 'Selecione um profissional.';
        if (!formData.date) newErrors.date = 'Selecione uma data.';
        if (!formData.time) newErrors.time = 'Selecione um horário.';
        if (!formData.duration || Number(formData.duration) <= 0) newErrors.duration = 'A duração deve ser maior que zero.';
        
        // Validação de disponibilidade
        if (formData.date && formData.time && formData.professionalId) {
            if (!isClinicOpen) {
                newErrors.date = 'A clínica está fechada neste dia.';
            } else {
                // Verifica se o horário selecionado é o original (permitido) ou se está na lista de disponíveis
                const isOriginalTime = isEditing && formData.time === originalBookingTime;
                
                if (!isOriginalTime && !availableTimes.includes(formData.time)) {
                    newErrors.time = 'Horário indisponível. O profissional está ocupado ou o horário está fora do expediente/almoço.';
                }
            }
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };
      if (name === 'serviceId' && !isPackageSaleMode) {
        newFormData.duration = services.find(s => s.id === value)?.duration || 30;
      }
      
      // Se mudar a data, profissional ou duração, resetar o horário
      if (['date', 'professionalId', 'duration'].includes(name)) {
          newFormData.time = '';
      }
      
      return newFormData;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'date' || name === 'time') setErrors(prev => ({ ...prev, date: '', time: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isPackageSaleMode) {
        const user = users.find(u => u.id === formData.userId);
        if (!user || !selectedService) return;
        
        await api.addCreditsToUser(user.id, selectedService.id, Number(formData.quantity), selectedService.sessions);
        const totalCreditsToAdd = sessionsPerPackage * Number(formData.quantity);
        alert(`${totalCreditsToAdd} créditos de "${selectedService?.name}" adicionados com sucesso para ${user.name}.`);
        onClose();
        return;
    } 
    
    // --- Lógica de Agendamento ---
    const [hours, minutes] = formData.time.split(':').map(Number);
    
    // Cria a data final no fuso horário local
    // É crucial que a data seja criada corretamente para que a API a salve no formato UTC
    const bookingDate = new Date(selectedDate!.getFullYear(), selectedDate!.getMonth(), selectedDate!.getDate(), hours, minutes, 0, 0);

    const newBooking: Partial<Booking> = {
      id: booking?.id,
      userId: formData.userId,
      serviceId: formData.serviceId,
      professionalId: formData.professionalId,
      date: bookingDate,
      status: formData.status as Booking['status'],
      duration: Number(formData.duration),
      comment: formData.notes, // Salvando as notas
      serviceName: selectedService?.name, // Adicionando serviceName para a API
    };
    await onSave(newBooking);
  };

  const modalTitle = isPackageSaleMode ? 'Vender Pacote de Serviços' : (isEditing ? 'Editar Agendamento' : 'Novo Agendamento');
  const submitButtonText = isPackageSaleMode ? 'Adicionar Créditos' : 'Salvar Agendamento';

  const clientUsers = useMemo(() => users.filter(u => u.role === Role.CLIENT), [users]);
  
  const clinicHoursMessage = useMemo(() => {
      if (!selectedDate) return 'Selecione uma data.';
      if (!isClinicOpen) return 'Clínica fechada neste dia.';
      
      let message = `Aberto das ${currentDaySettings?.start} às ${currentDaySettings?.end}.`;
      if (currentDaySettings?.lunchStart && currentDaySettings?.lunchEnd) {
          message += ` (Almoço: ${currentDaySettings.lunchStart} - ${currentDaySettings.lunchEnd})`;
      }
      return message;
  }, [selectedDate, isClinicOpen, currentDaySettings]);

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
              <div className={isPackageSaleMode ? "sm:col-span-2" : "sm:col-span-3"}>
                <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                <select id="serviceId" name="serviceId" value={formData.serviceId} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.serviceId ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="" disabled>Selecione um serviço</option>
                  {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
                {errors.serviceId && <p className="text-red-500 text-xs mt-1">{errors.serviceId}</p>}
              </div>
              {isPackageSaleMode && (
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} min="1" disabled={isEditing} title={isEditing ? 'Não é possível alterar a quantidade ao editar.' : ''} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.quantity ? 'border-red-500' : 'border-gray-300'} ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                  {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                </div>
              )}
            </div>
            {isPackageSaleMode ? (
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
                  <select id="professionalId" name="professionalId" value={formData.professionalId} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.professionalId ? 'border-red-500' : 'border-gray-300'}`}>
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
                    {formData.date && <p className={`text-xs mt-1 ${isClinicOpen ? 'text-gray-600' : 'text-red-500 font-semibold'}`}>{clinicHoursMessage}</p>}
                  </div>
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <select id="time" name="time" value={formData.time} onChange={handleChange} disabled={!formData.date || !formData.professionalId || loadingAvailability || !isClinicOpen} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.time ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-100`}>
                        <option value="" disabled>Selecione o horário</option>
                        {loadingAvailability ? (
                            <option disabled>Carregando...</option>
                        ) : availableTimes.length > 0 ? (
                            // Inclui o horário original se estiver editando e não estiver na lista (para permitir salvar sem mudar o horário)
                            [...new Set([...availableTimes, (isEditing ? originalBookingTime : '')])].filter(t => t).sort().map(time => <option key={time} value={time}>{time}</option>)
                        ) : (
                            <option disabled>Indisponível</option>
                        )}
                    </select>
                    {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                  </div>
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas/Comentários</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                    <option value="Agendado">Agendado</option>
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