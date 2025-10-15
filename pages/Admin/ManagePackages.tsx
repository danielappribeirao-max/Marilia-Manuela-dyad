import React, { useState, useEffect } from 'react';
import { ServicePackage } from '../../types';
import PackageModal from '../../components/PackageModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import AdminPackageCard from '../../components/AdminPackageCard';
import { useApp } from '../../App';
import * as api from '../../services/api';

export default function AdminManagePackages() {
    const { services, packages, setPackages } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<Partial<ServicePackage> | null>(null);
    const [packageToDelete, setPackageToDelete] = useState<ServicePackage | null>(null);
    const [modalKey, setModalKey] = useState(0);

    const handleAddNew = () => {
        setSelectedPackage(null);
        setModalKey(prev => prev + 1);
        setIsModalOpen(true);
    };

    const handleEdit = (pkg: ServicePackage) => {
        setSelectedPackage({ ...pkg }); 
        setModalKey(prev => prev + 1);
        setIsModalOpen(true);
    };

    const handleDelete = (pkg: ServicePackage) => {
        setPackageToDelete(pkg);
    };

    const handleConfirmDelete = async () => {
        if (packageToDelete) {
            await api.deletePackage(packageToDelete.id);
            setPackages(prev => prev.filter(p => p.id !== packageToDelete.id));
            setPackageToDelete(null);
            alert(`Pacote "${packageToDelete.name}" excluído com sucesso!`);
        }
    };

    const handleSave = async (savedPackage: ServicePackage) => {
        const result = await api.addOrUpdatePackage(savedPackage);
        
        if (result) {
            // Atualiza a lista de pacotes no estado global do App
            setPackages(prev => {
                const isExisting = prev.some(p => p.id === result.id);
                if (isExisting) {
                    return prev.map(p => p.id === result.id ? result : p);
                }
                return [...prev, result];
            });
            
            setSelectedPackage(null); 
            setIsModalOpen(false);
            alert(`Pacote "${result.name}" salvo com sucesso!`);
        } else {
            alert("Falha ao salvar o pacote. Verifique os dados e tente novamente.");
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Gerenciar Pacotes Especiais</h2>
                <button 
                    onClick={handleAddNew}
                    className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors font-semibold shadow-md"
                >
                    + Adicionar Novo Pacote
                </button>
            </div>
            
            <h3 className="text-2xl font-bold mb-4">Pacotes Atuais ({packages.length})</h3>
            
            <div className="space-y-4">
                {packages.length > 0 ? packages.map(pkg => (
                    <AdminPackageCard 
                        key={pkg.id} 
                        servicePackage={pkg} 
                        services={services}
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                )) : (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">Nenhum pacote cadastrado.</div>
                )}
            </div>

            {isModalOpen && (
                <PackageModal 
                    key={modalKey}
                    pkg={selectedPackage}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    availableServices={services}
                />
            )}
            {packageToDelete && (
                <ConfirmationModal
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir o pacote "${packageToDelete.name}"? Esta ação não pode ser desfeita.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setPackageToDelete(null)}
                    confirmText="Sim, excluir"
                    cancelText="Cancelar"
                    isDestructive={true}
                />
            )}
        </div>
    );
}