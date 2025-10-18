import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import * as api from '../services/api';
import { Booking, User, Service } from '../types';
import EditProfileModal from '../components/EditProfileModal';
import ConfirmationModal from '../components/ConfirmationModal';
import UserBookingCard from '../components/UserBookingCard';
import { CreditCard, Calendar, History } from 'lucide-react';

interface UserDashboardPageProps {
    onBookWithCredit: (service: Service) => void;
    onReschedule: (booking: Booking) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-full transition-colors duration-300 ${
            active 
            ? 'bg-pink-500 text-white shadow-md' 
            : 'bg-white text-gray-600 hover:bg-pink-50'
        }`}
    >
        {children}
    </button>
);

export default function UserDashboardPage({ onBookWithCredit, onReschedule }: UserDashboardPageProps) {
    const { currentUser, setCurrentUser, services, professionals } = useApp();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    useEffect(() => {
        const fetchBookings = async () => {
            if (currentUser) {
                setLoadingBookings(true);
                const userBookings = await api.getUserBookings(currentUser.id);
                setBookings(userBookings || []);
                setLoadingBookings(false);
            }
        };
        fetchBookings();
    }, [currentUser]);

    const handleConfirmCancel = async () => {
        if (!bookingToCancel || !currentUser) return;
        
        const booking = bookings.find(b => b.id === bookingToCancel);
        if (booking) {
            // 1. Atualiza o status do agendamento para 'canceled'
            const updatedBooking = await api.addOrUpdateBooking({ ...booking, status: 'canceled' });
            
            if (updatedBooking) {
                const service = services.find(s => s.id === booking.serviceId);
                
                // 2. Lógica de devolução de crédito:
                // Assumimos que se o serviço tem 'sessions' definido (o que é o caso de todos os serviços compráveis),
                // o agendamento consumiu 1 crédito, e este deve ser devolvido.
                
                let creditReturned = false;
                if (service && service.sessions !== undefined) {
                    const updatedUser = await api.returnCreditToUser(currentUser.id, service.id);
                    if (updatedUser) {
                        setCurrentUser(updatedUser);
                        creditReturned = true;
                    }
                }
                
                // 3. Atualiza a lista de agendamentos na UI
                setBookings(prev => prev.map(b => b.id === bookingToCancel ? updatedBooking : b));
                
                // 4. Feedback ao usuário
                let alertMessage = `Agendamento cancelado com sucesso.`;
                if (creditReturned) {
                    alertMessage += ` 1 crédito de "${service?.name}" devolvido à sua conta.`;
                }
                alert(alertMessage);

            } else {
                alert('Ocorreu um erro ao cancelar o agendamento.');
            }
        }
        setBookingToCancel(null);
    };

    if (!currentUser) {
        return <div className="p-8 text-center">Faça login para ver seu painel.</div>;
    }

    // Modificado para ser assíncrono e retornar um booleano
    const handleProfileSave = async (updatedUserData: Partial<User>): Promise<boolean> => {
        const updatedUser = await api.updateUserProfile(currentUser!.id, updatedUserData);
        if (updatedUser) {
            setCurrentUser(updatedUser);
            return true;
        }
        return false;
    };

    const upcomingBookings = bookings
        .filter(b => b.status === 'confirmed')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const pastBookings = bookings
        .filter(b => b.status !== 'confirmed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const userCredits = currentUser.credits && Object.entries(currentUser.credits).filter(([, count]) => (count as number) > 0);

    const renderBookings = (bookingList: Booking[]) => {
        if (loadingBookings) return <p className="text-center text-gray-500 py-8">Carregando agendamentos...</p>;
        if (bookingList.length === 0) {
            const message = activeTab === 'upcoming' 
                ? "Você não possui agendamentos futuros." 
                : "Você ainda não realizou nenhum procedimento.";
            return <p className="text-center text-gray-500 py-8 bg-white rounded-lg shadow-sm">{message}</p>;
        }
        return (
            <div className="space-y-6">
                {bookingList.map(b => <UserBookingCard key={b.id} booking={b} onCancel={setBookingToCancel} onReschedule={onReschedule} services={services} professionals={professionals} />)}
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-[80vh] py-12">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold">Minha Conta</h1>
                        <p className="text-gray-600 mt-1">Bem-vindo(a) de volta, {currentUser.name.split(' ')[0]}!</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Credits Section */}
                        {userCredits && userCredits.length > 0 && (
                            <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <CreditCard className="w-6 h-6 text-pink-500" />
                                    <h2 className="text-2xl font-bold">Meus Créditos</h2>
                                </div>
                                <div className="space-y-4">
                                    {userCredits.map(([serviceId, count]) => {
                                        const service = services.find(s => s.id === serviceId);
                                        if (!service) return null;
                                        return (
                                            <div key={serviceId} className="bg-pink-50 p-4 rounded-lg flex items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{service.name}</h3>
                                                    <p className="text-green-600 font-semibold text-sm">{count as number} {(count as number) > 1 ? 'sessões restantes' : 'sessão restante'}</p>
                                                </div>
                                                <button onClick={() => onBookWithCredit(service)} className="px-5 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors text-sm whitespace-nowrap">Agendar Agora</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Bookings Section with Tabs */}
                        <section>
                            <div className="flex items-center gap-2 mb-6 p-1.5 bg-white rounded-full shadow-sm border w-fit">
                                <TabButton active={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')}>
                                    <Calendar size={16} /> Próximos Agendamentos
                                </TabButton>
                                <TabButton active={activeTab === 'past'} onClick={() => setActiveTab('past')}>
                                    <History size={16} /> Histórico
                                </TabButton>
                            </div>
                            {activeTab === 'upcoming' ? renderBookings(upcomingBookings) : renderBookings(pastBookings)}
                        </section>
                    </div>
                    
                    {/* Profile Sidebar */}
                    <aside>
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-28 text-center">
                            <img 
                                src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name.replace(/\s/g, '+')}&background=e9d5ff&color=7c3aed`} 
                                alt="Avatar" 
                                className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-4 border-pink-200 shadow-md"
                            />
                            <h3 className="text-2xl font-bold mb-4">{currentUser.name}</h3>
                            <div className="space-y-3 text-gray-600 text-left text-sm border-t pt-4">
                                <p><strong className="font-semibold text-gray-800">Email:</strong> {currentUser.email}</p>
                                <p><strong className="font-semibold text-gray-800">Telefone:</strong> {currentUser.phone}</p>
                                <p><strong className="font-semibold text-gray-800">CPF:</strong> {currentUser.cpf}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(true)} className="mt-6 w-full py-2.5 bg-gray-800 text-white rounded-full hover:bg-pink-500 transition-colors font-semibold">Editar Perfil</button>
                        </div>
                    </aside>
                </div>
            </div>
             {isEditModalOpen && (
                <EditProfileModal 
                    user={currentUser}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleProfileSave}
                />
            )}
            {bookingToCancel && (
                <ConfirmationModal
                    title="Confirmar Cancelamento"
                    message="Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
                    onConfirm={handleConfirmCancel}
                    onCancel={() => setBookingToCancel(null)}
                    confirmText="Sim, cancelar"
                    cancelText="Manter agendamento"
                    isDestructive={true}
                />
            )}
        </div>
    );
}