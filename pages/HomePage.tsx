import React from 'react';
import { Service, ServicePackage } from '../types';
import ServiceCard from '../components/ServiceCard';
import PackageCard from '../components/PackageCard';
import { useApp } from '../App';
import { Page } from '../types';

interface HomePageProps {
    onPurchaseOrBook: (service: Service, quantity: number) => void;
    onPurchasePackage: (pkg: ServicePackage) => void;
}

export default function HomePage({ onPurchaseOrBook, onPurchasePackage }: HomePageProps) {
  const { setCurrentPage, services, packages, heroImageUrl, aboutImageUrl } = useApp();
  const featuredServices = services.slice(0, 3);
  const featuredPackages = packages.slice(0, 2);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-cover bg-center h-[60vh] text-white" style={{ backgroundImage: `url('${heroImageUrl}')` }}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative container mx-auto px-6 h-full flex flex-col justify-center items-start">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">Sua Beleza, Nosso Compromisso.</h1>
          <p className="mt-4 text-xl max-w-lg">Descubra tratamentos estéticos de ponta e agende seu momento de cuidado em um ambiente de luxo e bem-estar.</p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button 
              onClick={() => setCurrentPage(Page.SERVICES)}
              className="px-8 py-3 bg-pink-500 text-white rounded-full font-semibold text-lg hover:bg-pink-600 transition-transform hover:scale-105 duration-300 shadow-lg">
              Ver Procedimentos
            </button>
            <button 
              onClick={() => setCurrentPage(Page.FREE_CONSULTATION)}
              className="px-8 py-3 bg-white text-pink-500 rounded-full font-semibold text-lg hover:bg-gray-100 transition-transform hover:scale-105 duration-300 shadow-lg border border-pink-500">
              Agende sua Consulta Gratuita
            </button>
          </div>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="py-20 bg-pink-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-2">Tratamentos em Destaque</h2>
          <p className="text-center text-gray-600 mb-12">Os procedimentos mais amados por nossas clientes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {featuredServices.map(service => (
              <ServiceCard key={service.id} service={service} onPurchaseOrBook={onPurchaseOrBook} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Packages Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-2">Pacotes Especiais</h2>
          <p className="text-center text-gray-600 mb-12">Combinações perfeitas de tratamentos com preços especiais para você.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {featuredPackages.map(pkg => (
              <PackageCard key={pkg.id} servicePackage={pkg} onPurchase={onPurchasePackage} services={services} />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-pink-50">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
                <img src={aboutImageUrl} alt="Interior da clínica" className="rounded-lg shadow-xl"/>
            </div>
            <div className="md:w-1/2">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">Bem-vinda à Marília Manuela</h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                    Na Marília Manuela, acreditamos que a estética vai além da aparência. É sobre bem-estar, autoestima e o prazer de se cuidar. Nossa equipe de especialistas utiliza as tecnologias mais avançadas e produtos de alta qualidade para oferecer resultados excepcionais com segurança e conforto.
                </p>
                <p className="text-gray-600 leading-relaxed">
                    Convidamos você a viver uma experiência única de transformação e relaxamento.
                </p>
            </div>
        </div>
      </section>
    </div>
  );
}