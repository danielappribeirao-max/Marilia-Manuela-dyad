import React, { useState, useEffect } from 'react';
import { OperatingHours, DayOperatingHours } from '../types';

interface OperatingHoursFormProps {
  initialHours: OperatingHours;
  onSave: (hours: OperatingHours) => void;
}

const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const OperatingHoursForm: React.FC<OperatingHoursFormProps> = ({ initialHours, onSave }) => {
  const [hours, setHours] = useState<OperatingHours>(initialHours);
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    setHours(initialHours);
  }, [initialHours]);

  const handleToggleOpen = (dayIndex: number, open: boolean) => {
    setHours(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        open: open,
        // Define horários padrão se abrir
        start: open && !prev[dayIndex]?.start ? '08:00' : prev[dayIndex]?.start,
        end: open && !prev[dayIndex]?.end ? '20:00' : prev[dayIndex]?.end,
      },
    }));
    if (errors[dayIndex]) setErrors(prev => ({ ...prev, [dayIndex]: '' }));
  };

  const handleTimeChange = (dayIndex: number, field: 'start' | 'end', value: string) => {
    setHours(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [field]: value,
      },
    }));
    if (errors[dayIndex]) setErrors(prev => ({ ...prev, [dayIndex]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: { [key: number]: string } = {};
    let isValid = true;

    for (let i = 0; i < 7; i++) {
      const day = hours[i];
      if (day.open) {
        if (!day.start || !day.end) {
          newErrors[i] = 'Horário de início e fim são obrigatórios.';
          isValid = false;
        } else if (timeToMinutes(day.start) >= timeToMinutes(day.end)) {
          newErrors[i] = 'O horário de início deve ser anterior ao horário de fim.';
          isValid = false;
        }
      }
    }
    setErrors(newErrors);
    return isValid;
  };
  
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(hours);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Defina os horários em que a clínica está aberta para agendamentos. Os horários devem ser em formato 24h (HH:MM).</p>
      </div>
      
      <div className="space-y-4">
        {dayNames.map((dayName, index) => {
          const dayHours = hours[index] || { open: false };
          const isError = errors[index];
          
          return (
            <div key={index} className={`p-4 rounded-lg border transition-colors ${isError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{dayName}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={dayHours.open} 
                        onChange={(e) => handleToggleOpen(index, e.target.checked)} 
                        className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-pink-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">{dayHours.open ? 'Aberto' : 'Fechado'}</span>
                </label>
              </div>
              
              {dayHours.open && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`start-${index}`} className="block text-xs font-medium text-gray-500 mb-1">Início</label>
                    <input 
                      type="time" 
                      id={`start-${index}`} 
                      value={dayHours.start || ''} 
                      onChange={(e) => handleTimeChange(index, 'start', e.target.value)} 
                      className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${isError ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label htmlFor={`end-${index}`} className="block text-xs font-medium text-gray-500 mb-1">Fim</label>
                    <input 
                      type="time" 
                      id={`end-${index}`} 
                      value={dayHours.end || ''} 
                      onChange={(e) => handleTimeChange(index, 'end', e.target.value)} 
                      className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${isError ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                </div>
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