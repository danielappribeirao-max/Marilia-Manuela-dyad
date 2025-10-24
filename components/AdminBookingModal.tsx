import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Booking, User, Service, Role, RecurrenceFrequency } from '../types';
import { useApp } from '../App';
import * as api from '../services/api';
import { useAvailability } from '../hooks/useAvailability';
import { Repeat } from 'lucide-react';

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
        const d = new Date(booking.date);
        initialDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    } else if (defaultDate) {
        initialDate = new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate());
    } else {
        const today = new Date();
        initialDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }
    
    // 2. Determinar a hora inicial
    const initialTime = booking ? new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : (defaultDate ? defaultDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : '');
    
    // Data final padrão: 1 mês após a data inicial
    const defaultEndDate = new Date(initialDate);
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
    
    return {
      userId: booking?.userId || '', // Permite que seja string vazia se o usuário foi excluído
      serviceId: booking?.serviceId || '',
      professionalId: booking?.professionalId || '',
      date: initialDate.toISOString().split('T')[0],
      time: initialTime,
      status: booking?.status || 'confirmed',
      duration: booking?.duration || service?.duration || 30,
      quantity: 1,
      notes: booking?.comment || '', // Adicionando notas/comentários
      
      // Campos de Recorrência (apenas para criação)
      isRecurring: false,
      frequency: RecurrenceFrequency.WEEKLY,
      endDate: defaultEndDate.toISOString().split('T')[0], 
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false); // Novo estado para desabilitar o botão

  const selectedService = useMemo(() => services.find(s => s.id === formData.serviceId), [formData.serviceId, services]);
  const sessionsPerPackage = selectedService?.sessions || 1;
  const isPackageSale = !isEditing && (sessionsPerPackage > 1 || Number(formData.quantity) > 1);
  
  const selectedDate = useMemo(() => {
      if (!formData.date) return null;
      const [year, month, day] = formData.date.split('-').map(Number);
      // Usamos o construtor (year, monthIndex, day) que cria a data no fuso horário local
      return new Date(year, month - 1, day);
  }, [formData.date]);
  
  // Horário original do agendamento (se estiver editando)
  const originalBookingTime = useMemo(() => {
      if (!isEditing || !booking?.date) return null;
      return new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
  }, [isEditing, booking?.date]);

  const { availableTimes, isClinicOpen, currentDaySettings, loadingAvailability } = useAvailability({
      selectedDate,
      selectedProfessionalId: formData.professionalId,
      serviceDuration: Number(formData.duration),
      clinicOperatingHours: clinicSettings?.operatingHours,
      clinicHolidayExceptions: clinicSettings?.holidayExceptions,
      bookingToIgnoreId: booking?.id,
  });

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
        
        // Validação de disponibilidade (apenas para agendamentos)
        if (formData.date && formData.time && formData.professionalId) {
            if (!isClinicOpen) {
                newErrors.date = 'A clínica está fechada neste dia.';
            } else {
                const isTimeChanged = formData.time !== originalBookingTime;
                
                // Se o horário foi alterado OU se for um novo agendamento, verificamos a disponibilidade na lista.
                if (!isEditing || isTimeChanged) {
                    if (!availableTimes.includes(formData.time)) {
                        newErrors.time = 'Horário indisponível. O profissional está ocupado ou o horário está fora do expediente/almoço.';
                    }
                }
                // Se for edição e o horário não foi alterado, permitimos salvar (pois o slot já está ocupado por este booking).
            }
        }
        
        // Validação de recorrência (apenas para novos agendamentos)
        if (!isEditing && formData.isRecurring) {
            if (!formData.endDate) {
                newErrors.endDate = 'A data final da recorrência é obrigatória.';
            } else if (new Date(formData.endDate) <= new Date(formData.date)) {
                newErrors.endDate = 'A data final deve ser posterior à data de início.';
            }
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => {
      const newFormData = { ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value };
      
      if (name === 'serviceId' && !isPackageSale) {
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
    
    setIsSaving(true);

    try {
        if (isPackageSale) {
            const user = users.find(u => u.id === formData.userId);
            if (!user || !selectedService) return;
            
            await api.addCreditsToUser(user.id, selectedService.id, Number(formData.quantity), selectedService.sessions);
            const totalCreditsToAdd = sessionsPerPackage * Number(formData.quantity);
            alert(`${totalCreditsToAdd} créditos de "${selectedService?.name}" adicionados com sucesso para ${user.name}.`);
            onClose();
            return;
        } 
        
        // --- Agendamento Único ou Recorrente ---
        
        if (!isEditing && formData.isRecurring) {
            // 1. Agendamento Recorrente (Cria a regra)
            const user = users.find(u => u.id === formData.userId);
            if (!user || !selectedService) return;
            
            const recurringBookingPayload = {
                userId: formData.userId, // Garantido que é um ID válido pela validação
                serviceId: formData.serviceId,
                professionalId: formData.professionalId,
                startDate: formData.date,
                startTime: formData.time,
                duration: Number(formData.duration),
                endDate: formData.endDate,
                frequency: formData.frequency as RecurrenceFrequency,
            };
            
            const result = await api.addRecurringBooking(recurringBookingPayload);
            
            if (result) {
                alert(`Agendamento recorrente para "${selectedService.name}" criado com sucesso!`);
                onClose();
            } else {
                alert("Falha ao criar agendamento recorrente. Verifique a disponibilidade e tente novamente.");
            }
            return;
        }
        
        // 2. Agendamento Único (Cria ou Edita)
        
        const [hours, minutes] = formData.time.split(':').map(Number);
        
        // Cria a data final no fuso horário local
        const bookingDate = new Date(selectedDate!.getFullYear(), selectedDate!.getMonth(), selectedDate!.getDate(), hours, minutes, 0, 0);

        const newBooking: Partial<Booking> = {
          id: booking?.id,
          userId: formData.userId || undefined, // Envia undefined se for string vazia (usuário excluído)
          serviceId: formData.serviceId,
          professionalId: formData.professionalId,
          date: bookingDate,
          status: formData.status as Booking['status'],
          duration: Number(formData.duration),
          comment: formData.notes, // Salvando as notas
          serviceName: selectedService?.name, // Adicionando serviceName para a API
        };
        await onSave(newBooking);
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Ocorreu um erro inesperado ao salvar o agendamento.");
    } finally {
        setIsSaving(false);
    }
  };

  const modalTitle = isPackageSale ? 'Vender Pacote de Serviços' : (isEditing ? 'Editar Agendamento' : 'Novo Agendamento');
  const submitButtonText = isPackageSale ? 'Adicionar Créditos' : (formData.isRecurring ? 'Criar Recorrência' : 'Salvar Agendamento');

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
                <option value="" disabled={!isEditing}>
                    {isEditing && !formData.userId ? 'Cliente Excluído' : 'Selecione um cliente'}
                </option>
                {clientUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
              {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
              {isEditing && !formData.userId && <p className="text-orange-500 text-xs mt-1">Este agendamento não tem um cliente associado (usuário pode ter sido excluído).</p>}
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
                {/* Opção de Recorrência (Apenas para Novo Agendamento) */}
                {!isEditing && (
                    <div className="pt-2 border-t border-gray-200">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                name="isRecurring"
                                checked={formData.isRecurring} 
                                onChange={handleChange} 
                                className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                            />
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Repeat size={16} /> Agendamento Recorrente?</span>
                        </label>
                    </div>
                )}
                
                {/* Campos de Agendamento Único / Recorrente */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="professionalId" className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                    <select id="professionalId" name="professionalId" value={formData.professionalId} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.professionalId ? 'border-red-500' : 'border-gray-300'}`}>
                      <option value="" disabled>Selecione um profissional</option>
                      {professionals.map(prof => <option key={prof.id} value={prof.id}>{prof.name}</option>)}
                    </select>
                    {errors.professionalId && <p className="text-red-500 text-xs mt-1">{errors.professionalId}</p>}
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                    <input type="number" id="duration" name="duration" value={formData.duration || ''} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
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
                            // Se estiver editando, adiciona o horário original se ele não estiver na lista (para permitir salvar sem mudar o horário)
                            [...new Set([...availableTimes, (isEditing ? originalBookingTime : '')])].filter(t => t).sort().map(time => <option key={time} value={time}>{time}</option>)
                        ) : (
                            <option disabled>Indisponível</option>
                        )}
                    </select>
                    {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                  </div>
                </div>
                
                {/* Campos de Recorrência */}
                {!isEditing && formData.isRecurring && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                        <div>
                            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                            <select id="frequency" name="frequency" value={formData.frequency} onChange={handleChange} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500">
                                <option value={RecurrenceFrequency.WEEKLY}>Semanalmente</option>
                                <option value={RecurrenceFrequency.MONTHLY}>Mensalmente</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Data Final da Recorrência</label>
                            <input type="date" id="endDate" name="endDate" value={formData.endDate} onChange={handleChange} min={formData.date} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`} />
                            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                        </div>
                        <div className="sm:col-span-2 text-sm text-gray-600">
                            <p>A recorrência será criada para todas as {formData.frequency === RecurrenceFrequency.WEEKLY ? 'semanas' : 'meses'} até a data final, no mesmo dia da semana ({selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long' })}).</p>
                        </div>
                    </div>
                )}
                
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas/Comentários</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500" disabled={formData.isRecurring}>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Concluído</option>
                    <option value="canceled">Cancelado</option>
                    <option value="Agendado">Agendado (Padrão)</option>
                  </select>
                  {formData.isRecurring && <p className="text-xs text-gray-500 mt-1">O status é fixo como 'active' para agendamentos recorrentes.</p>}
                </div>
              </>
            )}
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-400">
                {isSaving ? 'Salvando...' : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminBookingModal;