
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Search, List } from 'lucide-react';
import clsx from 'clsx';
import { LoginButton } from './LoginButton';

export const Layout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: Search, label: 'Buscar', path: '/search' },
    { icon: List, label: 'Minhas Listas', path: '/lists' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 md:pb-0">
      <header className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            ListFlix
          </Link>
          <nav className="hidden md:flex gap-6">
            {navItems.map((item) => {
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-2 hover:text-purple-400 transition-colors",
                    isActive ? "text-purple-500 font-medium" : "text-gray-400"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center">
            <LoginButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={clsx(
                  "flex flex-col items-center gap-1 text-xs",
                  isActive ? "text-purple-500" : "text-gray-500"
                )}
              >
                <item.icon size={24} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
