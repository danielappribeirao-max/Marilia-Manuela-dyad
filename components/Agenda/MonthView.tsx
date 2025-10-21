import React, { useMemo } from 'react';
import { Booking, Service, User } from '../../types';
import { formatPhone } from '../../utils/formatters';

interface AgendaMonthViewProps {
  currentDate: Date;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onNewBooking: (date: Date) => void;
  services: Service[];
  users: User[];
}

const weekDaysHeader = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AgendaMonthView: React.FC<AgendaMonthViewProps> = ({ currentDate, bookings, onBookingClick, onNewBooking, services, users }) => {
    
    const { year, month } = useMemo(() => ({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth(),
    }), [currentDate]);

    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [year, month]);

    const bookingsByDate = useMemo(() => {
        const map = new Map<string, Booking[]>();
        bookings.forEach(booking => {
            const dateKey = new Date(booking.date).toDateString();
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)?.push(booking);
        });
        map.forEach(dayBookings => dayBookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        return map;
    }, [bookings]);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };
    
    const statusClasses = {
        confirmed: 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200',
        completed: 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200',
        canceled: 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200 line-through',
        Agendado: 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200', // Adicionado status 'Agendado'
    };

    return (
        <div className="grid grid-cols-7 border-t border-l border-gray-200">
            {weekDaysHeader.map(day => (
                <div key={day} className="text-center font-bold text-gray-600 py-2 border-r border-b border-gray-200 bg-gray-50 text-xs sm:text-sm">{day}</div>
            ))}
            
            {calendarDays.map((day, index) => {
                if (!day) {
                    return <div key={`empty-${index}`} className="border-r border-b border-gray-200 bg-gray-50 min-h-[120px]"></div>;
                }

                const dayBookings = bookingsByDate.get(day.toDateString()) || [];
                const isCurrentDay = isToday(day);

                return (
                    <div key={day.toISOString()} className="group relative min-h-[120px] border-r border-b border-gray-200 p-1.5 overflow-y-auto">
                        <div className="flex justify-between items-start">
                            <span className={`flex items-center justify-center h-7 w-7 text-sm rounded-full ${isCurrentDay ? 'bg-pink-500 text-white font-bold' : 'text-gray-700'}`}>
                                {day.getDate()}
                            </span>
                             <button
                                onClick={() => onNewBooking(day)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center bg-pink-400 text-white rounded-full hover:bg-pink-500 focus:outline-none"
                                aria-label={`Adicionar agendamento para ${day.toLocaleDateString('pt-BR')}`}
                                title={`Adicionar agendamento para ${day.toLocaleDateString('pt-BR')}`}
                            >
                                +
                            </button>
                        </div>
                        <div className="mt-1 space-y-1">
                            {dayBookings.map(booking => {
                                const service = services.find(s => s.id === booking.serviceId);
                                // Busca o usuário, se não encontrar, usa um objeto placeholder
                                const user = booking.userId ? users.find(u => u.id === booking.userId) : null;
                                const clientName = user?.name || 'Cliente Excluído';
                                const clientPhone = user?.phone || 'N/A';
                                
                                const bookingStatusClasses = statusClasses[booking.status as keyof typeof statusClasses] || statusClasses.Agendado;
                                
                                return (
                                    <div 
                                        key={booking.id} 
                                        onClick={() => onBookingClick(booking)}
                                        className={`border-l-4 p-1.5 rounded-r-md cursor-pointer transition-colors ${bookingStatusClasses}`}
                                        role="button"
                                        aria-label={`Agendamento de ${service?.name} para ${clientName}`}
                                    >
                                        <p className="font-bold text-xs">
                                            {new Date(booking.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs truncate font-medium">{service?.name}</p>
                                        {clientPhone !== 'N/A' && <p className="text-xs text-gray-600 font-medium">{formatPhone(clientPhone)}</p>}
                                        {clientName === 'Cliente Excluído' && <p className="text-xs text-red-600 font-medium">Excluído</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AgendaMonthView;