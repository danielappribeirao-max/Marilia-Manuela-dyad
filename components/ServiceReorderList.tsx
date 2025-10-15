import React, { useState } from 'react';
import { Service } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { GripVertical, Check } from 'lucide-react';

interface ServiceReorderListProps {
  services: Service[];
  onReorder: (newOrder: Service[]) => void;
  onSaveOrder: (orderUpdates: { id: string; order: number }[]) => Promise<boolean>;
}

// Função auxiliar para reordenar o array
const reorder = (list: Service[], startIndex: number, endIndex: number): Service[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const ServiceReorderList: React.FC<ServiceReorderListProps> = ({ services, onReorder, onSaveOrder }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isOrderChanged, setIsOrderChanged] = useState(false);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = reorder(
      services,
      result.source.index,
      result.destination.index
    );

    onReorder(items);
    setIsOrderChanged(true);
  };
  
  const handleSave = async () => {
      setIsSaving(true);
      
      // Mapeia a nova ordem para o formato de atualização da API
      const orderUpdates = services.map((service, index) => ({
          id: service.id,
          order: index + 1, // Usamos 1-based index para a ordem
      }));
      
      const success = await onSaveOrder(orderUpdates);
      
      if (success) {
          setIsOrderChanged(false);
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
        
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="service-list">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                    >
                        {services.map((service, index) => (
                            <Draggable key={service.id} draggableId={service.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center bg-white p-3 rounded-lg shadow-sm border transition-all ${
                                            snapshot.isDragging ? 'shadow-lg border-pink-500' : 'border-gray-200'
                                        }`}
                                    >
                                        <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-pink-500 mr-4 p-1">
                                            <GripVertical size={20} />
                                        </div>
                                        <span className="font-bold text-lg w-8 text-center text-gray-500">{index + 1}</span>
                                        <div className="flex items-center space-x-4 flex-grow ml-4">
                                            <img 
                                                src={service.imageUrl} 
                                                alt={service.name} 
                                                className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                                            />
                                            <span className="font-medium text-gray-800">{service.name}</span>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    </div>
  );
};

export default ServiceReorderList;