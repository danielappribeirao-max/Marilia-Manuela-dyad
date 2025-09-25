import { supabase } from '../supabase/client';
import { User, Service, Booking, Role, Sale, ServicePackage } from '../types';

// Helper to map Supabase user and profile to our app's User type
const toAppUser = (user: any, profile: any): User | null => {
    if (!user || !profile) return null;
    return {
        id: user.id,
        email: user.email || '',
        name: profile.name || '',
        phone: profile.phone || '',
        cpf: profile.cpf || '',
        role: profile.role || Role.CLIENT,
        credits: profile.credits || {},
    };
};

// ==================
// MOCK DATA
// ==================
const MOCK_PROFESSIONALS: User[] = [
    {
        id: 'prof1',
        name: 'Ana Silva',
        email: 'ana.silva@bellezapura.com',
        phone: '(11) 98765-4321',
        cpf: '111.222.333-44',
        role: Role.STAFF,
        credits: {},
    },
    {
        id: 'prof2',
        name: 'Beatriz Costa',
        email: 'beatriz.costa@bellezapura.com',
        phone: '(11) 91234-5678',
        cpf: '222.333.444-55',
        role: Role.STAFF,
        credits: {},
    },
     {
        id: 'prof3',
        name: 'Carla Dias',
        email: 'carla.dias@bellezapura.com',
        phone: '(11) 99999-8888',
        cpf: '333.444.555-66',
        role: Role.STAFF,
        credits: {},
    },
];

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

const MOCK_USERS: User[] = [
    {
        id: 'user1',
        name: 'Mariana Lima',
        email: 'mariana.lima@example.com',
        phone: '(11) 91111-2222',
        cpf: '123.456.789-00',
        role: Role.CLIENT,
        credits: {
            'a1b2c3d4-e5f6-7890-1234-567890abcdef': 2, // Limpeza de Pele
            'f5e6d4c3-b2a1-9876-5432-109876abcdef': 1, // Massagem Modeladora
        },
    },
    {
        id: 'user2',
        name: 'Juliana Almeida',
        email: 'juliana.almeida@example.com',
        phone: '(21) 93333-4444',
        cpf: '098.765.432-11',
        role: Role.CLIENT,
        credits: {},
    },
    {
        id: 'admin1',
        name: 'Sofia Oliveira',
        email: 'sofia.oliveira@bellezapura.com',
        phone: '(31) 95555-6666',
        cpf: '111.111.111-11',
        role: Role.ADMIN,
        credits: {},
    },
    ...MOCK_PROFESSIONALS,
];

const MOCK_BOOKINGS: Booking[] = [
    {
        id: 'booking1',
        userId: 'user1',
        serviceId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Limpeza de Pele
        professionalId: 'prof1', // Ana Silva
        date: new Date(new Date().setDate(new Date().getDate() + 3)),
        status: 'confirmed',
        duration: 90,
    },
    {
        id: 'booking2',
        userId: 'user2',
        serviceId: 'd4c3b2a1-f6e5-0987-4321-fedcba098765', // Massagem Relaxante
        professionalId: 'prof2', // Beatriz Costa
        date: new Date(new Date().setDate(new Date().getDate() - 7)),
        status: 'completed',
        rating: 5,
        comment: 'A massagem foi incrível, saí de lá renovada! A Beatriz é excelente.',
        duration: 60,
    },
    {
        id: 'booking3',
        userId: 'user1',
        serviceId: 'e6f5d4c3-b2a1-0987-6543-210987fedcba', // Design de Sobrancelhas
        professionalId: 'prof3', // Carla Dias
        date: new Date(new Date().setDate(new Date().getDate() - 14)),
        status: 'completed',
        duration: 30,
    },
    {
        id: 'booking4',
        userId: 'user2',
        serviceId: 'b2c3d4a1-e5f6-7890-1234-abcdef567890', // Peeling de Diamante
        professionalId: 'prof1', // Ana Silva
        date: new Date(new Date().setDate(new Date().getDate() - 5)),
        status: 'canceled',
        duration: 45,
    },
    {
        id: 'booking5',
        userId: 'user2',
        serviceId: 'c3d4a1b2-f6e5-0987-4321-abcdef098765', // Drenagem
        professionalId: 'prof2',
        date: new Date(new Date().setDate(new Date().getDate() + 10)),
        status: 'confirmed',
        duration: 60,
    }
];


// ==================
// AUTHENTICATION
// ==================
export const getCurrentUserSession = async () => {
    // To make the app usable, we'll simulate being logged in as a mock user.
    const mockClient = MOCK_USERS.find(u => u.role === Role.CLIENT);
    if (mockClient) {
        return {
            session: {
                user: {
                    id: mockClient.id,
                    email: mockClient.email,
                }
            }
        };
    }
    return { session: null };
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const user = MOCK_USERS.find(u => u.id === userId);
    return Promise.resolve(user || null);
};

export const signIn = async (email?: string, password?: string) => {
    if (!email || !password) return { user: null, error: { message: "Email and password are required." } };
    const user = MOCK_USERS.find(u => u.email === email); // Simplified login
    if (user) {
        return { user, error: null };
    }
    return { user: null, error: { message: "E-mail ou senha inválidos." } };
};

export const signUp = async (email?: string, password?: string, name?: string) => {
    if (!email || !password || !name) return { user: null, error: { message: "All fields are required." } };
    const newUser: User = {
        id: `user-${Date.now()}`,
        name,
        email,
        phone: '',
        cpf: '',
        role: Role.CLIENT,
        credits: {},
    };
    MOCK_USERS.push(newUser);
    return { user: { id: newUser.id, email: newUser.email }, error: null };
};

export const signOut = async () => {
    // In a mock environment, we don't need to do anything.
    return Promise.resolve();
};

export const sendPasswordResetEmail = async (email: string) => {
    alert(`(Simulação) Um link para redefinição de senha foi enviado para ${email}.`);
    return { data: {}, error: null };
}

// ==================
// SERVICES & PACKAGES
// ==================
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
    return Promise.resolve(MOCK_USERS);
};

export const getProfessionals = async (): Promise<User[]> => {
    return Promise.resolve(MOCK_USERS.filter(u => u.role === Role.STAFF));
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    const index = MOCK_USERS.findIndex(u => u.id === userId);
    if (index > -1) {
        MOCK_USERS[index] = { ...MOCK_USERS[index], ...updates };
        return MOCK_USERS[index];
    }
    return null;
};

export const addOrUpdateUser = async (user: User): Promise<User | null> => {
    const index = MOCK_USERS.findIndex(u => u.id === user.id);
    if (index > -1) {
        MOCK_USERS[index] = user;
    } else {
        MOCK_USERS.push(user);
    }
    return user;
};

// ==================
// CREDITS
// ==================
export const addCreditsToUser = async (userId: string, serviceId: string, quantity: number, sessionsPerPackage: number = 1): Promise<User | null> => {
    const user = await getUserProfile(userId);
    if (!user) return null;

    const totalCreditsToAdd = (sessionsPerPackage || 1) * quantity;
    const existingCredits = user.credits?.[serviceId] || 0;
    
    const newCredits = {
        ...user.credits,
        [serviceId]: existingCredits + totalCreditsToAdd,
    };
    
    return await updateUserProfile(userId, { credits: newCredits });
};

export const addPackageCreditsToUser = async (userId: string, pkg: ServicePackage): Promise<User | null> => {
    const user = await getUserProfile(userId);
    if (!user) return null;

    const newCredits = { ...(user.credits || {}) };

    pkg.services.forEach(item => {
        const existingCredits = newCredits[item.serviceId] || 0;
        newCredits[item.serviceId] = existingCredits + item.quantity;
    });

    return await updateUserProfile(userId, { credits: newCredits });
};

export const deductCreditFromUser = async (userId: string, serviceId: string): Promise<User | null> => {
    const user = await getUserProfile(userId);
    if (!user) return null;

    const existingCredits = user.credits?.[serviceId] || 0;
    if (existingCredits <= 0) return user; // Cannot go below zero

    const newCredits = {
        ...user.credits,
        [serviceId]: existingCredits - 1,
    };

    return await updateUserProfile(userId, { credits: newCredits });
};


// ==================
// BOOKINGS
// ==================
const mapBooking = (b: any): Booking => ({ ...b, date: new Date(b.date) });

export const getAllBookings = async (): Promise<Booking[]> => {
    return Promise.resolve(MOCK_BOOKINGS.map(mapBooking));
};

export const getUserBookings = async (userId: string): Promise<Booking[]> => {
    const userBookings = MOCK_BOOKINGS.filter(b => b.userId === userId);
    return Promise.resolve(userBookings.map(mapBooking));
};

export const addOrUpdateBooking = async (booking: Partial<Booking>): Promise<Booking | null> => {
    if (booking.id) { // Update
        const index = MOCK_BOOKINGS.findIndex(b => b.id === booking.id);
        if (index > -1) {
            MOCK_BOOKINGS[index] = { ...MOCK_BOOKINGS[index], ...booking } as Booking;
            return mapBooking(MOCK_BOOKINGS[index]);
        }
    }
    // Create
    const newBooking: Booking = {
        id: `booking-${Date.now()}`,
        ...booking,
    } as Booking;
    MOCK_BOOKINGS.push(newBooking);
    return mapBooking(newBooking);
};

// ==================
// REPORTS
// ==================
export const getSalesData = async (): Promise<Sale[]> => {
    const completedBookings = MOCK_BOOKINGS.filter(b => b.status === 'completed');
    
    return completedBookings.map((b: any) => {
        const service = MOCK_SERVICES.find(s => s.id === b.serviceId);
        const client = MOCK_USERS.find(u => u.id === b.userId);
        return {
            id: b.id,
            serviceName: service?.name || 'Serviço Desconhecido',
            clientName: client?.name || 'Cliente Desconhecido',
            amount: service?.price || 0,
            date: new Date(b.date),
        };
    });
};