# Kapo Presupuestos

Sistema de gestión de presupuestos construido con Next.js 16, React 19, TypeScript y GraphQL.

## 🚀 Características

- ⚡️ Next.js 16 con App Router
- 🎨 Tailwind CSS 4 para estilos
- 🔐 Autenticación con JWT y refresh tokens
- 📡 GraphQL con Apollo Client
- 🎯 TypeScript para type safety
- 🔄 React Query para gestión de estado del servidor
- 🎭 Componentes UI reutilizables
- 📱 Diseño responsive

## 📁 Estructura del Proyecto

```
kapo-presupuestos/
├── src/
│   ├── app/                    # Rutas de Next.js
│   │   ├── (auth)/             # Rutas de autenticación
│   │   ├── (dashboard)/        # Rutas del dashboard
│   │   ├── layout.tsx          # Layout principal
│   │   └── page.tsx            # Página de inicio
│   ├── components/             # Componentes React
│   │   ├── common/             # Componentes comunes
│   │   ├── layout/             # Componentes de layout
│   │   └── ui/                 # Componentes UI base
│   ├── context/                # Contextos de React
│   │   └── auth-context.tsx    # Contexto de autenticación
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilidades y helpers
│   │   ├── constants/         # Constantes de la app
│   │   ├── cookies.ts          # Utilidades de cookies
│   │   └── utils.ts            # Utilidades generales
│   ├── providers/              # Providers de React
│   │   └── providers.tsx      # Provider principal
│   ├── services/               # Servicios
│   │   ├── auth-service.ts    # Servicio de autenticación
│   │   └── graphql-client.ts  # Cliente GraphQL
│   ├── types/                  # Tipos TypeScript
│   └── graphql/                # Queries y mutations GraphQL
├── public/                     # Archivos estáticos
└── package.json
```

## 🛠️ Instalación

1. Instala las dependencias:

```bash
npm install
```

2. Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
```

3. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🏗️ Arquitectura

El proyecto sigue una arquitectura limpia y modular:

- **App Router**: Usa el nuevo App Router de Next.js 16
- **Grupos de Rutas**: Organización con `(auth)` y `(dashboard)`
- **Context API**: Para estado global (autenticación)
- **React Query**: Para gestión de datos del servidor
- **Services**: Lógica de negocio separada
- **TypeScript**: Type safety en toda la aplicación

## 🔐 Autenticación

El sistema incluye:

- Login con usuario y contraseña
- Refresh tokens automático
- Validación de tokens
- Protección de rutas privadas
- Manejo de sesiones

## 🎨 Componentes UI

Los componentes UI están basados en shadcn/ui y son completamente personalizables:

- Button
- Input
- (Más componentes se pueden agregar según necesidad)

## 📚 Próximos Pasos

- [ ] Agregar más componentes UI
- [ ] Implementar gestión de presupuestos
- [ ] Agregar tests
- [ ] Configurar CI/CD
- [ ] Documentación de API

## 📄 Licencia

MIT
