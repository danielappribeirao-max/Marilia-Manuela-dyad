import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Service, Booking, User } from '../types';
import * as api from '../services/api';

interface BookingModalProps {
  service: Service;
  onClose: () => void;
  isCreditBooking?: boolean;
  booking?: Booking | null;
  onConfirmBooking: (details: { date: Date, professionalId: string }) => Promise<boolean>;
  professionals: User[];
}

// Função utilitária para converter HH:MM para minutos desde a meia-noite
const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

// Função utilitária para converter minutos para HH:MM
const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose, isCreditBooking = false, booking = null, onConfirmBooking, professionals }) => {
  const isRescheduling = !!booking;

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(booking ? new Date(booking.date) : new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(booking ? new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(booking?.professionalId || null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<{ professional_id: string, booking_time: string, duration: number }[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const serviceDuration = service.duration;
  const minBookingDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const fetchAvailability = useCallback(async (date: Date) => {
    setLoadingAvailability(true);
    const dateString = date.toISOString().split('T')[0];
    const slots = await api.getOccupiedSlots(dateString);
    setOccupiedSlots(slots);
    setLoadingAvailability(false);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, fetchAvailability]);

  const availableTimes = useMemo(() => {
    if (!selectedDate || !selectedProfessionalId) return [];

    const startDayMinutes = timeToMinutes("08:00"); // 8:00 AM
    const endDayMinutes = timeToMinutes("20:00");   // 8:00 PM
    const interval = 30; // Slots de 30 minutos
    
    const times: string[] = [];
    
    // 1. Filtrar agendamentos ocupados para o profissional selecionado
    const professionalOccupiedSlots = occupiedSlots.filter(slot => slot.professional_id === selectedProfessionalId);

    // 2. Gerar todos os slots possíveis e verificar conflitos
    for (let minutes = startDayMinutes; minutes < endDayMinutes; minutes += interval) {
        const slotStartTime = minutes;
        const slotEndTime = minutes + serviceDuration;
        
        // Se o serviço for muito longo e ultrapassar o horário de fechamento, pular
        if (slotEndTime > endDayMinutes) continue;

        let isAvailable = true;

        // Verificar conflito com agendamentos existentes
        for (const occupied of professionalOccupiedSlots) {
            const occupiedStart = timeToMinutes(occupied.booking_time);
            const occupiedEnd = occupiedStart + occupied.duration;
            
            // Se estiver reagendando o mesmo booking, ignore o conflito com ele mesmo
            if (isRescheduling && booking?.id === occupied.id) continue;

            // Conflito se o novo slot começar durante um agendamento existente OU
            // se o novo slot terminar durante um agendamento existente OU
            // se o novo slot englobar um agendamento existente
            const overlaps = (slotStartTime < occupiedEnd && occupiedStart < slotEndTime);

            if (overlaps) {
                isAvailable = false;
                break;
            }
        }

        if (isAvailable) {
            times.push(minutesToTime(minutes));
        }
    }

    return times;
  }, [selectedDate, selectedProfessionalId, occupiedSlots, serviceDuration, isRescheduling, booking?.id]);

  const handleDateChange = (dateString: string) => {
    if (!dateString) return;
    const newDate = new Date(dateString + 'T00:00:00');
    setSelectedDate(newDate);
    setSelectedTime(null); // Resetar horário ao mudar a data
  };
  
  const handleProfessionalChange = (id: string) => {
    setSelectedProfessionalId(id);
    setSelectedTime(null); // Resetar horário ao mudar o profissional
  };
  
  const handleBookingConfirm = async () => {
    if (!selectedDate || !selectedTime || !selectedProfessionalId) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const finalDate = new Date(selectedDate);
    // Ajustar para o horário selecionado (o input date é sempre 00:00:00)
    finalDate.setHours(hours, minutes, 0, 0);

    const success = await onConfirmBooking({
        date: finalDate,
        professionalId: selectedProfessionalId,
    });
    
    if (success) {
        setShowConfirmation(true);
        setTimeout(onClose, 3000);
    } else {
        alert("Ocorreu um erro ao confirmar o agendamento. Por favor, verifique se todos os dados estão corretos e tente novamente.");
    }
  }

  const selectedProfessional = useMemo(() => 
    professionals.find(p => p.id === selectedProfessionalId), 
  [professionals, selectedProfessionalId]);

  const renderStep = () => {
    if (showConfirmation) {
        return (
            <div className="text-center p-8">
                <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h3 className="text-2xl font-bold mt-4">{isRescheduling ? 'Agendamento Reagendado!' : 'Agendamento Confirmado!'}</h3>
                <p className="text-gray-600 mt-2">
                    {isRescheduling
                        ? "Seu agendamento foi atualizado com sucesso. Nos vemos em breve!"
                        : isCreditBooking 
                        ? "Um crédito foi utilizado com sucesso. Mal podemos esperar para te ver!" 
                        : "Você receberá um e-mail com os detalhes. Obrigado por escolher a Marília Manuela!"
                    }
                </p>
            </div>
        );
    }

    switch (step) {
      case 1: // Date, Time, and Professional
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-center">1. Escolha a data</h3>
              <div className="flex justify-center">
                  <input 
                      type="date"
                      className="p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 w-full"
                      value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={minBookingDate}
                  />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-center">2. Escolha o profissional</h3>
              <select
                value={selectedProfessionalId || ''}
                onChange={(e) => handleProfessionalChange(e.target.value)}
                className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="" disabled>Selecione um profissional</option>
                {professionals.map(prof => (
                  <option key={prof.id} value={prof.id}>{prof.name}</option>
                ))}
              </select>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-center">3. Escolha o horário ({serviceDuration} min)</h3>
              {loadingAvailability ? (
                  <div className="text-center text-gray-500">Carregando horários...</div>
              ) : !selectedProfessionalId ? (
                  <div className="text-center text-gray-500">Selecione um profissional para ver os horários.</div>
              ) : availableTimes.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableTimes.map(time => (
                      <button key={time} onClick={() => setSelectedTime(time)} className={`p-2 rounded-md text-sm transition-colors ${selectedTime === time ? 'bg-pink-500 text-white' : 'bg-gray-100 hover:bg-pink-100'}`}>
                        {time}
                      </button>
                    ))}
                  </div>
              ) : (
                  <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">Nenhum horário disponível para este profissional na data selecionada.</div>
              )}
            </div>
          </div>
        );
      case 2: // Confirmation
        return (
          <div>
            <h3 className="text-2xl font-bold mb-4 text-center">{isRescheduling ? 'Revisar Alterações' : 'Resumo do Agendamento'}</h3>
            <div className="bg-pink-50 p-4 rounded-lg space-y-3 text-gray-700">
                <div className="flex justify-between"><span className="font-semibold">Serviço:</span><span>{service.name}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Profissional:</span><span>{selectedProfessional?.name || 'Não selecionado'}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Data:</span><span>{selectedDate?.toLocaleDateString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Horário:</span><span>{selectedTime}</span></div>
                <hr className="my-3"/>
                {isRescheduling ? (<div className="flex justify-between text-xl font-bold text-gray-800"><span>Custo da Alteração:</span><span className="text-green-600">Grátis</span></div>
                ) : isCreditBooking ? (<div className="flex justify-between text-xl font-bold text-gray-800"><span>Custo:</span><span className="text-green-600">1 Crédito</span></div>
                ) : (<div className="flex justify-between text-xl font-bold text-gray-800"><span>Total:</span><span className="text-pink-600">R$ {service.price.toFixed(2).replace('.', ',')}</span></div>)}
            </div>
            {!isCreditBooking && !isRescheduling && <p className="text-xs text-gray-500 mt-4 text-center">O pagamento será processado de forma segura. Após a confirmação, o horário será reservado para você.</p>}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
            <div><h2 className="text-2xl font-bold">{isRescheduling ? 'Reagendar Horário' : service.name}</h2><p className="text-gray-500">{service.duration} min</p></div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6 flex-grow">{renderStep()}</div>
        {!showConfirmation && <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
          {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">Voltar</button>}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!selectedTime || !selectedProfessionalId} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-300 ml-auto">Avançar</button>
          ) : (
            <button onClick={handleBookingConfirm} className="w-full px-6 py-3 bg-green-500 text-white rounded-full font-bold text-lg hover:bg-green-600">{isRescheduling ? 'Confirmar Reagendamento' : (isCreditBooking ? 'Confirmar Agendamento' : 'Confirmar e Pagar')}</button>
          )}
        </div>}
      </div>
    </div>
  );
};

export default BookingModal;