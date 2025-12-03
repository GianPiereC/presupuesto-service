'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Presupuesto } from '@/hooks/usePresupuestos';

interface PresupuestoFormProps {
  presupuesto?: Presupuesto;
  id_proyecto: string;
  editMode?: boolean;
  onSubmit?: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  cantidadPresupuestos?: number;
  modoCrearPadre?: boolean; // Si es true, solo muestra el campo nombre
}

export default function PresupuestoForm({
  presupuesto,
  id_proyecto,
  editMode = false,
  onSubmit,
  onCancel,
  isLoading: externalLoading = false,
  cantidadPresupuestos = 0,
  modoCrearPadre = false,
}: PresupuestoFormProps) {
  const [formData, setFormData] = useState({
    nombre_presupuesto: '',
    costo_directo: '0',
    ppto_base: '0',
    ppto_oferta: '0',
    observaciones: '',
    monto_igv: '0',
    monto_utilidad: '0',
    parcial_presupuesto: '0',
    plazo: '0',
    porcentaje_igv: '18',
    porcentaje_utilidad: '0',
    total_presupuesto: '0',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario con datos del presupuesto si está en modo edición
  useEffect(() => {
    if (editMode && presupuesto) {
      setFormData({
        nombre_presupuesto: presupuesto.nombre_presupuesto || '',
        costo_directo: presupuesto.costo_directo?.toString() || '0',
        ppto_base: presupuesto.ppto_base?.toString() || '0',
        ppto_oferta: presupuesto.ppto_oferta?.toString() || '0',
        observaciones: presupuesto.observaciones || '',
        monto_igv: presupuesto.monto_igv?.toString() || '0',
        monto_utilidad: presupuesto.monto_utilidad?.toString() || '0',
        parcial_presupuesto: presupuesto.parcial_presupuesto?.toString() || '0',
        plazo: presupuesto.plazo?.toString() || '0',
        porcentaje_igv: presupuesto.porcentaje_igv?.toString() || '18',
        porcentaje_utilidad: presupuesto.porcentaje_utilidad?.toString() || '0',
        total_presupuesto: presupuesto.total_presupuesto?.toString() || '0',
      });
    }
  }, [editMode, presupuesto, cantidadPresupuestos]);

  // Calcular valores derivados cuando cambian los campos base
  useEffect(() => {
    const costoDirecto = parseFloat(formData.costo_directo) || 0;
    const porcentajeIGV = parseFloat(formData.porcentaje_igv) || 0;
    const porcentajeUtilidad = parseFloat(formData.porcentaje_utilidad) || 0;

    // Calcular parcial (costo directo + utilidad)
    const parcial = costoDirecto * (1 + porcentajeUtilidad / 100);
    
    // Calcular IGV sobre el parcial
    const montoIGV = parcial * (porcentajeIGV / 100);
    
    // Calcular utilidad
    const montoUtilidad = costoDirecto * (porcentajeUtilidad / 100);
    
    // Calcular total
    const total = parcial + montoIGV;

    setFormData(prev => ({
      ...prev,
      parcial_presupuesto: parcial.toFixed(2),
      monto_igv: montoIGV.toFixed(2),
      monto_utilidad: montoUtilidad.toFixed(2),
      total_presupuesto: total.toFixed(2),
    }));
  }, [formData.costo_directo, formData.porcentaje_igv, formData.porcentaje_utilidad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumericField = name.includes('costo') || 
                          name.includes('ppto') || 
                          name.includes('plazo') || 
                          name.includes('porcentaje') ||
                          name.includes('monto') ||
                          name.includes('parcial') ||
                          name.includes('total');

    if (isNumericField) {
      // Permitir solo números y un punto decimal
      const numericValue = value.replace(/[^0-9.]/g, '');
      if (numericValue.split('.').length <= 2) {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (modoCrearPadre) {
        // Modo crear padre: envía nombre, IGV y utilidad
        if (onSubmit) {
          await onSubmit({
            nombre_presupuesto: formData.nombre_presupuesto,
            porcentaje_igv: parseFloat(formData.porcentaje_igv) || 18,
            porcentaje_utilidad: parseFloat(formData.porcentaje_utilidad) || 0,
          });
        }
      } else {
        // Modo normal: envía todos los campos
        const numericData = {
          id_proyecto,
          nombre_presupuesto: formData.nombre_presupuesto,
          costo_directo: parseFloat(formData.costo_directo) || 0,
          ppto_base: parseFloat(formData.ppto_base) || 0,
          ppto_oferta: parseFloat(formData.ppto_oferta) || 0,
          monto_igv: parseFloat(formData.monto_igv) || 0,
          monto_utilidad: parseFloat(formData.monto_utilidad) || 0,
          parcial_presupuesto: parseFloat(formData.parcial_presupuesto) || 0,
          plazo: parseInt(formData.plazo) || 0,
          porcentaje_igv: parseFloat(formData.porcentaje_igv) || 18,
          porcentaje_utilidad: parseFloat(formData.porcentaje_utilidad) || 0,
          total_presupuesto: parseFloat(formData.total_presupuesto) || 0,
          observaciones: formData.observaciones,
        };

        if (onSubmit) {
          await onSubmit(numericData);
        }
      }
    } catch (error) {
      console.error('Error al guardar presupuesto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmittingForm = isSubmitting || externalLoading;

  return (
    <form id="presupuesto-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre del Presupuesto */}
      <div>
        <label htmlFor="nombre_presupuesto" className="block text-xs font-medium text-(--text-primary) mb-1">
          Nombre del Presupuesto *
        </label>
        <Input
          id="nombre_presupuesto"
          name="nombre_presupuesto"
          value={formData.nombre_presupuesto}
          onChange={handleChange}
          required
          disabled={isSubmittingForm}
          placeholder="Ingrese el nombre del presupuesto"
        />
        {modoCrearPadre && (
          <>
            {!editMode && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 mb-3">
                Se creará un presupuesto. Los detalles se agregarán cuando comiences a trabajar en él.
          </p>
            )}
            {/* IGV y Utilidad para el padre */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="porcentaje_igv" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  IGV (%) *
                </label>
                <Input
                  id="porcentaje_igv"
                  name="porcentaje_igv"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.porcentaje_igv}
                  onChange={handleChange}
                  required
                  disabled={isSubmittingForm}
                  placeholder="18"
                />
              </div>
              <div>
                <label htmlFor="porcentaje_utilidad" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                  Utilidad (%) *
                </label>
                <Input
                  id="porcentaje_utilidad"
                  name="porcentaje_utilidad"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.porcentaje_utilidad}
                  onChange={handleChange}
                  required
                  disabled={isSubmittingForm}
                  placeholder="0"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Solo mostrar campos financieros si NO es modo crear padre */}
      {!modoCrearPadre && (
        <>
          {/* Primera fila: Costo Directo, Presupuesto Base, Plazo */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="costo_directo" className="block text-xs font-medium text-(--text-primary) mb-1">
            Costo Directo (S/.) *
          </label>
          <Input
            id="costo_directo"
            name="costo_directo"
            type="number"
            step="0.01"
            min="0"
            value={formData.costo_directo}
            onChange={handleChange}
            required
            disabled={isSubmittingForm}
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor="ppto_base" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Presupuesto Base (S/.) *
          </label>
          <Input
            id="ppto_base"
            name="ppto_base"
            type="number"
            step="0.01"
            min="0"
            value={formData.ppto_base}
            onChange={handleChange}
            required
            disabled={isSubmittingForm}
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor="plazo" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Plazo (días)
          </label>
          <Input
            id="plazo"
            name="plazo"
            type="number"
            min="0"
            value={formData.plazo}
            onChange={handleChange}
            disabled={isSubmittingForm}
            placeholder="0 (opcional)"
          />
        </div>
      </div>

      {/* Segunda fila: Presupuesto Oferta, Porcentaje IGV, Porcentaje Utilidad */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="ppto_oferta" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Presupuesto Oferta (S/.) *
          </label>
          <Input
            id="ppto_oferta"
            name="ppto_oferta"
            type="number"
            step="0.01"
            min="0"
            value={formData.ppto_oferta}
            onChange={handleChange}
            required
            disabled={isSubmittingForm}
            placeholder="0.00"
          />
        </div>
        <div>
          <label htmlFor="porcentaje_igv" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Porcentaje IGV (%) *
          </label>
          <Input
            id="porcentaje_igv"
            name="porcentaje_igv"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.porcentaje_igv}
            onChange={handleChange}
            required
            disabled={isSubmittingForm}
            placeholder="18"
          />
        </div>
        <div>
          <label htmlFor="porcentaje_utilidad" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
            Porcentaje Utilidad (%) *
          </label>
          <Input
            id="porcentaje_utilidad"
            name="porcentaje_utilidad"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.porcentaje_utilidad}
            onChange={handleChange}
            required
            disabled={isSubmittingForm}
            placeholder="0"
          />
        </div>
      </div>

          {/* Observaciones */}
          <div>
            <label htmlFor="observaciones" className="block text-xs font-medium text-[var(--text-primary)] mb-1">
              Observaciones
            </label>
            <Textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              disabled={isSubmittingForm}
              rows={3}
              placeholder="Ingrese las observaciones del presupuesto (opcional)"
            />
          </div>
        </>
      )}
    </form>
  );
}

