import React, { useState, useMemo } from 'react';
import { Service } from '../types';
import { GripVertical, Check } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ServiceReorderListProps {
  services: Service[];
  onReorder: (newOrder: Service[]) => void;
  onSaveOrder: (orderUpdates: { id: string; order: number }[]) => Promise<boolean>;
}

interface SortableItemProps {
    service: Service;
}

// Componente de item arrastável
const SortableItem: React.FC<SortableItemProps> = ({ service }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: service.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 0,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center bg-white p-3 rounded-lg shadow-sm border transition-all ${
                isDragging ? 'shadow-lg border-pink-500' : 'border-gray-200'
            }`}
        >
            <div 
                {...listeners} 
                {...attributes} 
                className="cursor-grab text-gray-400 hover:text-pink-500 mr-4 p-1"
            >
                <GripVertical size={20} />
            </div>
            <span className="font-bold text-lg w-8 text-center text-gray-500">
                {service.order}
            </span>
            <div className="flex items-center space-x-4 flex-grow ml-4">
                <img 
                    src={service.imageUrl} 
                    alt={service.name} 
                    className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                />
                <span className="font-medium text-gray-800">{service.name}</span>
            </div>
        </div>
    );
};

const ServiceReorderList: React.FC<ServiceReorderListProps> = ({ services, onReorder, onSaveOrder }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  
  // IDs dos serviços para o SortableContext
  const serviceIds = useMemo(() => services.map(s => s.id), [services]);

  // Configuração dos sensores para DndContext
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = serviceIds.indexOf(active.id);
      const newIndex = serviceIds.indexOf(over.id);
      
      const newOrderedServices = arrayMove(services, oldIndex, newIndex);
      
      // Atualiza a propriedade 'order' localmente para refletir a nova posição
      const servicesWithNewOrder = newOrderedServices.map((s, index) => ({
          ...s,
          order: index + 1, // 1-based index
      }));

      onReorder(servicesWithNewOrder);
      setIsOrderChanged(true);
    }
  };
  
  const handleSave = async () => {
      setIsSaving(true);
      
      // Mapeia a nova ordem para o formato de atualização da API
      const orderUpdates = services.map((service, index) => ({
          id: service.id,
          order: index + 1, // 1-based index
      }));
      
      const success = await onSaveOrder(orderUpdates);
      
      if (success) {
          setIsOrderChanged(false);
          // A lista 'services' já foi atualizada com a nova ordem (index + 1)
          alert("Ordem dos serviços salva com sucesso!");
      } else {
          alert("Erro ao salvar a nova ordem dos serviços.");
      }
      setIsSaving(false);
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Arraste e solte os serviços para definir a ordem de exibição na página de Serviços.</p>
            <button 
                onClick={handleSave}
                disabled={isSaving || !isOrderChanged}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
                <Check size={18} /> {isSaving ? 'Salvando...' : 'Salvar Ordem'}
            </button>
        </div>
        
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={serviceIds}>
                <div className="space-y-2">
                    {services.map((service) => (
                        <SortableItem key={service.id} service={service} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    </div>
  );
};

export default ServiceReorderList;