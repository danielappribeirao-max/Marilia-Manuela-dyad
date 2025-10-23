import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import { Booking, Service, User, RecurringBooking } from '../../types';
import AdminBookingModal from '../../components/AdminBookingModal';
import AgendaWeekView from '../../components/Agenda/WeekView';
import AgendaMonthView from '../../components/Agenda/MonthView';
import AgendaDayView from '../../components/Agenda/DayView';
import RecurringBookingCancelModal from '../../components/RecurringBookingCancelModal'; // Importado
import { useApp } from '../../App';

type AgendaView = 'day' | 'week' | 'month';

// Date utility functions
const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Saturday
    // Ajusta o final do dia para incluir o último minuto
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const getDayRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

// Helper function to generate bookings from RRULE for a given date range
const generateRecurringBookings = (
    recurringBookings: RecurringBooking[], 
    startDate: Date, 
    endDate: Date, 
    services: Service[], 
    users: User[]
): Booking[] => {
    const generatedBookings: Booking[] = [];
    
    // Helper to convert RRULE BYDAY to JS Day Index (MO -> 1, TU -> 2, ..., SU -> 0)
    const rruleDayToJsIndex: Record<string, number> = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };

    for (const rb of recurringBookings) {
        const parts = rb.rrule.split(';');
        const freqPart = parts.find(p => p.startsWith('FREQ='));
        const byDayPart = parts.find(p => p.startsWith('BYDAY='));
        const untilPart = parts.find(p => p.startsWith('UNTIL='));

        if (!freqPart || !untilPart) {
            continue;
        }
        
        const frequency = freqPart.split('=')[1];
        
        // Apenas suportamos WEEKLY e MONTHLY (simples)
        if (frequency !== 'WEEKLY' && frequency !== 'MONTHLY') {
            continue;
        }
        
        let targetDayIndex: number | null = null;
        if (frequency === 'WEEKLY' && byDayPart) {
            const rruleDay = byDayPart.split('=')[1];
            targetDayIndex = rruleDayToJsIndex[rruleDay];
        }
        
        const untilDateStr = untilPart.split('=')[1]; // YYYYMMDD
        
        const [untilYear, untilMonth, untilDay] = [
            parseInt(untilDateStr.substring(0, 4)),
            parseInt(untilDateStr.substring(4, 6)) - 1, // Month is 0-indexed
            parseInt(untilDateStr.substring(6, 8))
        ];
        // Define a data final da recorrência (fim do dia)
        const untilDate = new Date(untilYear, untilMonth, untilDay, 23, 59, 59);

        // Parse start time (HH:MM)
        const [startHour, startMinute] = rb.startTime.split(':').map(Number);
        
        // Define a data de início da recorrência (início do dia)
        const rbStartDate = new Date(rb.startDate + 'T00:00:00');
        
        // Começa a iteração a partir do início do intervalo visível ou da data de início da recorrência, o que for mais tarde
        let current = new Date(startDate);
        
        // Se o início da visualização for anterior ao início da recorrência, ajusta o ponto de partida
        if (current < rbStartDate) {
            current = new Date(rbStartDate);
        }
        
        // Itera para gerar as instâncias
        while (current <= endDate && current <= untilDate) {
            let shouldGenerate = false;
            
            if (frequency === 'WEEKLY') {
                if (targetDayIndex !== null && current.getDay() === targetDayIndex) {
                    shouldGenerate = true;
                }
            } else if (frequency === 'MONTHLY') {
                // Para mensal, usamos o dia do mês da data de início
                const startDayOfMonth = rbStartDate.getDate();
                if (current.getDate() === startDayOfMonth) {
                    shouldGenerate = true;
                }
            }
            
            if (shouldGenerate) {
                // Cria a instância de agendamento
                const bookingDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), startHour, startMinute);
                
                // Verifica se a instância está dentro do período de recorrência
                if (bookingDate >= rbStartDate && bookingDate <= untilDate) {
                    const service = services.find(s => s.id === rb.serviceId);
                    
                    // Adiciona a instância como um Booking normal, mas com ID especial
                    generatedBookings.push({
                        id: `R-${rb.id}-${bookingDate.getTime()}`, // ID único para a instância recorrente
                        userId: rb.userId || '',
                        serviceId: rb.serviceId,
                        professionalId: rb.professionalId,
                        date: bookingDate,
                        status: 'confirmed', 
                        duration: rb.duration,
                        comment: `[RECORRENTE] ${service?.name || 'Serviço Desconhecido'}`,
                    });
                }
            }
            
            // Move para o próximo dia/semana/mês
            if (frequency === 'WEEKLY') {
                current.setDate(current.getDate() + 1);
            } else if (frequency === 'MONTHLY') {
                // Para mensal, avançamos para o próximo mês e tentamos manter o dia do mês
                const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, rbStartDate.getDate());
                // Se o dia do mês não existir no próximo mês (ex: dia 31 em fevereiro), ele vai para o dia 1 do mês seguinte.
                // Isso é uma simplificação, mas funciona para a maioria dos casos.
                current = nextMonth;
            } else {
                // Avança um dia por padrão para evitar loops infinitos em regras não suportadas
                current.setDate(current.getDate() + 1);
            }
            
            // Se for mensal, precisamos garantir que a iteração avance corretamente
            if (frequency === 'MONTHLY') {
                // Se a data atual for maior que a data de início da recorrência, avançamos para o próximo mês
                if (current.getTime() > rbStartDate.getTime()) {
                    current = new Date(current.getFullYear(), current.getMonth() + 1, rbStartDate.getDate());
                } else {
                    current.setDate(current.getDate() + 1); // Avança um dia para iniciar o loop
                }
            } else {
                current.setDate(current.getDate() + 1);
            }
        }
    }
    
    return generatedBookings;
};


interface AdminAgendaProps {
    // Propriedade injetada pelo AdminDashboardPage para forçar o recarregamento
    key: number; 
}

export default function AdminAgenda() {
    const { services, professionals, refreshAdminData } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<AgendaView>('week');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [defaultDateForNewBooking, setDefaultDateForNewBooking] = useState<Date | undefined>(undefined);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estado para o modal de cancelamento de recorrência
    const [recurringBookingToCancel, setRecurringBookingToCancel] = useState<RecurringBooking | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [allBookings, allUsers, allRecurring] = await Promise.all([
            api.getAllBookings(),
            api.getUsersWithRoles(),
            api.getRecurringBookings(), // Busca agendamentos recorrentes
        ]);
        setBookings(allBookings || []);
        setUsers(allUsers || []);
        setRecurringBookings(allRecurring || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshAdminData]);

    const openCreateModal = useCallback((date?: Date) => {
        setSelectedBooking(null);
        setDefaultDateForNewBooking(date);
        setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((booking: Booking) => {
        // Se for uma instância recorrente, abre o modal de cancelamento de recorrência
        if (booking.id.startsWith('R-')) {
            const recurringId = booking.id.split('-')[1];
            const rb = recurringBookings.find(r => r.id === recurringId);
            if (rb) {
                setRecurringBookingToCancel(rb);
            } else {
                alert("Regra de recorrência não encontrada.");
            }
            return;
        }
        setSelectedBooking(booking);
        setDefaultDateForNewBooking(undefined);
        setIsModalOpen(true);
    }, [recurringBookings]);
    
    const handleConfirmCancelRecurring = async (recurringBookingId: string) => {
        const success = await api.cancelRecurringBooking(recurringBookingId);
        if (success) {
            alert("Agendamento recorrente cancelado com sucesso! As instâncias futuras não aparecerão mais na agenda.");
            setRecurringBookingToCancel(null);
            fetchData(); // Recarrega os dados para remover as instâncias da visualização
        } else {
            alert("Falha ao cancelar o agendamento recorrente.");
        }
    };

    const handleSaveBooking = async (booking: Partial<Booking>) => {
        // ... (Lógica de salvar agendamento único/cancelamento) ...
        const isEditing = !!booking.id;
        
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
            } else {
                // Feedback de sucesso para novo agendamento ou edição
                alert(`Agendamento ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            }
        } else {
            alert(`Falha ao salvar o agendamento. Verifique se todos os campos estão preenchidos e se o horário está disponível.`);
        }
        setIsModalOpen(false);
        fetchData(); // Garante que a lista seja recarregada após salvar/cancelar
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

    const visibleBookings = useMemo(() => {
        const singleBookings = bookings.filter(b => b.status !== 'canceled');
        
        let range: { start: Date, end: Date };
        if (view === 'month') range = getMonthRange(currentDate);
        else if (view === 'week') range = getWeekRange(currentDate);
        else range = getDayRange(currentDate);
        
        const recurringInstances = generateRecurringBookings(
            recurringBookings, 
            range.start, 
            range.end, 
            services, 
            users
        );
        
        // Combina agendamentos únicos e instâncias recorrentes
        return [...singleBookings, ...recurringInstances];
    }, [bookings, recurringBookings, currentDate, view, services, users]);

    const renderView = () => {
        if (loading) return <div className="flex justify-center items-center h-96">Carregando agenda...</div>;
        switch (view) {
            case 'day': return <AgendaDayView currentDate={currentDate} bookings={visibleBookings} onBookingClick={openEditModal} onNewBooking={openCreateModal} services={services} users={users}/>;
            case 'week': return <AgendaWeekView currentDate={currentDate} bookings={visibleBookings} onBookingClick={openEditModal} onNewBooking={openCreateModal} services={services} users={users}/>;
            case 'month': return <AgendaMonthView currentDate={currentDate} bookings={visibleBookings} onBookingClick={openEditModal} onNewBooking={openCreateModal} services={services} users={users}/>;
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
                    onClose={() => {
                        setIsModalOpen(false);
                        // Força o recarregamento da agenda ao fechar o modal, caso tenha havido alteração
                        fetchData(); 
                    }}
                    onSave={handleSaveBooking}
                    defaultDate={defaultDateForNewBooking}
                    users={users}
                    professionals={professionals}
                />
            )}
            
            {recurringBookingToCancel && (
                <RecurringBookingCancelModal
                    recurringBooking={recurringBookingToCancel}
                    onClose={() => setRecurringBookingToCancel(null)}
                    onConfirmCancel={handleConfirmCancelRecurring}
                    users={users}
                    services={services}
                />
            )}
        </div>
    );
}