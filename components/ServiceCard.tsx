import React from 'react';
import { Service } from '../types';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';

interface ServiceCardProps {
  // A função agora recebe apenas o serviço, pois a quantidade é sempre 1 para agendamento
  onBook: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onBook }) => {
  const isFreeConsultation = service.id === FREE_CONSULTATION_SERVICE_ID;
  
  const sessionsPerPackage = service.sessions || 1;

  const buttonText = isFreeConsultation ? 'Agendar Consulta Gratuita' : 'Agendar Serviço';
  const buttonClasses = isFreeConsultation 
    ? 'bg-green-500 hover:bg-green-600' 
    : 'bg-pink-500 hover:bg-pink-600';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
      <img src={service.image} alt={service.name} className="w-full h-48 object-cover" />
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{service.name}</h3>
        <p className="text-gray-600 text-sm flex-grow">{service.description}</p>
        
        {sessionsPerPackage > 1 && (
            <div className="mt-4 text-center bg-pink-100 text-pink-700 font-semibold py-1 px-3 rounded-full text-sm">
                Pacote com {sessionsPerPackage} sessões
            </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <span className={`text-lg font-semibold ${isFreeConsultation ? 'text-green-600' : 'text-pink-500'}`}>
            {isFreeConsultation ? 'GRATUITO' : `R$ ${service.price.toFixed(2).replace('.', ',')}`}
          </span>
          <span className="text-sm text-gray-500">{service.duration} min</span>
        </div>
        
        <button 
          onClick={() => onBook(service)}
          className={`mt-4 w-full text-white py-2 rounded-full font-semibold transition-colors duration-300 ${buttonClasses}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;