import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { Check, X } from 'lucide-react';

interface FeaturedServicesFormProps {
  initialFeaturedIds: string[];
  availableServices: Service[];
  onSave: (featuredIds: string[]) => Promise<void>;
}

const FeaturedServicesForm: React.FC<FeaturedServicesFormProps> = ({ initialFeaturedIds, availableServices, onSave }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialFeaturedIds);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(initialFeaturedIds);
  }, [initialFeaturedIds]);

  const toggleService = (serviceId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else if (prev.length < 3) {
        return [...prev, serviceId];
      }
      return prev; // Limite de 3
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(selectedIds);
    setIsSaving(false);
  };
  
  const featuredServices = selectedIds.map(id => availableServices.find(s => s.id === id)).filter(Boolean) as Service[];
  const nonFeaturedServices = availableServices.filter(s => !selectedIds.includes(s.id));
  
  // Exclui o serviço de consulta gratuita da lista de seleção, mas permite que ele seja exibido se for o único
  const selectableServices = availableServices.filter(s => s.id !== '00000000-0000-0000-0000-000000000000');

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Selecione até 3 serviços para aparecerem em destaque na seção "Tratamentos em Destaque" da página inicial.</p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700">Serviços em Destaque ({selectedIds.length} de 3)</h4>
        <div className="flex flex-wrap gap-3">
          {featuredServices.map(service => (
            <div key={service.id} className="flex items-center bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-medium border border-pink-300">
              {service.name}
              <button onClick={() => toggleService(service.id)} className="ml-2 text-pink-500 hover:text-pink-800 p-0.5 rounded-full transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700">Serviços Disponíveis</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border rounded-lg bg-white">
          {selectableServices.map(service => (
            <button
              key={service.id}
              onClick={() => toggleService(service.id)}
              disabled={selectedIds.length >= 3 && !selectedIds.includes(service.id)}
              className={`flex items-center justify-between p-3 rounded-lg text-left transition-colors border ${
                selectedIds.includes(service.id)
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <span className="text-sm font-medium truncate">{service.name}</span>
              {selectedIds.includes(service.id) && <Check size={18} />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 shadow disabled:bg-gray-400">
          {isSaving ? 'Salvando...' : 'Salvar Destaques'}
        </button>
      </div>
    </div>
  );
};

export default FeaturedServicesForm;