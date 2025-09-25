import React, { useState } from 'react';
import { Service } from '../types';

interface ServiceModalProps {
  service: Partial<Service> | null;
  onClose: () => void;
  onSave: (service: Service) => void;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ service, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Service>>({
    id: service?.id || `service-${Date.now()}`,
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || 30,
    category: service?.category || '',
    imageUrl: service?.imageUrl || '',
    sessions: service?.sessions || 1,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isEditing = !!service?.id;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!formData.description?.trim()) newErrors.description = 'A descrição é obrigatória.';
    if (!formData.price || formData.price <= 0) newErrors.price = 'O preço deve ser maior que zero.';
    if (!formData.duration || formData.duration <= 0) newErrors.duration = 'A duração deve ser maior que zero.';
    if (!formData.sessions || formData.sessions < 1) newErrors.sessions = 'A quantidade de sessões deve ser de no mínimo 1.';
    if (!formData.category?.trim()) newErrors.category = 'A categoria é obrigatória.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseFloat(value) : value 
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          imageUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalFormData = { ...formData };
      if (!finalFormData.imageUrl) {
        finalFormData.imageUrl = `https://picsum.photos/seed/${finalFormData.name?.replace(/\s/g, '') || 'service'}/400/300`;
      }
      onSave(finalFormData as Service);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h2>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Form fields */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
            <div>
              <label htmlFor="sessions" className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Sessões (para pacotes)</label>
              <input type="number" id="sessions" name="sessions" value={formData.sessions} onChange={handleChange} min="1" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.sessions ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.sessions && <p className="text-red-500 text-xs mt-1">{errors.sessions}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                <input type="number" id="price" name="price" value={formData.price} onChange={handleChange} step="0.01" min="0" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.price ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
                <input type="number" id="duration" name="duration" value={formData.duration} onChange={handleChange} min="0" className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.category ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Serviço</label>
              <div className="mt-1 flex items-center gap-4">
                <span className="inline-block h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Pré-visualização" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5V5h9v12zm-2-6l-2.5 3.5L8.5 13l-1.5 2h6l-3.5-4.5z" />
                    </svg>
                  )}
                </span>
                <label htmlFor="image-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500">
                  <span>Selecionar Imagem</span>
                  <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceModal;