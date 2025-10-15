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
import PurchaseConfirmationModal from './components/PurchaseConfirmationModal';
import PackagePurchaseConfirmationModal from './components/PackagePurchaseConfirmationModal';
import PostPurchaseModal from './components/PostPurchaseModal';
import QuickRegistrationModal from './components/QuickRegistrationModal';
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
  addOrUpdateService: (service: Service) => Promise<Service | null>;
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
  updateClinicTexts: (texts: { heroText: string; aboutText: string }) => Promise<void>; // Adicionado
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
  // Inicializa com um objeto vazio para evitar null/undefined no contexto
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(api.DEFAULT_CLINIC_SETTINGS); 
  
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<{ service: Service, quantity: number } | null>(null);
  const [purchasePackageConfirmation, setPurchasePackageConfirmation] = useState<ServicePackage | null>(null);
  const [creditBookingService, setCreditBookingService] = useState<Service | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [postPurchaseService, setPostPurchaseService] = useState<Service | null>(null);
  
  // Novo estado para o fluxo de consulta gratuita
  const [isQuickRegisterModalOpen, setIsQuickRegisterModalOpen] = useState(false);
  const [tempClientData, setTempClientData] = useState<{ name: string; phone: string; description: string } | null>(null);

  const [showWhatsApp, setShowWhatsApp] = useState(false);
  
  // Inicialização com URLs que forçam o cache a ser ignorado
  const [logoUrl, setLogoUrl] = useState(api.getAssetUrl('logo-marilia-manuela.jpeg'));
  const [heroImageUrl, setHeroImageUrl] = useState(api.getAssetUrl('hero-image.jpeg'));
  const [aboutImageUrl, setAboutImageUrl] = useState(api.getAssetUrl('about-image.jpeg'));
  
  // Estado para forçar o recarregamento de dados administrativos (Agenda, Usuários)
  const [adminDataRefreshKey, setAdminDataRefreshKey] = useState(0);
  const refreshAdminData = useCallback(() => {
      setAdminDataRefreshKey(prev => prev + 1);
  }, []);


  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      try {
        const [servicesData, professionalsData, packagesData, settingsData, freeConsultationService] = await Promise.all([
          api.getServices(),
          api.getProfessionals(),
          api.getServicePackages(),
          api.getClinicSettings(),
          api.ensureFreeConsultationServiceExists(), // Busca ou cria o serviço de consulta gratuita
        ]);
        
        // Adiciona o serviço de consulta gratuita (se existir) à lista de serviços
        let allServices = servicesData || [];
        if (freeConsultationService) {
            // Remove qualquer versão antiga e adiciona a versão atualizada do banco no início
            allServices = allServices.filter(s => s.id !== FREE_CONSULTATION_SERVICE_ID);
            allServices.unshift(freeConsultationService);
        }
        
        setServices(allServices);
        setProfessionals(professionalsData || []);
        setPackages(packagesData || []);
        setClinicSettings(settingsData);

        const { session } = await api.getCurrentUserSession();
        if (session?.user) {
          const userProfile = await api.getUserProfile(session.user.id);
          if (userProfile) {
            setCurrentUser(userProfile);
            // Não redireciona aqui, o listener de auth faz isso
          }
        }
      } catch (error) {
        console.error("Error initializing app:", error);
        // Em caso de falha total, ainda usamos os padrões
        setClinicSettings(api.DEFAULT_CLINIC_SETTINGS);
      } finally {
        setLoading(false);
      }
    };
    initializeApp();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userProfile = await api.getUserProfile(session.user.id);
        if (userProfile) {
          setCurrentUser(userProfile);
          if (event === 'SIGNED_IN') {
            setCurrentPage(userProfile.role === Role.ADMIN ? Page.ADMIN_DASHBOARD : Page.USER_DASHBOARD);
          }
        }
      } else {
        setCurrentUser(null);
        setCurrentPage(Page.HOME);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
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

  const handlePurchaseOrBook = useCallback((service: Service, quantity: number) => {
    if (!currentUser) {
        setCurrentPage(Page.LOGIN);
        return;
    }
    setPurchaseConfirmation({ service, quantity });
  }, [currentUser]);
  
  const handlePurchasePackage = useCallback((pkg: ServicePackage) => {
    if (!currentUser) {
        setCurrentPage(Page.LOGIN);
        return;
    }
    setPurchasePackageConfirmation(pkg);
  }, [currentUser]);

  const handleConfirmPurchase = useCallback(async () => {
    if (!purchaseConfirmation || !currentUser) return;
    const { service, quantity } = purchaseConfirmation;
    
    // 1. Adiciona os créditos
    const updatedUser = await api.addCreditsToUser(currentUser.id, service.id, quantity, service.sessions);
    
    if (updatedUser) {
      setCurrentUser(updatedUser);
      
      // 2. Fecha o modal de confirmação de compra
      setPurchaseConfirmation(null);
      
      // 3. Abre o modal pós-compra
      setPostPurchaseService(service);
      
    } else {
      alert("Ocorreu um erro ao processar sua compra.");
      setPurchaseConfirmation(null);
    }
  }, [purchaseConfirmation, currentUser]);

  const handleConfirmPackagePurchase = useCallback(async () => {
    if (!purchasePackageConfirmation || !currentUser) return;
    const pkg = purchasePackageConfirmation;
    const updatedUser = await api.addPackageCreditsToUser(currentUser.id, pkg);
    if (updatedUser) {
      setCurrentUser(updatedUser);
      alert(`Compra do pacote "${pkg.name}" confirmada! Os créditos foram adicionados à sua conta.`);
    } else {
      alert("Ocorreu um erro ao processar sua compra.");
    }
    setPurchasePackageConfirmation(null);
  }, [purchasePackageConfirmation, currentUser]);

  const handleStartCreditBooking = useCallback((service: Service) => {
    if(currentUser) setCreditBookingService(service);
  }, [currentUser]);

  const handleStartReschedule = useCallback((booking: Booking) => {
    setReschedulingBooking(booking);
  }, []);
  
  // NOVO: Inicia o fluxo de consulta gratuita
  const handleStartFreeConsultation = useCallback(() => {
      const freeConsultationService = services.find(s => s.id === FREE_CONSULTATION_SERVICE_ID);
      if (!freeConsultationService) {
          alert("Serviço de consulta gratuita não encontrado.");
          return;
      }
      
      if (currentUser) {
          // Se o usuário estiver logado, pula o cadastro rápido e vai direto para o agendamento
          setBookingService(freeConsultationService);
      } else {
          // Se não estiver logado, abre o modal de cadastro rápido
          setIsQuickRegisterModalOpen(true);
      }
  }, [currentUser, services]);
  
  // NOVO: Lida com o cadastro rápido e abre o modal de agendamento
  const handleQuickRegisterAndBook = useCallback((data: { name: string; phone: string; description: string }) => {
      const freeConsultationService = services.find(s => s.id === FREE_CONSULTATION_SERVICE_ID);
      if (!freeConsultationService) {
          alert("Serviço de consulta gratuita não encontrado.");
          return;
      }
      setTempClientData(data);
      setIsQuickRegisterModalOpen(false);
      setBookingService(freeConsultationService);
  }, [services]);

  const handleConfirmFinalBooking = useCallback(async (details: { date: Date, professionalId: string }): Promise<boolean> => {
    if (!currentUser && !tempClientData) return false;
    
    const serviceToBook = bookingService || creditBookingService;
    if (!serviceToBook) return false;

    if (reschedulingBooking) {
      const updatedBooking = { ...reschedulingBooking, ...details, status: 'confirmed' as const };
      const result = await api.addOrUpdateBooking(updatedBooking);
      if(result) return true;
      return false;
    } else {
      // Se for agendamento normal (logado ou crédito)
      if (currentUser) {
          const newBooking: Omit<Booking, 'id'> = { 
              userId: currentUser.id, 
              serviceId: serviceToBook.id, 
              professionalId: details.professionalId, 
              date: details.date, 
              status: 'confirmed', 
              duration: serviceToBook.duration,
              serviceName: serviceToBook.name,
          };
          const result = await api.addOrUpdateBooking(newBooking);
          
          // Dedução de crédito
          if (result && creditBookingService) {
            const updatedUser = await api.deductCreditFromUser(currentUser.id, creditBookingService.id);
            if (updatedUser) setCurrentUser(updatedUser);
          }
          return !!result;
          
      } else if (tempClientData && serviceToBook.id === FREE_CONSULTATION_SERVICE_ID) {
          // Fluxo de Consulta Gratuita para Novo Usuário
          const result = await api.bookFreeConsultationForNewUser({
              name: tempClientData.name,
              phone: tempClientData.phone,
              description: tempClientData.description,
              date: details.date,
              professionalId: details.professionalId,
              serviceId: serviceToBook.id,
              serviceName: serviceToBook.name,
              duration: serviceToBook.duration,
          });
          
          if (result.success) {
              // Força o recarregamento dos dados administrativos para que o AdminAgenda veja o novo agendamento
              refreshAdminData();
              return true;
          } else {
              // O erro já foi alertado dentro da Edge Function ou na chamada da API
              return false;
          }
      }
    }
    return false;
  }, [currentUser, bookingService, creditBookingService, reschedulingBooking, tempClientData, refreshAdminData]);

  const handleCloseModals = () => {
    setBookingService(null);
    setPurchaseConfirmation(null);
    setPurchasePackageConfirmation(null);
    setCreditBookingService(null);
    setReschedulingBooking(null);
    setPostPurchaseService(null);
    setIsQuickRegisterModalOpen(false);
    setTempClientData(null); // Limpa dados temporários
  };
  
  const handleScheduleNow = () => {
      if (postPurchaseService) {
          setCreditBookingService(postPurchaseService);
          setPostPurchaseService(null);
      }
  };
  
  const handleScheduleLater = () => {
      setPostPurchaseService(null);
      setCurrentPage(Page.USER_DASHBOARD);
  };

  const addOrUpdateService = useCallback(async (service: Service) => {
    const savedService = await api.addOrUpdateService(service);
    if (savedService) {
      setServices(prevServices => {
        const isExisting = prevServices.some(s => s.id === savedService.id);
        if (isExisting) {
          return prevServices.map(s => s.id === savedService.id ? savedService : s);
        }
        // Adiciona o novo serviço
        return [...prevServices, savedService];
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
        refreshAdminData(); // Força o recarregamento da agenda
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
        refreshAdminData(); // Força o recarregamento da agenda
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
  
  const updateClinicTexts = useCallback(async (texts: { heroText: string; aboutText: string }) => {
    const updatedSettings = await api.updateClinicTexts(texts);
    if (updatedSettings) {
        setClinicSettings(updatedSettings);
        alert("Textos da página inicial atualizados com sucesso!");
    } else {
        alert("Erro ao atualizar textos da página inicial.");
    }
  }, []);

  const appContextValue = useMemo(() => ({ currentUser, setCurrentUser, currentPage, setCurrentPage, logout, services, setServices, packages, setPackages, professionals, addOrUpdateService, deleteService, addOrUpdatePackage, deletePackage, loading, logoUrl, setLogoUrl, heroImageUrl, setHeroImageUrl, aboutImageUrl, setAboutImageUrl, clinicSettings, updateClinicSettings, updateClinicHolidayExceptions, updateFeaturedServices, updateClinicTexts, refreshAdminData }), [currentUser, currentPage, logout, services, setServices, packages, setPackages, professionals, addOrUpdateService, deleteService, addOrUpdatePackage, deletePackage, loading, logoUrl, heroImageUrl, aboutImageUrl, clinicSettings, updateClinicSettings, updateClinicHolidayExceptions, updateFeaturedServices, updateClinicTexts, refreshAdminData]);

  const renderPage = () => {
    if(loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div></div>
    }
    switch (currentPage) {
      case Page.HOME: return <HomePage onPurchaseOrBook={handlePurchaseOrBook} onPurchasePackage={handlePurchasePackage} onStartFreeConsultation={handleStartFreeConsultation} />;
      case Page.SERVICES: return <ServicesPage onPurchaseOrBook={handlePurchaseOrBook} onPurchasePackage={handlePurchasePackage} />;
      case Page.LOGIN: return <LoginPage />;
      case Page.USER_DASHBOARD: return <UserDashboardPage onBookWithCredit={handleStartCreditBooking} onReschedule={handleStartReschedule} />;
      case Page.ADMIN_DASHBOARD: return <AdminDashboardPage adminDataRefreshKey={adminDataRefreshKey} />;
      default: return <HomePage onPurchaseOrBook={handlePurchaseOrBook} onPurchasePackage={handlePurchasePackage} onStartFreeConsultation={handleStartFreeConsultation} />;
    }
  };

  const serviceForBookingModal = bookingService || creditBookingService || (reschedulingBooking ? services.find(s => s.id === reschedulingBooking.serviceId) : null);

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
            isCreditBooking={!!creditBookingService} 
            onConfirmBooking={handleConfirmFinalBooking} 
            professionals={professionals} 
            clinicOperatingHours={clinicSettings.operatingHours} 
            clinicHolidayExceptions={clinicSettings.holidayExceptions}
            tempClientData={tempClientData} // Passa os dados temporários
        />}
        {purchaseConfirmation && <PurchaseConfirmationModal service={purchaseConfirmation.service} quantity={purchaseConfirmation.quantity} onConfirm={handleConfirmPurchase} onClose={handleCloseModals} />}
        {purchasePackageConfirmation && <PackagePurchaseConfirmationModal servicePackage={purchasePackageConfirmation} services={services} onConfirm={handleConfirmPackagePurchase} onClose={handleCloseModals} />}
        {postPurchaseService && <PostPurchaseModal service={postPurchaseService} onScheduleNow={handleScheduleNow} onScheduleLater={handleScheduleLater} />}
        {isQuickRegisterModalOpen && <QuickRegistrationModal onClose={handleCloseModals} onRegister={handleQuickRegisterAndBook} />}
        <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className={`fixed bottom-6 right-6 bg-green-500 rounded-full p-3 shadow-lg hover:bg-green-600 transition-transform duration-300 transform ${showWhatsApp ? 'scale-100' : 'scale-0'}`} aria-label="Contact us on WhatsApp"><WhatsAppIcon /></a>
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
      <AppContent />
  );
}