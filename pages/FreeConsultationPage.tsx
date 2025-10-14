import React, { useState, useCallback } from 'react';
import { useApp } from '../App';
import { Page, User } from '../types';
import LoginPage from './LoginPage';
import FreeConsultationBookingModal from '../components/FreeConsultationBookingModal';
import { FREE_CONSULTATION_SERVICE } from '../constants';
import * as api from '../services/api';

export default function FreeConsultationPage() {
    const { currentUser, setCurrentPage, professionals, clinicSettings } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);

    // Abre o modal de agendamento assim que o usuário estiver logado/cadastrado
    React.useEffect(() => {
        if (currentUser && !isBookingConfirmed) {
            setIsModalOpen(true);
        }
    }, [currentUser, isBookingConfirmed]);

    const handleConfirmBooking = useCallback(async (details: { date: Date, professionalId: string }) => {
        if (!currentUser) return false;

        const service = FREE_CONSULTATION_SERVICE;
        
        const newBooking: Omit<api.Booking, 'id'> = { 
            userId: currentUser.id, 
            serviceId: service.id, 
            professionalId: details.professionalId, 
            date: details.date, 
            status: 'confirmed', 
            duration: service.duration,
            serviceName: service.name, // Adiciona o nome do serviço para o DB
        };
        
        const result = await api.addOrUpdateBooking(newBooking);
        
        if (result) {
            setIsBookingConfirmed(true);
            return true;
        }
        return false;
    }, [currentUser]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        // Redireciona para a home ou dashboard após fechar o modal
        setCurrentPage(isBookingConfirmed ? Page.USER_DASHBOARD : Page.HOME);
    };

    if (!currentUser) {
        return (
            <div className="py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl mx-auto text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Agende sua Consulta Gratuita</h1>
                    <p className="text-gray-600 mt-2">Faça login ou cadastre-se rapidamente para reservar sua avaliação inicial sem custo.</p>
                </div>
                <LoginPage />
            </div>
        );
    }

    return (
        <div className="py-12 px-6 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Bem-vindo(a), {currentUser.name.split(' ')[0]}!</h1>
            <p className="text-gray-600 mt-2">Estamos preparando sua agenda. Por favor, selecione o horário abaixo.</p>
            
            {/* O modal abre automaticamente via useEffect */}
            {isModalOpen && (
                <FreeConsultationBookingModal
                    onClose={handleModalClose}
                    onConfirmBooking={handleConfirmBooking}
                    professionals={professionals}
                    clinicOperatingHours={clinicSettings?.operatingHours}
                    clinicHolidayExceptions={clinicSettings?.holidayExceptions}
                />
            )}
            
            {isBookingConfirmed && (
                <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                    <p className="text-lg font-semibold text-green-700">Sua consulta foi agendada com sucesso!</p>
                    <button onClick={() => setCurrentPage(Page.USER_DASHBOARD)} className="mt-4 px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600">Ver Meus Agendamentos</button>
                </div>
            )}
        </div>
    );
}