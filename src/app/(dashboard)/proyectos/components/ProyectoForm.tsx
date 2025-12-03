'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Modal from '@/components/ui/modal';
import { useAuth } from '@/context/auth-context';
import { useCreateProyecto, useUpdateProyecto } from '@/hooks/useProyectos';
import {
  useDepartamentos,
  useProvinciasByDepartamento,
  useDistritosByProvincia,
  useLocalidadesByDistrito,
  useInfraestructuras,
} from '@/hooks/useCatalogos';
import { Proyecto } from '@/services/proyecto-service';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProyectoFormProps {
  proyecto?: Proyecto;
  editMode?: boolean;
  onSubmit?: (data: Proyecto) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProyectoForm({
  proyecto,
  editMode = false,
  onSubmit,
  onCancel,
  isLoading: externalLoading = false,
}: ProyectoFormProps) {
  const { user } = useAuth();
  const createProyecto = useCreateProyecto();
  const updateProyecto = useUpdateProyecto();

  // Estados para los modales de creación
  const [isDepartamentoModalOpen, setIsDepartamentoModalOpen] = useState(false);
  const [isProvinciaModalOpen, setIsProvinciaModalOpen] = useState(false);
  const [isDistritoModalOpen, setIsDistritoModalOpen] = useState(false);
  const [isLocalidadModalOpen, setIsLocalidadModalOpen] = useState(false);
  const [isInfraestructuraModalOpen, setIsInfraestructuraModalOpen] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre_proyecto: '',
    id_infraestructura: '',
    id_departamento: '',
    id_provincia: '',
    id_distrito: '',
    id_localidad: '',
    cliente: '',
    empresa: '',
    plazo: 0,
    ppto_base: 0,
    ppto_oferta: 0,
    jornada: 8,
    estado: 'BORRADOR',
  });

  // Catálogos
  const { data: departamentos = [], isLoading: isLoadingDepartamentos } = useDepartamentos();
  const { data: provincias = [], isLoading: isLoadingProvincias } = useProvinciasByDepartamento(
    formData.id_departamento || null
  );
  const { data: distritos = [], isLoading: isLoadingDistritos } = useDistritosByProvincia(
    formData.id_provincia || null
  );
  const { data: localidades = [], isLoading: isLoadingLocalidades } = useLocalidadesByDistrito(
    formData.id_distrito || null
  );
  const { data: infraestructuras = [], isLoading: isLoadingInfraestructuras } = useInfraestructuras();

  // Inicializar formulario con datos del proyecto si está en modo edición
  useEffect(() => {
    if (editMode && proyecto) {
      setFormData({
        nombre_proyecto: proyecto.nombre_proyecto || '',
        id_infraestructura: proyecto.id_infraestructura || '',
        id_departamento: proyecto.id_departamento || '',
        id_provincia: proyecto.id_provincia || '',
        id_distrito: proyecto.id_distrito || '',
        id_localidad: proyecto.id_localidad || '',
        cliente: proyecto.cliente || '',
        empresa: proyecto.empresa || '',
        plazo: proyecto.plazo || 0,
        ppto_base: proyecto.ppto_base || 0,
        ppto_oferta: proyecto.ppto_oferta || 0,
        jornada: proyecto.jornada || 8,
        estado: proyecto.estado || 'BORRADOR',
      });
    }
  }, [editMode, proyecto]);

  // Limpiar campos dependientes cuando cambia el padre
  useEffect(() => {
    if (!formData.id_departamento) {
      setFormData((prev) => ({ ...prev, id_provincia: '', id_distrito: '', id_localidad: '' }));
    }
  }, [formData.id_departamento]);

  useEffect(() => {
    if (!formData.id_provincia) {
      setFormData((prev) => ({ ...prev, id_distrito: '', id_localidad: '' }));
    }
  }, [formData.id_provincia]);

  useEffect(() => {
    if (!formData.id_distrito) {
      setFormData((prev) => ({ ...prev, id_localidad: '' }));
    }
  }, [formData.id_distrito]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    const isSubmitting = createProyecto.isPending || updateProyecto.isPending || externalLoading;

    try {
      if (editMode && proyecto) {
        const updateData = {
          id_proyecto: proyecto.id_proyecto,
          nombre_proyecto: formData.nombre_proyecto,
          cliente: formData.cliente,
          empresa: formData.empresa,
          plazo: formData.plazo,
          ppto_base: formData.ppto_base,
          ppto_oferta: formData.ppto_oferta,
          jornada: formData.jornada,
          id_departamento: formData.id_departamento,
          id_provincia: formData.id_provincia,
          id_distrito: formData.id_distrito,
          id_localidad: formData.id_localidad || undefined,
          estado: formData.estado,
        };

        const updatedProyecto = await updateProyecto.mutateAsync(updateData);
        if (onSubmit) {
          onSubmit(updatedProyecto);
        } else {
          onCancel();
        }
      } else {
        const newProyecto = {
          id_usuario: user.id,
          id_infraestructura: formData.id_infraestructura,
          nombre_proyecto: formData.nombre_proyecto,
          id_departamento: formData.id_departamento,
          id_provincia: formData.id_provincia,
          id_distrito: formData.id_distrito,
          id_localidad: formData.id_localidad || undefined,
          estado: 'BORRADOR',
          cliente: formData.cliente,
          empresa: formData.empresa,
          plazo: formData.plazo,
          ppto_base: formData.ppto_base,
          ppto_oferta: formData.ppto_oferta,
          jornada: formData.jornada,
          total_proyecto: 0,
        };

        const createdProyecto = await createProyecto.mutateAsync(newProyecto);
        if (onSubmit) {
          onSubmit(createdProyecto);
        } else {
          onCancel();
        }
      }
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
    }
  };

  const isSubmitting = createProyecto.isPending || updateProyecto.isPending || externalLoading;

  return (
    <>
      <form id="proyecto-form" onSubmit={handleSubmit} className="space-y-4">
        {editMode && (
          <div>
            <label htmlFor="estado" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Estado del Proyecto
            </label>
            <Select
              id="estado"
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="BORRADOR">BORRADOR</option>
              <option value="EN REVISIÓN">EN REVISIÓN</option>
              <option value="APROBADO">APROBADO</option>
              <option value="EN CURSO">EN CURSO</option>
              <option value="SUSPENDIDO">SUSPENDIDO</option>
              <option value="CANCELADO">CANCELADO</option>
              <option value="COMPLETADO">COMPLETADO</option>
              <option value="CERRADO">CERRADO</option>
            </Select>
          </div>
        )}

        <div>
          <label htmlFor="nombre_proyecto" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Nombre del Proyecto *
          </label>
          <Input
            id="nombre_proyecto"
            value={formData.nombre_proyecto}
            onChange={(e) => handleChange('nombre_proyecto', e.target.value)}
            required
            disabled={isSubmitting}
            placeholder="Ingrese el nombre del proyecto"
          />
        </div>

        <div>
          <label htmlFor="id_infraestructura" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Infraestructura *
          </label>
          <div className="flex gap-1">
            <Select
              id="id_infraestructura"
              value={formData.id_infraestructura}
              onChange={(e) => handleChange('id_infraestructura', e.target.value)}
              required
              disabled={isSubmitting || isLoadingInfraestructuras}
              className="flex-1"
            >
              <option value="">Seleccione infraestructura</option>
              {infraestructuras.map((infra) => (
                <option key={infra.id_infraestructura} value={infra.id_infraestructura}>
                  {infra.nombre_infraestructura} ({infra.tipo_infraestructura})
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setIsInfraestructuraModalOpen(true)}
              className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sección Ubicación */}
        <div className="grid grid-cols-2 gap-4">
          {/* Departamento */}
          <div>
            <label htmlFor="id_departamento" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Departamento *
            </label>
            <div className="flex gap-1">
              <Select
                id="id_departamento"
                value={formData.id_departamento}
                onChange={(e) => handleChange('id_departamento', e.target.value)}
                required
                disabled={isSubmitting || isLoadingDepartamentos}
                className="flex-1"
              >
                <option value="">Seleccione departamento</option>
                {departamentos.map((dep) => (
                  <option key={dep.id_departamento} value={dep.id_departamento}>
                    {dep.nombre_departamento}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setIsDepartamentoModalOpen(true)}
                className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Provincia */}
          {formData.id_departamento && (
            <div>
              <label htmlFor="id_provincia" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Provincia *
              </label>
              <div className="flex gap-1">
                <Select
                  id="id_provincia"
                  value={formData.id_provincia}
                  onChange={(e) => handleChange('id_provincia', e.target.value)}
                  required
                  disabled={isSubmitting || isLoadingProvincias}
                  className="flex-1"
                >
                  <option value="">Seleccione provincia</option>
                  {provincias.map((prov) => (
                    <option key={prov.id_provincia} value={prov.id_provincia}>
                      {prov.nombre_provincia}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setIsProvinciaModalOpen(true)}
                  className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Distrito */}
          {formData.id_provincia && (
            <div>
              <label htmlFor="id_distrito" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Distrito *
              </label>
              <div className="flex gap-1">
                <Select
                  id="id_distrito"
                  value={formData.id_distrito}
                  onChange={(e) => handleChange('id_distrito', e.target.value)}
                  required
                  disabled={isSubmitting || isLoadingDistritos}
                  className="flex-1"
                >
                  <option value="">Seleccione distrito</option>
                  {distritos.map((dist) => (
                    <option key={dist.id_distrito} value={dist.id_distrito}>
                      {dist.nombre_distrito}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setIsDistritoModalOpen(true)}
                  className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Localidad */}
          {formData.id_distrito && (
            <div>
              <label htmlFor="id_localidad" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Localidad
              </label>
              <div className="flex gap-1">
                <Select
                  id="id_localidad"
                  value={formData.id_localidad}
                  onChange={(e) => handleChange('id_localidad', e.target.value)}
                  disabled={isSubmitting || isLoadingLocalidades}
                  className="flex-1"
                >
                  <option value="">Seleccione Localidad</option>
                  {localidades.map((loc) => (
                    <option key={loc.id_localidad} value={loc.id_localidad}>
                      {loc.nombre_localidad}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setIsLocalidadModalOpen(true)}
                  className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cliente" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Cliente *
            </label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => handleChange('cliente', e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="Ingrese el nombre del cliente"
            />
          </div>
          <div>
            <label htmlFor="empresa" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Empresa *
            </label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => handleChange('empresa', e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="Ingrese el nombre de la empresa"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="plazo" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Plazo (días) *
            </label>
            <Input
              id="plazo"
              type="number"
              value={formData.plazo}
              onChange={(e) => handleChange('plazo', parseInt(e.target.value) || 0)}
              required
              disabled={isSubmitting}
              min="0"
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="ppto_base" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Presupuesto Base *
            </label>
            <Input
              id="ppto_base"
              type="number"
              value={formData.ppto_base}
              onChange={(e) => handleChange('ppto_base', parseFloat(e.target.value) || 0)}
              required
              disabled={isSubmitting}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="ppto_oferta" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Presupuesto Oferta *
            </label>
            <Input
              id="ppto_oferta"
              type="number"
              value={formData.ppto_oferta}
              onChange={(e) => handleChange('ppto_oferta', parseFloat(e.target.value) || 0)}
              required
              disabled={isSubmitting}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label htmlFor="jornada" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Jornada (horas) *
          </label>
          <Input
            id="jornada"
            type="number"
            value={formData.jornada}
            onChange={(e) => handleChange('jornada', parseFloat(e.target.value) || 8)}
            required
            disabled={isSubmitting}
            min="0"
            step="0.1"
            placeholder="8"
          />
        </div>
      </form>

      {/* Modales para crear nuevos registros */}
      {isDepartamentoModalOpen && (
        <Modal
          isOpen={isDepartamentoModalOpen}
          onClose={() => setIsDepartamentoModalOpen(false)}
          title="Nuevo Departamento"
        >
          <div className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Funcionalidad de creación de departamento pendiente de implementar
            </p>
          </div>
        </Modal>
      )}

      {isProvinciaModalOpen && (
        <Modal
          isOpen={isProvinciaModalOpen}
          onClose={() => setIsProvinciaModalOpen(false)}
          title="Nueva Provincia"
        >
          <div className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Funcionalidad de creación de provincia pendiente de implementar
            </p>
          </div>
        </Modal>
      )}

      {isDistritoModalOpen && (
        <Modal
          isOpen={isDistritoModalOpen}
          onClose={() => setIsDistritoModalOpen(false)}
          title="Nuevo Distrito"
        >
          <div className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Funcionalidad de creación de distrito pendiente de implementar
            </p>
          </div>
        </Modal>
      )}

      {isLocalidadModalOpen && (
        <Modal
          isOpen={isLocalidadModalOpen}
          onClose={() => setIsLocalidadModalOpen(false)}
          title="Nueva Localidad"
        >
          <div className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Funcionalidad de creación de localidad pendiente de implementar
            </p>
          </div>
        </Modal>
      )}

      {isInfraestructuraModalOpen && (
        <Modal
          isOpen={isInfraestructuraModalOpen}
          onClose={() => setIsInfraestructuraModalOpen(false)}
          title="Nueva Infraestructura"
        >
          <div className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Funcionalidad de creación de infraestructura pendiente de implementar
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

