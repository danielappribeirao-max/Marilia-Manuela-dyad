import React, { useState, useMemo } from 'react';
import { Booking, RecurringBooking, User, Service } from '../../types';
import { Trash2, Repeat, Calendar, Clock } from 'lucide-react';
import { formatPhone } from '../../utils/formatters';

interface RecurringInstanceModalProps {
  instance: Booking; // A instância clicada
  recurringRule: RecurringBooking; // A regra original
  onClose: () => void;
  onCancelInstance: (instance: Booking) => Promise<void>;
  onCancelRecurrence: (recurringBookingId: string) => Promise<void>;
  users: User[];
  services: Service[];
}

const RecurringInstanceModal: React.FC<RecurringInstanceModalProps> = ({ instance, recurringRule, onClose, onCancelInstance, onCancelRecurrence, users, services }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const client = useMemo(() => users.find(u => u.id === instance.userId), [users, instance.userId]);
  const service = useMemo(() => services.find(s => s.id === instance.serviceId), [services, instance.serviceId]);

  const handleCancelInstance = async () => {
    if (!window.confirm("Tem certeza que deseja cancelar APENAS esta instância do agendamento recorrente?")) return;
    setIsProcessing(true);
    await onCancelInstance(instance);
    setIsProcessing(false);
    onClose();
  };
  
  const handleCancelRecurrence = async () => {
    if (!window.confirm("ATENÇÃO: Tem certeza que deseja cancelar TODA a regra de recorrência? Todas as futuras instâncias serão removidas da agenda.")) return;
    setIsProcessing(true);
    await onCancelRecurrence(recurringRule.id);
    setIsProcessing(false);
    onClose();
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
  
  const formattedDate = instance.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = instance.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="recurring-instance-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900" id="recurring-instance-modal-title">Gerenciar Agendamento Recorrente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 space-y-4">
            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200 space-y-2">
                <h4 className="font-bold text-lg text-pink-800 flex items-center gap-2"><Calendar size={20} /> Instância Selecionada</h4>
                <p className="text-gray-800 font-semibold">{service?.name || 'Serviço Desconhecido'}</p>
                <p className="text-sm text-gray-700 flex items-center gap-1.5"><Calendar size={14} /> {formattedDate}</p>
                <p className="text-sm text-gray-700 flex items-center gap-1.5"><Clock size={14} /> {formattedTime} ({instance.duration} min)</p>
                <p className="text-sm text-gray-700">Cliente: <span className="font-semibold">{client?.name || 'Cliente Excluído'}</span> ({client?.phone ? formatPhone(client.phone) : 'N/A'})</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Repeat size={20} /> Regra de Recorrência</h4>
                <p className="text-sm text-gray-700">Frequência: <span className="font-semibold">{getFrequencyLabel(recurringRule.rrule)}</span></p>
                <p className="text-sm text-gray-700">Início: <span className="font-semibold">{new Date(recurringRule.startDate + 'T' + recurringRule.startTime).toLocaleDateString('pt-BR')}</span></p>
                <p className="text-sm text-gray-700">Fim: <span className="font-semibold">{getEndDate(recurringRule.rrule)}</span></p>
            </div>
            
            <div className="pt-4 border-t border-gray-200 space-y-3">
                <h4 className="font-semibold text-gray-800">Ações:</h4>
                <button
                    type="button"
                    onClick={handleCancelInstance}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-full border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                >
                    <Trash2 size={18} /> {isProcessing ? 'Cancelando...' : 'Cancelar APENAS esta Instância'}
                </button>
                <button
                    type="button"
                    onClick={handleCancelRecurrence}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-full border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                    <Repeat size={18} /> {isProcessing ? 'Cancelando Tudo...' : 'Cancelar TODA a Recorrência'}
                </button>
            </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringInstanceModal;