import React, { useState } from 'react';
import { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  onPurchaseOrBook: (service: Service, quantity: number) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPurchaseOrBook }) => {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (amount: number) => {
    setQuantity(prev => Math.max(1, prev + amount));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
      <img src={service.imageUrl} alt={service.name} className="w-full h-48 object-cover" />
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{service.name}</h3>
        <p className="text-gray-600 text-sm flex-grow">{service.description}</p>
        
        {service.sessions && service.sessions > 1 && (
            <div className="mt-4 text-center bg-pink-100 text-pink-700 font-semibold py-1 px-3 rounded-full text-sm">
                Pacote com {service.sessions} sessões
            </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <span className="text-lg font-semibold text-pink-500">
            R$ {service.price.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-sm text-gray-500">{service.duration} min</span>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => handleQuantityChange(-1)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-300">-</button>
          <span className="text-xl font-bold w-12 text-center">{quantity}</span>
          <button onClick={() => handleQuantityChange(1)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-300">+</button>
        </div>
        {quantity > 1 && <p className="text-center text-sm text-gray-500 mt-2">Total: R$ {(service.price * quantity).toFixed(2).replace('.',',')}</p>}

        <button 
          onClick={() => onPurchaseOrBook(service, quantity)}
          className="mt-4 w-full bg-gray-800 text-white py-2 rounded-full font-semibold hover:bg-pink-500 transition-colors duration-300"
        >
          {quantity > 1 || (service.sessions && service.sessions > 1) ? 'Comprar Pacote' : 'Agendar Agora'}
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;