import React, { useState, useEffect } from 'react';
import { OperatingHours, DayOperatingHours } from '../types';

interface OperatingHoursFormProps {
  initialHours: OperatingHours;
  onSave: (hours: OperatingHours) => void;
}

const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const OperatingHoursForm: React.FC<OperatingHoursFormProps> = ({ initialHours, onSave }) => {
  const initialHoursStringKeys: OperatingHours = Object.fromEntries(
    Object.entries(initialHours).map(([key, value]) => [String(key), value])
  );
  
  const [hours, setHours] = useState<OperatingHours>(initialHoursStringKeys);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const newHours: OperatingHours = Object.fromEntries(
        Object.entries(initialHours).map(([key, value]) => [String(key), value])
    );
    setHours(newHours);
  }, [initialHours]);

  const handleToggleOpen = (dayIndex: number, open: boolean) => {
    const key = String(dayIndex);
    setHours(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        open: open,
        start: open && !prev[key]?.start ? '08:00' : prev[key]?.start,
        end: open && !prev[key]?.end ? '20:00' : prev[key]?.end,
        lunchStart: open && !prev[key]?.lunchStart ? '12:00' : prev[key]?.lunchStart,
        lunchEnd: open && !prev[key]?.lunchEnd ? '13:00' : prev[key]?.lunchEnd,
      },
    }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleTimeChange = (dayIndex: number, field: 'start' | 'end' | 'lunchStart' | 'lunchEnd', value: string) => {
    const key = String(dayIndex);
    setHours(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    for (let i = 0; i < 7; i++) {
      const key = String(i);
      const day = hours[key];
      if (day?.open) {
        if (!day.start || !day.end) {
          newErrors[key] = 'Horário de início e fim são obrigatórios.';
          isValid = false;
        } else if (timeToMinutes(day.start) >= timeToMinutes(day.end)) {
          newErrors[key] = 'O horário de início deve ser anterior ao horário de fim.';
          isValid = false;
        }
        
        if (day.lunchStart && day.lunchEnd) {
            const startMinutes = timeToMinutes(day.start);
            const endMinutes = timeToMinutes(day.end);
            const lunchStartMinutes = timeToMinutes(day.lunchStart);
            const lunchEndMinutes = timeToMinutes(day.lunchEnd);

            if (lunchStartMinutes >= lunchEndMinutes) {
                newErrors[key] = 'O início do almoço deve ser antes do fim do almoço.';
                isValid = false;
            } else if (lunchStartMinutes < startMinutes || lunchEndMinutes > endMinutes) {
                newErrors[key] = 'O horário de almoço deve estar dentro do horário de funcionamento.';
                isValid = false;
            }
        } else if (day.lunchStart || day.lunchEnd) {
            newErrors[key] = 'Ambos os horários de início e fim do almoço devem ser preenchidos.';
            isValid = false;
        }
      }
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalHours: OperatingHours = Object.fromEntries(
          Object.entries(hours).map(([key, value]) => [String(key), value])
      );
      onSave(finalHours);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Defina os horários em que a clínica está aberta para agendamentos, incluindo o intervalo de almoço.</p>
      </div>
      
      <div className="space-y-4">
        {dayNames.map((dayName, index) => {
          const key = String(index);
          const dayHours = hours[key] || { open: false };
          const isError = errors[key];
          
          return (
            <div key={key} className={`p-4 rounded-lg border transition-colors ${isError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{dayName}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={dayHours.open} onChange={(e) => handleToggleOpen(index, e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-pink-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">{dayHours.open ? 'Aberto' : 'Fechado'}</span>
                </label>
              </div>
              
              {dayHours.open && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`start-${key}`} className="block text-xs font-medium text-gray-500 mb-1">Início</label>
                      <input type="time" id={`start-${key}`} value={dayHours.start || ''} onChange={(e) => handleTimeChange(index, 'start', e.target.value)} className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${isError ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                    <div>
                      <label htmlFor={`end-${key}`} className="block text-xs font-medium text-gray-500 mb-1">Fim</label>
                      <input type="time" id={`end-${key}`} value={dayHours.end || ''} onChange={(e) => handleTimeChange(index, 'end', e.target.value)} className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${isError ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <label htmlFor={`lunchStart-${key}`} className="block text-xs font-medium text-gray-500 mb-1">Início Almoço</label>
                      <input type="time" id={`lunchStart-${key}`} value={dayHours.lunchStart || ''} onChange={(e) => handleTimeChange(index, 'lunchStart', e.target.value)} className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${isError ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                    <div>
                      <label htmlFor={`lunchEnd-${key}`} className="block text-xs font-medium text-gray-500 mb-1">Fim Almoço</label>
                      <input type="time" id={`lunchEnd-${key}`} value={dayHours.lunchEnd || ''} onChange={(e) => handleTimeChange(index, 'lunchEnd', e.target.value)} className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${isError ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                  </div>
                </>
              )}
              {isError && <p className="text-red-500 text-xs mt-2">{isError}</p>}
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-end">
        <button type="submit" className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 shadow">
          Salvar Horários
        </button>
      </div>
    </form>
  );
};

export default OperatingHoursForm;