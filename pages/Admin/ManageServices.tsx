import React, { useState } from 'react';
import { Service } from '../../types';
import ServiceModal from '../../components/ServiceModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useApp } from '../../App';

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
                    existingServices={services} // Passando a lista de serviços
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