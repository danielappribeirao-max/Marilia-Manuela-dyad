import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as api from '../../services/api';
import { Booking, Service, User, RecurringBooking } from '../../types';
import AdminBookingModal from '../../components/AdminBookingModal';
import AgendaWeekView from '../../components/Agenda/WeekView';
import AgendaMonthView from '../../components/Agenda/MonthView';
import AgendaDayView from '../../components/Agenda/DayView';
import RecurringInstanceModal from '../../components/Agenda/RecurringInstanceModal'; // NOVO MODAL
import { useApp } from '../../App';

type AgendaView = 'day' | 'week' | 'month';

// Date utility functions
const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Saturday
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
    singleBookings: Booking[], // Passamos os agendamentos únicos para verificar exceções
    startDate: Date, 
    endDate: Date, 
    services: Service[], 
    users: User[]
): Booking[] => {
    const generatedBookings: Booking[] = [];
    
    // Mapeia agendamentos únicos cancelados por regra e data/hora para filtrar instâncias recorrentes
    const canceledInstances = new Set<string>(); // Set de 'RULE_ID|YYYY-MM-DD|HH:MM'
    singleBookings.forEach(b => {
        if (b.status === 'canceled' && b.recurringRuleId) {
            const dateKey = b.date.toISOString().split('T')[0];
            const timeKey = b.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
            canceledInstances.add(`${b.recurringRuleId}|${dateKey}|${timeKey}`);
        }
    });

    // Helper to convert JS day Index (0=Sun, 6=Sat) to RRULE BYDAY (SU, MO, TU, WE, TH, FR, SA)
    const rruleDayToJsIndex: Record<string, number> = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };

    for (const rb of recurringBookings) {
        if (rb.status !== 'active') continue;

        const parts = rb.rrule.split(';');
        const freqPart = parts.find(p => p.startsWith('FREQ='));
        const byDayPart = parts.find(p => p.startsWith('BYDAY='));
        const untilPart = parts.find(p => p.startsWith('UNTIL='));

        if (!freqPart || !untilPart) {
            continue;
        }
        
        const frequency = freqPart.split('=')[1];
        
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
        
        // 1. Determinar o ponto de partida da iteração (máximo entre o início da visualização e o início da recorrência)
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        
        if (current < rbStartDate) {
            current = new Date(rbStartDate);
            current.setHours(0, 0, 0, 0);
        }
        
        // 2. Loop principal de geração
        while (current <= endDate && current <= untilDate) {
            
            let shouldGenerate = false;
            
            if (frequency === 'WEEKLY') {
                if (targetDayIndex !== null && current.getDay() === targetDayIndex) {
                    shouldGenerate = true;
                }
                // Avança para o próximo dia para verificar
                current.setDate(current.getDate() + 1);
            } else if (frequency === 'MONTHLY') {
                // Para mensal, usamos o dia do mês da data de início
                const startDayOfMonth = rbStartDate.getDate();
                if (current.getDate() === startDayOfMonth) {
                    shouldGenerate = true;
                }
                // Avança para o próximo dia
                current.setDate(current.getDate() + 1);
            }
            
            if (shouldGenerate) {
                // Cria a instância de agendamento
                const bookingDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), startHour, startMinute);
                
                // Ajuste para o caso MONTHLY onde o avanço de dia pode ter sido feito no final do loop
                if (frequency === 'MONTHLY' && current.getDate() !== rbStartDate.getDate()) {
                    // Se o dia do mês não for o dia alvo, ajustamos para o dia alvo no mês atual
                    const targetDay = rbStartDate.getDate();
                    current.setDate(targetDay);
                    // Se o ajuste fez a data retroceder, avançamos um mês
                    if (current.getTime() < bookingDate.getTime()) {
                        current.setMonth(current.getMonth() + 1);
                    }
                    // Recalcula a data de agendamento
                    bookingDate.setFullYear(current.getFullYear(), current.getMonth(), current.getDate());
                }
                
                const dateKey = bookingDate.toISOString().split('T')[0];
                const timeKey = bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).slice(0, 5);
                const cancellationKey = `${rb.id}|${dateKey}|${timeKey}`;
                
                // 3. Verifica se esta instância foi cancelada individualmente
                if (!canceledInstances.has(cancellationKey)) {
                    const service = services.find(s => s.id === rb.serviceId);
                    
                    generatedBookings.push({
                        id: `R-${rb.id}-${bookingDate.getTime()}`, // ID único para a instância recorrente
                        userId: rb.userId || '',
                        serviceId: rb.serviceId,
                        professionalId: rb.professionalId,
                        date: bookingDate,
                        status: 'confirmed', 
                        duration: rb.duration,
                        comment: `[RECORRENTE] ${service?.name || 'Serviço Desconhecido'}`,
                        isRecurringInstance: true, // NOVO CAMPO
                        recurringRuleId: rb.id, // NOVO CAMPO
                    });
                }
            }
            
            // 4. Avançar para a próxima data recorrente (Avanço de dia já está no loop)
            if (frequency === 'WEEKLY' && current.getDay() === targetDayIndex) {
                current.setDate(current.getDate() + 7);
            } else if (frequency === 'MONTHLY' && current.getDate() === rbStartDate.getDate()) {
                current.setMonth(current.getMonth() + 1);
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
    const [view, setView] = useState<AgendaView>('day'); // Alterado para 'day' como padrão
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [defaultDateForNewBooking, setDefaultDateForNewBooking] = useState<Date | undefined>(undefined);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estado para o modal de gerenciamento de recorrência
    const [recurringInstanceToManage, setRecurringInstanceToManage] = useState<{ instance: Booking, rule: RecurringBooking } | null>(null);

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
        // Se for uma instância recorrente, abre o modal de gerenciamento de recorrência
        if (booking.isRecurringInstance && booking.recurringRuleId) {
            const rb = recurringBookings.find(r => r.id === booking.recurringRuleId);
            
            if (rb) {
                setRecurringInstanceToManage({ instance: booking, rule: rb });
            } else {
                console.warn(`Regra de recorrência não encontrada para o ID: ${booking.recurringRuleId}. Ignorando clique.`);
            }
            return;
        }
        // Se for um agendamento único, abre o modal de edição normal
        setSelectedBooking(booking);
        setDefaultDateForNewBooking(undefined);
        setIsModalOpen(true);
    }, [recurringBookings]);
    
    const handleCancelRecurrence = async (recurringBookingId: string) => {
        const success = await api.cancelRecurringBooking(recurringBookingId);
        if (success) {
            alert("Agendamento recorrente cancelado com sucesso! As instâncias futuras não aparecerão mais na agenda.");
            setRecurringInstanceToManage(null);
            fetchData(); // Recarrega os dados
        } else {
            alert("Falha ao cancelar o agendamento recorrente.");
        }
    };
    
    const handleCancelInstance = async (instance: Booking) => {
        if (!instance.isRecurringInstance || !instance.recurringRuleId) return;
        
        const service = services.find(s => s.id === instance.serviceId);
        const user = users.find(u => u.id === instance.userId);
        
        if (!service || !user) {
            alert("Erro: Dados do serviço ou cliente não encontrados.");
            return;
        }
        
        // Cria um novo registro de agendamento com status 'canceled' para esta data/hora
        // Nota: O ID é removido para forçar a inserção de um novo registro (a exceção)
        const newBooking: Omit<Booking, 'id'> = { 
            userId: user.id, 
            serviceId: service.id, 
            professionalId: instance.professionalId, 
            date: instance.date, 
            status: 'canceled', 
            duration: instance.duration,
            serviceName: service.name,
            recurringRuleId: instance.recurringRuleId, // Marca como exceção
            comment: `Cancelamento de instância recorrente: ${instance.date.toLocaleDateString('pt-BR')}`,
        };
        
        try {
            const result = await api.addOrUpdateBooking(newBooking);
            
            if (result) {
                alert(`Instância de agendamento cancelada com sucesso!`);
                setRecurringInstanceToManage(null);
                fetchData(); // Recarrega os dados para filtrar a exceção
            } else {
                // Isso não deve acontecer se a API lançar erro, mas é um fallback
                alert("Falha ao cancelar a instância do agendamento.");
            }
        } catch (error: any) {
            console.error("Erro ao cancelar instância recorrente:", error);
            alert(`Falha ao cancelar a instância: ${error.message}`);
        }
    };

    const handleSaveBooking = async (booking: Partial<Booking>) => {
        const isEditing = !!booking.id;
        
        // Busca o agendamento original APENAS se estiver editando e o ID não for de recorrência (R-...)
        const originalBooking = isEditing && !booking.id?.startsWith('R-') 
            ? bookings.find(b => b.id === booking.id) 
            : null;
            
        const wasJustCancelled = originalBooking && originalBooking.status !== 'canceled' && booking.status === 'canceled';

        try {
            const savedBooking = await api.addOrUpdateBooking(booking);
            
            if (savedBooking) {
                // Atualiza a lista de agendamentos na interface
                setBookings(prev => {
                    const existingIndex = prev.findIndex(b => b.id === savedBooking.id);
                    if (existingIndex !== -1) {
                        return prev.map((b, index) => index === existingIndex ? savedBooking : b);
                    }
                    return [...prev, savedBooking]; // Adiciona se for novo
                });

                // Se o agendamento foi cancelado nesta ação, executa o fluxo de devolução e notificação
                if (wasJustCancelled) {
                    const service = services.find(s => s.id === savedBooking.serviceId);
                    const user = users.find(u => u.id === savedBooking.userId);

                    if (service && user) {
                        let creditReturned = false;
                        // 1. Devolve o crédito se for um serviço de pacote
                        if (service.sessions && service.sessions > 1) {
                            const updatedUser = await api.returnCreditToUser(user.id, service.id);
                            if (updatedUser) {
                                creditReturned = true;
                            }
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
                // Este bloco não deve ser alcançado se a API lançar erro
                alert(`Falha ao salvar o agendamento. Verifique se todos os campos estão preenchidos e se o horário está disponível.`);
            }
        } catch (error: any) {
            // Captura o erro lançado pela API e exibe a mensagem específica
            console.error("Erro ao salvar/cancelar agendamento:", error);
            alert(`Falha ao salvar o agendamento: ${error.message}`);
        } finally {
            setIsModalOpen(false);
            fetchData(); // Garante que a lista seja recarregada após salvar/cancelar
        }
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
        // 1. Filtra agendamentos únicos que NÃO estão cancelados E NÃO são exceções de recorrência canceladas
        const uniqueBookings = bookings.filter(b => 
            !b.recurringRuleId && b.status !== 'canceled'
        );
        
        let range: { start: Date, end: Date };
        if (view === 'month') range = getMonthRange(currentDate);
        else if (view === 'week') range = getWeekRange(currentDate);
        else range = getDayRange(currentDate);
        
        const recurringInstances = generateRecurringBookings(
            recurringBookings, 
            bookings, // Passa todos os bookings para verificar exceções canceladas
            range.start, 
            range.end, 
            services, 
            users
        );
        
        // 2. Combina agendamentos únicos (não recorrentes e não cancelados) e instâncias recorrentes
        return [...uniqueBookings, ...recurringInstances];
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
                        fetchData(); 
                    }}
                    onSave={handleSaveBooking}
                    defaultDate={defaultDateForNewBooking}
                    users={users}
                    professionals={professionals}
                />
            )}
            
            {recurringInstanceToManage && (
                <RecurringInstanceModal
                    instance={recurringInstanceToManage.instance}
                    recurringRule={recurringInstanceToManage.rule}
                    onClose={() => setRecurringInstanceToManage(null)}
                    onCancelInstance={handleCancelInstance}
                    onCancelRecurrence={handleCancelRecurrence}
                    users={users}
                    services={services}
                />
            )}
        </div>
    );
}