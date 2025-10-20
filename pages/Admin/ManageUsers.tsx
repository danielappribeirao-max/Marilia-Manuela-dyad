import React, { useState, useMemo, useEffect } from 'react';
import * as api from '../../services/api';
import { User, Role, Service } from '../../types';
import UserModal from '../../components/UserModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useApp } from '../../App';
import { formatCPF, formatPhone } from '../../utils/formatters';
import { Search, User as UserIcon, Phone, Mail, Briefcase, Edit, Trash2 } from 'lucide-react';

export default function AdminManageUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
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
            // Usamos a função de admin para garantir que a atualização de nome e função funcione
            result = await api.adminUpdateUser(userData);
        } else { // Senão, é uma criação
            result = await api.adminCreateUser(userData);
        }

        if (result) {
           await fetchUsers(); // Recarrega a lista para mostrar as alterações
           alert(`Usuário ${result.name} salvo com sucesso!`);
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
        if (!userToDelete) return;
        
        const result = await api.deleteUser(userToDelete.id);
        
        if (result.success) {
            alert(`Usuário ${userToDelete.name} excluído com sucesso.`);
            await fetchUsers();
        } else {
            alert(`Falha ao excluir usuário: ${result.error}`);
        }
        setUserToDelete(null);
    };
    
    const filteredUsers = useMemo(() => {
        console.log(`[Filter] Recalculating users. Query: "${searchQuery}", Role: ${filterRole}`);
        
        // Cria uma cópia do array antes de filtrar/ordenar
        let filtered = [...users];

        if (filterRole !== 'all') {
            filtered = filtered.filter(u => u.role === filterRole);
        }

        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            // Remove a formatação da query de busca para comparar com os dados brutos
            const unformattedQuery = searchQuery.replace(/\D/g, ''); 
            
            filtered = filtered.filter(u => 
                // Busca por nome ou email (case insensitive)
                u.name.toLowerCase().includes(lowercasedQuery) || 
                u.email.toLowerCase().includes(lowercasedQuery) ||
                // Busca por telefone (apenas dígitos)
                u.phone.replace(/\D/g, '').includes(unformattedQuery) ||
                // Busca por CPF (apenas dígitos)
                u.cpf.replace(/\D/g, '').includes(unformattedQuery)
            );
        }
        
        // Ordenação alfabética por nome
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`[Filter] Found ${filtered.length} users.`);
        return filtered;
    }, [users, filterRole, searchQuery]);

    const roleOptions = [
        { value: 'all', label: 'Todas as Funções' },
        { value: Role.CLIENT, label: 'Clientes' },
        { value: Role.STAFF, label: 'Profissionais' },
        { value: Role.ADMIN, label: 'Administradores' },
    ];
    
    const getRoleClasses = (role: Role) => {
        switch (role) {
            case Role.ADMIN: return 'bg-purple-100 text-purple-800';
            case Role.STAFF: return 'bg-blue-100 text-blue-800';
            case Role.CLIENT: return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-500">Carregando usuários...</div>

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Gerenciar Usuários</h2>
                <button 
                    onClick={handleAddNewUser}
                    className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 font-semibold shadow-md transition-colors"
                >
                    + Adicionar Usuário
                </button>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email, telefone ou CPF..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            console.log(`[Input] Search query updated to: ${e.target.value}`);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-shadow"
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as Role | 'all')}
                    className="sm:w-52 w-full p-2 border border-gray-300 bg-white text-gray-700 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500"
                >
                    {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>
            
            <div className="bg-white shadow-xl rounded-xl overflow-hidden">
                <table className="w-full leading-normal table-fixed">
                    <thead>
                        <tr className="bg-gray-50 text-left text-gray-600 uppercase text-xs font-semibold border-b border-gray-200">
                            {/* Aumentando a largura da coluna de Usuário */}
                            <th className="px-5 py-3 w-1/2 sm:w-2/5">Usuário</th>
                            {/* Ocultando em telas pequenas, mostrando em telas médias */}
                            <th className="px-5 py-3 w-1/4 hidden md:table-cell">Contato</th>
                            <th className="px-5 py-3 w-1/4 sm:w-1/5">Função</th>
                            <th className="px-5 py-3 w-1/6 sm:w-1/5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {filteredUsers.length > 0 ? filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-100 hover:bg-pink-50 transition-colors">
                                <td className="px-5 py-4 align-top">
                                    <div className="flex items-start">
                                        <img 
                                            // Usando avatarUrl do objeto user, que é preenchido no getUserProfile
                                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name.replace(/\s/g, '+')}&background=e9d5ff&color=7c3aed`} 
                                            alt={user.name} 
                                            className="w-10 h-10 rounded-full object-cover mr-3 bg-gray-200 flex-shrink-0"
                                        />
                                        <div className="min-w-0">
                                            {/* Removendo break-words para evitar quebras excessivas, mas garantindo que o contêiner se ajuste */}
                                            <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={12} /> {user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                {/* Ocultando em telas pequenas, mostrando em telas médias */}
                                <td className="px-5 py-4 hidden md:table-cell align-top">
                                    <p className="text-sm flex items-center gap-1.5"><Phone size={14} className="text-pink-500" /> {formatPhone(user.phone)}</p>
                                    <p className="text-xs text-gray-500 mt-1">CPF: {formatCPF(user.cpf)}</p>
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize flex items-center gap-1 w-fit ${getRoleClasses(user.role)}`}>
                                        <Briefcase size={12} /> {user.role.toLowerCase()}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right align-top">
                                    <button onClick={() => handleEditUser(user)} className="text-sm text-blue-600 hover:text-blue-800 mr-1 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="Editar">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user)} className="text-sm text-red-600 hover:text-red-800 p-1.5 rounded-full hover:bg-red-50 transition-colors" title="Excluir">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-500">Nenhum usuário encontrado com os filtros aplicados.</td>
                            </tr>
                        )}
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