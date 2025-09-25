import { supabase } from '../supabase/client';
import { User, Service, Booking, Role, Sale, ServicePackage } from '../types';
import { User as SupabaseAuthUser } from '@supabase/supabase-js'; // Importar o tipo User do Supabase

// Helper to map Supabase user and profile to our app's User type
const toAppUser = (supabaseUser: any, profile: any): User | null => {
    if (!supabaseUser || !profile) return null;
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile.full_name || '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        role: profile.role as Role || Role.CLIENT,
        credits: profile.credits || {},
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
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId) // 'id' in profiles table is the user_id from auth.users
        .single();

    if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return null;
    }

    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching auth user:", userError);
        return null;
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
                full_name: name, // This will be used by the handle_new_user trigger
            },
        },
    });
    if (error) {
        console.error("Error signing up:", error);
        return { user: null, error };
    }
    if (data.user) {
        // The handle_new_user trigger will create the profile.
        // We might need to fetch it after a short delay or rely on the auth state change listener.
        return { user: { id: data.user.id, email: data.user.email }, error: null };
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
        redirectTo: `${window.location.origin}/update-password`, // Redirect to a page where user can set new password
    });
    if (error) {
        console.error("Error sending password reset email:", error);
        return { error };
    }
    return { error: null };
};

// ==================
// SERVICES & PACKAGES (Still using mock data for now, will update later if requested)
// ==================
const MOCK_SERVICES: Service[] = [
    {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        name: 'Limpeza de Pele Profunda',
        description: 'Tratamento facial completo para remover impurezas, cravos e células mortas, deixando a pele limpa, macia e revitalizada. Ideal para todos os tipos de pele.',
        duration: 90,
        price: 180.00,
        imageUrl: 'https://picsum.photos/seed/limpezapele/400/300',
        category: 'Facial',
    },
    {
        id: 'd4c3b2a1-f6e5-0987-4321-fedcba098765',
        name: 'Massagem Relaxante Clássica',
        description: 'Uma massagem corporal com movimentos suaves e firmes que aliviam a tensão muscular, reduzem o estresse e promovem uma profunda sensação de bem-estar e tranquilidade.',
        duration: 60,
        price: 150.00,
        imageUrl: 'https://picsum.photos/seed/massagem/400/300',
        category: 'Corporal',
    },
    {
        id: 'b2c3d4a1-e5f6-7890-1234-abcdef567890',
        name: 'Peeling de Diamante',
        description: 'Esfoliação mecânica profunda que promove a renovação celular, melhora a textura da pele, atenua manchas, rugas finas e cicatrizes de acne.',
        duration: 45,
        price: 250.00,
        imageUrl: 'https://picsum.photos/seed/peeling/400/300',
        category: 'Facial',
    },
    {
        id: 'c3d4a1b2-f6e5-0987-4321-abcdef098765',
        name: 'Drenagem Linfática Corporal',
        description: 'Técnica de massagem que estimula o sistema linfático, ajudando a eliminar toxinas, reduzir o inchaço e a retenção de líquidos, e combater a celulite.',
        duration: 60,
        price: 160.00,
        imageUrl: 'https://picsum.photos/seed/drenagem/400/300',
        category: 'Corporal',
    },
    {
        id: 'e6f5d4c3-b2a1-0987-6543-210987fedcba',
        name: 'Design de Sobrancelhas',
        description: 'Modelagem e alinhamento das sobrancelhas de acordo com a simetria facial, realçando o olhar. Inclui depilação com pinça ou cera.',
        duration: 30,
        price: 50.00,
        imageUrl: 'https://picsum.photos/seed/sobrancelha/400/300',
        category: 'Beleza do Olhar',
    },
    {
        id: 'f5e6d4c3-b2a1-9876-5432-109876abcdef',
        name: 'Pacote 4x Massagem Modeladora',
        description: 'Tratamento intensivo com 4 sessões de massagem modeladora para remodelar o contorno corporal e reduzir medidas.',
        duration: 50,
        price: 540.00,
        imageUrl: 'https://picsum.photos/seed/modeladora/400/300',
        category: 'Corporal',
        sessions: 4,
    }
];

const MOCK_PACKAGES: ServicePackage[] = [
  {
    id: 'pkg_relax_total',
    name: 'Pacote Relax Total',
    description: 'Uma combinação perfeita de massagem relaxante e limpeza de pele para renovar suas energias e cuidar da sua pele.',
    services: [
      { serviceId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', quantity: 1 }, // Assuming ID for Limpeza de Pele
      { serviceId: 'd4c3b2a1-f6e5-0987-4321-fedcba098765', quantity: 2 }, // Assuming ID for Massagem Relaxante
    ],
    price: 420.00,
    imageUrl: 'https://picsum.photos/seed/relaxpack/400/300'
  },
  {
    id: 'pkg_pele_renovada',
    name: 'Pacote Pele Renovada',
    description: 'Tratamento intensivo para revitalização facial, combinando limpeza profunda com o poder do peeling de diamante.',
    services: [
      { serviceId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', quantity: 2 }, // Limpeza de Pele
      { serviceId: 'b2c3d4a1-e5f6-7890-1234-abcdef567890', quantity: 1 }, // Peeling de Diamante
    ],
    price: 550.00,
    imageUrl: 'https://picsum.photos/seed/skinpack/400/300'
  },
  {
    id: 'pkg_corpo_leve',
    name: 'Pacote Corpo Leve',
    description: 'Sinta-se mais leve e relaxada com sessões de drenagem linfática e massagem para aliviar a tensão e o inchaço.',
    services: [
      { serviceId: 'c3d4a1b2-f6e5-0987-4321-abcdef098765', quantity: 3 }, // Drenagem Linfática
      { serviceId: 'd4c3b2a1-f6e5-0987-4321-fedcba098765', quantity: 1 }, // Massagem Relaxante
    ],
    price: 600.00,
    imageUrl: 'https://picsum.photos/seed/bodypack/400/300'
  }
];

export const getServices = async (): Promise<Service[]> => {
    return Promise.resolve(MOCK_SERVICES);
};

export const getServicePackages = async (): Promise<ServicePackage[]> => {
    return Promise.resolve(MOCK_PACKAGES);
};

export const addOrUpdateService = async (service: Service): Promise<Service | null> => {
    const serviceWithId = { ...service, id: service.id || `service-${Date.now()}` };
    const index = MOCK_SERVICES.findIndex(s => s.id === serviceWithId.id);
    if (index > -1) {
        MOCK_SERVICES[index] = serviceWithId;
    } else {
        MOCK_SERVICES.push(serviceWithId);
    }
    return serviceWithId;
};

export const deleteService = async (serviceId: string) => {
    const index = MOCK_SERVICES.findIndex(s => s.id === serviceId);
    if (index > -1) {
        MOCK_SERVICES.splice(index, 1);
    }
};

// ==================
// USERS & PROFESSIONALS
// ==================
export const getUsersWithRoles = async (): Promise<User[]> => {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("Error fetching users with roles:", error);
        return [];
    }

    const { data: { users: authUsers }, error: authUsersError } = await supabase.auth.admin.listUsers();
    if (authUsersError) {
        console.error("Error fetching auth users:", authUsersError);
        return [];
    }

    const usersMap = new Map<string, SupabaseAuthUser>(); // Explicitly type SupabaseAuthUser
    authUsers.forEach((u: SupabaseAuthUser) => usersMap.set(u.id, u));

    return profiles.map(profile => {
        const authUser = usersMap.get(profile.id);
        return toAppUser(authUser, profile);
    }).filter(Boolean) as User[];
};

export const getProfessionals = async (): Promise<User[]> => {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', Role.STAFF); // Assuming 'STAFF' is the role for professionals

    if (error) {
        console.error("Error fetching professionals:", error);
        return [];
    }

    const { data: { users: authUsers }, error: authUsersError } = await supabase.auth.admin.listUsers();
    if (authUsersError) {
        console.error("Error fetching auth users:", authUsersError);
        return [];
    }

    const usersMap = new Map<string, SupabaseAuthUser>(); // Explicitly type SupabaseAuthUser
    authUsers.forEach((u: SupabaseAuthUser) => usersMap.set(u.id, u));

    return profiles.map(profile => {
        const authUser = usersMap.get(profile.id);
        return toAppUser(authUser, profile);
    }).filter(Boolean) as User[];
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            full_name: updates.name,
            phone: updates.phone,
            cpf: updates.cpf,
            role: updates.role,
            credits: updates.credits,
            // Add other fields as needed
        })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error("Error updating user profile:", error);
        return null;
    }

    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
    if (userError) {
        console.error("Error fetching auth user after profile update:", userError);
        return null;
    }

    return toAppUser(supabaseUser, data);
};

export const addOrUpdateUser = async (user: User): Promise<User | null> => {
    // For existing users, update profile. For new users, this should ideally be handled by signUp.
    // Admin can update roles, phone, cpf, etc.
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id, // This is the auth.users.id
            full_name: user.name,
            email: user.email, // Email is not directly in profiles, but useful for context
            phone: user.phone,
            cpf: user.cpf,
            role: user.role,
        }, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error("Error adding or updating user:", error);
        return null;
    }
    
    // If the user's email or role needs to be updated in auth.users, it requires admin privileges
    // For now, we'll assume email is handled by auth.signUp/signIn and role is only in profiles.
    // If you need to update auth.users.email, you'd use supabase.auth.admin.updateUserById(user.id, { email: user.email })

    const { data: { user: supabaseUser }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError) {
        console.error("Error fetching auth user after upsert:", authUserError);
        return null;
    }

    return toAppUser(supabaseUser, data);
};

// ==================
// CREDITS
// ==================
export const addCreditsToUser = async (userId: string, serviceId: string, quantity: number, sessionsPerPackage: number = 1): Promise<User | null> => {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) return null;

    const totalCreditsToAdd = (sessionsPerPackage || 1) * quantity;
    const existingCredits = userProfile.credits?.[serviceId] || 0;
    
    const newCredits = {
        ...userProfile.credits,
        [serviceId]: existingCredits + totalCreditsToAdd,
    };
    
    return await updateUserProfile(userId, { credits: newCredits });
};

export const addPackageCreditsToUser = async (userId: string, pkg: ServicePackage): Promise<User | null> => {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) return null;

    const newCredits = { ...(userProfile.credits || {}) };

    pkg.services.forEach(item => {
        const existingCredits = newCredits[item.serviceId] || 0;
        newCredits[item.serviceId] = existingCredits + item.quantity;
    });

    return await updateUserProfile(userId, { credits: newCredits });
};

export const deductCreditFromUser = async (userId: string, serviceId: string): Promise<User | null> => {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) return null;

    const existingCredits = userProfile.credits?.[serviceId] || 0;
    if (existingCredits <= 0) return userProfile; // Cannot go below zero

    const newCredits = {
        ...userProfile.credits,
        [serviceId]: existingCredits - 1,
    };

    return await updateUserProfile(userId, { credits: newCredits });
};


// ==================
// BOOKINGS
// ==================
const mapBooking = (b: any): Booking => ({ ...b, date: new Date(b.appointment_date + 'T' + b.start_time) }); // Combine date and time

export const getAllBookings = async (): Promise<Booking[]> => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*');

    if (error) {
        console.error("Error fetching all bookings:", error);
        return [];
    }
    return data.map(mapBooking);
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', userId);

    if (error) {
        console.error("Error fetching user bookings:", error);
        return [];
    }
    return data.map(mapBooking);
};

export const addOrUpdateBooking = async (booking: Partial<Booking>): Promise<Booking | null> => {
    const appointmentDate = booking.date?.toISOString().split('T')[0];
    const startTime = booking.date?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    const bookingData = {
        client_id: booking.userId,
        service_id: booking.serviceId,
        professional_id: booking.professionalId,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: new Date(booking.date!.getTime() + (booking.duration || 0) * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        status: booking.status,
        notes: booking.comment, // Using comment for notes
        // internal_notes: booking.internalNotes, // If you have this field
    };

    if (booking.id) { // Update
        const { data, error } = await supabase
            .from('appointments')
            .update(bookingData)
            .eq('id', booking.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating booking:", error);
            return null;
        }
        return mapBooking(data);
    } else { // Create
        const { data, error } = await supabase
            .from('appointments')
            .insert(bookingData)
            .select()
            .single();

        if (error) {
            console.error("Error creating booking:", error);
            return null;
        }
        return mapBooking(data);
    }
};

// ==================
// REPORTS
// ==================
export const getSalesData = async (): Promise<Sale[]> => {
    const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
            *,
            appointments (
                client_id,
                service_id,
                profiles (full_name),
                services (name, price)
            )
        `)
        .eq('status', 'paid'); // Assuming 'paid' status for completed sales

    if (paymentsError) {
        console.error("Error fetching sales data:", paymentsError);
        return [];
    }
    
    return payments.map((payment: any) => {
        const serviceName = payment.appointments?.services?.name || 'Serviço Desconhecido';
        const clientName = payment.appointments?.profiles?.full_name || 'Cliente Desconhecido';
        const amount = payment.amount || payment.appointments?.services?.price || 0; // Use payment amount if available, otherwise service price
        
        return {
            id: payment.id,
            serviceName: serviceName,
            clientName: clientName,
            amount: amount,
            date: new Date(payment.paid_at || payment.created_at),
        };
    });
};