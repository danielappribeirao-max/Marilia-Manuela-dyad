
import React from 'react';
import { ServicePackage, Service } from '../types';

interface PackagePurchaseConfirmationModalProps {
  servicePackage: ServicePackage;
  services: Service[];
  onConfirm: () => void;
  onClose: () => void;
}

const PackagePurchaseConfirmationModal: React.FC<PackagePurchaseConfirmationModalProps> = ({ servicePackage, services, onConfirm, onClose }) => {

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Confirmar Compra de Pacote</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">Você está adquirindo o pacote <strong>{servicePackage.name}</strong>. Os créditos dos serviços abaixo serão adicionados à sua conta.</p>
          <div className="bg-pink-50 p-4 rounded-lg space-y-3 text-gray-700">
            <h4 className="font-bold">Serviços Inclusos:</h4>
            <ul className="space-y-2">
                {servicePackage.services.map(({ serviceId, quantity }) => {
                    const service = services.find(s => s.id === serviceId);
                    if (!service) return null;
                    return (
                        <li key={serviceId} className="flex justify-between text-sm">
                            <span>{quantity}x {service.name}</span>
                            <span className="font-medium text-gray-500">({service.duration} min cada)</span>
                        </li>
                    );
                })}
            </ul>
            <hr className="my-3"/>
            <div className="flex justify-between text-xl font-bold text-gray-800">
              <span>Total a Pagar:</span>
              <span className="text-pink-600">R$ {servicePackage.price.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-5 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600">
            Confirmar e Pagar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackagePurchaseConfirmationModal;
