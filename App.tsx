import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { User, Role, Page, Service, Booking, ServicePackage, ClinicSettings, OperatingHours } from './types';
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
import { supabase } from './supabase/client';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  logout: () => void;
  services: Service[];
  packages: ServicePackage[];
  professionals: User[];
  addOrUpdateService: (service: Service) => Promise<Service | null>;
  deleteService: (serviceId: string) => Promise<void>;
  loading: boolean;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  heroImageUrl: string;
  setHeroImageUrl: (url: string) => void;
  aboutImageUrl: string;
  setAboutImageUrl: (url: string) => void;
  clinicSettings: ClinicSettings | null;
  updateClinicSettings: (hours: OperatingHours) => Promise<void>;
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [loading, setLoading] = useState(true);
  
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);
  
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<{ service: Service, quantity: number } | null>(null);
  const [purchasePackageConfirmation, setPurchasePackageConfirmation] = useState<ServicePackage | null>(null);
  const [creditBookingService, setCreditBookingService] = useState<Service | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);

  const [showWhatsApp, setShowWhatsApp] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState('https://mdxqiozhqmcriiqspbqf.supabase.co/storage/v1/object/public/assets/logo-marilia-manuela.jpeg');
  const [heroImageUrl, setHeroImageUrl] = useState('https://picsum.photos/seed/spa/1600/900');
  const [aboutImageUrl, setAboutImageUrl] = useState('https://picsum.photos/seed/clinic/600/400');


  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      try {
        const [servicesData, professionalsData, packagesData, settingsData] = await Promise.all([
          api.getServices(),
          api.getProfessionals(),
          api.getServicePackages(),
          api.getClinicSettings(),
        ]);
        setServices(servicesData || []);
        setProfessionals(professionalsData || []);
        setPackages(packagesData || []);
        setClinicSettings(settingsData);

        const { session } = await api.getCurrentUserSession();
        if (session?.user) {
          const userProfile = await api.getUserProfile(session.user.id);
          if (userProfile) {
            setCurrentUser(userProfile);
            // Don't auto-navigate on initial load, let user stay on the page they loaded
          }
        }
      } catch (error) {
        console.error("Error initializing app:", error);
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
          // Only redirect to dashboard on initial sign-in
          if (event === 'SIGNED_IN') {
            setCurrentPage(userProfile.role === Role.ADMIN ? Page.ADMIN_DASHBOARD : Page.USER_DASHBOARD);
          }
        }
      } else {
        // This handles SIGNED_OUT
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
      // Manually update state for immediate UI feedback
      setCurrentUser(null);
      setCurrentPage(Page.HOME);
    }
  }, [setCurrentUser, setCurrentPage]);

  const handlePurchaseOrBook = useCallback((service: Service, quantity: number) => {
    if (!currentUser) {
        setCurrentPage(Page.LOGIN);
        return;
    }
    if ((service.sessions && service.sessions > 1) || quantity > 1) {
      setPurchaseConfirmation({ service, quantity });
    } else {
      setBookingService(service);
    }
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
    const updatedUser = await api.addCreditsToUser(currentUser.id, service.id, quantity, service.sessions);
    if (updatedUser) {
      setCurrentUser(updatedUser);
       const sessionsPerPackage = service.sessions || 1;
       const totalCreditsAdded = sessionsPerPackage * quantity;
      alert(`Compra de ${quantity} pacote(s) de ${service.name} confirmada! ${totalCreditsAdded} créditos foram adicionados à sua conta.`);
    } else {
      alert("Ocorreu um erro ao processar sua compra.");
    }
    setPurchaseConfirmation(null);
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

  const handleConfirmFinalBooking = useCallback(async (details: { date: Date, professionalId: string }) => {
    if (!currentUser) return false;
    let success = false;
    if (reschedulingBooking) {
      const updatedBooking = { ...reschedulingBooking, ...details, status: 'confirmed' as const };
      const result = await api.addOrUpdateBooking(updatedBooking);
      if(result) success = true;
    } else {
      const serviceToBook = bookingService || creditBookingService;
      if (!serviceToBook) return false;
      const newBooking: Omit<Booking, 'id'> = { userId: currentUser.id, serviceId: serviceToBook.id, professionalId: details.professionalId, date: details.date, status: 'confirmed', duration: serviceToBook.duration };
      const result = await api.addOrUpdateBooking(newBooking);
      if(result) success = true;
      if (creditBookingService) {
        const updatedUser = await api.deductCreditFromUser(currentUser.id, creditBookingService.id);
        if (updatedUser) setCurrentUser(updatedUser);
      }
    }
    return success;
  }, [currentUser, bookingService, creditBookingService, reschedulingBooking]);

  const handleCloseModals = () => {
    setBookingService(null);
    setPurchaseConfirmation(null);
    setPurchasePackageConfirmation(null);
    setCreditBookingService(null);
    setReschedulingBooking(null);
  };

  const addOrUpdateService = useCallback(async (service: Service) => {
    const savedService = await api.addOrUpdateService(service);
    if (savedService) {
      setServices(prevServices => {
        const isExisting = prevServices.some(s => s.id === savedService.id);
        if (isExisting) {
          return prevServices.map(s => s.id === savedService.id ? savedService : s);
        }
        return [...prevServices, savedService];
      });
    }
    return savedService;
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    await api.deleteService(serviceId);
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
  }, []);
  
  const updateClinicSettings = useCallback(async (operatingHours: OperatingHours) => {
    const updatedSettings = await api.updateClinicOperatingHours(operatingHours);
    if (updatedSettings) {
        setClinicSettings(updatedSettings);
        alert("Horários de funcionamento atualizados com sucesso!");
    } else {
        alert("Erro ao atualizar horários de funcionamento.");
    }
  }, []);

  const appContextValue = useMemo(() => ({ currentUser, setCurrentUser, currentPage, setCurrentPage, logout, services, packages, professionals, addOrUpdateService, deleteService, loading, logoUrl, setLogoUrl, heroImageUrl, setHeroImageUrl, aboutImageUrl, setAboutImageUrl, clinicSettings, updateClinicSettings }), [currentUser, currentPage, logout, services, packages, professionals, addOrUpdateService, deleteService, loading, logoUrl, heroImageUrl, aboutImageUrl, clinicSettings, updateClinicSettings]);

  const renderPage = () => {
    if(loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div></div>
    }
    switch (currentPage) {
      case Page.HOME: return <HomePage onPurchaseOrBook={handlePurchaseOrBook} onPurchasePackage={handlePurchasePackage} />;
      case Page.SERVICES: return <ServicesPage onPurchaseOrBook={handlePurchaseOrBook} onPurchasePackage={handlePurchasePackage} />;
      case Page.LOGIN: return <LoginPage />;
      case Page.USER_DASHBOARD: return <UserDashboardPage onBookWithCredit={handleStartCreditBooking} onReschedule={handleStartReschedule} />;
      case Page.ADMIN_DASHBOARD: return <AdminDashboardPage />;
      default: return <HomePage onPurchaseOrBook={handlePurchaseOrBook} onPurchasePackage={handlePurchasePackage} />;
    }
  };

  const serviceForBookingModal = bookingService || creditBookingService || (reschedulingBooking ? services.find(s => s.id === reschedulingBooking.serviceId) : null);

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">{renderPage()}</main>
        <Footer />
        {serviceForBookingModal && <BookingModal service={serviceForBookingModal} booking={reschedulingBooking} onClose={handleCloseModals} isCreditBooking={!!creditBookingService} onConfirmBooking={handleConfirmFinalBooking} professionals={professionals} clinicOperatingHours={clinicSettings?.operatingHours} />}
        {purchaseConfirmation && <PurchaseConfirmationModal service={purchaseConfirmation.service} quantity={purchaseConfirmation.quantity} onConfirm={handleConfirmPurchase} onClose={handleCloseModals} />}
        {purchasePackageConfirmation && <PackagePurchaseConfirmationModal servicePackage={purchasePackageConfirmation} services={services} onConfirm={handleConfirmPackagePurchase} onClose={handleCloseModals} />}
        <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className={`fixed bottom-6 right-6 bg-green-500 rounded-full p-3 shadow-lg hover:bg-green-600 transition-transform duration-300 transform ${showWhatsApp ? 'scale-100' : 'scale-0'}`} aria-label="Contact us on WhatsApp"><WhatsAppIcon /></a>
      </div>
    </AppContext.Provider>
  );
}