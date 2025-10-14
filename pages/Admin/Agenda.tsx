import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import { Booking, Service, User } from '../../types';
import AdminBookingModal from '../../components/AdminBookingModal';
import AgendaWeekView from '../../components/Agenda/WeekView';
import AgendaMonthView from '../../components/Agenda/MonthView';
import AgendaDayView from '../../components/Agenda/DayView';
import { useApp } from '../../App';

type AgendaView = 'day' | 'week' | 'month';

// Date utility functions
const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Saturday
    return { start, end };
};

export default function AdminAgenda() {
    const { services, professionals } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<AgendaView>('week');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [defaultDateForNewBooking, setDefaultDateForNewBooking] = useState<Date | undefined>(undefined);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [allBookings, allUsers] = await Promise.all([
            api.getAllBookings(),
            api.getUsersWithRoles(),
        ]);
        setBookings(allBookings || []);
        setUsers(allUsers || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openCreateModal = useCallback((date?: Date) => {
        setSelectedBooking(null);
        setDefaultDateForNewBooking(date);
        setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((booking: Booking) => {
        setSelectedBooking(booking);
        setDefaultDateForNewBooking(undefined);
        setIsModalOpen(true);
    }, []);

    const handleSaveBooking = async (booking: Partial<Booking>) => {
        const originalBooking = bookings.find(b => b.id === booking.id);
        const wasJustCancelled = originalBooking && originalBooking.status !== 'canceled' && booking.status === 'canceled';

        const savedBooking = await api.addOrUpdateBooking(booking);
        
        if (savedBooking) {
            // Atualiza a lista de agendamentos na interface
            setBookings(prev => prev.map(b => b.id === savedBooking.id ? savedBooking : b));

            // Se o agendamento foi cancelado nesta ação, executa o fluxo de devolução e notificação
            if (wasJustCancelled) {
                const service = services.find(s => s.id === savedBooking.serviceId);
                const user = users.find(u => u.id === savedBooking.userId);

                if (service && user) {
                    let creditReturned = false;
                    // 1. Devolve o crédito se for um serviço de pacote
                    if (service.sessions && service.sessions > 1) {
                        await api.returnCreditToUser(user.id, service.id);
                        creditReturned = true;
                    }

                    // 2. Notifica o cliente
                    const professional = professionals.find(p => p.id === savedBooking.professionalId);
                    const message = `Olá ${user.name}, seu agendamento para "${service.name}" com ${professional?.name || 'o profissional'} no dia ${new Date(savedBooking.date).toLocaleDateString('pt-BR')} às ${new Date(savedBooking.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} foi cancelado. Por favor, entre em contato para reagendar.`;
                    
                    if (user.phone) {
                        await api.sendCancellationNotice({ to: user.phone.replace(/\D/g, ''), message });
                    }

                    // 3. Alerta o admin e atualiza os dados
                    let alertMessage = `Agendamento de ${user.name} cancelado com sucesso.`;
                    if (creditReturned) {
                        alertMessage += ` 1 crédito de "${service.name}" foi devolvido.`;
                    }
                    alertMessage += ' O cliente foi notificado.';
                    alert(alertMessage);
                    
                    // Recarrega os usuários para atualizar a contagem de créditos na interface
                    const allUsers = await api.getUsersWithRoles();
                    setUsers(allUsers || []);
                }
            }
        }
        setIsModalOpen(false);
    };

    const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }
        const newDate = new Date(currentDate);
        const increment = direction === 'prev' ? -1 : 1;
        if (view === 'month') newDate.setMonth(newDate.getMonth() + increment);
        else if (view === 'week') newDate.setDate(newDate.getDate() + (7 * increment));
        else newDate.setDate(newDate.getDate() + increment);
        setCurrentDate(newDate);
    };

    const headerTitle = useMemo(() => {
        if (view === 'month') return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (view === 'week') {
            const { start, end } = getWeekRange(currentDate);
            const startMonth = start.toLocaleDateString('pt-BR', { month: 'short' });
            const endMonth = end.toLocaleDateString('pt-BR', { month: 'short' });
            return `${start.getDate()} de ${startMonth} - ${end.getDate()} de ${endMonth}, ${start.getFullYear()}`;
        }
        return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }, [currentDate, view]);

    const renderView = () => {
        if (loading) return <div className="flex justify-center items-center h-96">Carregando agenda...</div>;
        switch (view) {
            case 'day': return <AgendaDayView currentDate={currentDate} bookings={bookings} onBookingClick={openEditModal} onNewBooking={openCreateModal} services={services} users={users}/>;
            case 'week': return <AgendaWeekView currentDate={currentDate} bookings={bookings} onBookingClick={openEditModal} onNewBooking={openCreateModal} services={services} users={users}/>;
            case 'month': return <AgendaMonthView currentDate={currentDate} bookings={bookings} onBookingClick={openEditModal} onNewBooking={openCreateModal} services={services} users={users}/>;
            default: return null;
        }
    };
    
    const ViewButton: React.FC<{ viewName: AgendaView, label: string }> = ({ viewName, label }) => (
        <button onClick={() => setView(viewName)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === viewName ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{label}</button>
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                 <div className="flex items-center gap-2">
                    <button onClick={() => handleNavigate('prev')} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
                    <span className="font-semibold text-lg md:text-xl w-64 text-center capitalize">{headerTitle}</span>
                    <button onClick={() => handleNavigate('next')} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
                    <button onClick={() => handleNavigate('today')} className="px-3 py-1.5 border rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors ml-2">Hoje</button>
                </div>
                <div className="flex-1 flex justify-center"><div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg"><ViewButton viewName="day" label="Dia" /><ViewButton viewName="week" label="Semana" /><ViewButton viewName="month" label="Mês" /></div></div>
                <button onClick={() => openCreateModal()} className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 font-semibold shadow">+ Novo Agendamento</button>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">{renderView()}</div>

            {isModalOpen && (
                <AdminBookingModal 
                    booking={selectedBooking}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveBooking}
                    defaultDate={defaultDateForNewBooking}
                    users={users}
                    professionals={professionals}
                />
            )}
        </div>
    );
}