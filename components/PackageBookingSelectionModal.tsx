import React from 'react';
import { ServicePackage, Service, ServiceInPackage } from '../types';
import { CheckCircle } from 'lucide-react';

interface PackageBookingSelectionModalProps {
  pkg: ServicePackage;
  services: Service[];
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

const PackageBookingSelectionModal: React.FC<PackageBookingSelectionModalProps> = ({ pkg, services, onClose, onSelectService }) => {
  
  const servicesInPackage = pkg.services.map(item => {
    const service = services.find(s => s.id === item.serviceId);
    return { ...item, service };
  }).filter(item => item.service) as (ServiceInPackage & { service: Service })[];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-pink-600">Agendar Serviço do Pacote</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-600">Selecione qual serviço do pacote <span className="font-semibold">{pkg.name}</span> você deseja agendar agora:</p>
          
          <div className="space-y-3">
            {servicesInPackage.map(item => (
              <div key={item.serviceId} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-lg text-gray-800">{item.service.name}</h3>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-green-500" />
                    {item.quantity} sessões inclusas no pacote.
                </p>
                <button 
                  onClick={() => onSelectService(item.service)}
                  className="mt-3 w-full py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors"
                >
                  Agendar {item.service.name}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default PackageBookingSelectionModal;