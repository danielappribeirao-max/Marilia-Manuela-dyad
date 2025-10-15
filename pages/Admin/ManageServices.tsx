import React, { useState } from 'react';
import { Service } from '../../types';
import ServiceModal from '../../components/ServiceModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import AdminServiceCard from '../../components/AdminServiceCard';
import { useApp } from '../../App';

export default function AdminManageServices() {
    const { services, addOrUpdateService, deleteService } = useApp();
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
    const [modalKey, setModalKey] = useState(0); // Novo estado para forçar a remontagem

    const handleAddNew = () => {
        setSelectedService(null);
        setModalKey(prev => prev + 1); // Incrementa a chave para forçar o reset
        setIsServiceModalOpen(true);
    };

    const handleEdit = (service: Service) => {
        setSelectedService(service);
        setModalKey(prev => prev + 1); // Também incrementa para edição, garantindo o reset
        setIsServiceModalOpen(true);
    };

    const handleDelete = (service: Service) => {
        setServiceToDelete(service);
    };

    const handleConfirmDelete = async () => {
        if (serviceToDelete) {
            await deleteService(serviceToDelete.id);
            setServiceToDelete(null);
        }
    };

    const handleSave = async (savedService: Service) => {
        console.log("Attempting to save service:", savedService);
        const result = await addOrUpdateService(savedService);
        
        if (result) {
            console.log("Service saved successfully:", result);
            setIsServiceModalOpen(false);
            setSelectedService(null);
            alert(`Serviço "${result.name}" salvo com sucesso!`);
        } else {
            console.error("Failed to save service. Result was null.");
            alert("Falha ao salvar o serviço. Verifique os dados e tente novamente.");
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Gerenciar Serviços</h2>
                <button 
                    onClick={handleAddNew}
                    className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors font-semibold shadow-md"
                >
                    + Adicionar Novo Serviço
                </button>
            </div>
            
            <h3 className="text-2xl font-bold mb-4">Serviços Atuais ({services.length})</h3>
            
            <div className="space-y-4">
                {services.map(service => (
                    <AdminServiceCard 
                        key={service.id} 
                        service={service} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                ))}
            </div>

            {isServiceModalOpen && (
                <ServiceModal 
                    key={modalKey} // Adicionando a chave para forçar o reset
                    service={selectedService}
                    onClose={() => setIsServiceModalOpen(false)}
                    onSave={handleSave}
                    existingServices={services}
                />
            )}
            {serviceToDelete && (
                <ConfirmationModal
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir o serviço "${serviceToDelete.name}"? Esta ação não pode ser desfeita.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setServiceToDelete(null)}
                    confirmText="Sim, excluir"
                    cancelText="Cancelar"
                    isDestructive={true}
                />
            )}
        </div>
    );
}