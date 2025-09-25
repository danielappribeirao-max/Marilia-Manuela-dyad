import React from 'react';
import { ServiceTemplate } from '../services/templates';

interface IndividualServiceTemplateCardProps {
  template: ServiceTemplate;
  onUseTemplate: (template: ServiceTemplate) => void;
}

const IndividualServiceTemplateCard: React.FC<IndividualServiceTemplateCardProps> = ({ template, onUseTemplate }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200/80 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-lg hover:border-gray-300">
      <div className="relative">
        <img src={template.imageUrl} alt={template.name} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>
        <span className="absolute bottom-2 left-2 bg-pink-500/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">{template.category}</span>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-md font-bold text-gray-800 mb-2">{template.name}</h3>
        <p className="text-gray-600 text-xs flex-grow mb-3 line-clamp-3">{template.description}</p>
        
        <div className="flex justify-between items-center text-sm mb-4">
          <span className="font-semibold text-gray-700">
            R$ {template.price.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-gray-500">{template.duration} min</span>
        </div>

        <button 
          onClick={() => onUseTemplate(template)}
          className="mt-auto w-full bg-gray-100 text-gray-700 py-2 rounded-full font-semibold border border-gray-300 hover:bg-pink-100 hover:border-pink-400 hover:text-pink-800 transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
        >
          Usar este Modelo
        </button>
      </div>
    </div>
  );
};

export default IndividualServiceTemplateCard;
