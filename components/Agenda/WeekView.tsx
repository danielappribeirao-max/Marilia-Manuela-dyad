
import React, { useMemo } from 'react';
import { Booking, Service, User } from '../../types';

interface AgendaWeekViewProps {
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

const AgendaWeekView: React.FC<AgendaWeekViewProps> = ({ currentDate, bookings, onBookingClick, onNewBooking, services, users }) => {
    const timeSlots = Array.from({ length: (20 - 8) * 2 }, (_, i) => {
        const hour = 8 + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    });

    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            return day;
        });
    }, [currentDate]);

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };
    
    const handleSlotClick = (day: Date, time: string) => {
        const [hour, minute] = time.split(':').map(Number);
        const newBookingDate = new Date(day);
        newBookingDate.setHours(hour, minute);
        onNewBooking(newBookingDate);
    };

    return (
        <div className="grid grid-cols-[auto_1fr] min-h-[80vh]">
            {/* Time column */}
            <div className="text-right text-xs text-gray-500">
                <div className="h-14 border-b border-gray-200"></div> {/* Corner */}
                {timeSlots.map(time => (
                    <div key={time} className="h-12 flex items-center justify-end pr-2 border-r border-gray-200">
                        {time.endsWith(':00') && <span>{time}</span>}
                    </div>
                ))}
            </div>

            {/* Day columns */}
            <div className="grid grid-cols-7">
                {weekDays.map(day => (
                    <div key={day.toISOString()} className="relative border-r border-gray-200">
                        {/* Day header */}
                        <div className={`text-center py-2 border-b border-gray-200 sticky top-0 bg-white z-10 ${isToday(day) ? 'text-pink-600' : ''}`}>
                            <p className="text-sm font-semibold">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                            <p className={`text-xl font-bold ${isToday(day) ? 'bg-pink-500 text-white rounded-full w-8 h-8 mx-auto flex items-center justify-center' : ''}`}>{day.getDate()}</p>
                        </div>

                        {/* Time slots for bookings */}
                        <div className="relative">
                            {timeSlots.map((time, index) => (
                                <div 
                                    key={time} 
                                    className={`h-12 border-b border-gray-100 cursor-pointer hover:bg-pink-50`}
                                    onClick={() => handleSlotClick(day, time)}
                                ></div>
                            ))}
                        </div>
                        
                        {/* Bookings */}
                        <div className="absolute top-14 left-0 right-0">
                            {bookings
                                .filter(b => new Date(b.date).toDateString() === day.toDateString())
                                .map(booking => {
                                    const service = services.find(s => s.id === booking.serviceId);
                                    const user = users.find(u => u.id === booking.userId);
                                    if (!service) return null;

                                    const bookingDuration = booking.duration || service.duration;
                                    const bookingDate = new Date(booking.date);
                                    const startHour = bookingDate.getHours();
                                    const startMinute = bookingDate.getMinutes();

                                    const top = ((startHour - 8) * 60 + startMinute) / 30 * 3; // 3rem (h-12) per 30 mins
                                    const height = bookingDuration / 30 * 3; // 3rem per 30 mins
                                    
                                    const colorClass = professionalColors[booking.professionalId] || 'bg-gray-200 border-gray-500';

                                    return (
                                        <div
                                            key={booking.id}
                                            onClick={() => onBookingClick(booking)}
                                            className={`absolute left-1 right-1 p-2 rounded-lg border-l-4 cursor-pointer text-xs ${colorClass}`}
                                            style={{ top: `${top}rem`, height: `${height}rem`, minHeight: '3rem' }}
                                        >
                                            <p className="font-bold truncate">{service.name}</p>
                                            <p className="truncate">{user?.name || 'Cliente'}</p>
                                            <p className="text-gray-600">{bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AgendaWeekView;
