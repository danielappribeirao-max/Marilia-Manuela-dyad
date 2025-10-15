import React from 'react';
import { Service } from '../types';
import { Edit, Trash2, Clock, DollarSign, Layers } from 'lucide-react';

interface AdminServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const AdminServiceCard: React.FC<AdminServiceCardProps> = ({ service, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-shadow hover:shadow-lg">
      
      {/* Service Info */}
      <div className="flex items-center space-x-4 flex-grow min-w-0">
        <img 
          src={service.imageUrl} 
          alt={service.name} 
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
        />
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-800">{service.name}</h3>
          <p className="text-sm text-gray-500 truncate">{service.description}</p>
        </div>
      </div>

      {/* Details and Actions */}
      <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
        
        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5 font-medium">
            <DollarSign size={16} className="text-green-600" />
            R$ {service.price.toFixed(2).replace('.', ',')}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={16} className="text-pink-500" />
            {service.duration} min
          </span>
          <span className="flex items-center gap-1.5">
            <Layers size={16} className="text-blue-500" />
            {service.sessions || 1} sessões
          </span>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 flex-shrink-0">
          <button 
            onClick={() => onEdit(service)} 
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            <Edit size={16} /> Editar
          </button>
          <button 
            onClick={() => onDelete(service)} 
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-full text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminServiceCard;