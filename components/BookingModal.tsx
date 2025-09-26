import React, { useState, useMemo } from 'react';
import { Service, Professional, Booking, User } from '../types';

interface BookingModalProps {
  service: Service;
  onClose: () => void;
  isCreditBooking?: boolean;
  booking?: Booking | null;
  onConfirmBooking: (details: { date: Date, professionalId: string }) => Promise<boolean>;
  professionals: User[];
}

const BookingModal: React.FC<BookingModalProps> = ({ service, onClose, isCreditBooking = false, booking = null, onConfirmBooking, professionals }) => {
  const isRescheduling = !!booking;

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(booking ? new Date(booking.date) : new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(booking ? new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const availableTimes = useMemo(() => {
    // This is still mock availability. A real app would fetch this from an API based on date.
    return ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  }, [selectedDate]);

  const handleDateChange = (dateString: string) => {
    if (!dateString) return;
    const newDate = new Date(dateString + 'T00:00:00');
    setSelectedDate(newDate);
    setSelectedTime(null);
  };
  
  const handleBookingConfirm = async () => {
    if (!selectedDate || !selectedTime || !professionals || professionals.length === 0) return;

    // Assign the first available professional automatically
    const assignedProfessionalId = professionals[0].id;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);

    const success = await onConfirmBooking({
        date: finalDate,
        professionalId: assignedProfessionalId,
    });
    
    if (success) {
        setShowConfirmation(true);
        setTimeout(onClose, 3000);
    } else {
        alert("Ocorreu um erro ao confirmar o agendamento.");
    }
  }

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
                        : "Você receberá um e-mail com os detalhes. Obrigado por escolher a BellezaPura!"
                    }
                </p>
            </div>
        );
    }

    switch (step) {
      case 1: // Date and Time
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">Escolha a data e o horário</h3>
            <div className="flex justify-center mb-4">
                <input 
                    type="date"
                    className="p-2 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                    value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableTimes.map(time => (
                <button key={time} onClick={() => setSelectedTime(time)} className={`p-2 rounded-md text-sm transition-colors ${selectedTime === time ? 'bg-pink-500 text-white' : 'bg-gray-100 hover:bg-pink-100'}`}>
                  {time}
                </button>
              ))}
            </div>
          </div>
        );
      case 2: // Confirmation
        return (
          <div>
            <h3 className="text-2xl font-bold mb-4 text-center">{isRescheduling ? 'Revisar Alterações' : 'Resumo do Agendamento'}</h3>
            <div className="bg-pink-50 p-4 rounded-lg space-y-3 text-gray-700">
                <div className="flex justify-between"><span className="font-semibold">Serviço:</span><span>{service.name}</span></div>
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
            <button onClick={() => setStep(s => s + 1)} disabled={!selectedTime} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-300 ml-auto">Avançar</button>
          ) : (
            <button onClick={handleBookingConfirm} className="w-full px-6 py-3 bg-green-500 text-white rounded-full font-bold text-lg hover:bg-green-600">{isRescheduling ? 'Confirmar Reagendamento' : (isCreditBooking ? 'Confirmar Agendamento' : 'Confirmar e Pagar')}</button>
          )}
        </div>}
      </div>
    </div>
  );
};

export default BookingModal;