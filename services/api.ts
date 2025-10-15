import { supabase } from '../supabase/client';
import { User, Service, Booking, Role, Sale, ServicePackage, ClinicSettings, OperatingHours, HolidayException } from '../types';
import { User as SupabaseAuthUser } from '@supabase/supabase-js'; // Importar o tipo User do Supabase

// Helper to map Supabase user and profile to our app's User type
const toAppUser = (supabaseUser: SupabaseAuthUser, profile: any | null): User => {
    // Mapeia o papel do banco de dados ('admin', 'user', 'staff') para o enum Role ('ADMIN', 'CLIENT', 'STAFF')
    let appRole: Role = Role.CLIENT;
    if (profile?.role === 'admin') {
        appRole = Role.ADMIN;
    } else if (profile?.role === 'staff') {
        appRole = Role.STAFF;
    }

    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email || 'Usuário',
        phone: profile?.phone || supabaseUser.user_metadata?.phone || '',
        cpf: profile?.cpf || '',
        role: appRole,
        credits: profile?.credits || profile?.procedure_credits || {},
        avatarUrl: profile?.avatar_url || '',
    };
};

// ==================
// AUTHENTICATION
// ==================
export const getCurrentUserSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error);
        return { session: null, error };
    }
    return { session: data.session, error: null };
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !supabaseUser) {
        console.error("Error fetching auth user:", userError);
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, procedure_credits')
        .eq('id', userId)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching user profile:", profileError);
    }

    return toAppUser(supabaseUser, profile);
};

export const signIn = async (email: string, password?: string) => {
    if (!password) return { user: null, error: { message: "Password is required." } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        console.error("Error signing in:", error);
        return { user: null, error };
    }
    
    if (data.user) {
        const userProfile = await getUserProfile(data.user.id);
        return { user: userProfile, error: null };
    }
    return { user: null, error: { message: "Login failed." } };
};

export const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
        },
    });
    if (error) {
        console.error("Error signing up:", error);
        return { user: null, error };
    }
    if (data.user) {
        return { user: { id: data.user.id, email: data.user.email || '', name: name, phone: '', cpf: '', role: Role.CLIENT, avatarUrl: '' }, error: null };
    }
    return { user: null, error: { message: "Sign up failed." } };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error signing out:", error);
        return { error };
    }
    return { error: null };
};

export const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) {
        console.error("Error sending password reset email:", error);
        return { error };
    }
    return { error: null };
};

// ==================
// SERVICES & PACKAGES
// ==================
const MOCK_PACKAGES: ServicePackage[] = [
  { id: 'pkg_relax_total', name: 'Pacote Relax Total', description: 'Uma combinação perfeita de massagem relaxante e limpeza de pele para renovante suas energias e cuidar da sua pele.', services: [{ serviceId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', quantity: 1 }, { serviceId: 'd4c3b2a1-f6e5-0987-4321-fedcba098765', quantity: 2 }], price: 420.00, imageUrl: 'https://picsum.photos/seed/relaxpack/400/300' },
  { id: 'pkg_pele_renovada', name: 'Pacote Pele Renovada', description: 'Tratamento intensivo para revitalização facial, combinando limpeza profunda com o poder do peeling de diamante.', services: [{ serviceId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', quantity: 2 }, { serviceId: 'b2c3d4a1-f6e5-7890-1234-abcdef567890', quantity: 1 }], price: 550.00, imageUrl: 'https://picsum.photos/seed/skinpack/400/300' },
  { id: 'pkg_corpo_leve', name: 'Pacote Corpo Leve', description: 'Sinta-se mais leve e relaxada com sessões de drenagem linfática e massagem para aliviar a tensão e o inchaço.', services: [{ serviceId: 'c3d4a1b2-f6e5-0987-4321-abcdef098765', quantity: 3 }, { serviceId: 'd4c3b2a1-f6e5-0987-4321-fedcba098765', quantity: 1 }], price: 600.00, imageUrl: 'https://picsum.photos/seed/bodypack/400/300' }
];

const mapDbToService = (dbService: any): Service => ({
    id: dbService.id,
    name: dbService.name,
    description: dbService.description,
    duration: dbService.duration,
    price: Number(dbService.price),
    imageUrl: dbService.image,
    category: dbService.category,
    sessions: dbService.sessions,
});

export const getServices = async (): Promise<Service[]> => {
    const { data, error } = await supabase.from('services').select('*');
    if (error) {
        console.error("Error fetching services:", error);
        return [];
    }
    return data.map(mapDbToService);
};

export const getServicePackages = async (): Promise<ServicePackage[]> => Promise.resolve(MOCK_PACKAGES);

export const addOrUpdateService = async (service: Service): Promise<Service | null> => {
    const serviceData = {
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: service.category,
        image: service.imageUrl,
        sessions: service.sessions,
    };

    let result;
    if (service.id) {
        // Atualizar serviço existente
        result = await supabase
            .from('services')
            .update(serviceData)
            .eq('id', service.id)
            .select()
            .single();
    } else {
        // Inserir novo serviço (o ID será gerado pelo banco de dados)
        // Remove o ID do payload para garantir que o banco gere um novo UUID
        const { id, ...insertData } = serviceData; 
        
        // Garantir que o payload de inserção não contenha 'id'
        const insertPayload = { ...insertData };
        if (insertPayload.id) delete insertPayload.id;

        result = await supabase
            .from('services')
            .insert(insertPayload)
            .select()
            .single();
    }

    if (result.error) {
        console.error("Error adding/updating service:", result.error);
        // Adicionando um alerta mais detalhado para o console
        alert(`Erro ao salvar serviço: ${result.error.message}`);
        return null;
    }
    return mapDbToService(result.data);
};

export const deleteService = async (serviceId: string) => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) {
        console.error("Error deleting service:", error);
    }
};

// ==================
// USERS & PROFESSIONALS
// ==================
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
};

export const uploadLogo = async (file: File): Promise<string | null> => {
    const filePath = 'logo-marilia-manuela.jpeg'; // Manter o nome do arquivo consistente
    
    const { error } = await supabase.storage
        .from('assets')
        .update(filePath, file, {
            contentType: file.type,
            upsert: true,
        });

    if (error) {
        console.error('Error uploading logo:', error);
        alert(`Erro ao enviar logo: ${error.message}`);
        return null;
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    
    const newUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
    return newUrl;
};

export const uploadHeroImage = async (file: File): Promise<string | null> => {
    const filePath = 'hero-image.jpeg'; // Nome de arquivo consistente para a imagem principal
    
    const { error } = await supabase.storage
        .from('assets')
        .update(filePath, file, {
            contentType: file.type,
            upsert: true,
        });

    if (error) {
        console.error('Error uploading hero image:', error);
        alert(`Erro ao enviar imagem principal: ${error.message}`);
        return null;
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    
    const newUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
    return newUrl;
};

export const uploadAboutImage = async (file: File): Promise<string | null> => {
    const filePath = 'about-image.jpeg'; // Nome de arquivo consistente para a imagem "Sobre"
    
    const { error } = await supabase.storage
        .from('assets')
        .update(filePath, file, {
            contentType: file.type,
            upsert: true,
        });

    if (error) {
        console.error('Error uploading about image:', error);
        alert(`Erro ao enviar imagem da seção Sobre: ${error.message}`);
        return null;
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    
    const newUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
    return newUrl;
};

export const adminCreateUser = async (userData: Partial<User> & { password?: string, avatarUrl?: string }): Promise<User | null> => {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
            email: userData.email,
            password: userData.password,
            name: userData.name,
            phone: userData.phone?.replace(/\D/g, ''),
            cpf: userData.cpf?.replace(/\D/g, ''),
            role: userData.role === Role.ADMIN ? 'admin' : userData.role === Role.STAFF ? 'staff' : 'user',
        }
    });

    if (error) {
        console.error('Error creating user via function:', error);
        alert(`Erro ao criar usuário: ${error.message}`);
        return null;
    }

    let profile = data.user;
    
    if (userData.avatarUrl && profile.id) {
        const updatedProfile = await updateUserProfile(profile.id, { avatarUrl: userData.avatarUrl });
        if (updatedProfile) {
            profile = { ...profile, avatar_url: updatedProfile.avatarUrl };
        }
    }

    const createdUser: User = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        phone: profile.phone,
        cpf: profile.cpf,
        role: profile.role === 'admin' ? Role.ADMIN : profile.role === 'staff' ? Role.STAFF : Role.CLIENT,
        credits: profile.procedure_credits || {},
        avatarUrl: profile.avatar_url || '',
    };

    return createdUser;
};

export const getUsersWithRoles = async (): Promise<User[]> => {
    const { data, error } = await supabase.rpc('get_all_users_for_admin');
    if (error) {
        console.error("Error fetching users with roles via RPC:", error);
        return [];
    }
    return data.map((profile: any) => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.full_name || profile.email || '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        role: profile.role === 'admin' ? Role.ADMIN : profile.role === 'staff' ? Role.STAFF : Role.CLIENT,
        credits: profile.credits || {},
        avatarUrl: profile.avatar_url || '',
    }));
};

export const getProfessionals = async (): Promise<User[]> => {
    const { data, error } = await supabase.rpc('get_all_professionals');
    if (error) {
        console.error("Error fetching professionals via RPC:", error);
        return [];
    }
    return data.map((profile: any) => ({
        id: profile.id,
        email: '', // O e-mail não é exposto publicamente para profissionais
        name: profile.full_name || '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        role: Role.STAFF,
        credits: profile.credits || {},
        avatarUrl: profile.avatar_url || '',
    }));
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    const dbUpdates: { [key: string]: any } = {};
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.phone) dbUpdates.phone = updates.phone.replace(/\D/g, '');
    if (updates.cpf) dbUpdates.cpf = updates.cpf.replace(/\D/g, '');
    if (updates.credits) dbUpdates.procedure_credits = updates.credits;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;

    if (updates.role) {
        let dbRole = 'user';
        if (updates.role === Role.ADMIN) dbRole = 'admin';
        else if (updates.role === Role.STAFF) dbRole = 'staff';
        dbUpdates.role = dbRole;
    }

    Object.keys(dbUpdates).forEach(key => dbUpdates[key] === undefined && delete dbUpdates[key]);

    const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId)
        .select('*, procedure_credits')
        .single();

    if (error) {
        console.error("Error updating user profile:", error);
        return null;
    }

    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (!supabaseUser) return null;

    return toAppUser(supabaseUser, data);
};

// ==================
// CLINIC SETTINGS
// ==================

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const mapDbToClinicSettings = (dbSettings: any): ClinicSettings => ({
    id: dbSettings.id,
    operatingHours: dbSettings.operating_hours,
    holidayExceptions: dbSettings.holiday_exceptions || [],
});

// NOVOS HORÁRIOS PADRÃO
const DEFAULT_OPERATING_HOURS: OperatingHours = {
    0: { open: false }, // Domingo
    1: { open: true, start: '07:00', end: '20:00', lunchStart: '13:00', lunchEnd: '14:00' }, // Segunda
    2: { open: true, start: '07:00', end: '20:00', lunchStart: '13:00', lunchEnd: '14:00' }, // Terça
    3: { open: true, start: '07:00', end: '20:00', lunchStart: '13:00', lunchEnd: '14:00' }, // Quarta
    4: { open: true, start: '07:00', end: '20:00', lunchStart: '13:00', lunchEnd: '14:00' }, // Quinta
    5: { open: true, start: '07:00', end: '20:00', lunchStart: '13:00', lunchEnd: '14:00' }, // Sexta
    6: { open: true, start: '07:00', end: '14:00' } // Sábado (sem almoço)
};

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
    id: SETTINGS_ID,
    operatingHours: DEFAULT_OPERATING_HOURS,
    holidayExceptions: [],
};

export const getClinicSettings = async (): Promise<ClinicSettings> => {
    try {
        const { data, error } = await supabase
            .from('clinic_settings')
            .select('id, operating_hours, holiday_exceptions')
            .eq('id', SETTINGS_ID)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
            console.error("Error fetching clinic settings:", error);
            // Fallback para padrões se houver erro de conexão/permissão
            return DEFAULT_CLINIC_SETTINGS;
        }
        
        if (!data) {
            // Se não houver dados, insere a linha padrão
            const { data: insertData, error: insertError } = await supabase
                .from('clinic_settings')
                .insert({ 
                    id: SETTINGS_ID, 
                    operating_hours: DEFAULT_OPERATING_HOURS,
                    holiday_exceptions: [],
                })
                .select('id, operating_hours, holiday_exceptions')
                .single();
                
            if (insertError) {
                console.error("Error inserting default clinic settings:", insertError);
                // Fallback para padrões se a inserção falhar
                return DEFAULT_CLINIC_SETTINGS;
            }
            return mapDbToClinicSettings(insertData);
        }

        return mapDbToClinicSettings(data);
    } catch (e) {
        console.error("Unexpected error in getClinicSettings:", e);
        // Fallback final em caso de erro inesperado
        return DEFAULT_CLINIC_SETTINGS;
    }
};

export const updateClinicOperatingHours = async (operatingHours: OperatingHours): Promise<ClinicSettings | null> => {
    // Usamos o objeto diretamente, pois o Supabase lida bem com JSONB
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ operating_hours: operatingHours })
        .eq('id', SETTINGS_ID)
        .select()
        .single();

    if (error) {
        console.error("Error updating clinic operating hours:", error);
        alert(`Erro do Supabase: ${error.message}`);
        return null;
    }
    
    return mapDbToClinicSettings(data);
};

export const updateClinicHolidayExceptions = async (holidayExceptions: HolidayException[]): Promise<ClinicSettings | null> => {
    const { data, error } = await supabase
        .from('clinic_settings')
        .update({ holiday_exceptions: holidayExceptions })
        .eq('id', SETTINGS_ID)
        .select()
        .single();

    if (error) {
        console.error("Error updating holiday exceptions:", error);
        alert(`Erro ao atualizar exceções de feriados: ${error.message}`);
        return null;
    }
    
    return mapDbToClinicSettings(data);
};


// ==================
// CREDITS & BOOKINGS & REPORTS
// ==================
export const addCreditsToUser = async (userId: string, serviceId: string, quantity: number, sessionsPerPackage: number = 1): Promise<User | null> => { const userProfile = await getUserProfile(userId); if (!userProfile) return null; const totalCreditsToAdd = (sessionsPerPackage || 1) * quantity; const existingCredits = userProfile.credits?.[serviceId] || 0; const newCredits = { ...userProfile.credits, [serviceId]: existingCredits + totalCreditsToAdd, }; return await updateUserProfile(userId, { credits: newCredits }); };
export const returnCreditToUser = async (userId: string, serviceId: string): Promise<User | null> => { 
    const userProfile = await getUserProfile(userId); 
    if (!userProfile) return null; 
    
    const existingCredits = userProfile.credits?.[serviceId] || 0; 
    const newCredits = { 
        ...userProfile.credits, 
        [serviceId]: existingCredits + 1, // Devolve 1 crédito
    }; 
    return await updateUserProfile(userId, { credits: newCredits }); 
};
export const addPackageCreditsToUser = async (userId: string, pkg: ServicePackage): Promise<User | null> => { const userProfile = await getUserProfile(userId); if (!userProfile) return null; const newCredits = { ...(userProfile.credits || {}) }; pkg.services.forEach(item => { const existingCredits = newCredits[item.serviceId] || 0; newCredits[item.serviceId] = existingCredits + item.quantity; }); return await updateUserProfile(userId, { credits: newCredits }); };
export const deductCreditFromUser = async (userId: string, serviceId: string): Promise<User | null> => { const userProfile = await getUserProfile(userId); if (!userProfile) return null; const existingCredits = userProfile.credits?.[serviceId] || 0; if (existingCredits <= 0) return userProfile; const newCredits = { ...userProfile.credits, [serviceId]: existingCredits - 1, }; return await updateUserProfile(userId, { credits: newCredits }); };

const mapDbToBooking = (dbBooking: any): Booking => {
    const timePart = dbBooking.booking_time || '00:00';
    const datePart = dbBooking.booking_date;
    
    // Cria a data combinada no fuso horário local
    // Ex: '2024-10-16T09:00:00'
    const bookingDate = new Date(`${datePart}T${timePart}:00`);
    
    let status: 'confirmed' | 'completed' | 'canceled';

    if (dbBooking.status === 'Concluído' || dbBooking.status === 'completed') {
        status = 'completed';
    } else if (dbBooking.status === 'Cancelado' || dbBooking.status === 'canceled') {
        status = 'canceled';
    } else { // Status é 'Agendado' ou 'confirmed'
        const now = new Date();
        // Se a data do agendamento já passou, ele é considerado 'completed'
        if (bookingDate < now) {
            status = 'completed';
        } else {
            // Se ainda não passou, continua 'confirmed'
            status = 'confirmed';
        }
    }

    return {
        id: String(dbBooking.id),
        userId: dbBooking.user_id,
        serviceId: dbBooking.service_id,
        professionalId: dbBooking.professional_id,
        date: bookingDate,
        status: status,
        rating: dbBooking.rating,
        comment: dbBooking.notes,
        duration: dbBooking.duration,
    };
};

export const getAllBookings = async (): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) {
        console.error("Error fetching all bookings:", error);
        return [];
    }
    return data.map(mapDbToBooking);
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
    const { data, error } = await supabase.from('bookings').select('*').eq('user_id', userId);
    if (error) {
        console.error("Error fetching user bookings:", error);
        return [];
    }
    return data.map(mapDbToBooking);
};

export const getOccupiedSlots = async (dateString: string): Promise<{ professional_id: string, booking_time: string, duration: number }[]> => {
    const { data, error } = await supabase
        .from('bookings')
        .select('professional_id, booking_time, duration, id')
        .eq('booking_date', dateString)
        .in('status', ['Agendado', 'confirmed']); // Apenas agendamentos confirmados/agendados

    if (error) {
        console.error("Error fetching occupied slots:", error);
        return [];
    }
    return data.map(d => ({
        id: String(d.id),
        professional_id: d.professional_id,
        booking_time: d.booking_time,
        duration: d.duration,
    }));
};

export const addOrUpdateBooking = async (booking: Partial<Booking> & { serviceName?: string, notes?: string }): Promise<Booking | null> => {
    // O serviceName deve ser fornecido pelo componente de chamada, especialmente para novos agendamentos.
    const serviceName = booking.serviceName;

    if (!booking.date) {
        console.error("Booking date is missing.");
        return null;
    }
    
    // --- CORREÇÃO DE FUSO HORÁRIO ---
    // Usamos métodos locais (getFullYear, getMonth, getDate, getHours, getMinutes)
    // para garantir que a data e hora salvas sejam exatamente o que o usuário selecionou localmente.
    const dateObj = booking.date;
    
    // Formata a data como YYYY-MM-DD (local)
    const bookingDateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    // Formata a hora como HH:MM (local)
    const bookingTimeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    // --------------------------------

    let dbStatus = 'Agendado';
    if (booking.status === 'completed') dbStatus = 'Concluído';
    else if (booking.status === 'canceled') dbStatus = 'Cancelado';

    const bookingData: { [key: string]: any } = {
        user_id: booking.userId,
        service_id: booking.serviceId,
        professional_id: booking.professionalId,
        booking_date: bookingDateStr,
        booking_time: bookingTimeStr,
        status: dbStatus,
        notes: booking.notes || booking.comment, // Usar notes ou comment
        rating: booking.rating,
        duration: booking.duration,
        service_name: serviceName, // Usar o serviceName fornecido
    };

    Object.keys(bookingData).forEach(key => bookingData[key] === undefined && delete bookingData[key]);

    if (booking.id) {
        const { data, error } = await supabase.from('bookings').update(bookingData).eq('id', booking.id).select().single();
        if (error) { console.error("Error updating booking:", error); return null; }
        return mapDbToBooking(data);
    } else {
        // Verificação rigorosa para inserção
        if (!bookingData.user_id || !bookingData.service_id || !bookingData.service_name || !bookingData.booking_date || !bookingData.booking_time || !bookingData.duration) {
            console.error("Missing required fields for new booking:", bookingData);
            return null;
        }
        const { data, error } = await supabase.from('bookings').insert(bookingData).select().single();
        if (error) { console.error("Error creating booking:", error); return null; }
        return mapDbToBooking(data);
    }
};

export const bookFreeConsultationForNewUser = async (details: { name: string; phone: string; description: string; date: Date; professionalId: string; serviceId: string; serviceName: string; duration: number }): Promise<{ success: boolean, error: string | null, newUserId?: string }> => {
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
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            return { success: false, error: data.error };
        }

        return { success: true, error: null, newUserId: data.newUserId };

    } catch (e) {
        console.error("Unexpected error during free consultation booking:", e);
        return { success: false, error: "Erro inesperado ao tentar agendar a consulta gratuita." };
    }
};

export const getSalesData = async (): Promise<Sale[]> => {
    // 1. Buscar todos os agendamentos concluídos, juntando com o perfil do cliente e o preço do serviço
    const { data: completedBookings, error } = await supabase
        .from('bookings')
        .select(`
            *, 
            profiles (full_name), 
            services (price)
        `)
        .in('status', ['Concluído', 'completed']);

    if (error) {
        console.error("Error fetching sales data from bookings:", error);
        return [];
    }

    // 2. Mapear para o tipo Sale, garantindo que o valor da venda seja o preço do serviço
    return completedBookings
        .filter((booking: any) => booking.services?.price !== undefined && booking.services.price !== null)
        .map((booking: any) => {
            // Se o agendamento foi concluído, assumimos que ele foi pago (ou consumiu um crédito pago anteriormente).
            // Se o preço do serviço for 0, ele não entra no faturamento.
            const amount = Number(booking.services.price);
            
            return {
                id: String(booking.id),
                serviceName: booking.service_name,
                clientName: booking.profiles?.full_name || 'Cliente Desconhecido',
                amount: amount,
                date: new Date(booking.booking_date),
            };
        });
};

// ==================
// NOTIFICATIONS
// ==================

interface SendNotificationProps {
    to: string; // Número de telefone formatado
    message: string;
}

export const sendWhatsappReminder = async ({ to, message }: SendNotificationProps): Promise<{ success: boolean, error: string | null }> => {
    try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
            body: { to, message },
        });

        if (error) {
            console.error("Error invoking send-whatsapp-reminder function:", error);
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            return { success: false, error: data.error };
        }

        return { success: true, error: null };

    } catch (e) {
        console.error("Unexpected error during whatsapp invocation:", e);
        return { success: false, error: "Erro inesperado ao tentar enviar o lembrete." };
    }
};

export const sendCancellationNotice = async ({ to, message }: SendNotificationProps): Promise<{ success: boolean, error: string | null }> => {
    try {
        const { data, error } = await supabase.functions.invoke('send-cancellation-notice', {
            body: { to, message },
        });

        if (error) {
            console.error("Error invoking send-cancellation-notice function:", error);
            return { success: false, error: error.message };
        }
        
        if (data.error) {
            return { success: false, error: data.error };
        }

        return { success: true, error: null };

    } catch (e) {
        console.error("Unexpected error during cancellation invocation:", e);
        return { success: false, error: "Erro inesperado ao tentar enviar o aviso de cancelamento." };
    }
};