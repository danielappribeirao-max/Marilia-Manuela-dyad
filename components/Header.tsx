
import React from 'react';
import { useApp } from '../App';
import { Page, Role } from '../types';

export default function Header() {
  const { currentUser, currentPage, setCurrentPage, logout } = useApp();

  const navItemClasses = (page: Page) => 
    `cursor-pointer transition-colors duration-300 ${currentPage === page ? 'text-pink-400' : 'hover:text-pink-400'}`;

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-800 cursor-pointer" onClick={() => setCurrentPage(Page.HOME)}>
          Belleza<span className="text-pink-500">Pura</span>
        </div>
        <ul className="hidden md:flex items-center space-x-8 font-medium">
          <li className={navItemClasses(Page.HOME)} onClick={() => setCurrentPage(Page.HOME)}>Início</li>
          <li className={navItemClasses(Page.SERVICES)} onClick={() => setCurrentPage(Page.SERVICES)}>Serviços</li>
          {currentUser?.role === Role.ADMIN && (
            <li className={navItemClasses(Page.ADMIN_DASHBOARD)} onClick={() => setCurrentPage(Page.ADMIN_DASHBOARD)}>Painel Admin</li>
          )}
        </ul>
        <div className="flex items-center space-x-3">
           <button 
             onClick={() => setCurrentPage(Page.SERVICES)} 
             className="px-5 py-2 border border-pink-500 text-pink-500 rounded-full font-semibold hover:bg-pink-500 hover:text-white transition-colors duration-300 hidden sm:block"
           >
            Agendar
          </button>
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <span className="font-medium hidden lg:inline">Olá, {currentUser.name.split(' ')[0]}</span>
               <button onClick={() => setCurrentPage(currentUser.role === Role.CLIENT ? Page.USER_DASHBOARD : Page.ADMIN_DASHBOARD)} className="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors duration-300">
                Minha Conta
              </button>
              <button onClick={logout} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors duration-300">
                Sair
              </button>
            </div>
          ) : (
            <button onClick={() => setCurrentPage(Page.LOGIN)} className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors duration-300 shadow-md">
              Login
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
