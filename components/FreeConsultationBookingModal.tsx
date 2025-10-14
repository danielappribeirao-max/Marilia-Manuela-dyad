import React, { useState, useMemo, useEffect } from 'react';
import { User, OperatingHours, HolidayException } from '../types';
import { useAvailability } from '../hooks/useAvailability';
import { FREE_CONSULTATION_SERVICE } from '../constants';

interface FreeConsultationBookingModalProps {
  onClose: () => void;
  onConfirmBooking: (details: { date: Date, professionalId: string }) => Promise<boolean>;
  professionals: User[];
  clinicOperatingHours: OperatingHours | undefined;
  clinicHolidayExceptions: HolidayException[] | undefined;
}

const FreeConsultationBookingModal: React.FC<FreeConsultationBookingModalProps> = ({ onClose, onConfirmBooking, professionals, clinicOperatingHours, clinicHolidayExceptions }) => {
  const service = FREE_CONSULTATION_SERVICE;
  const serviceDuration = service.duration;

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  });

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate, selectedProfessionalId]);

  const handleDateChange = (dateString: string) => {
    if (!dateString) return;
    const newDate = new Date(dateString);
    const userTimezoneOffset = newDate.getTimezoneOffset() * 60000;
    setSelectedDate(new Date(newDate.getTime() + userTimezoneOffset));
  };
  
  const handleProfessionalChange = (id: string) => {
    setSelectedProfessionalId(id);
  };
  
  const handleBookingConfirm = async () => {
    if (!selectedDate || !selectedTime || !selectedProfessionalId) return;

    setIsSaving(true);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);

    const success = await onConfirmBooking({
        date: finalDate,
        professionalId: selectedProfessionalId,
    });
    
    setIsSaving(false);
    if (success) {
        setShowConfirmation(true);
        setTimeout(onClose, 3000);
    } else {
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
                <h3 className="text-2xl font-bold mt-4">Consulta Agendada!</h3>
                <p className="text-gray-600 mt-2">
                    Sua consulta gratuita foi confirmada. Você receberá um e-mail com os detalhes.
                </p>
            </div>
        );
    }

    const holidayName = clinicHolidayExceptions?.find(ex => ex.date === selectedDate?.toISOString().split('T')[0])?.name;
    
    let clinicHoursMessage = 'Selecione uma data.';
    if (selectedDate) {
        if (holidayName) {
            clinicHoursMessage = isClinicOpen 
                ? `Exceção: ${holidayName}. Aberto das ${currentDaySettings?.start} às ${currentDaySettings?.end}.`
                : `Exceção: ${holidayName}. Fechado o dia todo.`;
        } else {
            clinicHoursMessage = isClinicOpen 
                ? `Horário de funcionamento: ${currentDaySettings?.start} - ${currentDaySettings?.end}`
                : 'Clínica fechada neste dia.';
        }
        
        if (isClinicOpen && currentDaySettings?.lunchStart && currentDaySettings?.lunchEnd) {
            clinicHoursMessage += ` (Almoço: ${currentDaySettings.lunchStart} - ${currentDaySettings.lunchEnd})`;
        }
    }

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
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
            <div><h2 className="text-2xl font-bold">{service.name}</h2><p className="text-gray-500">{service.duration} min - Gratuito</p></div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6 flex-grow">{renderStep()}</div>
        {!showConfirmation && <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button 
            onClick={handleBookingConfirm} 
            disabled={!selectedTime || !selectedProfessionalId || !isClinicOpen || isSaving} 
            className="w-full px-6 py-3 bg-green-500 text-white rounded-full font-bold text-lg hover:bg-green-600 disabled:bg-gray-300"
          >
            {isSaving ? 'Agendando...' : 'Confirmar Consulta Gratuita'}
          </button>
        </div>}
      </div>
    </div>
  );
};

export default FreeConsultationBookingModal;