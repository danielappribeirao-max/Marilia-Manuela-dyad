import React from 'react';
import { Booking, Service, User } from '../../types';

interface AgendaDayViewProps {
  currentDate: Date;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
  onNewBooking: (date: Date) => void;
  services: Service[];
  users: User[];
}

const professionalColors: { [key: string]: string } = {
    'prof1': 'bg-blue-200 border-blue-500',
    'prof2': 'bg-green-200 border-green-500',
    'prof3': 'bg-purple-200 border-purple-500',
};

const AgendaDayView: React.FC<AgendaDayViewProps> = ({ currentDate, bookings, onBookingClick, onNewBooking, services, users }) => {
    const timeSlots = Array.from({ length: (20 - 8) * 2 }, (_, i) => {
        const hour = 8 + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    });
    
    const handleSlotClick = (time: string) => {
        const [hour, minute] = time.split(':').map(Number);
        const newBookingDate = new Date(currentDate);
        newBookingDate.setHours(hour, minute);
        onNewBooking(newBookingDate);
    };

    return (
        <div className="grid grid-cols-[auto_1fr] min-h-[80vh]">
            {/* Time column */}
            <div className="text-right text-xs text-gray-500">
                {timeSlots.map(time => (
                    <div key={time} className="h-12 flex items-center justify-end pr-2 border-r border-gray-200">
                        {time.endsWith(':00') && <span>{time}</span>}
                    </div>
                ))}
            </div>

            {/* Day column */}
            <div className="relative border-r border-gray-200">
                {/* Time slots for bookings */}
                <div className="relative">
                    {timeSlots.map((time, index) => (
                        <div 
                            key={time} 
                            className={`h-12 border-b border-gray-100 cursor-pointer hover:bg-pink-50`}
                            onClick={() => handleSlotClick(time)}
                        ></div>
                    ))}
                </div>
                
                {/* Bookings */}
                <div className="absolute top-0 left-0 right-0">
                    {bookings
                        .filter(b => new Date(b.date).toDateString() === currentDate.toDateString())
                        .map(booking => {
                            const service = services.find(s => s.id === booking.serviceId);
                            const user = users.find(u => u.id === booking.userId);
                            if (!service) return null;

                            // Usar a duração do agendamento se existir, senão a do serviço
                            const bookingDuration = booking.duration || service.duration;
                            const bookingDate = new Date(booking.date);
                            const startHour = bookingDate.getHours();
                            const startMinute = bookingDate.getMinutes();

                            // 8:00 AM é o início da agenda (0 minutos)
                            const startMinutesFrom8AM = (startHour - 8) * 60 + startMinute;
                            
                            // 1 rem = 4px. h-12 = 3rem. 3rem representa 30 minutos.
                            // 1 minuto = 3rem / 30 minutos = 0.1 rem
                            const top = startMinutesFrom8AM / 30 * 3;
                            const height = bookingDuration / 30 * 3;
                            
                            const colorClass = professionalColors[booking.professionalId] || 'bg-gray-200 border-gray-500';

                            return (
                                <div
                                    key={booking.id}
                                    onClick={() => onBookingClick(booking)}
                                    className={`absolute left-2 right-2 p-2 rounded-lg border-l-4 cursor-pointer text-sm ${colorClass}`}
                                    style={{ top: `${top}rem`, height: `${height}rem`, minHeight: '3rem' }}
                                >
                                    <p className="font-bold truncate">{service.name}</p>
                                    <p className="truncate">{user?.name || 'Cliente não encontrado'}</p>
                                    <p className="text-gray-600 text-xs">{bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(bookingDate.getTime() + bookingDuration * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AgendaDayView;