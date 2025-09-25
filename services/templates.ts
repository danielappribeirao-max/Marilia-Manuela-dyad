import { Service } from '../types';

// Omit 'id' as these are templates, not actual services in the DB
export type ServiceTemplate = Omit<Service, 'id'>;

export const individualServiceTemplates: ServiceTemplate[] = [
  {
    name: 'Limpeza de Pele Profunda',
    description: 'Tratamento facial completo para remover impurezas, cravos e células mortas, deixando a pele limpa e revitalizada. Inclui extração, alta frequência e máscara calmante.',
    price: 180,
    duration: 90,
    category: 'Facial',
    imageUrl: 'https://picsum.photos/seed/facialcleansing/400/300',
    sessions: 1,
  },
  {
    name: 'Massagem Modeladora',
    description: 'Técnica com movimentos rápidos e firmes que visa remodelar o contorno corporal, combater a celulite e a gordura localizada.',
    price: 150,
    duration: 60,
    category: 'Corporal',
    imageUrl: 'https://picsum.photos/seed/bodysculpting/400/300',
    sessions: 1,
  },
  {
    name: 'Design de Sobrancelhas com Henna',
    description: 'Modelagem de sobrancelhas de acordo com a simetria facial, utilizando pinça e finalização com henna para preencher falhas e realçar o olhar.',
    price: 75,
    duration: 45,
    category: 'Beleza do Olhar',
    imageUrl: 'https://picsum.photos/seed/eyebrowdesign/400/300',
    sessions: 1,
  },
  {
    name: 'Drenagem Linfática Pós-Operatório',
    description: 'Massagem suave e especializada para acelerar a recuperação pós-cirúrgica, reduzindo inchaço, edemas e aliviando o desconforto.',
    price: 160,
    duration: 60,
    category: 'Corporal',
    imageUrl: 'https://picsum.photos/seed/postsurgery/400/300',
    sessions: 1,
  },
];
