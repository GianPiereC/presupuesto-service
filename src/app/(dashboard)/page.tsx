export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-on-content-bg-heading)]">
          Dashboard
        </h1>
        <p className="text-[var(--text-on-content-bg)] mt-2">
          Bienvenido al sistema de presupuestos
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Aquí puedes agregar tus componentes de dashboard */}
      </div>
    </div>
  );
}

