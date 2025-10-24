import { supabase } from '../supabase/client';
import { User, Role, Service, Booking, ServicePackage, ClinicSettings, OperatingHours, HolidayException, RecurringBooking, RecurrenceFrequency, Sale } from '../types';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';

// --- Configurações de Assets ---
const BUCKET_NAME = 'assets';
const SUPABASE_PROJECT_ID = 'mdxqiozhqmcriiqspbqf';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const getAssetUrl = (path: string) => {
    // Adiciona um timestamp para forçar o cache refresh
    const timestamp = new Date().getTime();
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}?t=${timestamp}`;
};

// --- Configurações Padrão da Clínica ---
export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
    id: '00000000-0000-0000-0000-000000000001',
    heroText: 'Sua Beleza, Nosso Compromisso.',
    heroSubtitle: 'Descubra tratamentos estéticos de ponta e agende seu momento de cuidado em um ambiente de luxo e bem-estar.',
    aboutText: 'Na Marília Manuela, acreditamos que a estética vai além da aparência. É sobre bem-estar, confiança e cuidado pessoal. Nossa clínica oferece um ambiente acolhedor e tratamentos avançados, personalizados para realçar sua beleza natural.',
    operatingHours: {
        '0': { open: false },
        '1': { open: true, start: '08:00', end: '20:00' },
        '2': { open: true, start: '08:00', end: '20:00' },
        '3': { open: true, start: '08:00', end: '20:00' },
        '4': { open: true, start: '08:00', end: '20:00' },
        '5': { open: true, start: '08:00', end: '20:00' },
        '6': { open: false },
    },
    holidayExceptions: [],
    featuredServiceIds: [],
};

// --- Mapeamento de Dados ---

const mapProfileToUser = (profile: any, authUser: any): User => ({
    id: profile.id,
    name: profile.full_name || authUser?.user_metadata?.full_name || 'Usuário',
    email: authUser?.email || profile.email || 'email-nao-disponivel',
    phone: profile.phone || authUser?.user_metadata?.phone || '',
    cpf: profile.cpf || '',
    role: profile.role as Role || Role.CLIENT,
    credits: profile.procedure_credits || {},
    avatarUrl: profile.avatar_url || authUser?.user_metadata?.avatar_url || '',
});

const mapBooking = (data: any): Booking => ({
    id: String(data.id),
    userId: data.user_id,
    serviceId: data.service_id,
    professionalId: data.professional_id,
    date: new Date(`${data.booking_date}T${data.booking_time}:00`), // Combina data e hora
    status: data.status as Booking['status'],
    rating: data.rating,
    comment: data.notes,
    duration: data.duration,
    isRecurringInstance: false, // Assume falso para agendamentos únicos do banco
    recurringRuleId: data.recurring_rule_id,
});

const mapService = (data: any): Service => ({
    id: data.id,
    name: data.name,
    description: data.description,
    duration: data.duration || 30,
    price: data.price || 0,
    image: data.image || getAssetUrl('default-service.jpeg'),
    category: data.category || 'Geral',
    sessions: data.sessions || 1,
    order: data.order || 0,
});

const mapPackage = (data: any): ServicePackage => ({
    id: data.id,
    name: data.name,
    description: data.description,
    price: data.price,
    image: data.image || getAssetUrl('default-package.jpeg'),
    services: data.package_services.map((ps: any) => ({
        serviceId: ps.service_id,
        quantity: ps.quantity,
    })),
});

const mapRecurringBooking = (data: any): RecurringBooking => ({
    id: data.id,
    userId: data.user_id,
    serviceId: data.service_id,
    professionalId: data.professional_id,
    startDate: data.start_date,
    startTime: data.start_time,
    duration: data.duration,
    rrule: data.rrule,
    status: data.status as RecurringBooking['status'],
});

// --- Funções de Autenticação ---

export const signOut = async () => {
    return supabase.auth.signOut();
};

// --- Funções de Perfil e Usuários ---

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
    }
    
    const { data: { user: authUser } } = await supabase.auth.getUser();

    return mapProfileToUser(profileData, authUser);
};

export const getUsersWithRoles = async (): Promise<User[] | null> => {
    // Esta função usa uma RPC que já aplica a segurança de RLS (apenas admins podem executar)
    const { data, error } = await supabase.rpc('get_all_users_for_admin');

    if (error) {
        console.error("Error fetching users via RPC:", error);
        return null;
    }
    
    // A RPC retorna um objeto que já inclui email e credits (procedure_credits)
    return data.map((item: any) => ({
        id: item.id,
        name: item.full_name || 'N/A',
        email: item.email || 'N/A',
        phone: item.phone || 'N/A',
        cpf: item.cpf || 'N/A',
        role: item.role as Role,
        credits: item.credits || {},
        avatarUrl: item.avatar_url || '',
    }));
};

export const updateUserProfile = async (userId: string, updatedData: Partial<User>): Promise<User | null> => {
    const payload: any = {
        full_name: updatedData.name,
        phone: updatedData.phone?.replace(/\D/g, '') || null,
        cpf: updatedData.cpf?.replace(/\D/g, '') || null,
        avatar_url: updatedData.avatarUrl || null,
        updated_at: new Date().toISOString(),
    };
    
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single();

    if (profileError) {
        console.error("Error updating profile:", profileError);
        return null;
    }
    
    // Atualiza o nome no auth.users metadata (para consistência)
    await supabase.auth.updateUser({
        data: {
            full_name: updatedData.name,
            phone: updatedData.phone?.replace(/\D/g, '') || null,
            avatar_url: updatedData.avatarUrl || null,
        }
    });
    
    // Retorna o perfil completo atualizado
    const { data: { user: authUser } } = await supabase.auth.getUser();
    return mapProfileToUser(profileData, authUser);
};

// --- Funções de Agendamento (Bookings) ---

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

    return data.map(mapBooking);
};

export const getAllBookings = async (): Promise<Booking[] | null> => {
    // A RLS garante que apenas admins vejam todos os bookings
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

    if (error) {
        console.error("Error fetching all bookings:", error);
        return null;
    }

    return data.map(mapBooking);
};

export const getOccupiedSlots = async (dateString: string): Promise<{ id: string | number, professional_id: string, booking_time: string, duration: number }[] | null> => {
    // Esta função é usada pelo hook useAvailability para verificar slots ocupados.
    // A RLS 'Allow anonymous read of confirmed bookings for availability' permite que usuários não logados vejam slots confirmados.
    const { data, error } = await supabase
        .from('bookings')
        .select('id, professional_id, booking_time, duration')
        .eq('booking_date', dateString)
        .in('status', ['confirmed', 'Agendado']); // Considera apenas status que bloqueiam a agenda

    if (error) {
        console.error("Error fetching occupied slots:", error);
        return null;
    }

    return data;
};

export const addOrUpdateBooking = async (booking: Partial<Booking> & { serviceName?: string }): Promise<Booking | null> => {
    if (!booking.date) {
        console.error("Booking date is required.");
        throw new Error("Data do agendamento é obrigatória.");
    }
    
    // Formata a data e hora para o formato do banco de dados (YYYY-MM-DD e HH:MM)
    const dateObj = booking.date;
    
    // Garante que a data seja YYYY-MM-DD (parte da data local)
    const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    // Garante que a hora seja HH:MM (parte da hora local)
    const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    
    const payload = {
        // Se for string vazia ('') ou undefined, transforma em null para o banco de dados
        user_id: booking.userId && booking.userId !== '' ? booking.userId : null, 
        service_id: booking.serviceId,
        professional_id: booking.professionalId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: booking.status,
        notes: booking.comment,
        duration: booking.duration,
        service_name: booking.serviceName,
        recurring_rule_id: booking.recurringRuleId || null, // NOVO CAMPO
    };

    let query;
    if (booking.id && !booking.id.startsWith('R-')) {
        // Atualização
        query = supabase
            .from('bookings')
            .update(payload)
            .eq('id', booking.id)
            .select()
            .single();
    } else {
        // Inserção (Novo agendamento ou exceção de recorrência)
        query = supabase
            .from('bookings')
            .insert(payload)
            .select()
            .single();
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error adding/updating booking:", error);
        // Lança o erro para que o componente possa capturá-lo
        throw new Error(error.message || "Falha na operação de agendamento no banco de dados.");
    }

    // Se for um novo agendamento, tenta sincronizar com o Google Calendar (apenas para admins)
    if (!booking.id) {
        const { data: { user } } = await supabase.auth.getUser();
        const profile = user ? await getUserProfile(user.id) : null;
        
        if (profile?.role === Role.ADMIN) {
            try {
                const client = await getUserProfile(payload.user_id);
                const professional = await getUserProfile(payload.professional_id);
                
                const startDateTime = dateObj.toISOString();
                const endDateTime = new Date(dateObj.getTime() + (payload.duration * 60000)).toISOString();
                
                const calendarPayload = {
                    summary: `${payload.service_name} - ${client?.name || 'Cliente'}`,
                    description: `Cliente: ${client?.name || 'N/A'}\nTelefone: ${client?.phone || 'N/A'}\nProfissional: ${professional?.name || 'N/A'}\nNotas: ${payload.notes || 'N/A'}`,
                    start: startDateTime,
                    end: endDateTime,
                };
                
                // Chama a Edge Function para sincronizar
                const { data: calendarData, error: calendarError } = await supabase.functions.invoke('google-calendar-sync', {
                    body: calendarPayload,
                });
                
                if (calendarError) {
                    console.error("Google Calendar Sync Error:", calendarError);
                } else {
                    console.log("Google Calendar Sync Success:", calendarData);
                }
            } catch (e) {
                console.error("Error preparing calendar sync:", e);
            }
        }
    }

    return mapBooking(data);
};

// --- Funções de Crédito ---

export const addCreditsToUser = async (userId: string, serviceId: string, quantity: number, sessionsPerPackage: number = 1): Promise<User | null> => {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Error fetching user credits:", profileError);
        return null;
    }

    const currentCredits = profileData.procedure_credits || {};
    const totalSessions = sessionsPerPackage * quantity;
    
    const newCredits = {
        ...currentCredits,
        [serviceId]: (currentCredits[serviceId] || 0) + totalSessions,
    };

    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ procedure_credits: newCredits })
        .eq('id', userId)
        .select('*')
        .single();

    if (updateError) {
        console.error("Error updating user credits:", updateError);
        return null;
    }
    
    const { data: { user: authUser } } = await supabase.auth.getUser();
    return mapProfileToUser(updatedProfile, authUser);
};

export const returnCreditToUser = async (userId: string, serviceId: string): Promise<User | null> => {
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Error fetching user credits for return:", profileError);
        return null;
    }

    const currentCredits = profileData.procedure_credits || {};
    
    if (currentCredits[serviceId] && currentCredits[serviceId] > 0) {
        const newCredits = {
            ...currentCredits,
            [serviceId]: currentCredits[serviceId] - 1,
        };

        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ procedure_credits: newCredits })
            .eq('id', userId)
            .select('*')
            .single();

        if (updateError) {
            console.error("Error returning user credit:", updateError);
            return null;
        }
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        return mapProfileToUser(updatedProfile, authUser);
    }
    
    // Se não houver crédito para devolver, retorna o perfil atual
    const { data: { user: authUser } } = await supabase.auth.getUser();
    return mapProfileToUser(profileData, authUser);
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

    return data.map(mapService);
};

export const addOrUpdateService = async (service: Partial<Service>): Promise<Service | null> => {
    const payload = {
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        image: service.image,
        category: service.category,
        sessions: service.sessions,
        order: service.order,
        active: true,
    };

    let query;
    if (service.id) {
        query = supabase.from('services').update(payload).eq('id', service.id).select().single();
    } else {
        query = supabase.from('services').insert(payload).select().single();
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error adding/updating service:", error);
        return null;
    }

    return mapService(data);
};

export const deleteService = async (serviceId: string): Promise<void> => {
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

    if (error) {
        console.error("Error deleting service:", error);
        throw new Error("Falha ao deletar serviço.");
    }
};

export const updateServiceOrder = async (orderUpdates: { id: string; order: number }[]): Promise<boolean> => {
    const { error } = await supabase.from('services').upsert(orderUpdates);
    
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

    return data.map(mapPackage);
};

export const addOrUpdatePackage = async (pkg: ServicePackage): Promise<ServicePackage | null> => {
    const packagePayload = {
        id: pkg.id || undefined,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        image: pkg.image,
    };

    let savedPackage: any;
    let packageError: any;

    // 1. Salvar ou Atualizar o Pacote
    if (pkg.id) {
        ({ data: savedPackage, error: packageError } = await supabase
            .from('packages')
            .update(packagePayload)
            .eq('id', pkg.id)
            .select()
            .single());
    } else {
        ({ data: savedPackage, error: packageError } = await supabase
            .from('packages')
            .insert(packagePayload)
            .select()
            .single());
    }

    if (packageError) {
        console.error("Error saving package:", packageError);
        return null;
    }
    
    const packageId = savedPackage.id;

    // 2. Gerenciar Serviços do Pacote (Deletar antigos e inserir novos)
    
    // Deleta todos os serviços antigos associados a este pacote
    await supabase.from('package_services').delete().eq('package_id', packageId);

    // Insere os novos serviços
    const serviceItemsPayload = pkg.services.map(item => ({
        package_id: packageId,
        service_id: item.serviceId,
        quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
        .from('package_services')
        .insert(serviceItemsPayload);

    if (itemsError) {
        console.error("Error saving package services:", itemsError);
        // Se falhar aqui, o pacote principal foi salvo, mas os itens não.
        return null; 
    }
    
    // 3. Retorna o pacote completo (incluindo os serviços recém-inseridos)
    const { data: finalPackageData, error: finalError } = await supabase
        .from('packages')
        .select('*, package_services(*)')
        .eq('id', packageId)
        .single();
        
    if (finalError) {
        console.error("Error fetching final package data:", finalError);
        return null;
    }

    return mapPackage(finalPackageData);
};

export const deletePackage = async (packageId: string): Promise<void> => {
    // A exclusão em cascata deve cuidar de package_services
    const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

    if (error) {
        console.error("Error deleting package:", error);
        throw new Error("Falha ao deletar pacote.");
    }
};

// --- Funções de Profissionais ---

export const getProfessionals = async (): Promise<User[] | null> => {
    // Usa a RPC para buscar apenas usuários com role 'staff'
    const { data, error } = await supabase.rpc('get_all_professionals');

    if (error) {
        console.error("Error fetching professionals via RPC:", error);
        return null;
    }
    
    return data.map((item: any) => ({
        id: item.id,
        name: item.full_name || 'Profissional',
        email: 'N/A', // Email não é retornado pela RPC por segurança
        phone: item.phone || 'N/A',
        cpf: item.cpf || 'N/A',
        role: item.role as Role,
        credits: item.credits || {},
    }));
};

// --- Funções de Configurações da Clínica ---

export const getClinicSettings = async (): Promise<ClinicSettings> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('id', DEFAULT_CLINIC_SETTINGS.id)
        .single();

    if (error) {
        console.warn("Clinic settings not found or error fetching, using defaults:", error);
        return DEFAULT_CLINIC_SETTINGS;
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
};

export const updateClinicOperatingHours = async (hours: OperatingHours): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ operating_hours: hours, updated_at: new Date().toISOString() })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id)
        .select()
        .single();

    if (error) {
        console.error("Error updating operating hours:", error);
        return null;
    }
    return getClinicSettings(); // Retorna o objeto completo atualizado
};

export const updateClinicHolidayExceptions = async (exceptions: HolidayException[]): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ holiday_exceptions: exceptions, updated_at: new Date().toISOString() })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id)
        .select()
        .single();

    if (error) {
        console.error("Error updating holiday exceptions:", error);
        return null;
    }
    return getClinicSettings();
};

export const updateFeaturedServices = async (serviceIds: string[]): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ featured_service_ids: serviceIds, updated_at: new Date().toISOString() })
        .eq('id', DEFAULT_CLINIC_SETTINGS.id)
        .select()
        .single();

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
        .select()
        .single();

    if (error) {
        console.error("Error updating clinic texts:", error);
        return null;
    }
    return getClinicSettings();
};

// --- Funções de Upload de Arquivos ---

const uploadFile = async (path: string, file: File): Promise<string | null> => {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        console.error(`Error uploading file to ${path}:`, error);
        return null;
    }

    return getAssetUrl(path);
};

export const uploadAvatar = (userId: string, file: File): Promise<string | null> => {
    const fileExtension = file.name.split('.').pop();
    const path = `avatars/${userId}.${fileExtension}`;
    return uploadFile(path, file);
};

export const uploadLogo = (file: File): Promise<string | null> => {
    return uploadFile('logo.jpeg', file);
};

export const uploadHeroImage = (file: File): Promise<string | null> => {
    return uploadFile('hero-image.jpeg', file);
};

export const uploadAboutImage = (file: File): Promise<string | null> => {
    return uploadFile('about-image.jpeg', file);
};

// --- Funções de Edge Functions (Admin) ---

export const adminCreateUser = async (userData: Partial<User> & { password?: string }): Promise<User | null> => {
    const payload = {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone?.replace(/\D/g, '') || null,
        cpf: userData.cpf?.replace(/\D/g, '') || null,
        role: userData.role,
    };
    
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload,
    });

    if (error) {
        console.error("Error invoking admin-create-user:", error);
        alert(`Erro ao criar usuário: ${error.message}`);
        return null;
    }
    
    if (data.error) {
        console.error("Edge Function Error (admin-create-user):", data.error);
        alert(`Erro ao criar usuário: ${data.error}`);
        return null;
    }

    return data.user as User;
};

export const adminUpdateUser = async (userData: Partial<User>): Promise<User | null> => {
    const payload = {
        userId: userData.id,
        name: userData.name,
        phone: userData.phone?.replace(/\D/g, '') || null,
        cpf: userData.cpf?.replace(/\D/g, '') || null,
        role: userData.role,
        avatarUrl: userData.avatarUrl || null,
    };
    
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: payload,
    });

    if (error) {
        console.error("Error invoking admin-update-user:", error);
        alert(`Erro ao atualizar usuário: ${error.message}`);
        return null;
    }
    
    if (data.error) {
        console.error("Edge Function Error (admin-update-user):", data.error);
        alert(`Erro ao atualizar usuário: ${data.error}`);
        return null;
    }

    return data.user as User;
};

export const deleteUser = async (userId: string): Promise<{ success: boolean, error?: string }> => {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
    });

    if (error) {
        console.error("Error invoking admin-delete-user:", error);
        return { success: false, error: error.message };
    }
    
    if (data.error) {
        console.error("Edge Function Error (admin-delete-user):", data.error);
        return { success: false, error: data.error };
    }

    return { success: true };
};

// --- Funções de Agendamento Rápido (Edge Function) ---

export const bookServiceForNewUser = async (details: { name: string; phone: string; description: string; date: Date; professionalId: string; serviceId: string; serviceName: string; duration: number }): Promise<{ success: boolean, error?: string, tempEmail?: string }> => {
    
    const dateObj = details.date;
    const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    
    const payload = {
        name: details.name,
        phone: details.phone,
        description: details.description,
        date: bookingDate,
        time: bookingTime,
        professionalId: details.professionalId,
        serviceId: details.serviceId,
        serviceName: details.serviceName,
        duration: details.duration,
    };
    
    const { data, error } = await supabase.functions.invoke('book-service-for-new-user', {
        body: payload,
    });

    if (error) {
        console.error("Error invoking book-service-for-new-user:", error);
        return { success: false, error: error.message };
    }
    
    if (data.error) {
        console.error("Edge Function Error (book-service-for-new-user):", data.error);
        return { success: false, error: data.error };
    }

    return { success: true, tempEmail: data.tempEmail };
};

// --- Funções de Recorrência ---

export const addRecurringBooking = async (details: { userId: string; serviceId: string; professionalId: string; startDate: string; startTime: string; duration: number; endDate: string; frequency: RecurrenceFrequency }): Promise<RecurringBooking | null> => {
    
    // 1. Determinar o dia da semana (BYDAY)
    const startDateObj = new Date(details.startDate + 'T00:00:00');
    const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][startDateObj.getDay()];
    
    // 2. Formatar a data final para RRULE (YYYYMMDD)
    const endDateObj = new Date(details.endDate + 'T00:00:00');
    const untilDate = `${endDateObj.getFullYear()}${String(endDateObj.getMonth() + 1).padStart(2, '0')}${String(endDateObj.getDate()).padStart(2, '0')}`;
    
    // 3. Construir a RRULE
    let rrule = `FREQ=${details.frequency};UNTIL=${untilDate}`;
    if (details.frequency === RecurrenceFrequency.WEEKLY) {
        rrule += `;BYDAY=${dayOfWeek}`;
    }
    // Nota: Para MONTHLY, o dia do mês é implícito pela data de início.

    const payload = {
        user_id: details.userId,
        service_id: details.serviceId,
        professional_id: details.professionalId,
        start_date: details.startDate,
        start_time: details.startTime,
        duration: details.duration,
        rrule: rrule,
        status: 'active',
    };
    
    const { data, error } = await supabase
        .from('recurring_bookings')
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error adding recurring booking:", error);
        return null;
    }
    
    return mapRecurringBooking(data);
};

export const getRecurringBookings = async (): Promise<RecurringBooking[] | null> => {
    // A RLS garante que apenas admins vejam todos os bookings recorrentes
    const { data, error } = await supabase
        .from('recurring_bookings')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: true });

    if (error) {
        console.error("Error fetching recurring bookings:", error);
        return null;
    }

    return data.map(mapRecurringBooking);
};

export const cancelRecurringBooking = async (recurringBookingId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('recurring_bookings')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', recurringBookingId);

    if (error) {
        console.error("Error canceling recurring booking:", error);
        return false;
    }
    return true;
};

// --- Funções de Relatórios ---

export const getSalesData = async (): Promise<Sale[] | null> => {
    // Usa a RPC que já aplica a segurança de RLS (apenas admins podem executar)
    const { data, error } = await supabase.rpc('get_sales_data');

    if (error) {
        console.error("Error fetching sales data via RPC:", error);
        return null;
    }
    
    return data.map((item: any) => ({
        id: String(item.id),
        serviceName: item.service_name,
        clientName: item.client_name || 'Cliente Excluído',
        amount: parseFloat(item.amount),
        date: new Date(item.date),
    }));
};

// --- Funções de Notificação (Edge Functions) ---

export const sendWhatsappReminder = async (details: { to: string; message: string }): Promise<{ success: boolean, error?: string }> => {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
        body: details,
    });

    if (error) {
        console.error("Error invoking send-whatsapp-reminder:", error);
        return { success: false, error: error.message };
    }
    
    if (data.error) {
        console.error("Edge Function Error (send-whatsapp-reminder):", data.error);
        return { success: false, error: data.error };
    }

    return { success: true };
};

export const sendEmailReminder = async (details: { to: string; subject: string; message: string }): Promise<{ success: boolean, error?: string }> => {
    const { data, error } = await supabase.functions.invoke('send-email-reminder', {
        body: details,
    });

    if (error) {
        console.error("Error invoking send-email-reminder:", error);
        return { success: false, error: error.message };
    }
    
    if (data.error) {
        console.error("Edge Function Error (send-email-reminder):", data.error);
        return { success: false, error: data.error };
    }

    return { success: true };
};

export const sendCancellationNotice = async (details: { to: string; message: string }): Promise<{ success: boolean, error?: string }> => {
    const { data, error } = await supabase.functions.invoke('send-cancellation-notice', {
        body: details,
    });

    if (error) {
        console.error("Error invoking send-cancellation-notice:", error);
        return { success: false, error: error.message };
    }
    
    if (data.error) {
        console.error("Edge Function Error (send-cancellation-notice):", data.error);
        return { success: false, error: data.error };
    }

    return { success: true };
};