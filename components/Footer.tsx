
import React from 'react';

const SocialIcon: React.FC<{ href: string, children: React.ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition-colors duration-300">
    {children}
  </a>
);

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Belleza<span className="text-pink-400">Pura</span></h3>
            <p className="text-gray-400">Sua beleza, nossa paixão. Agende seu momento de cuidado conosco.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Navegação</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-pink-400">Início</a></li>
              <li><a href="#" className="hover:text-pink-400">Serviços</a></li>
              <li><a href="#" className="hover:text-pink-400">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-pink-400">Contato</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Contato</h4>
            <p className="text-gray-400">Rua da Beleza, 123</p>
            <p className="text-gray-400">São Paulo, SP</p>
            <p className="text-gray-400 mt-2">contato@bellezapura.com</p>
            <p className="text-gray-400">(11) 91234-5678</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Redes Sociais</h4>
            <div className="flex space-x-4">
              <SocialIcon href="#">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              </SocialIcon>
              <SocialIcon href="#">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.012-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.345 2.525c.636-.247 1.363-.416 2.427-.465C9.795 2.013 10.148 2 12.315 2zm-1.113 4.868c-.407-.02-.82.02-1.22.108a4.01 4.01 0 00-1.03.323c-.38.16-.73.38-1.03.66a3.507 3.507 0 00-.66 1.03c-.18.32-.3.68-.4 1.06-.08.4-.13.8-.1 1.22-.02.48-.02.96-.02 1.44s0 .96.02 1.44c.02.42.06.84.14 1.25.1.41.25.8.45 1.17.2.37.45.7.75 1.05.3.35.63.63 1.05.85.37.2.76.35 1.17.45.4.1.83.14 1.25.14.48.02.96.02 1.44.02s.96 0 1.44-.02c.42-.02.84-.06 1.25-.14.41-.1.8-.25 1.17-.45.37-.2.7-.45 1.05-.75.35-.3.63-.63.85-1.05.2-.37.35-.76.45-1.17.1-.4.14-.83.14-1.25.02-.48.02-.96.02-1.44s0-.96-.02-1.44c-.02-.42-.06-.84-.14-1.25-.1-.41-.25-.8-.45-1.17a3.038 3.038 0 00-.75-1.05 3.038 3.038 0 00-1.05-.75c-.37-.2-.76-.35-1.17-.45-.4-.1-.83-.14-1.25-.14-.48-.02-.96-.02-1.44-.02zm.04 1.732c2.4 0 4.35 1.95 4.35 4.35s-1.95 4.35-4.35 4.35-4.35-1.95-4.35-4.35 1.95-4.35 4.35-4.35zm0 1.45c-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9-1.3-2.9-2.9-2.9zm5.55-3.3c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25z" clipRule="evenodd" /></svg>
              </SocialIcon>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-700 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Clínica Estética Belleza Pura. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
