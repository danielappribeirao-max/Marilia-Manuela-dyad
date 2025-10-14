import { Service } from './types';

export const FREE_CONSULTATION_SERVICE_ID = '00000000-0000-0000-0000-000000000000';

export const FREE_CONSULTATION_SERVICE: Service = {
    id: FREE_CONSULTATION_SERVICE_ID,
    name: 'Consulta de Avaliação Gratuita',
    description: 'Avaliação inicial sem custo com um de nossos especialistas.',
    duration: 30,
    price: 0.00,
    imageUrl: 'https://picsum.photos/seed/freeconsult/400/300',
    category: 'Avaliação',
    sessions: 1,
};