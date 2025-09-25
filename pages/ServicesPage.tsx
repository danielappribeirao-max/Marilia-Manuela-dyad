
import React, { useState, useMemo } from 'react';
import { Service, ServicePackage } from '../types';
import ServiceCard from '../components/ServiceCard';
import PackageCard from '../components/PackageCard';
import { useApp } from '../App';

interface ServicesPageProps {
    onPurchaseOrBook: (service: Service, quantity: number) => void;
    onPurchasePackage: (pkg: ServicePackage) => void;
}

export default function ServicesPage({ onPurchaseOrBook, onPurchasePackage }: ServicesPageProps) {
    const { services, packages } = useApp();
    const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = useMemo(() => 
        ['Todos', ...new Set(services.map(s => s.category))], 
    [services]);

    const filteredServices = useMemo(() => {
        let filtered = services;

        if (selectedCategory !== 'Todos') {
            filtered = filtered.filter(s => s.category === selectedCategory);
        }

        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(s => 
                s.name.toLowerCase().includes(lowercasedQuery) || 
                s.description.toLowerCase().includes(lowercasedQuery)
            );
        }
        
        return filtered;
    }, [selectedCategory, searchQuery, services]);

    const TabButton: React.FC<{tab: 'services' | 'packages', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3 rounded-t-lg font-bold text-lg transition-colors duration-300 focus:outline-none ${
                activeTab === tab 
                ? 'bg-white text-pink-600' 
                : 'bg-gray-100 text-gray-500 hover:bg-white'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-gray-100 py-16">
            <div className="container mx-auto px-6">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Nossos Procedimentos e Pacotes</h1>
                <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">Explore nossa gama completa de tratamentos e pacotes especiais, todos realizados com a máxima segurança e excelência.</p>
                
                <div className="border-b-2 border-gray-200 flex justify-center">
                    <TabButton tab="services" label="Serviços Individuais" />
                    <TabButton tab="packages" label="Pacotes Especiais" />
                </div>
                
                <div className="bg-white p-8 md:p-12 rounded-b-lg shadow-lg">
                    {activeTab === 'services' && (
                        <div>
                             <div className="mb-10 max-w-2xl mx-auto">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou descrição..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-shadow"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center flex-wrap gap-3 mb-12">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-6 py-2 rounded-full font-semibold transition-colors duration-300 ${
                                            selectedCategory === category 
                                            ? 'bg-pink-500 text-white shadow-md' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-pink-100'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>

                            {filteredServices.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {filteredServices.map(service => (
                                        <ServiceCard key={service.id} service={service} onPurchaseOrBook={onPurchaseOrBook} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <h3 className="text-2xl font-semibold text-gray-700">Nenhum serviço encontrado</h3>
                                    <p className="text-gray-500 mt-2">Tente ajustar sua busca ou remover os filtros.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'packages' && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {packages.map(pkg => (
                                    <PackageCard key={pkg.id} servicePackage={pkg} onPurchase={onPurchasePackage} services={services} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
