import React, { useState, useMemo, useEffect } from 'react';
import { Service } from '../../types';
import ServiceModal from '../../components/ServiceModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import AdminServiceCard from '../../components/AdminServiceCard';
import ServiceReorderList from '../../components/ServiceReorderList';
import { useApp } from '../../App';
import { FREE_CONSULTATION_SERVICE_ID } from '../../constants';
import * as api from '../../services/api'; // Importar a API para salvar a ordem

export default function AdminManageServices() {
    const { services, setServices, addOrUpdateService, deleteService } = useApp();
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
    const [modalKey, setModalKey] = useState(0);
    const [activeTab, setActiveTab] = useState<'manage' | 'reorder'>('manage');
    
    // Estado local para a ordem dos serviços (usado apenas na aba 'reorder')
    const [reorderableServices, setReorderableServices] = useState<Service[]>([]);

    // Inicializa e atualiza a lista de reordenação sempre que a lista principal de serviços mudar
    useEffect(() => {
        // Filtra o serviço de consulta gratuita da lista de reordenação, pois ele deve ser sempre o primeiro (order: 0)
        const filteredServices = services.filter(s => s.id !== FREE_CONSULTATION_SERVICE_ID);
        setReorderableServices(filteredServices);
    }, [services]);

    const handleAddNew = () => {
        setSelectedService(null);
        setModalKey(prev => prev + 1); // Incrementa a chave para forçar o reset
        setIsServiceModalOpen(true);
    };

    const handleEdit = (service: Service) => {
        // Passa uma cópia do objeto para garantir que o modal não altere o objeto original
        setSelectedService({ ...service }); 
        setModalKey(prev => prev + 1); // Também incrementa para edição, garantindo o reset
        setIsServiceModalOpen(true);
    };

    const handleDelete = (service: Service) => {
        if (service.id === FREE_CONSULTATION_SERVICE_ID) {
            alert("O serviço de Consulta de Avaliação Gratuita não pode ser excluído.");
            return;
        }
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
        
        // Se for um novo serviço, define a ordem como o último item
        if (!savedService.id) {
            // O serviço de consulta gratuita tem order 0. Novos serviços começam a partir de 1.
            const maxOrder = services.reduce((max, s) => Math.max(max, s.order || 0), 0);
            savedService.order = maxOrder + 1;
        }
        
        const result = await addOrUpdateService(savedService);
        
        if (result) {
            console.log("Service saved successfully:", result);
            // Limpa o estado antes de fechar o modal
            setSelectedService(null); 
            setIsServiceModalOpen(false);
            
            // Alerta específico para o serviço de consulta gratuita
            if (savedService.id === FREE_CONSULTATION_SERVICE_ID) {
                alert(`Serviço "${result.name}" atualizado localmente com sucesso!`);
            } else {
                alert(`Serviço "${result.name}" salvo com sucesso!`);
            }
        } else {
            console.error("Failed to save service. Result was null.");
            alert("Falha ao salvar o serviço. Verifique os dados e tente novamente.");
        }
    };
    
    const handleSaveOrder = async (orderUpdates: { id: string; order: number }[]): Promise<boolean> => {
        // Inclui o serviço de consulta gratuita na ordem 0, se ele existir
        const freeConsultationService = services.find(s => s.id === FREE_CONSULTATION_SERVICE_ID);
        const finalOrderUpdates = freeConsultationService ? [{ id: freeConsultationService.id, order: 0 }, ...orderUpdates] : orderUpdates;
        
        const success = await api.updateServiceOrder(finalOrderUpdates);
        
        if (success) {
            // Atualiza o estado global com a nova ordem
            const updatedServicesMap = new Map(finalOrderUpdates.map(u => [u.id, u.order]));
            setServices(prev => {
                const newServices = prev.map(s => ({
                    ...s,
                    order: updatedServicesMap.get(s.id) || s.order,
                }));
                // Reordena a lista localmente para refletir a ordem salva
                return newServices.sort((a, b) => (a.order || 0) - (b.order || 0));
            });
        }
        return success;
    };
    
    const TabButton: React.FC<{tab: 'manage' | 'reorder', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-t-lg font-bold text-md transition-colors duration-300 focus:outline-none ${
                activeTab === tab 
                ? 'bg-white text-pink-600 border-b-2 border-pink-600' 
                : 'bg-gray-100 text-gray-500 hover:bg-white'
            }`}
        >
            {label}
        </button>
    );
    
    // Filtra o serviço de consulta gratuita da lista de gerenciamento (manage) para que ele não possa ser excluído/editado facilmente
    const servicesForManagement = services.filter(s => s.id !== FREE_CONSULTATION_SERVICE_ID);
    const freeConsultationService = services.find(s => s.id === FREE_CONSULTATION_SERVICE_ID);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gerenciar Serviços</h2>
                <button 
                    onClick={handleAddNew}
                    className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors font-semibold shadow-md"
                >
                    + Adicionar Novo Serviço
                </button>
            </div>
            
            <div className="border-b border-gray-200 flex mb-6">
                <TabButton tab="manage" label="Detalhes dos Serviços" />
                <TabButton tab="reorder" label="Reordenar Exibição" />
            </div>
            
            {activeTab === 'manage' && (
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold mb-4">Serviços Atuais ({services.length})</h3>
                    
                    {/* Exibe o serviço de consulta gratuita separadamente, se existir */}
                    {freeConsultationService && (
                        <div className="bg-yellow-50 border-yellow-300 border-l-4 p-4 rounded-lg mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-yellow-800">Consulta de Avaliação Gratuita</p>
                                <p className="text-sm text-yellow-700">Este serviço é fixo e não pode ser excluído. Edite apenas os detalhes.</p>
                            </div>
                            <button 
                                onClick={() => handleEdit(freeConsultationService)} 
                                className="px-3 py-1.5 bg-yellow-200 text-yellow-800 rounded-full text-sm font-semibold hover:bg-yellow-300 transition-colors"
                            >
                                Editar Detalhes
                            </button>
                        </div>
                    )}
                    
                    {servicesForManagement.map(service => (
                        <AdminServiceCard 
                            key={service.id} 
                            service={service} 
                            onEdit={handleEdit} 
                            onDelete={handleDelete} 
                        />
                    ))}
                </div>
            )}
            
            {activeTab === 'reorder' && (
                <ServiceReorderList 
                    services={reorderableServices}
                    onReorder={setReorderableServices}
                    onSaveOrder={handleSaveOrder}
                />
            )}

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