import React, { useState } from 'react';
import AdminAgenda from './Admin/Agenda';
import AdminReports from './Admin/Reports';
import AdminManageServices from './Admin/ManageServices';
import AdminManageUsers from './Admin/ManageUsers';
import AdminNotifications from './Admin/Notifications';
import { useApp } from '../App';
import { Role } from '../types';

type AdminTab = 'agenda' | 'reports' | 'services' | 'users' | 'notifications';

const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const BarChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>;
const ClipboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;


export default function AdminDashboardPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('agenda');
    const { currentUser } = useApp();

    if (currentUser?.role !== Role.ADMIN) {
        return <div className="p-8 text-center text-red-500">Acesso negado.</div>;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'agenda': return <AdminAgenda />;
            case 'reports': return <AdminReports />;
            case 'services': return <AdminManageServices />;
            case 'users': return <AdminManageUsers />;
            case 'notifications': return <AdminNotifications />;
            default: return <AdminAgenda />;
        }
    };

    const NavItem: React.FC<{ tab: AdminTab, icon: React.ReactNode, label: string }> = ({ tab, icon, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                activeTab === tab 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'text-gray-600 hover:bg-pink-100 hover:text-pink-600'
            }`}
        >
            {icon}
            <span className="font-semibold">{label}</span>
        </button>
    );

    return (
        <div className="bg-gray-100 min-h-[80vh]">
            <div className="container mx-auto px-6 py-8">
                <h1 className="text-4xl font-bold mb-8">Painel Administrativo</h1>
                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="md:w-1/4 lg:w-1/5">
                        <div className="bg-white p-4 rounded-lg shadow-md">
                           <div className="space-y-2">
                               <NavItem tab="agenda" icon={<CalendarIcon />} label="Agenda"/>
                               <NavItem tab="reports" icon={<BarChartIcon />} label="Relatórios"/>
                               <NavItem tab="services" icon={<ClipboardIcon />} label="Serviços"/>
                               <NavItem tab="users" icon={<UsersIcon />} label="Usuários"/>
                               <NavItem tab="notifications" icon={<BellIcon />} label="Notificações"/>
                           </div>
                        </div>
                    </aside>
                    <main className="flex-grow md:w-3/4 lg:w-4/5">
                        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md min-h-[60vh]">
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}