import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { User, Role, Page, Service, Booking, ServicePackage, ClinicSettings, OperatingHours, HolidayException } from './types';
import * as api from './services/api';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import LoginPage from './pages/LoginPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BookingModal from './components/BookingModal';
import QuickRegistrationModal from './components/QuickRegistrationModal';
import PackageBookingSelectionModal from './components/PackageBookingSelectionModal'; // Importado
import { supabase } from './supabase/client';
import { FREE_CONSULTATION_SERVICE_ID } from './constants';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  logout: () => void;
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  packages: ServicePackage[];
  setPackages: React.Dispatch<React.SetStateAction<ServicePackage[]>>;
  professionals: User[];
  addOrUpdateService: (service: Partial<Service>) => Promise<Service | null>;
  deleteService: (serviceId: string) => Promise<void>;
  addOrUpdatePackage: (pkg: ServicePackage) => Promise<ServicePackage | null>;
  deletePackage: (packageId: string) => Promise<void>;
  loading: boolean;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  heroImageUrl: string;
  setHeroImageUrl: (url: string) => void;
  aboutImageUrl: string;
  setAboutImageUrl: (url: string) => void;
  clinicSettings: ClinicSettings;
  updateClinicSettings: (hours: OperatingHours) => Promise<void>;
  updateClinicHolidayExceptions: (exceptions: HolidayException[]) => Promise<void>;
  updateFeaturedServices: (serviceIds: string[]) => Promise<void>;
  updateClinicTexts: (texts: { heroText: string; heroSubtitle: string; aboutText: string }) => Promise<void>;
  refreshAdminData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-white"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
);

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [loading, setLoading] = useState(true);
  
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(api.DEFAULT_CLINIC_SETTINGS); 
  
  // Estado para o serviço a ser agendado (substitui bookingService e creditBookingService)
  const [serviceToBook, setServiceToBook] = useState<Service | null>(null); 
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  
  const [isQuickRegisterModalOpen, setIsQuickRegisterModalOpen] = useState(false);
  // O tempClientData agora só precisa de nome e telefone, a descrição é gerada
  const [tempClientData, setTempClientData] = useState<{ name: string; phone: string; description: string } | null>(null);
  const [newlyCreatedUserEmail, setNewlyCreatedUserEmail] = useState<string | null>(null);
  
  // NOVO: Estado para seleção de serviço dentro do pacote
  const [packageToSelectService, setPackageToSelectService] = useState<ServicePackage | null>(null);

  const [showWhatsApp, setShowWhatsApp] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState(api.getAssetUrl('logo.jpeg'));
  const [heroImageUrl, setHeroImageUrl] = useState(api.getAssetUrl('hero-image.jpeg'));
  const [aboutImageUrl, setAboutImageUrl] = useState(api.getAssetUrl('about-image.jpeg'));
  
  const [adminDataRefreshKey, setAdminDataRefreshKey] = useState(0);
  const refreshAdminData = useCallback(() => {
      setAdminDataRefreshKey(prev => prev + 1);
  }, []);

  const fetchAndSetUser = useCallback(async (userId: string) => {
      const userProfile = await api.getUserProfile(userId);
      if (userProfile) {
          setCurrentUser(userProfile);
          return userProfile;
      }
      return null;
  }, []);

  // --- Efeito de Inicialização ---
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      let servicesData: Service[] | null = null;
      let professionalsData: User[] | null = null;
      let packagesData: ServicePackage[] | null = null;
      let settingsData: ClinicSettings = api.DEFAULT_CLINIC_SETTINGS;

      try {
        [servicesData, professionalsData, packagesData, settingsData] = await Promise.all([
          api.getServices(),
          api.getProfessionals(),
          api.getServicePackages(),
          api.getClinicSettings(),
        ]);
        
        // A lista de serviços agora vem diretamente do banco, ordenada pelo campo 'order'
        setServices(servicesData || []);
        setProfessionals(professionalsData || []);
        setPackages(packagesData || []);
        setClinicSettings(settingsData);

        // Atualiza URLs de imagem (sem timestamp)
        setLogoUrl(api.getAssetUrl('logo.jpeg'));
        setHeroImageUrl(api.getAssetUrl('hero-image.jpeg'));
        setAboutImageUrl(api.getAssetUrl('about-image.jpeg'));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userProfile = await fetchAndSetUser(session.user.id);
          if (userProfile) {
            setCurrentPage(userProfile.role === Role.ADMIN ? Page.ADMIN_DASHBOARD : Page.USER_DASHBOARD);
          }
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        // Garante que o estado de carregamento seja falso e use defaults
        setClinicSettings(settingsData); 
        setServices(servicesData || []);
        setProfessionals(professionalsData || []);
        setPackages(packagesData || []);
        alert("Erro ao carregar dados iniciais. Verifique a conexão com o Supabase.");
      } finally {
        setLoading(false);
      }
    };
    initializeApp();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth Event: ${event}`);
      if (session?.user) {
        const userProfile = await fetchAndSetUser(session.user.id);
        
        if (userProfile) {
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            handleCloseModals(); 
            setCurrentPage(userProfile.role === Role.ADMIN ? Page.ADMIN_DASHBOARD : Page.USER_DASHBOARD);
          }
        } else {
            if (event === 'SIGNED_IN') {
                console.error("Profile not found after sign in. Forcing redirect to login.");
                await api.signOut();
                setCurrentPage(Page.LOGIN); 
            }
        }
      } else {
        setCurrentUser(null);
        if (currentPage !== Page.LOGIN) {
            setCurrentPage(Page.HOME);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchAndSetUser]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setShowWhatsApp(true);
      else setShowWhatsApp(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const logout = useCallback(async () => {
    const { error } = await api.signOut();
    if (error) {
      alert(`Ocorreu um erro ao sair: ${error.message}`);
      console.error("Logout error:", error);
    } else {
      setCurrentUser(null);
      setCurrentPage(Page.HOME);
    }
  }, []);

  const handleCloseModals = () => {
    setServiceToBook(null);
    setReschedulingBooking(null);
    setIsQuickRegisterModalOpen(false);
    setTempClientData(null); // Limpa dados temporários
    setNewlyCreatedUserEmail(null);
    setPackageToSelectService(null); // Limpa o pacote selecionado
  };

  // --- NOVO FLUXO DE AGENDAMENTO UNIFICADO ---
  const handleBookService = useCallback((service: Service) => {
      if (!currentUser) {
          // Se não estiver logado, abre o modal de cadastro rápido
          setServiceToBook(service);
          setIsQuickRegisterModalOpen(true);
      } else {
          // Se estiver logado, abre o modal de agendamento direto
          setServiceToBook(service);
      }
  }, [currentUser]);
  
  const handleBookPackage = useCallback((pkg: ServicePackage) => {
      // Abre o modal de seleção de serviço dentro do pacote
      setPackageToSelectService(pkg);
  }, []);
  
  const handleSelectServiceFromPackage = useCallback((service: Service) => {
      setPackageToSelectService(null); // Fecha o modal de seleção
      handleBookService(service); // Inicia o fluxo de agendamento para o serviço escolhido
  }, [handleBookService]);
  
  const handleStartFreeConsultation = useCallback(() => {
      // Busca o primeiro serviço com preço 0 (o novo serviço de consulta)
      const freeConsultationService = services.find(s => s.price === 0);
      if (!freeConsultationService) {
          alert("Serviço de consulta gratuita não encontrado. Por favor, cadastre um serviço com preço R$ 0,00.");
          return;
      }
      handleBookService(freeConsultationService);
  }, [services, handleBookService]);
  
  const handleStartReschedule = useCallback((booking: Booking) => {
    setReschedulingBooking(booking);
  }, []);
  
  const handleQuickRegisterAndBook = useCallback((data: { name: string; phone: string; description: string }) => {
      if (!serviceToBook) return;
      
      // A descrição é passada aqui, seja o interesse (consulta gratuita) ou o nome do serviço (serviço pago)
      setTempClientData(data);
      setIsQuickRegisterModalOpen(false);
      // O modal de agendamento será aberto automaticamente porque serviceToBook está definido
  }, [serviceToBook]);

  const handleConfirmFinalBooking = useCallback(async (details: { date: Date, professionalId: string }): Promise<{ success: boolean, error: string | null }> => {
    const serviceToUse = serviceToBook || (reschedulingBooking ? services.find(s => s.id === reschedulingBooking.serviceId) : null);
    if (!serviceToUse) return { success: false, error: "Serviço não selecionado." };

    if (reschedulingBooking) {
      // 1. Reagendamento (Usuário logado)
      const updatedBooking = { ...reschedulingBooking, ...details, status: 'confirmed' as const };
      const result = await api.addOrUpdateBooking(updatedBooking);
      if(result) return { success: true, error: null };
      return { success: false, error: "Falha ao reagendar." };
    } else if (currentUser) {
      // 2. Novo Agendamento (Usuário logado)
      const newBooking: Omit<Booking, 'id'> = { 
          userId: currentUser.id, 
          serviceId: serviceToUse.id, 
          professionalId: details.professionalId, 
          date: details.date, 
          status: 'confirmed', 
          duration: serviceToUse.duration,
          serviceName: serviceToUse.name,
      };
      const result = await api.addOrUpdateBooking(newBooking);
      
      // Não há dedução de crédito, pois não há compra/crédito no novo fluxo
      return { success: !!result, error: result ? null : "Falha ao criar agendamento." };
          
    } else if (tempClientData) {
        // 3. Novo Agendamento (Usuário não logado via Cadastro Rápido)
        const result = await api.bookServiceForNewUser({
            name: tempClientData.name,
            phone: tempClientData.phone,
            description: tempClientData.description, // Usa a descrição (interesse ou nome do serviço)
            date: details.date,
            professionalId: details.professionalId,
            serviceId: serviceToUse.id,
            serviceName: serviceToUse.name,
            duration: serviceToUse.duration,
        });
        
        if (result.success) {
            // Limpa tempClientData e define newlyCreatedUserEmail
            setTempClientData(null);
            if (result.tempEmail) {
                setNewlyCreatedUserEmail(result.tempEmail);
            }
            refreshAdminData();
            return { success: true, error: null };
        } else {
            // Se falhar, mantemos tempClientData para que o usuário possa tentar novamente
            return { success: false, error: result.error };
        }
    }
    return { success: false, error: "Erro desconhecido no fluxo de agendamento." };
  }, [currentUser, serviceToBook, reschedulingBooking, tempClientData, services, refreshAdminData]);
  // ------------------------------------------------------------------

  const addOrUpdateService = useCallback(async (service: Partial<Service>) => {
    const savedService = await api.addOrUpdateService(service);
    if (savedService) {
      setServices(prevServices => {
        const isExisting = prevServices.some(s => s.id === savedService.id);
        let newServices;
        if (isExisting) {
          newServices = prevServices.map(s => s.id === savedService.id ? savedService : s);
        } else {
          newServices = [...prevServices, savedService];
        }
        return newServices.sort((a, b) => (a.order || 0) - (b.order || 0));
      });
    }
    return savedService;
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    await api.deleteService(serviceId);
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
  }, []);
  
  const addOrUpdatePackage = useCallback(async (pkg: ServicePackage) => {
    const savedPackage = await api.addOrUpdatePackage(pkg);
    if (savedPackage) {
        setPackages(prevPackages => {
            const isExisting = prevPackages.some(p => p.id === savedPackage.id);
            if (isExisting) {
                return prevPackages.map(p => p.id === savedPackage.id ? savedPackage : p);
            }
            return [...prevPackages, savedPackage];
        });
    }
    return savedPackage;
  }, []);
  
  const deletePackage = useCallback(async (packageId: string) => {
    await api.deletePackage(packageId);
    setPackages(prevPackages => prevPackages.filter(p => p.id !== packageId));
  }, []);
  
  const updateClinicSettings = useCallback(async (operatingHours: OperatingHours) => {
    const updatedSettings = await api.updateClinicOperatingHours(operatingHours);
    if (updatedSettings) {
        setClinicSettings(updatedSettings);
        alert("Horários de funcionamento atualizados com sucesso!");
        refreshAdminData();
    } else {
        console.error("Falha ao atualizar configurações da clínica. Verifique os logs da API para detalhes.");
        alert("Erro ao atualizar horários de funcionamento.");
    }
  }, [refreshAdminData]);

  const updateClinicHolidayExceptions = useCallback(async (exceptions: HolidayException[]) => {
    const updatedSettings = await api.updateClinicHolidayExceptions(exceptions);
    if (updatedSettings) {
        setClinicSettings(updatedSettings);
        alert("Exceções de feriados atualizadas com sucesso!");
        refreshAdminData();
    } else {
        alert("Erro ao atualizar exceções de feriados.");
    }
  }, [refreshAdminData]);
  
  const updateFeaturedServices = useCallback(async (serviceIds: string[]) => {
    const updatedSettings = await api.updateFeaturedServices(serviceIds);
    if (updatedSettings) {
        setClinicSettings(updatedSettings);
        alert("Serviços em destaque atualizados com sucesso!");
    } else {
        alert("Erro ao atualizar serviços em destaque.");
    }
  }, []);
  
  const updateClinicTexts = useCallback(async (texts: { heroText: string; heroSubtitle: string; aboutText: string }) => {
    const updatedSettings = await api.updateClinicTexts(texts);
    if (updatedSettings) {
        setClinicSettings(updatedSettings); // ATUALIZA O ESTADO LOCAL IMEDIATAMENTE
        alert("Textos da página inicial atualizados com sucesso!");
        refreshAdminData(); 
    } else {
        alert("Erro ao atualizar textos da página inicial.");
    }
  }, [refreshAdminData]);

  const appContextValue = useMemo(() => ({ currentUser, setCurrentUser, currentPage, setCurrentPage, logout, services, setServices, packages, setPackages, professionals, addOrUpdateService, deleteService, addOrUpdatePackage, deletePackage, loading, logoUrl, setLogoUrl, heroImageUrl, setHeroImageUrl, aboutImageUrl, setAboutImageUrl, clinicSettings, updateClinicSettings, updateClinicHolidayExceptions, updateFeaturedServices, updateClinicTexts, refreshAdminData }), [currentUser, currentPage, logout, services, setServices, packages, setPackages, professionals, addOrUpdateService, deleteService, addOrUpdatePackage, deletePackage, loading, logoUrl, heroImageUrl, aboutImageUrl, clinicSettings, updateClinicSettings, updateClinicHolidayExceptions, updateFeaturedServices, updateClinicTexts, refreshAdminData]);

  const renderPage = () => {
    if(loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div></div>
    }
    switch (currentPage) {
      case Page.HOME: return <HomePage onBook={handleBookService} onStartFreeConsultation={handleStartFreeConsultation} onBookPackage={handleBookPackage} />;
      case Page.SERVICES: return <ServicesPage onBook={handleBookService} onBookPackage={handleBookPackage} />;
      case Page.LOGIN: return <LoginPage />;
      case Page.USER_DASHBOARD: return <UserDashboardPage onBookWithCredit={handleBookService} onReschedule={handleStartReschedule} />;
      case Page.ADMIN_DASHBOARD: return <AdminDashboardPage adminDataRefreshKey={adminDataRefreshKey} />;
      default: return <HomePage onBook={handleBookService} onStartFreeConsultation={handleStartFreeConsultation} onBookPackage={handleBookPackage} />;
    }
  };

  const serviceForBookingModal = serviceToBook || (reschedulingBooking ? services.find(s => s.id === reschedulingBooking.serviceId) : null);

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">{renderPage()}</main>
        <Footer />
        {serviceForBookingModal && <BookingModal 
            service={serviceForBookingModal} 
            booking={reschedulingBooking} 
            onClose={handleCloseModals} 
            isCreditBooking={false} // Sempre false agora
            onConfirmBooking={handleConfirmFinalBooking} 
            professionals={professionals} 
            clinicOperatingHours={clinicSettings.operatingHours} 
            clinicHolidayExceptions={clinicSettings.holidayExceptions}
            tempClientData={tempClientData} 
            newlyCreatedUserEmail={newlyCreatedUserEmail}
        />}
        {isQuickRegisterModalOpen && serviceToBook && <QuickRegistrationModal 
            service={serviceToBook} // Passa o serviço
            onClose={handleCloseModals} 
            onRegister={handleQuickRegisterAndBook} 
        />}
        
        {/* NOVO MODAL DE SELEÇÃO DE SERVIÇO DO PACOTE */}
        {packageToSelectService && (
            <PackageBookingSelectionModal
                pkg={packageToSelectService}
                services={services}
                onClose={handleCloseModals}
                onSelectService={handleSelectServiceFromPackage}
            />
        )}
        
        <a href="https://wa.me/5516993140852" target="_blank" rel="noopener noreferrer" className={`fixed bottom-6 right-6 bg-green-500 rounded-full p-3 shadow-lg hover:bg-green-600 transition-transform duration-300 transform ${showWhatsApp ? 'scale-100' : 'scale-0'}`} aria-label="Contact us on WhatsApp"><WhatsAppIcon /></a>
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
      <AppContent />
  );
}