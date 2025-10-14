import React, { useState } from 'react';
import { Booking, Service, User } from '../types';
import * as api from '../services/api';
import StarRating from './StarRating';
import { Calendar, Clock, User as UserIcon, Star, Edit, XCircle } from 'lucide-react';

interface UserBookingCardProps {
    booking: Booking;
    onCancel: (bookingId: string) => void;
    onReschedule: (booking: Booking) => void;
    services: Service[];
    professionals: User[];
}

const UserBookingCard: React.FC<UserBookingCardProps> = ({ booking, onCancel, onReschedule, services, professionals }) => {
    const service = services.find(s => s.id === booking.serviceId);
    const professional = professionals.find(p => p.id === booking.professionalId);
    
    const [newRating, setNewRating] = useState(booking.rating || 0);
    const [isReviewing, setIsReviewing] = useState(false);
    const [newComment, setNewComment] = useState(booking.comment || '');
    const [commentError, setCommentError] = useState('');

    if (!service || !professional) return null;

    const statusMap = {
        confirmed: { text: 'Confirmado', classes: 'bg-blue-100 text-blue-800', icon: <Calendar className="w-4 h-4" /> },
        completed: { text: 'Realizado', classes: 'bg-green-100 text-green-800', icon: <Star className="w-4 h-4" /> },
        canceled: { text: 'Cancelado', classes: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
    };
    const statusInfo = statusMap[booking.status] || { text: booking.status, classes: 'bg-gray-100 text-gray-800', icon: <Calendar className="w-4 h-4" /> };

    const handleReviewSubmit = async () => {
        if (newRating === 0) {
            setCommentError('Por favor, selecione uma avaliação de estrelas.');
            return;
        }
        setCommentError('');
        
        const updatedBooking = await api.addOrUpdateBooking({
            ...booking,
            rating: newRating,
            comment: newComment
        });

        if (updatedBooking) {
            alert(`Avaliação enviada com sucesso! Obrigado!`);
            setIsReviewing(false);
            booking.rating = newRating;
            booking.comment = newComment;
        } else {
            alert('Ocorreu um erro ao enviar sua avaliação.');
        }
    };

    const bookingDate = new Date(booking.date);

    return (
        <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 transition-shadow hover:shadow-xl">
            <div className="flex flex-col sm:flex-row gap-4">
                <img src={service.imageUrl} alt={service.name} className="w-full sm:w-32 h-32 object-cover rounded-lg" />
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                            <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-1"><UserIcon size={14} /> com {professional.name}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize flex items-center gap-1.5 ${statusInfo.classes}`}>
                            {statusInfo.icon} {statusInfo.text}
                        </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200/80 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                        <p className="flex items-center gap-1.5"><Calendar size={14} /> {bookingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <p className="flex items-center gap-1.5"><Clock size={14} /> {bookingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200/80">
                {booking.status === 'confirmed' && (
                     <div className="flex items-center justify-end gap-3">
                         <button onClick={() => onReschedule(booking)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 font-semibold"><Edit size={14} /> Reagendar</button>
                         <button onClick={() => onCancel(booking.id)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 font-semibold"><XCircle size={14} /> Cancelar</button>
                     </div>
                )}
                {booking.status === 'completed' && (
                    <div>
                        {booking.rating ? (
                            <div>
                                <p className="font-semibold text-sm mb-1 text-gray-700">Sua Avaliação:</p>
                                <div className="flex items-center gap-4">
                                    <StarRating rating={booking.rating} readOnly={true} />
                                    {booking.comment && <p className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded-md flex-1">"{booking.comment}"</p>}
                                </div>
                            </div>
                        ) : (
                            <div>
                                {!isReviewing ? (
                                    <button onClick={() => setIsReviewing(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-full hover:bg-yellow-500 font-semibold transition-colors">
                                        <Star size={16} /> Avaliar Serviço
                                    </button>
                                ) : (
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                        <p className="font-semibold text-center">Deixe sua avaliação:</p>
                                        <div className="flex justify-center">
                                            <StarRating rating={newRating} onRatingChange={(r) => { setNewRating(r); setCommentError(''); }} />
                                        </div>
                                        <textarea 
                                            value={newComment}
                                            onChange={(e) => { setNewComment(e.target.value); if(commentError) setCommentError(''); }}
                                            className={`w-full mt-2 p-2 border rounded-md bg-white text-gray-900 transition-colors ${commentError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-pink-500'}`} 
                                            placeholder="Como foi sua experiência? (opcional)"
                                            rows={2}
                                        ></textarea>
                                        {commentError && <p className="text-red-500 text-xs mt-1 text-center">{commentError}</p>}
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsReviewing(false)} className="px-4 py-1 text-sm bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300">Cancelar</button>
                                            <button onClick={handleReviewSubmit} className="px-4 py-1 text-sm bg-pink-500 text-white rounded-full hover:bg-pink-600">Enviar</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserBookingCard;