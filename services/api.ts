import { supabase } from '../supabase/client';
import { User, Service, ServicePackage, Booking, Sale, OperatingHours, HolidayException, ClinicSettings } from '../types';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';

// --- Configurações Padrão da Clínica ---

// ... (DEFAULT_CLINIC_SETTINGS e Funções de Autenticação/Perfil/Serviços/Pacotes omitidas, pois não foram alteradas)

// --- Funções de Créditos ---

export const addCreditsToUser = async (userId: string, serviceId: string, quantity: number, sessionsPerPackage: number = 1): Promise<User | null> => {
    const user = await getUserProfile(userId);
    if (!user) return null;

    const totalCreditsToAdd = quantity * sessionsPerPackage;
    const currentCredits = user.credits || {};
    const newCredits = {
        ...currentCredits,
        [serviceId]: (currentCredits[serviceId] || 0) + totalCreditsToAdd,
    };

    const { error } = await supabase
        .from('profiles')
        .update({ procedure_credits: newCredits })
        .eq('id', userId);

    if (error) {
        console.error("Error adding credits:", error);
        return null;
    }

    return getUserProfile(userId);
};

export const addPackageCreditsToUser = async (userId: string, pkg: ServicePackage): Promise<User | null> => {
    const user = await getUserProfile(userId);
    if (!user) return null;

    const currentCredits = user.credits || {};
    let newCredits = { ...currentCredits };
    
    // Busca todos os serviços de uma vez para evitar múltiplas chamadas de API dentro do loop
    const allServices = await getServices();
    if (!allServices) return null;

    for (const item of pkg.services) {
        const service = allServices.find(s => s.id === item.serviceId);
        const sessionsPerService = service?.sessions || 1;
        const totalCreditsToAdd = item.quantity * sessionsPerService;
        
        newCredits[item.serviceId] = (newCredits[item.serviceId] || 0) + totalCreditsToAdd;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ procedure_credits: newCredits })
        .eq('id', userId);

    if (error) {
        console.error("Error adding package credits:", error);
        return null;
    }

    return getUserProfile(userId);
};

export const deductCreditFromUser = async (userId: string, serviceId: string): Promise<User | null> => {
// ... (restante do arquivo)