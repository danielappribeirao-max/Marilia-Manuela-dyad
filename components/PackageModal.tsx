import React, { useState, useMemo, useEffect } from 'react';
import { ServicePackage, Service, ServiceInPackage } from '../types';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface PackageModalProps {
  pkg: Partial<ServicePackage> | null;
  onClose: () => void;
  onSave: (pkg: ServicePackage) => void;
  availableServices: Service[];
}

const PackageModal: React.FC<PackageModalProps> = ({ pkg, onClose, onSave, availableServices }) => {
  const isEditing = !!pkg?.id;
  
  const [formData, setFormData] = useState<Partial<ServicePackage>>({
    id: pkg?.id, 
    name: pkg?.name || '',
    description: pkg?.description || '',
    price: pkg?.price || 0,
    imageUrl: pkg?.imageUrl || '',
    services: pkg?.services || [],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Efeito para garantir que o estado seja resetado se a prop 'pkg' mudar
  useEffect(() => {
    setFormData({
      id: pkg?.id, 
      name: pkg?.name || '',
      description: pkg?.description || '',
      price: pkg?.price || 0,
      imageUrl: pkg?.imageUrl || '',
      services: pkg?.services || [],
    });
    setErrors({});
  }, [pkg]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!formData.description?.trim()) newErrors.description = 'A descrição é obrigatória.';
    
    const price = Number(formData.price);
    if (isNaN(price) || price <= 0) newErrors.price = 'O preço deve ser maior que zero.';
    
    if (!formData.services || formData.services.length === 0) {
        newErrors.services = 'O pacote deve incluir pelo menos um serviço.';
    } else if (formData.services.some(s => s.quantity <= 0)) {
        newErrors.services = 'A quantidade de sessões deve ser maior que zero para todos os serviços.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let finalValue: string | number = value;
    if (type === 'number') {
        finalValue = value === '' ? 0 : parseFloat(value);
    }
    
    setFormData(prev => ({ 
        ...prev, 
        [name]: finalValue 
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
  
  // --- Gerenciamento de Serviços no Pacote ---
  const [newServiceId, setNewServiceId] = useState('');
  const [newServiceQuantity, setNewServiceQuantity] = useState(1);
  
  const handleAddService = () => {
    if (!newServiceId || newServiceQuantity <= 0) return;
    
    const existingIndex = formData.services!.findIndex(s => s.serviceId === newServiceId);
    
    setFormData(prev => {
        const newServices = [...prev.services!];
        if (existingIndex !== -1) {
            // Atualiza a quantidade se o serviço já existir
            newServices[existingIndex].quantity += newServiceQuantity;
        } else {
            // Adiciona novo serviço
            newServices.push({ serviceId: newServiceId, quantity: newServiceQuantity });
        }
        return { ...prev, services: newServices };
    });
    
    setNewServiceId('');
    setNewServiceQuantity(1);
    if (errors.services) setErrors(prev => ({ ...prev, services: '' }));
  };
  
  const handleUpdateServiceQuantity = (serviceId: string, amount: number) => {
    setFormData(prev => {
        const newServices = prev.services!.map(s => {
            if (s.serviceId === serviceId) {
                return { ...s, quantity: Math.max(1, s.quantity + amount) };
            }
            return s;
        }).filter(s => s.quantity > 0); // Remove se a quantidade for zero
        return { ...prev, services: newServices };
    });
  };
  
  const handleRemoveService = (serviceId: string) => {
    setFormData(prev => ({
        ...prev,
        services: prev.services!.filter(s => s.serviceId !== serviceId),
    }));
  };
  // ------------------------------------------

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalFormData = { ...formData };
      
      if (!isEditing) {
          delete finalFormData.id;
      }
      
      if (!finalFormData.imageUrl) {
        const seed = finalFormData.name?.replace(/\s/g, '') || 'package';
        finalFormData.imageUrl = `https://picsum.photos/seed/${seed}/400/300`;
      }
      
      const packageToSave: ServicePackage = {
          id: finalFormData.id || '',
          name: finalFormData.name!,
          description: finalFormData.description!,
          price: Number(finalFormData.price),
          imageUrl: finalFormData.imageUrl!,
          services: finalFormData.services!,
      };
      
      onSave(packageToSave);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">{isEditing ? 'Editar Pacote' : 'Adicionar Novo Pacote'}</h2>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            
            {/* Informações Básicas */}
            <div className="space-y-4 border p-4 rounded-lg">
                <h3 className="font-semibold text-lg">Detalhes do Pacote</h3>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Pacote</label>
                  <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={3} className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Preço Total (R$)</label>
                  <input 
                      type="number" 
                      id="price" 
                      name="price" 
                      value={formData.price || 0} 
                      onChange={handleChange} 
                      step="0.01" 
                      min="0.01"
                      className={`w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 ${errors.price ? 'border-red-500' : 'border-gray-300'}`} 
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>
            </div>
            
            {/* Imagem */}
            <div className="space-y-4 border p-4 rounded-lg">
                <h3 className="font-semibold text-lg">Imagem do Pacote</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Pacote</label>
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
                    <label htmlFor="image-upload" className="cursor-pointer w-full sm:w-auto text-center bg-white py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500">
                      <span>Selecionar Imagem</span>
                      <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>
            </div>

            {/* Serviços Inclusos */}
            <div className="space-y-4 border p-4 rounded-lg">
                <h3 className="font-semibold text-lg">Serviços Inclusos</h3>
                
                {/* Lista de Serviços Atuais */}
                {formData.services && formData.services.length > 0 && (
                    <div className="space-y-2">
                        {formData.services.map(item => {
                            const service = availableServices.find(s => s.id === item.serviceId);
                            if (!service) return null;
                            
                            return (
                                <div key={item.serviceId} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border">
                                    <span className="font-medium text-gray-700">{service.name}</span>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-1">
                                            <button type="button" onClick={() => handleUpdateServiceQuantity(item.serviceId, -1)} className="p-1 bg-gray-200 rounded-full hover:bg-gray-300"><Minus size={14} /></button>
                                            <span className="font-bold w-6 text-center">{item.quantity}x</span>
                                            <button type="button" onClick={() => handleUpdateServiceQuantity(item.serviceId, 1)} className="p-1 bg-gray-200 rounded-full hover:bg-gray-300"><Plus size={14} /></button>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveService(item.serviceId)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {errors.services && <p className="text-red-500 text-xs mt-1">{errors.services}</p>}

                {/* Adicionar Novo Serviço */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                    <h4 className="font-medium text-gray-700">Adicionar Serviço:</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <select 
                                value={newServiceId} 
                                onChange={(e) => setNewServiceId(e.target.value)}
                                className="w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 border-gray-300"
                            >
                                <option value="" disabled>Selecione um serviço</option>
                                {availableServices
                                    .filter(s => s.id !== '00000000-0000-0000-0000-000000000000') // Exclui consulta gratuita
                                    .map(service => (
                                    <option key={service.id} value={service.id}>{service.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <input 
                                type="number" 
                                value={newServiceQuantity} 
                                onChange={(e) => setNewServiceQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="w-full p-2 border bg-white text-gray-900 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 border-gray-300"
                            />
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={handleAddService} 
                        disabled={!newServiceId}
                        className="w-full px-4 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-300 transition-colors"
                    >
                        Adicionar ao Pacote
                    </button>
                </div>
            </div>
            
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600">
              Salvar Pacote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageModal;