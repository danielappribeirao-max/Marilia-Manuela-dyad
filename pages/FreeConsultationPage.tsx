import React, { useState, useCallback } from 'react';
import { useApp } from '../App';
import { Page, User, Booking } from '../types';
import FreeConsultationBookingModal from '../components/FreeConsultationBookingModal';
import QuickRegistrationForm from '../components/QuickRegistrationForm';
import { FREE_CONSULTATION_SERVICE } from '../constants';
import * as api from '../services/api';

interface TempUserInfo {
    name: string;
    phone: string;
    description: string;
}

export default function FreeConsultationPage() {
    const { currentUser, setCurrentPage, professionals, clinicSettings, setCurrentUser } = useApp();
    
    const [step, setStep] = useState(currentUser ? 2 : 1);
    const [tempUserInfo, setTempUserInfo] = useState<TempUserInfo | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (step === 2 && !isBookingConfirmed) {
            setIsModalOpen(true);
        }
    }, [step, isBookingConfirmed]);

    const handleQuickRegistrationSuccess = (data: TempUserInfo) => {
        setTempUserInfo(data);
        setStep(2);
    };

    const handleConfirmBooking = useCallback(async (details: { date: Date, professionalId: string }) => {
        setIsSubmitting(true);
        let result: Booking | null = null;

        if (currentUser) {
            // Fluxo para usuário logado
            const service = FREE_CONSULTATION_SERVICE;
            const newBooking: Partial<Booking> & { serviceName: string, notes: string } = { 
                userId: currentUser.id, 
                serviceId: service.id, 
                professionalId: details.professionalId, 
                date: details.date, 
                status: 'confirmed', 
                duration: service.duration,
                serviceName: service.name,
                notes: 'Consulta de avaliação agendada pelo próprio cliente.',
            };
            result = await api.addOrUpdateBooking(newBooking);
        } else if (tempUserInfo) {
            // Fluxo para novo usuário, usando a nova Edge Function
            result = await api.bookFreeConsultationForNewUser({
                ...tempUserInfo,
                ...details,
            });
            // Tenta logar o usuário recém-criado para que ele tenha uma sessão
            if (result) {
                const phoneDigits = tempUserInfo.phone.replace(/\D/g, '');
                const tempEmail = `temp_${phoneDigits}@mariliamanuela.com`;
                const tempPassword = `temp${phoneDigits}`;
                const loginResult = await api.signIn(tempEmail, tempPassword);
                if (loginResult.user) {
                    setCurrentUser(loginResult.user);
                }
            }
        }
        
        setIsSubmitting(false);
        if (result) {
            setIsBookingConfirmed(true);
            return true;
        }
        return false;
    }, [currentUser, tempUserInfo, setCurrentUser]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        setCurrentPage(isBookingConfirmed ? Page.USER_DASHBOARD : Page.HOME);
    };

    const renderContent = () => {
        if (isBookingConfirmed) {
            return (
                <div className="text-center py-12 px-6">
                    <h1 className="text-3xl font-bold text-green-600">Agendamento Confirmado!</h1>
                    <p className="text-gray-600 mt-2 max-w-md mx-auto">Sua consulta de avaliação gratuita foi agendada com sucesso. Entraremos em contato em breve com mais detalhes.</p>
                    <button onClick={() => setCurrentPage(Page.USER_DASHBOARD)} className="mt-6 px-6 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600">
                        Ver Meus Agendamentos
                    </button>
                </div>
            );
        }
        
        if (step === 1 && !currentUser) {
            return (
                <div className="py-12 px-4 sm:px-6 lg:px-8">
                    <QuickRegistrationForm 
                        onSuccess={handleQuickRegistrationSuccess} 
                        isSubmitting={isSubmitting}
                    />
                </div>
            );
        }
        
        if (step === 2) {
            const userName = currentUser?.name.split(' ')[0] || tempUserInfo?.name.split(' ')[0];
            return (
                <div className="py-12 px-6 text-center">
                    <h1 className="text-3xl font-bold text-gray-800">Quase lá, {userName}!</h1>
                    <p className="text-gray-600 mt-2">Agora, selecione o melhor horário para sua consulta gratuita.</p>
                </div>
            );
        }
        
        return null;
    };

    return (
        <div className="min-h-[70vh]">
            {renderContent()}
            
            {isModalOpen && (
                <FreeConsultationBookingModal
                    onClose={handleModalClose}
                    onConfirmBooking={handleConfirmBooking}
                    professionals={professionals}
                    clinicOperatingHours={clinicSettings?.operatingHours}
                    clinicHolidayExceptions={clinicSettings?.holidayExceptions}
                />
            )}
        </div>
    );
}