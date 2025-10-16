import React from 'react';
import { ServicePackage, Service } from '../types';
import { Edit, Trash2, DollarSign, Package } from 'lucide-react';

interface AdminPackageCardProps {
  servicePackage: ServicePackage;
  services: Service[];
  onEdit: (pkg: ServicePackage) => void;
  onDelete: (pkg: ServicePackage) => void;
}

const AdminPackageCard: React.FC<AdminPackageCardProps> = ({ servicePackage, services, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-shadow hover:shadow-lg">
      
      {/* Package Info */}
      <div className="flex items-center space-x-4 flex-grow min-w-0">
        <img 
          src={servicePackage.image} 
          alt={servicePackage.name} 
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
        />
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-800">{servicePackage.name}</h3>
          <p className="text-sm text-gray-500 truncate">{servicePackage.description}</p>
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            {servicePackage.services.map(({ serviceId, quantity }) => {
              const service = services.find(s => s.id === serviceId);
              return (
                <p key={serviceId} className="flex items-center gap-1.5">
                  <Package size={12} className="text-pink-500" />
                  {quantity}x {service?.name || 'Serviço Desconhecido'}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* Details and Actions */}
      <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
        
        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5 font-medium">
            <DollarSign size={16} className="text-green-600" />
            R$ {servicePackage.price.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {/* Actions - Vertical Stack */}
        <div className="flex flex-col space-y-2 flex-shrink-0 w-full sm:w-auto">
          <button 
            onClick={() => onEdit(servicePackage)} 
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            <Edit size={16} /> Editar
          </button>
          <button 
            onClick={() => onDelete(servicePackage)} 
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-full text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPackageCard;