import React, { useState, useCallback } from 'react';
import { useApp } from '../App';
import { Page, User, Booking } from '../types';
import FreeConsultationBookingModal from '../components/FreeConsultationBookingModal';
import QuickRegistrationForm from '../components/QuickRegistrationForm';
import { FREE_CONSULTATION_SERVICE } from '../constants';
import * as api from '../services/api';

// Tipos para o estado do usuário pré-agendamento
interface TempUser extends Partial<User> {
    description: string;
    tempId?: string; // ID temporário para o agendamento
}

export default function FreeConsultationPage() {
    const { currentUser, setCurrentPage, professionals, clinicSettings, setCurrentUser } = useApp();
    
    // Estado para gerenciar o fluxo de 2 etapas
    const [step, setStep] = useState(currentUser ? 2 : 1); // 1: Cadastro Rápido, 2: Agendamento
    const [tempUserData, setTempUserData] = useState<TempUser | null>(currentUser ? { ...currentUser, description: '' } : null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Abre o modal de agendamento se estiver no passo 2
    React.useEffect(() => {
        if (step === 2 && (currentUser || tempUserData) && !isBookingConfirmed) {
            setIsModalOpen(true);
        }
    }, [step, currentUser, tempUserData, isBookingConfirmed]);

    const handleQuickRegistrationSuccess = async (data: Partial<User> & { description: string }) => {
        setIsSubmitting(true);
        
        const phoneDigits = data.phone?.replace(/\D/g, '') || Date.now().toString();
        const tempEmail = `temp_${phoneDigits}@mariliamanuela.com`;
        const tempPassword = `temp${phoneDigits}`;

        // 1. Tenta criar o usuário
        let newUser = await api.adminCreateUser({
            email: tempEmail,
            password: tempPassword,
            name: data.name,
            phone: data.phone,
            role: 'CLIENT',
        });

        // 2. Se a criação falhar (provavelmente porque o e-mail já existe), tenta fazer login
        if (!newUser) {
            const loginResult = await api.signIn(tempEmail, tempPassword);
            if (loginResult.user) {
                newUser = loginResult.user;
                alert("Detectamos que você já iniciou um cadastro. Prosseguindo com o agendamento.");
            }
        }

        setIsSubmitting(false);

        if (newUser) {
            // 3. Se a criação ou login for bem-sucedido, atualiza o estado global e local
            setCurrentUser(newUser);
            setTempUserData({ ...newUser, description: data.description });
            setStep(2); // Avança para o agendamento
        } else {
            alert("Não foi possível criar ou acessar o registro. Por favor, verifique seus dados e tente novamente.");
        }
    };

    const handleConfirmBooking = useCallback(async (details: { date: Date, professionalId: string }) => {
        const userToBook = currentUser || tempUserData;
        if (!userToBook || !userToBook.id) return false;

        const service = FREE_CONSULTATION_SERVICE;
        
        // A descrição dos serviços pretendidos será salva nas notas do agendamento
        const notes = `Serviços de Interesse: ${tempUserData?.description || 'Não informado'}`;
        
        // Usamos Partial<Booking> & { serviceName: string, notes: string } para garantir que todos os campos necessários para a API estejam presentes.
        const newBooking: Partial<Booking> & { serviceName: string, notes: string } = { 
            userId: userToBook.id, 
            serviceId: service.id, 
            professionalId: details.professionalId, 
            date: details.date, 
            status: 'confirmed', 
            duration: service.duration, // ESSENCIAL: Adicionar duration
            serviceName: service.name, // ESSENCIAL: Adicionar serviceName
            notes: notes,
        };
        
        const result = await api.addOrUpdateBooking(newBooking);
        
        if (result) {
            setIsBookingConfirmed(true);
            return true;
        }
        return false;
    }, [currentUser, tempUserData]);

    const handleModalClose = () => {
        setIsModalOpen(false);
        // Redireciona para a home ou dashboard após fechar o modal
        setCurrentPage(isBookingConfirmed ? Page.USER_DASHBOARD : Page.HOME);
    };

    const renderContent = () => {
        if (isBookingConfirmed) {
            return (
                <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                    <p className="text-lg font-semibold text-green-700">Sua consulta foi agendada com sucesso!</p>
                    <p className="text-sm text-gray-600 mt-2">Você receberá os detalhes por e-mail e WhatsApp.</p>
                    <button onClick={() => setCurrentPage(Page.USER_DASHBOARD)} className="mt-4 px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600">Ver Meus Agendamentos</button>
                </div>
            );
        }
        
        if (step === 1) {
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
            return (
                <div className="py-12 px-6 text-center">
                    <h1 className="text-3xl font-bold text-gray-800">Quase lá, {currentUser?.name.split(' ')[0] || tempUserData?.name?.split(' ')[0]}!</h1>
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