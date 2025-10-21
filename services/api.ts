import { supabase } from '../supabase/client';
import { User, Service, ServicePackage, Booking, Sale, OperatingHours, HolidayException, ClinicSettings, Role } from '../types';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';

// --- Configurações Padrão da Clínica ---
export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
    id: '00000000-0000-0000-0000-000000000001',
    operatingHours: {
        0: { open: false }, // Domingo
        1: { open: true, start: '08:00', end: '20:00' }, // Segunda
        2: { open: true, start: '08:00', end: '20:00' }, // Terça
        3: { open: true, start: '08:00', end: '20:00' }, // Quarta
        4: { open: true, start: '08:00', end: '20:00' }, // Quinta
        5: { open: true, start: '08:00', end: '20:00' }, // Sexta
        6: { open: true, start: '08:00', end: '20:00' }, // Sábado (AGORA ABERTO POR PADRÃO)
    },
    holidayExceptions: [],
    featuredServiceIds: [],
    heroText: 'Bem Vindos ...', // TÍTULO ATUALIZADO
    heroSubtitle: 'Na Marília Manuela - Centro de Estética Avançada temos tratamentos de ponta, agende seu momento de cuidado em um ambiente de luxo e bem-estar.', // SUBTÍTULO ATUALIZADO
    aboutText: 'Na Marília Manuela, acreditamos que a estética vai além da aparência. Oferecemos um refúgio de bem-estar com tratamentos personalizados e tecnologia de ponta, garantindo resultados que elevam sua autoestima e promovem saúde integral. Nossa equipe de profissionais altamente qualificados está pronta para te receber.',
};

// --- Funções de Autenticação e Perfil ---

export const getCurrentUserSession = async () => {
    return supabase.auth.getSession();
};

export const signOut = async () => {
    return supabase.auth.signOut();
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    try {
        // 1. Get the authenticated user's email from the client session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || user.id !== userId) {
            console.error("Authenticated user mismatch or session expired during profile fetch.");
            return null;
        }
        
        // 2. Fetch the profile data
        let { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*') // Only select from profiles
            .eq('id', userId)
            .single();

        if (profileError && profileError.code === 'PGRST116') { // No rows found
            console.warn(`Profile not found for user ${userId}. Attempting to create a basic profile.`);
            
            // Tenta criar um perfil básico (confiando na política RLS de INSERT)
            const { data: newProfileData, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    full_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'Novo Usuário',
                    // O email não é salvo no profiles, mas é útil para debug
                    phone: user.user_metadata.phone || '',
                    role: 'user',
                })
                .select('*')
                .single();
                
            if (insertError) {
                console.error("Error creating basic profile:", insertError);
                return null;
            }
            profileData = newProfileData;
        } else if (profileError) {
            console.error("Error fetching user profile:", profileError);
            return null;
        }

        if (profileData) {
            return {
                id: profileData.id,
                name: profileData.full_name || 'Usuário',
                email: user.email || '', // Use email from auth session
                phone: profileData.phone || '',
                cpf: profileData.cpf || '',
                role: profileData.role as User['role'],
                credits: profileData.procedure_credits || {},
                avatarUrl: profileData.avatar_url || '',
            };
        }
        return null;
    } catch (e) {
        console.error("Critical error in getUserProfile:", e);
        return null;
    }
};

export const getUsersWithRoles = async (): Promise<User[] | null> => {
    // Usamos a RPC para obter dados de auth.users e public.profiles
    const { data, error } = await supabase.rpc('get_all_users_for_admin');

    if (error) {
        console.error("Error fetching users with roles:", error);
        return null;
    }

    return data.map(d => ({
        id: d.id,
        name: d.full_name || 'N/A',
        email: d.email || 'N/A',
        phone: d.phone || 'N/A',
        cpf: d.cpf || 'N/A',
        role: d.role as User['role'],
        credits: d.credits || {},
        // Agora a RPC retorna avatar_url
        avatarUrl: d.avatar_url || '', 
    }));
};

export const getProfessionals = async (): Promise<User[] | null> => {
    const { data, error } = await supabase.rpc('get_all_professionals');

    if (error) {
        console.error("Error fetching professionals:", error);
        return null;
    }

    return data.map(d => ({
        id: d.id,
        name: d.full_name || 'Profissional',
        email: '',
        phone: d.phone || '',
        cpf: d.cpf || '',
        role: d.role as User['role'],
        credits: d.credits || {},
        avatarUrl: '',
    }));
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    const payload: any = {
        updated_at: new Date().toISOString(),
    };
    
    // Inclui apenas campos que foram fornecidos na atualização
    if (updates.name !== undefined) {
        payload.full_name = updates.name;
    }
    if (updates.phone !== undefined) {
        // Remove formatação e garante que strings vazias sejam salvas como NULL
        payload.phone = updates.phone?.replace(/\D/g, '') || null; 
    }
    if (updates.cpf !== undefined) {
        payload.cpf = updates.cpf?.replace(/\D/g, '') || null; 
    }
    if (updates.avatarUrl !== undefined) {
        payload.avatar_url = updates.avatarUrl;
    }
    // Inclui a função apenas se estiver sendo atualizada (geralmente pelo Admin)
    if (updates.role !== undefined) {
        payload.role = updates.role;
    }
    
    // Se o nome for atualizado, também atualiza o user_metadata para consistência
    if (updates.name !== undefined || updates.phone !== undefined || updates.avatarUrl !== undefined) {
        const authUpdatePayload: any = {
            data: {
                full_name: updates.name,
                phone: updates.phone?.replace(/\D/g, '') || null,
                avatar_url: updates.avatarUrl,
            }
        };
        // Nota: O RLS do storage depende do user_metadata, então é bom mantê-lo atualizado.
        // Não precisamos esperar por isso, mas é bom ter o log de erro.
        const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
        if (authError) {
            console.error("Error updating auth user metadata:", authError);
        }
    }
    
    const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

    if (error) {
        console.error("Error updating user profile:", error);
        // Se a atualização do perfil falhar, retornamos null para que o modal saiba que falhou.
        return null;
    }

    // Força o refresh da sessão para garantir que o user_metadata seja atualizado no cliente
    await supabase.auth.refreshSession();
    
    return getUserProfile(userId); // Busca o perfil completo e atualizado
};

export const adminCreateUser = async (userData: Partial<User> & { password?: string }): Promise<User | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
            body: {
                email: userData.email,
                password: userData.password,
                name: userData.name,
                phone: userData.phone?.replace(/\D/g, ''),
                cpf: userData.cpf?.replace(/\D/g, ''),
                role: userData.role,
            },
        });

        if (error) {
            console.error("Error invoking admin-create-user function:", error);
            alert(`Erro ao criar usuário: ${error.message}`);
            return null;
        }

        if (data.error) {
            console.error("Edge Function returned error:", data.error);
            alert(`Erro ao criar usuário: ${data.error}`);
            return null;
        }

        const createdUser = data.user;
        return {
            id: createdUser.id,
            name: createdUser.full_name || createdUser.name,
            email: createdUser.email,
            phone: createdUser.phone || '',
            cpf: createdUser.cpf || '',
            role: createdUser.role as Role,
            credits: createdUser.procedure_credits || {},
            avatarUrl: createdUser.avatar_url || '',
        };

    } catch (e) {
        console.error("Unexpected error during admin user creation:", e);
        alert("Erro inesperado ao criar usuário.");
        return null;
    }
};

export const adminUpdateUser = async (userData: Partial<User>): Promise<User | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
            body: {
                userId: userData.id,
                name: userData.name,
                phone: userData.phone?.replace(/\D/g, ''),
                cpf: userData.cpf?.replace(/\D/g, ''),
                role: userData.role,
                avatarUrl: userData.avatarUrl,
            },
        });

        if (error) {
            console.error("Error invoking admin-update-user function:", error);
            alert(`Erro ao atualizar usuário: ${error.message}`);
            return null;
        }

        if (data.error) {
            console.error("Edge Function returned error:", data.error);
            alert(`Erro ao atualizar usuário: ${data.error}`);
            return null;
        }

        const updatedUser = data.user;
        return {
            id: updatedUser.id,
            name: updatedUser.full_name || updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone || '',
            cpf: updatedUser.cpf || '',
            role: updatedUser.role as Role,
            credits: updatedUser.procedure_credits || {},
            avatarUrl: updatedUser.avatar_url || '',
        };

    } catch (e) {
        console.error("Unexpected error during admin user update:", e);
        alert("Erro inesperado ao atualizar usuário.");
        return null;
    }
};

export const deleteUser = async (userId: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
            body: { userId },
        });

        if (error) {
            console.error("Error invoking admin-delete-user function:", error);
            return { success: false, error: error.message };
        }

        if (data.error) {
            console.error("Edge Function returned error:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true };
    } catch (e) {
        console.error("Unexpected error during admin user deletion:", e);
        return { success: false, error: "Erro inesperado ao excluir usuário." };
    }
};

// --- Funções de Serviços ---

export const getServices = async (): Promise<Service[] | null> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('order', { ascending: true });

    if (error) {
        console.error("Error fetching services:", error);
        return null;
    }

    return data as Service[];
};

// REMOVIDA: ensureFreeConsultationServiceExists

export const addOrUpdateService = async (service: Partial<Service>): Promise<Service | null> => {
    if (service.id) {
        // Atualiza um serviço existente
        const { id, ...updateData } = service;
        const { data, error } = await supabase
            .from('services')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();
        
        if (error) {
            console.error("Error updating service:", error);
            return null;
        }
        return data as Service;
    } else {
        // Insere um novo serviço (removendo o campo 'id' se ele for nulo/undefined)
        const { id, ...newServiceData } = service;
        const { data, error } = await supabase
            .from('services')
            .insert(newServiceData)
            .select('*')
            .single();

        if (error) {
            console.error("Error inserting service:", error);
            return null;
        }
        return data as Service;
    }
};

export const deleteService = async (serviceId: string): Promise<void> => {
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

    if (error) {
        console.error("Error deleting service:", error);
        throw new Error("Falha ao excluir serviço.");
    }
};

export const updateServiceOrder = async (orderUpdates: { id: string; order: number }[]): Promise<boolean> => {
    const { error } = await supabase
        .from('services')
        .upsert(orderUpdates);

    if (error) {
        console.error("Error updating service order:", error);
        return false;
    }
    return true;
};

// --- Funções de Pacotes ---

export const getServicePackages = async (): Promise<ServicePackage[] | null> => {
    const { data, error } = await supabase
        .from('packages')
        .select('*, package_services(*)')
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching packages:", error);
        return null;
    }

    return data.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        image: pkg.image,
        services: pkg.package_services.map((ps: any) => ({
            serviceId: ps.service_id,
            quantity: ps.quantity,
        })),
    })) as ServicePackage[];
};

export const addOrUpdatePackage = async (pkg: Partial<ServicePackage>): Promise<ServicePackage | null> => {
    const isNew = !pkg.id;
    let packageId = pkg.id;

    // 1. Salvar/Atualizar o Pacote Principal
    const packagePayload = {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        image: pkg.image,
    };

    const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .upsert(packagePayload, { onConflict: 'id' })
        .select('id')
        .single();

    if (packageError || !packageData) {
        console.error("Error saving package:", packageError);
        return null;
    }

    packageId = packageData.id;

    // 2. Atualizar os Serviços do Pacote (Deleta tudo e insere novamente)
    if (packageId) {
        // Deleta os serviços antigos
        await supabase.from('package_services').delete().eq('package_id', packageId);

        // Insere os novos serviços
        const servicePayloads = pkg.services?.map(s => ({
            package_id: packageId,
            service_id: s.serviceId,
            quantity: s.quantity,
        })) || [];

        const { error: servicesError } = await supabase
            .from('package_services')
            .insert(servicePayloads);

        if (servicesError) {
            console.error("Error saving package services:", servicesError);
            // Tenta reverter a criação do pacote se a inserção dos serviços falhar
            await supabase.from('packages').delete().eq('id', packageId);
            return null;
        }
    }

    // 3. Retorna o pacote completo atualizado
    const updatedPackage = await getServicePackages();
    return updatedPackage?.find(p => p.id === packageId) || null;
};

export const deletePackage = async (packageId: string): Promise<void> => {
    // A exclusão em cascata deve cuidar de package_services
    const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

    if (error) {
        console.error("Error deleting package:", error);
        throw new Error("Falha ao excluir pacote.");
    }
};

// --- Funções de Créditos (Mantidas para uso do Admin/Interno) ---

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
    const user = await getUserProfile(userId);
    if (!user) return null;

    const currentCredits = user.credits || {};
    const currentCount = currentCredits[serviceId] || 0;

    if (currentCount <= 0) {
        console.warn(`Attempted to deduct credit for service ${serviceId} from user ${userId} but count is zero.`);
        return user; // Retorna o usuário sem alteração
    }

    const newCredits = {
        ...currentCredits,
        [serviceId]: currentCount - 1,
    };

    const { error } = await supabase
        .from('profiles')
        .update({ procedure_credits: newCredits })
        .eq('id', userId);

    if (error) {
        console.error("Error deducting credit:", error);
        return null;
    }

    return getUserProfile(userId);
};

export const returnCreditToUser = async (userId: string, serviceId: string): Promise<User | null> => {
    const user = await getUserProfile(userId);
    if (!user) return null;

    const currentCredits = user.credits || {};
    const currentCount = currentCredits[serviceId] || 0;

    const newCredits = {
        ...currentCredits,
        [serviceId]: currentCount + 1,
    };

    const { error } = await supabase
        .from('profiles')
        .update({ procedure_credits: newCredits })
        .eq('id', userId);

    if (error) {
        console.error("Error returning credit:", error);
        return null;
    }

    return getUserProfile(userId);
};

// --- Funções de Agendamento ---

export const getUserBookings = async (userId: string): Promise<Booking[] | null> => {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

    if (error) {
        console.error("Error fetching user bookings:", error);
        return null;
    }

    return data.map(b => ({
        id: String(b.id),
        userId: b.user_id,
        serviceId: b.service_id,
        professionalId: b.professional_id,
        date: new Date(`${b.booking_date}T${b.booking_time}:00`), // Combina data e hora
        status: b.status as Booking['status'],
        rating: b.rating,
        comment: b.notes,
        duration: b.duration,
    })) as Booking[];
};

export const getAllBookings = async (): Promise<Booking[] | null> => {
    // Nota: Esta função usa RLS para admins (get_my_role = 'admin')
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

    if (error) {
        console.error("Error fetching all bookings:", error);
        return null;
    }

    return data.map(b => ({
        id: String(b.id),
        userId: b.user_id,
        serviceId: b.service_id,
        professionalId: b.professional_id,
        date: new Date(`${b.booking_date}T${b.booking_time}:00`), // Combina data e hora
        status: b.status as Booking['status'],
        rating: b.rating,
        comment: b.notes,
        duration: b.duration,
    })) as Booking[];
};

export const getOccupiedSlots = async (date: string): Promise<{ id: number, professional_id: string, booking_time: string, duration: number }[]> => {
    // Busca agendamentos confirmados ou agendados para o dia
    const { data, error } = await supabase
        .from('bookings')
        .select('id, professional_id, booking_time, duration')
        .eq('booking_date', date)
        .in('status', ['confirmed', 'Agendado']); // 'Agendado' é o valor padrão no banco

    if (error) {
        console.error("Error fetching occupied slots:", error);
        return [];
    }

    return data.map(d => ({
        id: d.id,
        professional_id: d.professional_id,
        booking_time: d.booking_time,
        duration: d.duration,
    }));
};

export const addOrUpdateBooking = async (booking: Partial<Booking> & { serviceName?: string }): Promise<Booking | null> => {
    if (!booking.date) {
        console.error("Booking date is required.");
        return null;
    }
    
    // Formata a data e hora para o formato do banco de dados (YYYY-MM-DD e HH:MM)
    // Usamos UTC para a data (YYYY-MM-DD) e extraímos a hora local (HH:MM)
    const dateObj = booking.date;
    
    // Garante que a data seja YYYY-MM-DD (parte da data local)
    const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    // Garante que a hora seja HH:MM (parte da hora local)
    const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    
    const payload = {
        user_id: booking.userId,
        service_id: booking.serviceId,
        professional_id: booking.professionalId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: booking.status,
        notes: booking.comment,
        duration: booking.duration,
        service_name: booking.serviceName,
    };

    if (booking.id) {
        // Atualização
        const { data, error } = await supabase
            .from('bookings')
            .update(payload)
            .eq('id', booking.id)
            .select('*')
            .single();

        if (error) {
            console.error("Error updating booking:", error);
            return null;
        }
        
        return {
            id: String(data.id),
            userId: data.user_id,
            serviceId: data.service_id,
            professionalId: data.professional_id,
            date: new Date(`${data.booking_date}T${data.booking_time}:00`),
            status: data.status as Booking['status'],
            rating: data.rating,
            comment: data.notes,
            duration: data.duration,
        } as Booking;
    } else {
        // Inserção
        const { data, error } = await supabase
            .from('bookings')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error("Error inserting booking:", error);
            return null;
        }
        
        return {
            id: String(data.id),
            userId: data.user_id,
            serviceId: data.service_id,
            professionalId: data.professional_id,
            date: new Date(`${data.booking_date}T${data.booking_time}:00`),
            status: data.status as Booking['status'],
            rating: data.rating,
            comment: data.notes,
            duration: data.duration,
        } as Booking;
    }
};

// --- Funções de Configurações da Clínica ---

export const getClinicSettings = async (): Promise<ClinicSettings> => {
    try {
        const { data, error } = await supabase
            .from('clinic_settings')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found (esperado se for a primeira vez)
            console.error("Error fetching clinic settings:", error);
        }
        
        if (!data) {
            // Se não houver dados, insere o registro padrão (upsert)
            const { data: upsertData, error: upsertError } = await supabase
                .from('clinic_settings')
                .upsert({
                    id: DEFAULT_CLINIC_SETTINGS.id,
                    operating_hours: DEFAULT_CLINIC_SETTINGS.operatingHours,
                    holiday_exceptions: DEFAULT_CLINIC_SETTINGS.holidayExceptions,
                    featured_service_ids: DEFAULT_CLINIC_SETTINGS.featuredServiceIds, // CORRIGIDO
                    hero_text: DEFAULT_CLINIC_SETTINGS.heroText,
                    hero_subtitle: DEFAULT_CLINIC_SETTINGS.heroSubtitle,
                    about_text: DEFAULT_CLINIC_SETTINGS.aboutText,
                }, { onConflict: 'id' })
                .select('*')
                .single();
                
            if (upsertError) {
                console.error("Error upserting default clinic settings:", upsertError);
                return DEFAULT_CLINIC_SETTINGS;
            }
            
            if (upsertData) {
                data = upsertData;
            } else {
                return DEFAULT_CLINIC_SETTINGS;
            }
        }

        return {
            id: data.id,
            operatingHours: data.operating_hours || DEFAULT_CLINIC_SETTINGS.operatingHours,
            holidayExceptions: data.holiday_exceptions || DEFAULT_CLINIC_SETTINGS.holidayExceptions,
            featuredServiceIds: data.featured_service_ids || DEFAULT_CLINIC_SETTINGS.featuredServiceIds,
            heroText: data.hero_text || DEFAULT_CLINIC_SETTINGS.heroText,
            heroSubtitle: data.hero_subtitle || DEFAULT_CLINIC_SETTINGS.heroSubtitle,
            aboutText: data.about_text || DEFAULT_CLINIC_SETTINGS.aboutText,
        };
    } catch (e) {
        console.error("Critical error fetching clinic settings:", e);
        return DEFAULT_CLINIC_SETTINGS; // Retorna o default em caso de falha crítica
    }
};

export const updateClinicOperatingHours = async (hours: OperatingHours): Promise<ClinicSettings | null> => {
    const { error } = await supabase
        .from('clinic_settings')
        .update({ operating_hours: hours, updated_at: new Date().toISOString() })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id);

    if (error) {
        console.error("Error updating operating hours:", error);
        return null;
    }
    return getClinicSettings();
};

export const updateClinicHolidayExceptions = async (exceptions: HolidayException[]): Promise<ClinicSettings | null> => {
    const { error } = await supabase
        .from('clinic_settings')
        .update({ holiday_exceptions: exceptions, updated_at: new Date().toISOString() })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id);

    if (error) {
        console.error("Error updating holiday exceptions:", error);
        return null;
    }
    return getClinicSettings();
};

export const updateFeaturedServices = async (serviceIds: string[]): Promise<ClinicSettings | null> => {
    const { error } = await supabase
        .from('clinic_settings')
        .update({ featured_service_ids: serviceIds, updated_at: new Date().toISOString() })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id);

    if (error) {
        console.error("Error updating featured services:", error);
        return null;
    }
    return getClinicSettings();
};

export const updateClinicTexts = async (texts: { heroText: string; heroSubtitle: string; aboutText: string }): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ 
            hero_text: texts.heroText, 
            hero_subtitle: texts.heroSubtitle, 
            about_text: texts.aboutText, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id)
        .select('*') // Adiciona select para garantir que o retorno seja válido
        .single();

    if (error) {
        console.error("Error updating clinic texts:", error);
        // Lança o erro para que o chamador saiba que falhou
        throw new Error(`Falha ao salvar textos da clínica: ${error.message}`);
    }
    // Retorna o objeto de configurações completo e atualizado
    return getClinicSettings();
};

// --- Funções de Upload de Arquivos ---

const uploadFile = async (bucket: string, file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        console.error(`Error uploading file to ${bucket}:`, error);
        return null;
    }

    // Retorna a URL pública para que o frontend possa usá-la imediatamente
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
};

export const uploadLogo = (file: File) => uploadFile('assets', file, 'logo.jpeg');
export const uploadHeroImage = (file: File) => uploadFile('assets', file, 'hero-image.jpeg');
export const uploadAboutImage = (file: File) => uploadFile('assets', file, 'about-image.jpeg');
export const uploadAvatar = (userId: string, file: File) => uploadFile('avatars', file, `${userId}/avatar.jpeg`);

// URL base do Supabase Storage para o bucket 'assets'
const SUPABASE_ASSETS_BASE_URL = 'https://mdxqiozhqmcriiqspbqf.supabase.co/storage/v1/object/public/assets/';

export const getAssetUrl = (path: string): string => {
    // Adiciona um parâmetro de versão para forçar o cache-busting em ativos estáticos
    // Aumentei a versão para garantir que o cache seja ignorado após o último upload.
    const version = path === 'consulta.jpeg' ? 'v4' : 'v0'; 
    return `${SUPABASE_ASSETS_BASE_URL}${path}?v=${version}`;
};

// --- Funções de Notificações ---

export const sendWhatsappReminder = async (details: { to: string; message: string }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
            body: details,
        });

        if (error) {
            console.error("Error invoking send-whatsapp-reminder function:", error);
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            console.error("Edge Function returned error:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true };
    } catch (e) {
        console.error("Unexpected error during whatsapp reminder:", e);
        return { success: false, error: "Erro inesperado ao tentar enviar lembrete." };
    }
};

export const sendEmailReminder = async (details: { to: string; subject: string; message: string }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('send-email-reminder', {
            body: details,
        });

        if (error) {
            console.error("Error invoking send-email-reminder function:", error);
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            console.error("Edge Function returned error:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true };
    } catch (e) {
        console.error("Unexpected error during email reminder:", e);
        return { success: false, error: "Erro inesperado ao tentar enviar lembrete por e-mail." };
    }
};

export const sendCancellationNotice = async (details: { to: string; message: string }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data, error } = await supabase.functions.invoke('send-cancellation-notice', {
            body: details,
        });

        if (error) {
            console.error("Error invoking send-cancellation-notice function:", error);
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            console.error("Edge Function returned error:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true };
    } catch (e) {
        console.error("Unexpected error during cancellation notice:", e);
        return { success: false, error: "Erro inesperado ao tentar enviar aviso de cancelamento." };
    }
};

// --- Funções de Agendamento Rápido (Edge Function) ---

export const bookServiceForNewUser = async (details: { name: string; phone: string; description: string; date: Date; professionalId: string; serviceId: string; serviceName: string; duration: number }): Promise<{ success: boolean, error: string | null, newUserId?: string, tempEmail?: string }> => {
    try {
        // --- CORREÇÃO DE FUSO HORÁRIO ---
        const dateObj = details.date;
        const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        // --------------------------------
        
        const { data, error } = await supabase.functions.invoke('book-service-for-new-user', {
            body: {
                name: details.name,
                phone: details.phone.replace(/\D/g, ''), // Envia apenas dígitos
                description: details.description,
                date: bookingDate, // Enviando data YYYY-MM-DD
                time: bookingTime, // Enviando hora HH:MM
                professionalId: details.professionalId,
                serviceId: details.serviceId,
                serviceName: details.serviceName,
                duration: details.duration,
            },
        });

        if (error) {
            console.error("Error invoking book-service-for-new-user function:", error);
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            console.error("Edge Function returned application error:", data.error);
            return { success: false, error: data.error };
        }

        if (!data.success) {
             console.error("Edge Function returned success: false without specific error.");
             return { success: false, error: "Falha desconhecida ao agendar o serviço. Tente novamente." };
        }

        return { success: true, error: null, newUserId: data.newUserId, tempEmail: data.tempEmail };

    } catch (e) {
        console.error("Unexpected error during service booking:", e);
        return { success: false, error: "Erro inesperado ao tentar agendar o serviço." };
    }
};

// --- Funções de Relatórios ---

export const getSalesData = async (): Promise<Sale[]> => {
    // Dados mockados para relatórios
    const mockSales: Sale[] = [
        { id: 's1', serviceName: 'Limpeza de Pele Profunda', clientName: 'Ana Silva', amount: 150.00, date: new Date(Date.now() - 86400000 * 5) },
        { id: 's2', serviceName: 'Massagem Relaxante', clientName: 'Bruno Costa', amount: 90.00, date: new Date(Date.now() - 86400000 * 5) },
        { id: 's3', serviceName: 'Preenchimento Labial', clientName: 'Carla Dias', amount: 800.00, date: new Date(Date.now() - 86400000 * 10) },
        { id: 's4', serviceName: 'Limpeza de Pele Profunda', clientName: 'Daniela Alves', amount: 150.00, date: new Date(Date.now() - 86400000 * 15) },
        { id: 's5', serviceName: 'Pacote Corporal 5 Sessões', clientName: 'Eduardo Lima', amount: 500.00, date: new Date(Date.now() - 86400000 * 20) },
        { id: 's6', serviceName: 'Massagem Relaxante', clientName: 'Fábio Gomes', amount: 90.00, date: new Date(Date.now() - 86400000 * 25) },
        { id: 's7', serviceName: 'Preenchimento Labial', clientName: 'Gabriela Rocha', amount: 800.00, date: new Date(Date.now() - 86400000 * 30) },
        { id: 's8', serviceName: 'Limpeza de Pele Profunda', clientName: 'Helena Souza', amount: 150.00, date: new Date(Date.now() - 86400000 * 35) },
        { id: 's9', serviceName: 'Pacote Corporal 5 Sessões', clientName: 'Igor Pereira', amount: 500.00, date: new Date(Date.now() - 86400000 * 40) },
        { id: 's10', serviceName: 'Massagem Relaxante', clientName: 'Juliana Martins', amount: 90.00, date: new Date(Date.now() - 86400000 * 45) },
        { id: 's11', serviceName: 'Limpeza de Pele Profunda', clientName: 'Lucas Ferreira', amount: 150.00, date: new Date(Date.now() - 86400000 * 50) },
        { id: 's12', serviceName: 'Preenchimento Labial', clientName: 'Mariana Nunes', amount: 800.00, date: new Date(Date.now() - 86400000 * 55) },
        { id: 's13', serviceName: 'Limpeza de Pele Profunda', clientName: 'Nathalia Oliveira', amount: 150.00, date: new Date(Date.now() - 86400000 * 60) },
        { id: 's14', serviceName: 'Massagem Relaxante', clientName: 'Otávio Rodrigues', amount: 90.00, date: new Date(Date.now() - 86400000 * 65) },
        { id: 's15', serviceName: 'Pacote Corporal 5 Sessões', clientName: 'Patrícia Santos', amount: 500.00, date: new Date(Date.now() - 86400000 * 70) },
    ];
    return mockSales;
};