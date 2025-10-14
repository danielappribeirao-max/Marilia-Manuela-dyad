import React, { useState } from 'react';
import { Service } from '../../types';
import ServiceModal from '../../components/ServiceModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useApp } from '../../App';
import IndividualServiceTemplateCard from '../../components/IndividualServiceTemplateCard';
import { individualServiceTemplates, ServiceTemplate } from '../../services/templates';

export default function AdminManageServices() {
    const { services, addOrUpdateService, deleteService } = useApp();
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

    const handleAddNew = () => {
        setSelectedService(null);
        setIsServiceModalOpen(true);
    };

    const handleEdit = (service: Service) => {
        setSelectedService(service);
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
        await addOrUpdateService(savedService);
        setIsServiceModalOpen(false);
        setSelectedService(null);
    };
    
    const handleUseTemplate = (template: ServiceTemplate) => {
        // Ao usar um modelo, criamos um novo objeto Service com um ID temporário
        // para que o ServiceModal o trate como um novo serviço a ser criado.
        const newServiceFromTemplate: Partial<Service> = {
            ...template,
            id: `temp-service-${Date.now()}`, // Garante que o modal não pense que é uma edição
        };
        setSelectedService(newServiceFromTemplate);
        setIsServiceModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Gerenciar Serviços</h2>
                <button 
                    onClick={handleAddNew}
                    className="px-4 py-2 bg-white border border-pink-500 text-pink-500 rounded-full hover:bg-pink-50 hover:shadow-md transition-all font-semibold"
                >
                    + Criar Serviço em Branco
                </button>
            </div>

            <div className="mb-12 bg-pink-50/50 p-6 rounded-xl border border-pink-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Comece com um Modelo</h3>
                <p className="text-gray-600 mb-6 text-sm max-w-2xl">Acelere o cadastro de novos procedimentos utilizando nossos modelos prontos. Clique em "Usar este Modelo" para abrir o formulário com as informações já preenchidas.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {individualServiceTemplates.map((template, index) => (
                        <IndividualServiceTemplateCard 
                            key={index} 
                            template={template}
                            onUseTemplate={handleUseTemplate} 
                        />
                    ))}
                </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-4">Serviços Atuais</h3>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">Serviço</th>
                            <th className="px-5 py-3">Sessões</th>
                            <th className="px-5 py-3">Preço</th>
                            <th className="px-5 py-3">Duração</th>
                            <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {services.map(service => (
                            <tr key={service.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-5 py-4 whitespace-nowrap">
                                    <p className="font-semibold">{service.name}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <p>{service.sessions || 1}</p>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                    <p>R$ {service.price.toFixed(2).replace('.', ',')}</p>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                    <p>{service.duration} min</p>
                                </td>
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                    <button onClick={() => handleEdit(service)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 mr-4">Editar</button>
                                    <button onClick={() => handleDelete(service)} className="text-sm font-semibold text-red-600 hover:text-red-800">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isServiceModalOpen && (
                <ServiceModal 
                    service={selectedService}
                    onClose={() => setIsServiceModalOpen(false)}
                    onSave={handleSave}
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