
export enum Role {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
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
  imageUrl: string;
  category: string;
  sessions?: number;
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
  imageUrl: string;
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
