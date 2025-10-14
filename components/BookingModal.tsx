import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Service, Booking, User, OperatingHours, DayOperatingHours, HolidayException } from '../types';
import { useAvailability } from '../hooks/useAvailability';
import * as api from '../services/api'; // Importar a API

interface BookingModalProps {
  service: Service;
  onClose: () => void;
  isCreditBooking?: boolean;
  booking?: Booking | null;
  onConfirmBooking: (details: { date: Date, professionalId: string }) => Promise<boolean>;
  professionals: User[];
  clinicOperatingHours: OperatingHours | undefined;
  clinicHolidayExceptions: HolidayException[] | undefined; // CORRIGIDO: Deve ser um array
  tempClientData?: { name: string; phone: string; description: string } | null; // Novo: Dados temporários do cliente
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose, isCreditBooking = false, booking = null, onConfirmBooking, professionals, clinicOperatingHours, clinicHolidayExceptions, tempClientData = null }) => {
  const isRescheduling = !!booking;
  const isFreeConsultation = service.id === '00000000-0000-0000-0000-000000000000'; // Usar o ID da constante
  const isNewUserFreeBooking = isFreeConsultation && !!tempClientData;

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(booking ? new Date(booking.date) : new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(booking ? new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5) : null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(booking?.professionalId || null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const serviceDuration = service.duration;
  const minBookingDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const {
    availableTimes,
    loadingAvailability,
    currentDaySettings,
    isClinicOpen,
  } = useAvailability({
    selectedDate,
    selectedProfessionalId,
    serviceDuration,
    clinicOperatingHours,
    clinicHolidayExceptions,
    bookingToIgnoreId: booking?.id,
  });

  useEffect(() => {
    // Se a data mudar, resetar o horário selecionado
    setSelectedTime(null);
  }, [selectedDate, selectedProfessionalId]);

  const handleDateChange = (dateString: string) => {
    if (!dateString) return;
    // CORREÇÃO: Cria a data baseada na string YYYY-MM-DD, mas garante que o objeto Date
    // represente o início do dia no fuso horário local, evitando que o getDay() retorne o dia anterior.
    const [year, month, day] = dateString.split('-').map(Number);
    setSelectedDate(new Date(year, month - 1, day));
  };
  
  const handleProfessionalChange = (id: string) => {
    setSelectedProfessionalId(id);
  };
  
  const handleBookingConfirm = async () => {
    if (!selectedDate || !selectedTime || !selectedProfessionalId) return;

    setIsProcessing(true);
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    // Cria a data final no fuso horário local
    const finalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, minutes, 0, 0);

    // Chama a função de confirmação no App.tsx, que lida com todos os fluxos (logado, crédito, reagendamento, consulta gratuita)
    const success = await onConfirmBooking({
        date: finalDate,
        professionalId: selectedProfessionalId,
    });
    
    setIsProcessing(false);

    if (success) {
        setShowConfirmation(true);
        // Fecha o modal após a confirmação e um breve delay
        setTimeout(onClose, isNewUserFreeBooking ? 5000 : 3000); 
    } else {
        // O erro já deve ter sido alertado no App.tsx ou na Edge Function
        alert("Ocorreu um erro ao confirmar o agendamento. Por favor, tente novamente.");
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
                    {isNewUserFreeBooking
                        ? `Sua consulta gratuita foi agendada com sucesso! Entraremos em contato pelo WhatsApp ${tempClientData?.phone}.`
                        : isRescheduling
                        ? "Seu agendamento foi atualizado com sucesso. Nos vemos em breve!"
                        : isCreditBooking 
                        ? "Um crédito foi utilizado com sucesso. Mal podemos esperar para te ver!" 
                        : "Você receberá um e-mail com os detalhes. Obrigado por escolher a Marília Manuela!"
                    }
                </p>
                {isNewUserFreeBooking && (
                    <p className="text-sm text-pink-600 mt-4 font-semibold">
                        Você pode fazer login usando o e-mail temporário ({tempClientData?.phone}@mariliamanuela.com) e a senha padrão (senhaPadrao123) para gerenciar seu agendamento.
                    </p>
                )}
            </div>
        );
    }

    const holidayName = clinicHolidayExceptions?.find(ex => ex.date === selectedDate?.toISOString().split('T')[0])?.name;
    
    let clinicHoursMessage = 'Selecione uma data.';
    if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0];
        const holiday = clinicHolidayExceptions?.find(ex => ex.date === dateString);
        
        if (holiday) {
            clinicHoursMessage = isClinicOpen 
                ? `Exceção: ${holiday.name}. Aberto das ${currentDaySettings?.start} às ${currentDaySettings?.end}.`
                : `Exceção: ${holiday.name}. Fechado o dia todo.`;
        } else {
            clinicHoursMessage = isClinicOpen 
                ? `Horário de funcionamento: ${currentDaySettings?.start} - ${currentDaySettings?.end}`
                : 'Clínica fechada neste dia.';
        }
        
        if (isClinicOpen && currentDaySettings?.lunchStart && currentDaySettings?.lunchEnd) {
            clinicHoursMessage += ` (Almoço: ${currentDaySettings.lunchStart} - ${currentDaySettings.lunchEnd})`;
        }
    }

    switch (step) {
      case 1: // Date, Time, and Professional
        return (
          <div className="space-y-6">
            {isNewUserFreeBooking && (
                <div className="bg-pink-50 p-3 rounded-lg text-sm text-pink-800 font-semibold">
                    Agendando consulta gratuita para: {tempClientData?.name} ({tempClientData?.phone})
                </div>
            )}
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
              <p className={`text-center text-sm mt-2 ${isClinicOpen ? 'text-gray-600' : 'text-red-500 font-semibold'}`}>{clinicHoursMessage}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-center">2. Escolha o profissional</h3>
              <select
                value={selectedProfessionalId || ''}
                onChange={(e) => handleProfessionalChange(e.target.value)}
                className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                disabled={!isClinicOpen}
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
              ) : !isClinicOpen ? (
                  <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">A clínica está fechada neste dia.</div>
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
                {isFreeConsultation ? (
                    <div className="flex justify-between text-xl font-bold text-gray-800"><span>Custo:</span><span className="text-green-600">GRATUITO</span></div>
                ) : isRescheduling ? (
                    <div className="flex justify-between text-xl font-bold text-gray-800"><span>Custo da Alteração:</span><span className="text-green-600">Grátis</span></div>
                ) : isCreditBooking ? (
                    <div className="flex justify-between text-xl font-bold text-gray-800"><span>Custo:</span><span className="text-green-600">1 Crédito</span></div>
                ) : (
                    <div className="flex justify-between text-xl font-bold text-gray-800"><span>Total:</span><span className="text-pink-600">R$ {service.price.toFixed(2).replace('.', ',')}</span></div>
                )}
            </div>
            {!isCreditBooking && !isRescheduling && !isFreeConsultation && <p className="text-xs text-gray-500 mt-4 text-center">O pagamento será processado de forma segura. Após a confirmação, o horário será reservado para você.</p>}
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
            <button onClick={() => setStep(s => s + 1)} disabled={!selectedTime || !selectedProfessionalId || !isClinicOpen} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-300 ml-auto">Avançar</button>
          ) : (
            <button onClick={handleBookingConfirm} disabled={isProcessing} className="w-full px-6 py-3 bg-green-500 text-white rounded-full font-bold text-lg hover:bg-green-600 disabled:bg-gray-400">
                {isProcessing ? 'Processando...' : (isRescheduling ? 'Confirmar Reagendamento' : 'Confirmar Agendamento')}
            </button>
          )}
        </div>}
      </div>
    </div>
  );
};

export default BookingModal;