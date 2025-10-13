import React, { useState, useMemo, useEffect } from 'react';
import * as api from '../../services/api';
import { User, Role, Service } from '../../types';
import UserModal from '../../components/UserModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useApp } from '../../App';

export default function AdminManageUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const { services } = useApp();


    const fetchUsers = async () => {
        setLoading(true);
        const fetchedUsers = await api.getUsersWithRoles();
        setUsers(fetchedUsers || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddNewUser = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };
    
    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleSaveUser = async (userData: Partial<User> & { password?: string }) => {
        let result: User | null = null;
        if (userData.id) { // Se tem ID, é uma atualização
            result = await api.updateUserProfile(userData.id, userData);
        } else { // Senão, é uma criação
            result = await api.adminCreateUser(userData);
        }

        if (result) {
           await fetchUsers(); // Recarrega a lista para mostrar as alterações
        } else {
            // A mensagem de erro específica já é mostrada pela função da API
        }
        setIsModalOpen(false);
        setSelectedUser(null);
    };
    
    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
    };
    
    const handleConfirmDelete = async () => {
        if (userToDelete) {
            // Nota: A exclusão de usuários pode ser complexa devido a restrições de chave estrangeira.
            // Esta é uma versão simplificada. Uma aplicação real poderia desativar os usuários em vez de excluí-los.
            alert("A funcionalidade de exclusão de usuários está desabilitada nesta demonstração para evitar a remoção de dados essenciais.");
            // await api.deleteUser(userToDelete.id);
            // await fetchUsers();
            setUserToDelete(null);
        }
    };

    if (loading) return <div>Carregando usuários...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gerenciar Usuários</h2>
                <button 
                    onClick={handleAddNewUser}
                    className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600"
                >
                    Adicionar Usuário
                </button>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">Nome</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Função</th>
                            <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-5 py-4 whitespace-nowrap">
                                    <p className="font-semibold">{user.name}</p>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                    <p>{user.email}</p>
                                </td>
                                <td className="px-5 py-4">
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                                         user.role === Role.ADMIN ? 'bg-purple-200 text-purple-800' :
                                         user.role === Role.CLIENT ? 'bg-green-200 text-green-800' :
                                         'bg-blue-200 text-blue-800'
                                     }`}>
                                        {user.role.toLowerCase()}
                                     </span>
                                </td>
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                    <button onClick={() => handleEditUser(user)} className="text-sm text-blue-600 hover:text-blue-800 mr-2">Editar</button>
                                    <button onClick={() => handleDeleteUser(user)} className="text-sm text-red-600 hover:text-red-800">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                <UserModal 
                    user={selectedUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                    services={services}
                />
            )}
            {userToDelete && (
                 <ConfirmationModal
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir o usuário "${userToDelete.name}"? Esta ação é irreversível.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setUserToDelete(null)}
                    confirmText="Sim, excluir"
                    cancelText="Cancelar"
                    isDestructive={true}
                />
            )}
        </div>
    );
}