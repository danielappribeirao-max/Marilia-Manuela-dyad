import React from 'react';
import { ServicePackage, Service } from '../types';
import { useApp } from '../App';
import { Page } from '../types';

interface PackageCardProps {
  servicePackage: ServicePackage;
  services: Service[]; // To look up service names
  onBookPackage: (pkg: ServicePackage) => void; // Esta prop não será mais usada diretamente
}

const PackageCard: React.FC<PackageCardProps> = ({ servicePackage, services, onBookPackage }) => {
  
  const whatsappNumber = '5516993140852'; // (16) 99314-0852
  const serviceList = servicePackage.services.map(({ serviceId, quantity }) => {
      const service = services.find(s => s.id === serviceId);
      return `${quantity}x ${service?.name || 'Serviço Desconhecido'}`;
  }).join(', ');
  
  const message = `Olá, tenho interesse no Pacote Especial: ${servicePackage.name}. Ele inclui: ${serviceList}. Gostaria de agendar.`;
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
      <img src={servicePackage.image} alt={servicePackage.name} className="w-full h-48 object-cover" />
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{servicePackage.name}</h3>
        <p className="text-gray-600 text-sm mb-4 flex-grow">{servicePackage.description}</p>
        
        <div className="mb-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Este pacote inclui:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {servicePackage.services.map(({ serviceId, quantity }) => {
              const service = services.find(s => s.id === serviceId);
              if (!service) return null;
              return <li key={serviceId}>{quantity}x {service.name}</li>;
            })}
          </ul>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-200">
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gray-800 text-white py-2 rounded-full font-semibold hover:bg-pink-500 transition-colors duration-300 text-center block"
          >
            Agendar Serviço do Pacote
          </a>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;