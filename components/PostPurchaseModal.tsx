import React from 'react';
import { Service } from '../types';

interface PostPurchaseModalProps {
  service: Service;
  onScheduleNow: () => void;
  onScheduleLater: () => void;
}

const PostPurchaseModal: React.FC<PostPurchaseModalProps> = ({ service, onScheduleNow, onScheduleLater }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-green-600">Compra Concluída!</h2>
        </div>
        <div className="p-6 text-center space-y-4">
          <p className="text-lg text-gray-800">Seus créditos para **{service.name}** foram adicionados à sua conta.</p>
          <p className="text-gray-600">Gostaria de agendar sua primeira sessão agora?</p>
        </div>
        <div className="p-6 bg-gray-50 border-t flex flex-col gap-3">
          <button onClick={onScheduleNow} className="w-full px-5 py-3 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-colors">
            Sim, Agendar Agora
          </button>
          <button onClick={onScheduleLater} className="w-full px-5 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">
            Não, Agendar Depois (Minha Conta)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostPurchaseModal;