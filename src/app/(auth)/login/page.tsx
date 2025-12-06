'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';

function LoginForm() {
  const [usuario, setUsuario] = useState('');
  const [contrasenna, setContrasenna] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(usuario, contrasenna);
      toast.success('Inicio de sesión exitoso');

      // Redirigir a la ruta original o al dashboard
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--content-bg)] px-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-[var(--card-bg)] p-8 card-shadow transition-colors duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[var(--text-on-content-bg-heading)]">Kapo Presupuestos</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Inicia sesión en tu cuenta</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-[var(--text-on-content-bg)]">
                Usuario
              </label>
              <Input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                className="mt-1"
                placeholder="Ingresa tu usuario"
              />
            </div>
            <div>
              <label htmlFor="contrasenna" className="block text-sm font-medium text-[var(--text-on-content-bg)]">
                Contraseña
              </label>
              <Input
                id="contrasenna"
                type="password"
                value={contrasenna}
                onChange={(e) => setContrasenna(e.target.value)}
                required
                className="mt-1"
                placeholder="Ingresa tu contraseña"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--content-bg)] px-4 transition-colors duration-300">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-[var(--card-bg)] p-8 card-shadow transition-colors duration-300">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[var(--text-on-content-bg-heading)] mb-4">Kapo Presupuestos</h2>
            <LoadingSpinner size={80} showText={true} text="Cargando..." />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}



