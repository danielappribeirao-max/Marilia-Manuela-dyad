import React, { useState, useMemo } from 'react';
import { RecurringBooking, User, Service } from '../types';
import { Trash2, Repeat } from 'lucide-react';
import { formatPhone } from '../utils/formatters';

interface RecurringBookingCancelModalProps {
  recurringBooking: RecurringBooking;
  onClose: () => void;
  onConfirmCancel: (recurringBookingId: string) => Promise<void>;
  users: User[];
  services: Service[];
}

const RecurringBookingCancelModal: React.FC<RecurringBookingCancelModalProps> = ({ recurringBooking, onClose, onConfirmCancel, users, services }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const client = useMemo(() => users.find(u => u.id === recurringBooking.userId), [users, recurringBooking.userId]);
  const service = useMemo(() => services.find(s => s.id === recurringBooking.serviceId), [services, recurringBooking.serviceId]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirmCancel(recurringBooking.id);
    // O fechamento é tratado pela função onConfirmCancel no AdminAgenda
  };
  
  const getFrequencyLabel = (rrule: string) => {
      if (rrule.includes('FREQ=WEEKLY')) return 'Semanalmente';
      if (rrule.includes('FREQ=MONTHLY')) return 'Mensalmente';
      return 'Recorrência';
  };
  
  const getEndDate = (rrule: string) => {
      const untilPart = rrule.split(';').find(p => p.startsWith('UNTIL='));
      if (untilPart) {
          const dateStr = untilPart.split('=')[1]; // YYYYMMDD
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          return new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString('pt-BR');
      }
      return 'Indefinida';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-recurring-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900" id="cancel-recurring-modal-title">Cancelar Agendamento Recorrente</h3>
              <div className="mt-2 space-y-3">
                <p className="text-sm text-gray-600">Tem certeza que deseja cancelar a regra de recorrência abaixo? Todas as futuras instâncias serão removidas da agenda.</p>
                
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                    <p className="font-bold text-gray-800 flex items-center gap-2"><Repeat size={16} /> {service?.name || 'Serviço Desconhecido'}</p>
                    <p className="mt-1 text-gray-700">Cliente: <span className="font-semibold">{client?.name || 'Cliente Excluído'}</span></p>
                    <p className="text-gray-700">Frequência: <span className="font-semibold">{getFrequencyLabel(recurringBooking.rrule)}</span></p>
                    <p className="text-gray-700">Início: <span className="font-semibold">{new Date(recurringBooking.startDate + 'T' + recurringBooking.startTime).toLocaleDateString('pt-BR')} às {recurringBooking.startTime}</span></p>
                    <p className="text-gray-700">Fim: <span className="font-semibold">{getEndDate(recurringBooking.rrule)}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`w-full inline-flex justify-center rounded-full border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-300 bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-400`}
          >
            {isProcessing ? 'Cancelando...' : 'Sim, Cancelar Recorrência'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors duration-300"
          >
            Manter
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringBookingCancelModal;