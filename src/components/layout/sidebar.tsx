'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/sidebar-context';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/hooks';
import { 
  FileText, 
  Gavel, 
  FileCheck, 
  Target, 
  LayoutDashboard,
  LogOut,
  X,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  // Dashboard - Comentado por ahora, puede usarse en el futuro
  // {
  //   name: 'Dashboard',
  //   href: '/',
  //   icon: LayoutDashboard,
  // },
  {
    name: 'Proyectos',
    href: '/proyectos',
    icon: FolderKanban,
  },
  {
    name: 'Licitaciones',
    href: '/presupuestos-licitaciones',
    icon: Gavel,
  },
  {
    name: 'Contractuales',
    href: '/presupuestos-contractuales',
    icon: FileCheck,
  },
  {
    name: 'Presupuestos Meta',
    href: '/presupuestos-meta',
    icon: Target,
  },
  {
    name: 'Aprobación de Presupuestos',
    href: '/presupuestos-aprobacion',
    icon: CheckCircle2,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, closeSidebar } = useSidebar();
  const { theme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isRouteActive = (href: string) => {
    const cleanPathname = pathname.replace(/\/$/, '') || '/';
    const cleanHref = href.replace(/\/$/, '') || '/';
    
    // Si el href es la raíz, solo está activo cuando el pathname es exactamente la raíz
    if (cleanHref === '/') {
      return cleanPathname === '/';
    }
    
    // Para otras rutas, verificar si el pathname coincide exactamente o es una subruta
    return cleanPathname === cleanHref || cleanPathname.startsWith(cleanHref + '/');
  };

  return (
    <>
      <div
        className={clsx(
          'flex h-full flex-col bg-[var(--sidebar-bg)] transition-all duration-300 card-shadow',
          'fixed md:relative z-30',
          {
            'w-16': isCollapsed && !isMobile,
            'w-60': !isCollapsed,
            '-translate-x-full': isCollapsed && isMobile,
            'translate-x-0': !isCollapsed || !isMobile,
          }
        )}
        style={{ isolation: 'isolate' }}
      >
        <Link
          className="flex h-[60px] items-center justify-center px-4 hover:opacity-90 transition-opacity duration-300"
          href="/"
        >
          <div
            className={clsx(
              'w-full flex flex-col items-center justify-center transition-all duration-300 gap-1',
              isCollapsed && !isMobile ? 'scale-75' : ''
            )}
          >
            {isCollapsed && !isMobile ? (
              <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                theme === 'dark' 
                  ? "bg-transparent" 
                  : "bg-gray-900"
              )}>
                <Image
                  src="/logo-negativo.webp"
                  alt="Kapo Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </div>
            ) : (
              <>
                <div className={clsx(
                  "inline-flex items-center justify-center transition-all duration-300 rounded-lg",
                  theme === 'dark' 
                    ? "bg-transparent" 
                    : "bg-gray-900"
                )}>
                  <Image
                    src="/logo-negativo.webp"
                    alt="Kapo Logo"
                    width={100}
                    height={35}
                    className="h-8 w-auto object-contain "
                    priority
                  />
                </div>
                <span className={clsx(
                  "text-[10px] font-medium text-center leading-tight",
                  theme === 'dark' 
                    ? "text-[var(--text-secondary)]" 
                    : "text-gray-700"
                )}>
                  Costos y Presupuestos
                </span>
              </>
            )}
          </div>
        </Link>

        <div
          className={clsx('flex flex-col h-[calc(100%-60px)]', {
            'overflow-hidden': isCollapsed && !isMobile,
            'overflow-y-auto': !isCollapsed || isMobile,
          })}
        >
          <div className="flex flex-col space-y-1 p-3 flex-1 overflow-x-hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (isMobile) {
                      closeSidebar();
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium relative transition-all duration-300 ease-in-out sidebar-nav-item group',
                    {
                      'bg-[var(--sidebar-active-bg-light)] text-[var(--sidebar-active-text-light)] sidebar-nav-item-active border-l-[3px] border-[var(--sidebar-active-bg)]': active,
                      'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]': !active,
                      'justify-center': isCollapsed && !isMobile,
                    }
                  )}
                  title={isCollapsed && !isMobile ? item.name : undefined}
                >
                  <Icon className={clsx(
                    'w-5 h-5 flex-shrink-0 transition-all duration-300 ease-in-out',
                    {
                      'text-[var(--sidebar-active-text-light)]': active,
                      'text-[var(--text-secondary)] group-hover:scale-110 group-hover:text-[var(--text-primary)]': !active,
                    }
                  )} />
                  {(!isCollapsed || isMobile) && (
                    <span className="truncate transition-all duration-300 ease-in-out">{item.name}</span>
                  )}
                </Link>
              );
            })}
            <div className="h-auto w-full grow rounded-md"></div>
          </div>
          
          <div className="text-center p-2 space-y-1">
            <button
              onClick={handleLogout}
              className={clsx(
                'flex cursor-pointer items-center justify-center gap-1 text-xs p-2 rounded-md bg-[var(--content-bg)] hover:bg-[var(--hover-bg)] w-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-300 ease-in-out sidebar-nav-item group card-shadow',
                isCollapsed && !isMobile && 'justify-center'
              )}
            >
              <LogOut className="w-4 h-4 transition-all duration-300 ease-in-out group-hover:scale-110" />
              {(!isCollapsed || isMobile) && <span>Desconectar</span>}
            </button>
          </div>
        </div>
      </div>
      
      {/* Overlay para móvil */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-20',
          isMobile && !isCollapsed ? 'block' : 'hidden'
        )}
        onClick={closeSidebar}
      />
    </>
  );
}

