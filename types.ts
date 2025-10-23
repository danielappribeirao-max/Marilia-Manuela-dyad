export enum Role {
  CLIENT = 'user',
  ADMIN = 'admin',
  STAFF = 'staff',
}

export enum Page {
  HOME = 'HOME',
  SERVICES = 'SERVICES',
  LOGIN = 'LOGIN',
  USER_DASHBOARD = 'USER_DASHBOARD',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  role: Role;
  credits?: { [serviceId: string]: number };
  avatarUrl?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  image: string;
  category: string;
  sessions?: number;
  order?: number; // NOVO: Posição de ordenação
}

export interface ServiceInPackage {
  serviceId: string;
  quantity: number; // Number of sessions for this service in the package
}

export interface ServicePackage {
  id:string;
  name: string;
  description: string;
  services: ServiceInPackage[];
  price: number;
  image: string;
}

export interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  professionalId: string;
  date: Date;
  status: 'confirmed' | 'completed' | 'canceled';
  rating?: number;
  comment?: string;
  duration?: number; // in minutes
}

// NOVO: Tipos para Agendamentos Recorrentes
export interface RecurringBooking {
  id: string;
  userId: string | null;
  serviceId: string;
  professionalId: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number; // in minutes
  rrule: string; // RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO;COUNT=10")
  status: 'active' | 'suspended' | 'completed';
}

export enum RecurrenceFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface Availability {
  [date: string]: string[]; // e.g., "2024-07-28": ["09:00", "10:00"]
}

export interface Sale {
  id: string;
  serviceName: string;
  clientName: string;
  amount: number;
  date: Date;
}

export interface DayOperatingHours {
  open: boolean;
  start?: string; // HH:MM
  end?: string; // HH:MM
  lunchStart?: string; // HH:MM
  lunchEnd?: string; // HH:MM
}

export interface OperatingHours {
  [dayOfWeek: number]: DayOperatingHours; // 0 = Sunday, 6 = Saturday
}

export interface HolidayException extends DayOperatingHours {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface ClinicSettings {
  id: string;
  operatingHours: OperatingHours;
  holidayExceptions?: HolidayException[];
  featuredServiceIds?: string[]; // NOVO: IDs dos serviços em destaque
  heroText: string; // Texto principal da home
  heroSubtitle: string; // NOVO: Subtítulo da home
  aboutText: string; // Texto da seção sobre
}