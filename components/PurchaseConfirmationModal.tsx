import React from 'react';
import { Service } from '../types';

interface PurchaseConfirmationModalProps {
  service: Service;
  quantity: number;
  onConfirm: () => void;
  onClose: () => void;
}

const PurchaseConfirmationModal: React.FC<PurchaseConfirmationModalProps> = ({ service, quantity, onConfirm, onClose }) => {
  const totalPrice = service.price * quantity;
  const sessionsPerPackage = service.sessions || 1;
  const totalSessions = sessionsPerPackage * quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Confirmar Compra</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">Você está prestes a adquirir um pacote de serviços. Os créditos serão adicionados à sua conta após a confirmação.</p>
          <div className="bg-pink-50 p-4 rounded-lg space-y-3 text-gray-700">
            <div className="flex justify-between">
              <span className="font-semibold">Serviço:</span>
              <span>{service.name}</span>
            </div>
            {sessionsPerPackage > 1 && (
                <div className="flex justify-between">
                    <span className="font-semibold">Sessões por Pacote:</span>
                    <span>{sessionsPerPackage}</span>
                </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold">{sessionsPerPackage > 1 ? 'Quantidade de Pacotes:' : 'Quantidade:'}</span>
              <span>{quantity}</span>
            </div>
             <div className="flex justify-between">
              <span className="font-semibold">Total de Créditos:</span>
              <span>{totalSessions} sessões</span>
            </div>
            <hr className="my-3"/>
            <div className="flex justify-between text-xl font-bold text-gray-800">
              <span>Total a Pagar:</span>
              <span className="text-pink-600">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
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

export default PurchaseConfirmationModal;