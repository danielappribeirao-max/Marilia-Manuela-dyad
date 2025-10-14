import React, { useState, useEffect } from 'react';
import { HolidayException } from '../types';
import { Trash2 } from 'lucide-react';

interface HolidayExceptionFormProps {
  initialExceptions: HolidayException[];
  onSave: (exceptions: HolidayException[]) => void;
}

const HolidayExceptionForm: React.FC<HolidayExceptionFormProps> = ({ initialExceptions, onSave }) => {
  const [exceptions, setExceptions] = useState<HolidayException[]>(initialExceptions);
  const [newException, setNewException] = useState<Partial<HolidayException>>({
    date: '',
    name: '',
    open: false,
    start: '08:00',
    end: '20:00',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setExceptions(initialExceptions);
  }, [initialExceptions]);

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const validateNewException = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!newException.date) newErrors.date = 'A data é obrigatória.';
    if (!newException.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    
    if (newException.open) {
      if (!newException.start || !newException.end) {
        newErrors.time = 'Horário de início e fim são obrigatórios.';
      } else if (timeToMinutes(newException.start) >= timeToMinutes(newException.end)) {
        newErrors.time = 'O horário de início deve ser anterior ao horário de fim.';
      }
    }
    
    if (exceptions.some(e => e.date === newException.date)) {
        newErrors.date = 'Já existe uma exceção para esta data.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddException = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateNewException() && newException.date && newException.name) {
      const finalException: HolidayException = {
        date: newException.date,
        name: newException.name,
        open: newException.open || false,
        start: newException.open ? newException.start : undefined,
        end: newException.open ? newException.end : undefined,
      };
      setExceptions(prev => [...prev, finalException].sort((a, b) => a.date.localeCompare(b.date)));
      setNewException({ date: '', name: '', open: false, start: '08:00', end: '20:00' });
      setErrors({});
    }
  };

  const handleRemoveException = (date: string) => {
    setExceptions(prev => prev.filter(e => e.date !== date));
  };

  const handleSaveAll = () => {
    onSave(exceptions);
  };
  
  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewException(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name] || errors.time) setErrors(prev => ({ ...prev, [name]: '', time: '' }));
  };

  const sortedExceptions = exceptions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Adicione datas específicas (feriados, eventos) onde o horário de funcionamento será diferente do padrão semanal.</p>
      </div>

      {/* Lista de Exceções Atuais */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">Exceções Cadastradas ({exceptions.length})</h4>
        {sortedExceptions.length === 0 ? (
            <p className="text-sm text-gray-500 p-3 bg-white rounded-md">Nenhuma exceção de feriado cadastrada.</p>
        ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {sortedExceptions.map(ex => (
                    <div key={ex.date} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
                        <div>
                            <p className="font-semibold text-gray-800">{ex.name} ({new Date(ex.date + 'T00:00:00').toLocaleDateString('pt-BR')})</p>
                            <p className={`text-sm ${ex.open ? 'text-green-600' : 'text-red-600'}`}>
                                {ex.open ? `Aberto: ${ex.start} - ${ex.end}` : 'Fechado o dia todo'}
                            </p>
                        </div>
                        <button onClick={() => handleRemoveException(ex.date)} className="text-red-500 hover:text-red-700 p-1 rounded-full transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Adicionar Nova Exceção */}
      <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
        <h4 className="font-semibold text-lg mb-3">Adicionar Nova Exceção</h4>
        <form onSubmit={handleAddException} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="date" className="block text-xs font-medium text-gray-700 mb-1">Data</label>
              <input 
                type="date" 
                id="date" 
                name="date" 
                value={newException.date} 
                onChange={handleNewChange} 
                className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">Nome do Feriado/Evento</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={newException.name} 
                onChange={handleNewChange} 
                placeholder="Ex: Carnaval, Aniversário da Cidade"
                className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                    type="checkbox" 
                    name="open"
                    checked={newException.open} 
                    onChange={handleNewChange} 
                    className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm font-medium text-gray-700">Clínica estará aberta?</span>
            </label>
          </div>

          {newException.open && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start" className="block text-xs font-medium text-gray-700 mb-1">Início</label>
                <input 
                  type="time" 
                  id="start" 
                  name="start" 
                  value={newException.start} 
                  onChange={handleNewChange} 
                  className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${errors.time ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              <div>
                <label htmlFor="end" className="block text-xs font-medium text-gray-700 mb-1">Fim</label>
                <input 
                  type="time" 
                  id="end" 
                  name="end" 
                  value={newException.end} 
                  onChange={handleNewChange} 
                  className={`w-full p-2 border rounded-md shadow-sm text-gray-900 ${errors.time ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
            </div>
          )}
          {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}

          <button type="submit" className="w-full px-4 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors">
            Adicionar Exceção
          </button>
        </form>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={handleSaveAll} className="px-6 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 shadow">
          Salvar Todas as Exceções
        </button>
      </div>
    </div>
  );
};

export default HolidayExceptionForm;