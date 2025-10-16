import { supabase } from '../supabase/client';
import { User, Role, Service, Booking, ServicePackage, ClinicSettings, OperatingHours, HolidayException, Sale } from '../types';
import { FREE_CONSULTATION_SERVICE_ID } from '../constants';

// --- Configurações Padrão ---
export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
    id: '00000000-0000-0000-0000-000000000001',
    heroText: 'Sua Beleza, Nosso Compromisso.',
    heroSubtitle: 'Descubra tratamentos estéticos de ponta e agende seu momento de cuidado em um ambiente de luxo e bem-estar.',
    aboutText: 'Na Marília Manuela, acreditamos que a estética vai além da aparência. Oferecemos um refúgio de bem-estar com tratamentos personalizados e tecnologia de ponta, garantindo resultados que elevam sua autoestima e promovem saúde integral. Nossa equipe de profissionais altamente qualificados está pronta para te receber.',
    operatingHours: {
        0: { open: false }, // Domingo
        1: { open: true, start: '08:00', end: '20:00' }, // Segunda
        2: { open: true, start: '08:00', end: '20:00' }, // Terça
        3: { open: true, start: '08:00', end: '20:00' }, // Quarta
        4: { open: true, start: '08:00', end: '20:00' }, // Quinta
        5: { open: true, start: '08:00', end: '20:00' }, // Sexta
        6: { open: false }, // Sábado
    },
    holidayExceptions: [],
    featuredServiceIds: [],
};

// --- Funções de Autenticação e Perfil ---

export const getCurrentUserSession = async () => {
    return supabase.auth.getSession();
};

export const signOut = async () => {
    return supabase.auth.signOut();
};

const mapSupabaseProfileToUser = (profile: any, authUser: any): User => ({
    id: profile.id,
    name: profile.full_name || authUser.email.split('@')[0],
    email: authUser.email,
    phone: profile.phone || '',
    cpf: profile.cpf || '',
    role: profile.role as Role || Role.CLIENT,
    credits: profile.procedure_credits || {},
    avatarUrl: profile.avatar_url || '',
});

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError) {
        console.error("Error fetching auth user:", authError);
        return null;
    }
    const authUser = authData.user;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
    }

    return mapSupabaseProfileToUser(profile, authUser);
};

export const updateUserProfile = async (userId: string, userData: Partial<User>): Promise<User | null> => {
    const { name, phone, cpf, avatarUrl } = userData;

    const updatePayload: any = {
        full_name: name,
        phone: phone?.replace(/\D/g, ''), // Salva apenas dígitos
        cpf: cpf?.replace(/\D/g, ''), // Salva apenas dígitos
        avatar_url: avatarUrl,
    };

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select('*, procedure_credits')
        .single();

    if (profileError) {
        console.error("Error updating profile:", profileError);
        return null;
    }

    // Atualiza o metadata do auth.users (apenas nome e telefone)
    const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
            full_name: name,
            phone: phone?.replace(/\D/g, ''),
        }
    });
    
    if (authUpdateError) {
        console.error("Error updating auth user metadata:", authUpdateError);
        // Não é crítico, mas logamos
    }

    // Rebusca o usuário completo para retornar
    return getUserProfile(userId);
};

export const getUsersWithRoles = async (): Promise<User[] | null> => {
    // Usa a função RPC que garante que apenas admins podem ver todos os usuários
    const { data, error } = await supabase.rpc('get_all_users_for_admin');

    if (error) {
        console.error("Error fetching all users:", error);
        return null;
    }

    // Mapeia o resultado da RPC para o tipo User
    return data.map((item: any) => ({
        id: item.id,
        name: item.full_name || item.email.split('@')[0],
        email: item.email,
        phone: item.phone || '',
        cpf: item.cpf || '',
        role: item.role as Role,
        credits: item.credits || {},
        avatarUrl: `https://ui-avatars.com/api/?name=${(item.full_name || item.email.split('@')[0]).replace(/\s/g, '+')}&background=e9d5ff&color=7c3aed`,
    }));
};

export const getProfessionals = async (): Promise<User[] | null> => {
    // Usa a função RPC que busca apenas usuários com role 'staff'
    const { data, error } = await supabase.rpc('get_all_professionals');

    if (error) {
        console.error("Error fetching professionals:", error);
        return null;
    }

    // Mapeia o resultado da RPC para o tipo User
    return data.map((item: any) => ({
        id: item.id,
        name: item.full_name || 'Profissional',
        email: '', // Email não é necessário para a lista de profissionais
        phone: item.phone || '',
        cpf: item.cpf || '',
        role: item.role as Role,
        credits: item.credits || {},
        avatarUrl: `https://ui-avatars.com/api/?name=${(item.full_name || 'Profissional').replace(/\s/g, '+')}&background=e9d5ff&color=7c3aed`,
    }));
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

        // O retorno da Edge Function já é o objeto User mapeado
        const createdUser = data.user;
        return {
            id: createdUser.id,
            name: createdUser.full_name,
            email: createdUser.email,
            phone: createdUser.phone || '',
            cpf: createdUser.cpf || '',
            role: createdUser.role as Role,
            credits: createdUser.procedure_credits || {},
            avatarUrl: createdUser.avatar_url || `https://ui-avatars.com/api/?name=${(createdUser.full_name || createdUser.email.split('@')[0]).replace(/\s/g, '+')}&background=e9d5ff&color=7c3aed`,
        };

    } catch (e) {
        console.error("Unexpected error during admin user creation:", e);
        alert("Erro inesperado ao tentar criar o usuário.");
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
        return { success: false, error: "Erro inesperado ao tentar excluir o usuário." };
    }
};

// --- Funções de Serviços ---

const mapSupabaseServiceToService = (s: any): Service => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration: s.duration || 30,
    price: parseFloat(s.price) || 0,
    imageUrl: s.image || `https://picsum.photos/seed/${s.id}/400/300`,
    category: s.category || 'Geral',
    sessions: s.sessions || 1,
    order: s.order || 0,
});

export const getServices = async (): Promise<Service[] | null> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('order', { ascending: true });

    if (error) {
        console.error("Error fetching services:", error);
        return null;
    }

    return data.map(mapSupabaseServiceToService);
};

export const addOrUpdateService = async (service: Partial<Service>): Promise<Service | null> => {
    const payload = {
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        image: service.imageUrl,
        category: service.category,
        sessions: service.sessions,
        order: service.order,
    };

    let query = supabase.from('services');

    if (service.id) {
        query = query.update(payload).eq('id', service.id);
    } else {
        query = query.insert(payload);
    }

    const { data, error } = await query.select().single();

    if (error) {
        console.error("Error saving service:", error);
        return null;
    }

    return mapSupabaseServiceToService(data);
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
    const { error } = await supabase.from('services').upsert(
        orderUpdates.map(u => ({ id: u.id, order: u.order }))
    );

    if (error) {
        console.error("Error updating service order:", error);
        return false;
    }
    return true;
};

export const ensureFreeConsultationServiceExists = async (): Promise<Service | null> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', FREE_CONSULTATION_SERVICE_ID)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error("Error checking free consultation service:", error);
        return null;
    }

    if (data) {
        // Serviço existe, retorna a versão atualizada
        return mapSupabaseServiceToService(data);
    }

    // Serviço não existe, cria
    const newService: Partial<Service> = {
        id: FREE_CONSULTATION_SERVICE_ID,
        name: 'Consulta de Avaliação Gratuita',
        description: 'Agende uma avaliação inicial sem custo para definirmos o melhor tratamento para você.',
        duration: 30,
        price: 0,
        imageUrl: 'https://picsum.photos/seed/freeconsultation/400/300',
        category: 'Avaliação',
        sessions: 1,
        order: 0, // Sempre o primeiro
    };

    const { data: insertedData, error: insertError } = await supabase
        .from('services')
        .insert(newService)
        .select()
        .single();

    if (insertError) {
        console.error("Error creating free consultation service:", insertError);
        return null;
    }

    return mapSupabaseServiceToService(insertedData);
};

// --- Funções de Pacotes ---

const mapSupabasePackageToPackage = (p: any, services: Service[]): ServicePackage => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price) || 0,
    imageUrl: p.image || `https://picsum.photos/seed/${p.id}/400/300`,
    services: p.package_services.map((ps: any) => ({
        serviceId: ps.service_id,
        quantity: ps.quantity,
    })),
});

export const getServicePackages = async (): Promise<ServicePackage[] | null> => {
    const { data, error } = await supabase
        .from('packages')
        .select('*, package_services(*)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching packages:", error);
        return null;
    }
    
    // Nota: A função mapSupabasePackageToPackage precisa dos serviços, mas aqui só temos os dados do pacote.
    // Como o frontend (App.tsx) já tem a lista de serviços, vamos retornar o objeto cru e deixar o frontend
    // fazer o mapeamento final se necessário, ou apenas usar o formato retornado.
    // Para simplificar, vamos retornar o formato ServicePackage, assumindo que o join funcionou.
    
    // Usamos uma lista vazia de serviços para o mapeamento, pois o frontend não precisa dos nomes aqui.
    return data.map(p => mapSupabasePackageToPackage(p, []));
};

export const addOrUpdatePackage = async (pkg: Partial<ServicePackage>): Promise<ServicePackage | null> => {
    const packagePayload = {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        image: pkg.imageUrl,
    };

    let packageQuery = supabase.from('packages');
    if (pkg.id) {
        packageQuery = packageQuery.update(packagePayload).eq('id', pkg.id);
    } else {
        packageQuery = packageQuery.insert(packagePayload);
    }

    const { data: packageData, error: packageError } = await packageQuery.select().single();

    if (packageError) {
        console.error("Error saving package:", packageError);
        return null;
    }
    
    const packageId = packageData.id;

    // 1. Excluir serviços antigos do pacote
    await supabase.from('package_services').delete().eq('package_id', packageId);

    // 2. Inserir novos serviços do pacote
    if (pkg.services && pkg.services.length > 0) {
        const servicePayload = pkg.services.map(s => ({
            package_id: packageId,
            service_id: s.serviceId,
            quantity: s.quantity,
        }));
        
        const { error: serviceError } = await supabase.from('package_services').insert(servicePayload);
        
        if (serviceError) {
            console.error("Error inserting package services:", serviceError);
            // Continua, mas loga o erro
        }
    }
    
    // 3. Retorna o pacote completo (com os serviços aninhados)
    const { data: finalData, error: finalError } = await supabase
        .from('packages')
        .select('*, package_services(*)')
        .eq('id', packageId)
        .single();
        
    if (finalError) {
        console.error("Error fetching final package data:", finalError);
        return null;
    }

    return mapSupabasePackageToPackage(finalData, []);
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

// --- Funções de Agendamento ---

const mapSupabaseBookingToBooking = (b: any): Booking => ({
    id: String(b.id),
    userId: b.user_id,
    serviceId: b.service_id,
    professionalId: b.professional_id,
    date: new Date(`${b.booking_date}T${b.booking_time}:00`), // Combina data e hora
    status: b.status as Booking['status'],
    rating: b.rating,
    comment: b.notes,
    duration: b.duration,
});

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

    return data.map(mapSupabaseBookingToBooking);
};

export const getAllBookings = async (): Promise<Booking[] | null> => {
    // Admins têm RLS para ver todos os bookings
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

    if (error) {
        console.error("Error fetching all bookings:", error);
        return null;
    }

    return data.map(mapSupabaseBookingToBooking);
};

export const addOrUpdateBooking = async (booking: Partial<Booking> & { serviceName?: string }): Promise<Booking | null> => {
    const dateObj = booking.date as Date;
    const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    const payload = {
        user_id: booking.userId,
        service_id: booking.serviceId,
        professional_id: booking.professionalId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: booking.status,
        notes: booking.comment,
        rating: booking.rating,
        duration: booking.duration,
        service_name: booking.serviceName,
    };

    let query = supabase.from('bookings');

    if (booking.id) {
        query = query.update(payload).eq('id', booking.id);
    } else {
        query = query.insert(payload);
    }

    const { data, error } = await query.select().single();

    if (error) {
        console.error("Error saving booking:", error);
        return null;
    }

    return mapSupabaseBookingToBooking(data);
};

export const getOccupiedSlots = async (date: string): Promise<{ id: number, professional_id: string, booking_time: string, duration: number }[]> => {
    // Esta função é chamada pelo hook useAvailability para verificar a disponibilidade.
    // Ela usa RLS público para bookings 'confirmed' ou 'Agendado'.
    const { data, error } = await supabase
        .from('bookings')
        .select('id, professional_id, booking_time, duration')
        .eq('booking_date', date)
        .in('status', ['confirmed', 'Agendado']);

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

// --- Funções de Créditos e Compras ---

export const addCreditsToUser = async (userId: string, serviceId: string, quantity: number, sessionsPerPackage: number = 1): Promise<User | null> => {
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error("Error fetching user credits:", fetchError);
        return null;
    }

    const currentCredits = profile.procedure_credits || {};
    const totalSessions = quantity * sessionsPerPackage;
    const newCreditCount = (currentCredits[serviceId] || 0) + totalSessions;

    const updatedCredits = {
        ...currentCredits,
        [serviceId]: newCreditCount,
    };

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ procedure_credits: updatedCredits })
        .eq('id', userId);

    if (updateError) {
        console.error("Error updating user credits:", updateError);
        return null;
    }

    // Retorna o perfil atualizado
    return getUserProfile(userId);
};

export const addPackageCreditsToUser = async (userId: string, pkg: ServicePackage): Promise<User | null> => {
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error("Error fetching user credits:", fetchError);
        return null;
    }

    const currentCredits = profile.procedure_credits || {};
    let updatedCredits = { ...currentCredits };

    // Busca os serviços para obter o número de sessões por pacote
    const { data: servicesData } = await supabase.from('services').select('id, sessions');
    const serviceSessionsMap = new Map(servicesData?.map(s => [s.id, s.sessions || 1]));

    pkg.services.forEach(item => {
        const sessionsPerPackage = serviceSessionsMap.get(item.serviceId) || 1;
        const totalSessions = item.quantity * sessionsPerPackage;
        updatedCredits[item.serviceId] = (updatedCredits[item.serviceId] || 0) + totalSessions;
    });

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ procedure_credits: updatedCredits })
        .eq('id', userId);

    if (updateError) {
        console.error("Error updating user credits:", updateError);
        return null;
    }

    // Retorna o perfil atualizado
    return getUserProfile(userId);
};

export const deductCreditFromUser = async (userId: string, serviceId: string): Promise<User | null> => {
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error("Error fetching user credits for deduction:", fetchError);
        return null;
    }

    const currentCredits = profile.procedure_credits || {};
    const newCreditCount = Math.max(0, (currentCredits[serviceId] || 0) - 1);

    const updatedCredits = {
        ...currentCredits,
        [serviceId]: newCreditCount,
    };

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ procedure_credits: updatedCredits })
        .eq('id', userId);

    if (updateError) {
        console.error("Error deducting user credit:", updateError);
        return null;
    }

    return getUserProfile(userId);
};

export const returnCreditToUser = async (userId: string, serviceId: string): Promise<User | null> => {
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error("Error fetching user credits for return:", fetchError);
        return null;
    }

    const currentCredits = profile.procedure_credits || {};
    const newCreditCount = (currentCredits[serviceId] || 0) + 1;

    const updatedCredits = {
        ...currentCredits,
        [serviceId]: newCreditCount,
    };

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ procedure_credits: updatedCredits })
        .eq('id', userId);

    if (updateError) {
        console.error("Error returning user credit:", updateError);
        return null;
    }

    return getUserProfile(userId);
};

// --- Funções de Configurações da Clínica ---

const CLINIC_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const mapSupabaseSettingsToClinicSettings = (s: any): ClinicSettings => ({
    id: s.id,
    operatingHours: s.operating_hours || DEFAULT_CLINIC_SETTINGS.operatingHours,
    holidayExceptions: s.holiday_exceptions || [],
    featuredServiceIds: s.featured_service_ids || [],
    heroText: s.hero_text || DEFAULT_CLINIC_SETTINGS.heroText,
    heroSubtitle: s.hero_subtitle || DEFAULT_CLINIC_SETTINGS.heroSubtitle,
    aboutText: s.about_text || DEFAULT_CLINIC_SETTINGS.aboutText,
});

export const getClinicSettings = async (): Promise<ClinicSettings> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .select('*')
        .eq('id', CLINIC_SETTINGS_ID)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching clinic settings:", error);
        return DEFAULT_CLINIC_SETTINGS;
    }
    
    if (!data) {
        // Se não houver dados, tenta inserir o padrão
        const { data: insertedData, error: insertError } = await supabase
            .from('clinic_settings')
            .insert({ id: CLINIC_SETTINGS_ID, ...DEFAULT_CLINIC_SETTINGS })
            .select()
            .single();
            
        if (insertError) {
            console.error("Error inserting default clinic settings:", insertError);
            return DEFAULT_CLINIC_SETTINGS;
        }
        return mapSupabaseSettingsToClinicSettings(insertedData);
    }

    return mapSupabaseSettingsToClinicSettings(data);
};

export const updateClinicOperatingHours = async (hours: OperatingHours): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ operating_hours: hours })
        .eq('id', CLINIC_SETTINGS_ID)
        .select()
        .single();

    if (error) {
        console.error("Error updating operating hours:", error);
        return null;
    }
    return mapSupabaseSettingsToClinicSettings(data);
};

export const updateClinicHolidayExceptions = async (exceptions: HolidayException[]): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ holiday_exceptions: exceptions })
        .eq('id', CLINIC_SETTINGS_ID)
        .select()
        .single();

    if (error) {
        console.error("Error updating holiday exceptions:", error);
        return null;
    }
    return mapSupabaseSettingsToClinicSettings(data);
};

export const updateFeaturedServices = async (serviceIds: string[]): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ featured_service_ids: serviceIds })
        .eq('id', CLINIC_SETTINGS_ID)
        .select()
        .single();

    if (error) {
        console.error("Error updating featured services:", error);
        return null;
    }
    return mapSupabaseSettingsToClinicSettings(data);
};

export const updateClinicTexts = async (texts: { heroText: string; heroSubtitle: string; aboutText: string }): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ 
            hero_text: texts.heroText,
            hero_subtitle: texts.heroSubtitle,
            about_text: texts.aboutText,
        })
        .eq('id', CLINIC_SETTINGS_ID)
        .select()
        .single();

    if (error) {
        console.error("Error updating clinic texts:", error);
        return null;
    }
    return mapSupabaseSettingsToClinicSettings(data);
};

// --- Funções de Upload de Arquivos ---

const BUCKET_NAME = 'assets';

export const uploadAsset = async (path: string, file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        console.error(`Error uploading ${path}:`, uploadError);
        return null;
    }

    return getAssetUrl(filePath);
};

export const getAssetUrl = (path: string): string => {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);
        
    // Adiciona um timestamp para evitar cache agressivo
    return `${data.publicUrl}?t=${Date.now()}`;
};

export const uploadLogo = (file: File) => uploadAsset('logo', file);
export const uploadHeroImage = (file: File) => uploadAsset('hero', file);
export const uploadAboutImage = (file: File) => uploadAsset('about', file);
export const uploadAvatar = (userId: string, file: File) => uploadAsset(`avatars/${userId}`, file);

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

// --- Funções de Agendamento de Consulta Gratuita (Edge Function) ---

export const bookFreeConsultationForNewUser = async (details: { name: string; phone: string; description: string; date: Date; professionalId: string; serviceId: string; serviceName: string; duration: number }): Promise<{ success: boolean, error: string | null, newUserId?: string, tempEmail?: string }> => {
    try {
        // --- CORREÇÃO DE FUSO HORÁRIO ---
        // Enviamos a data como string ISO, mas a Edge Function precisa saber a hora local.
        // Vamos enviar a data e hora separadamente para que a Edge Function possa reconstruir a data localmente.
        const dateObj = details.date;
        const bookingDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const bookingTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        // --------------------------------
        
        const { data, error } = await supabase.functions.invoke('book-free-consultation', {
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
            console.error("Error invoking book-free-consultation function:", error);
            // Se for um erro de rede ou erro 500 do Deno, retornamos uma mensagem genérica
            return { success: false, error: error.message };
        }
        
        // Se a Edge Function retornou um erro no corpo (status 400), data.error estará preenchido
        if (data.error) {
            console.error("Edge Function returned application error:", data.error);
            return { success: false, error: data.error };
        }

        // Se a Edge Function retornou sucesso, mas faltam dados essenciais
        if (!data.success) {
             console.error("Edge Function returned success: false without specific error.");
             return { success: false, error: "Falha desconhecida ao agendar a consulta. Tente novamente." };
        }

        return { success: true, error: null, newUserId: data.newUserId, tempEmail: data.tempEmail };

    } catch (e) {
        console.error("Unexpected error during free consultation booking:", e);
        return { success: false, error: "Erro inesperado ao tentar agendar a consulta gratuita." };
    }
};

// --- Funções de Relatórios ---

// Dados mockados para relatórios (substituir por fetch real se necessário)
const MOCK_SALES_DATA: Sale[] = [
    { id: 's1', serviceName: 'Limpeza de Pele', clientName: 'Ana Silva', amount: 150.00, date: new Date(Date.now() - 86400000 * 5) },
    { id: 's2', serviceName: 'Massagem Relaxante', clientName: 'Bruno Costa', amount: 120.00, date: new Date(Date.now() - 86400000 * 10) },
    { id: 's3', serviceName: 'Botox', clientName: 'Carla Dias', amount: 800.00, date: new Date(Date.now() - 86400000 * 1) },
    { id: 's4', serviceName: 'Limpeza de Pele', clientName: 'Daniela Alves', amount: 150.00, date: new Date(Date.now() - 86400000 * 1) },
    { id: 's5', serviceName: 'Pacote Corporal', clientName: 'Eduardo Ferreira', amount: 1200.00, date: new Date(Date.now() - 86400000 * 20) },
    { id: 's6', serviceName: 'Massagem Relaxante', clientName: 'Fábio Gomes', amount: 120.00, date: new Date(Date.now() - 86400000 * 3) },
    { id: 's7', serviceName: 'Botox', clientName: 'Gabriela Horta', amount: 800.00, date: new Date(Date.now() - 86400000 * 3) },
    { id: 's8', serviceName: 'Limpeza de Pele', clientName: 'Henrique Ivo', amount: 150.00, date: new Date(Date.now() - 86400000 * 3) },
    { id: 's9', serviceName: 'Pacote Facial', clientName: 'Isabela Jardim', amount: 600.00, date: new Date(Date.now() - 86400000 * 2) },
    { id: 's10', serviceName: 'Botox', clientName: 'João Lima', amount: 800.00, date: new Date(Date.now() - 86400000 * 2) },
];

export const getSalesData = async (): Promise<Sale[]> => {
    // Em um ambiente real, buscaríamos dados da tabela 'purchases' e 'purchase_items'
    // Por enquanto, retornamos dados mockados.
    return new Promise(resolve => {
        setTimeout(() => resolve(MOCK_SALES_DATA), 500);
    });
};