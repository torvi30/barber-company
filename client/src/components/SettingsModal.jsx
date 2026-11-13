import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { useBarbershop } from '../context/BarbershopContext';
import { showSuccessAlert, showErrorAlert } from '../lib/swal';
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  ShoppingBag,
  MapPin,
  Phone,
  Check,
  Trash2,
  Sliders,
  ExternalLink,
  Store,
  Layers,
  Eye
} from 'lucide-react';

const PRESET_LOGOS = [
  {
    id: 'classic-pole',
    name: 'Barber Pole & Clásico',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?fit=crop&w=300&h=300&q=80'
  },
  {
    id: 'golden-scissors',
    name: 'Tijeras de Oro & Estilo',
    url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?fit=crop&w=300&h=300&q=80'
  },
  {
    id: 'gentlemen-club',
    name: 'Club de Caballeros',
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?fit=crop&w=300&h=300&q=80'
  },
  {
    id: 'precision-blade',
    name: 'Navaja & Acero Puro',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?fit=crop&w=300&h=300&q=80'
  },
  {
    id: 'vintage-leather',
    name: 'Sillón Cuero Tradicional',
    url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?fit=crop&w=300&h=300&q=80'
  },
  {
    id: 'royal-crown',
    name: 'Royal Master Barber',
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?fit=crop&w=300&h=300&q=80'
  }
];

export const SettingsModal = ({ isOpen, onClose }) => {
  const { barbershopInfo, updateCompanySettings, toggleStoreModule } = useBarbershop();

  const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'modules'
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [previewTheme, setPreviewTheme] = useState('dark'); // 'dark' | 'light'
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const fileInputRef = useRef(null);

  const isStoreEnabled = barbershopInfo?.storeEnabled !== false;

  // Sincronizar datos al abrir el modal o cambiar la barbería activa
  useEffect(() => {
    if (barbershopInfo) {
      setName(barbershopInfo.name || '');
      setSlogan(barbershopInfo.slogan || '');
      setLogoUrl(barbershopInfo.logoUrl || '');
      setWhatsapp(barbershopInfo.whatsapp || '');
      setAddress(barbershopInfo.address || '');
      setMunicipality(barbershopInfo.municipality || 'Rionegro');
      setUploadFeedback(null);
    }
  }, [barbershopInfo, isOpen]);

  // Compresión y optimización de imagen en Canvas (Cliente Spark Plan: 256x256 max, ~25-35KB DataURL)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showErrorAlert('Archivo no válido', 'Por favor selecciona una imagen (PNG, JPG, SVG o WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar respetando aspecto a máximo 256x256 px
        const maxDimension = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como JPEG de alta fidelidad ultra liviano (Spark Plan Ready)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const originalKb = Math.round(file.size / 1024);
        const compressedKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

        setLogoUrl(compressedDataUrl);
        setUploadFeedback(`Imagen optimizada: ${originalKb} KB → ${compressedKb} KB (Carga ultrarrápida)`);
      };
      img.onerror = () => {
        showErrorAlert('Error al procesar imagen', 'No pudimos procesar el archivo seleccionado.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Guardar configuración general
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      showErrorAlert('Campo requerido', 'El nombre de la barbería no puede estar vacío.');
      return;
    }

    try {
      setIsSaving(true);
      await updateCompanySettings({
        name: name.trim(),
        slogan: slogan.trim(),
        logoUrl: logoUrl.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
        municipality: municipality.trim()
      });

      await showSuccessAlert(
        '¡Identidad Actualizada!',
        `El logotipo y los datos de ${name.trim()} se han sincronizado en tiempo real.`
      );
      onClose();
    } catch (err) {
      showErrorAlert('Error al guardar', err.message || 'No se pudieron actualizar los ajustes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle de la tienda boutique
  const handleToggleStore = async () => {
    try {
      setIsUpdatingStore(true);
      const nextState = !isStoreEnabled;
      await toggleStoreModule(nextState);
    } catch (err) {
      showErrorAlert('Error al cambiar módulo', err.message);
    } finally {
      setIsUpdatingStore(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustes de Barbería & Logotipo"
      subtitle={`Personaliza la marca, logotipo y módulos de ${barbershopInfo?.name || 'tu empresa'}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-200 dark:border-industrial-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'identity'
                ? 'border-gold-500 text-amber-600 dark:text-gold-400'
                : 'border-transparent text-slate-500 dark:text-industrial-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Identidad & Logotipo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'modules'
                ? 'border-gold-500 text-amber-600 dark:text-gold-400'
                : 'border-transparent text-slate-500 dark:text-industrial-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Módulos del Sistema</span>
          </button>
        </div>

        {/* TAB 1: IDENTIDAD & LOGOTIPO */}
        {activeTab === 'identity' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Visualizador / Live Preview de Marca */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                  Previsualización en Vivo de tu Marca
                </span>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-noir-900 p-0.5 rounded-lg border border-slate-300 dark:border-industrial-700 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('dark')}
                    className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
                      previewTheme === 'dark'
                        ? 'bg-noir-950 text-gold-400 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-industrial-400'
                    }`}
                  >
                    Oscuro
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('light')}
                    className={`px-2 py-0.5 rounded-md font-mono transition-colors ${
                      previewTheme === 'light'
                        ? 'bg-white text-slate-900 font-bold shadow-sm'
                        : 'text-slate-600 dark:text-industrial-400'
                    }`}
                  >
                    Claro
                  </button>
                </div>
              </div>

              {/* Simulación del Header / Navbar */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  previewTheme === 'dark'
                    ? 'bg-noir-900 border-industrial-800 text-white'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Badge de Logo */}
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={name || 'Logo'}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500/50 shadow-glow-gold flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center font-display font-black text-black text-sm shadow-glow-gold flex-shrink-0">
                      {name ? name.substring(0, 2).toUpperCase() : 'BP'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm truncate">
                        {name || 'Nombre de tu Barbería'}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex-shrink-0">
                        ADMIN
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{municipality || 'Rionegro'}</span>
                      {slogan && <span>• "{slogan}"</span>}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-gold-400 border border-amber-500/20">
                    Vista Previa
                  </span>
                </div>
              </div>
            </div>

            {/* Opciones de Carga de Logotipo */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-500 dark:text-gold-400" />
                  Logotipo Oficial de la Barbería
                </span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setUploadFeedback(null);
                    }}
                    className="text-[11px] text-rose-500 hover:text-rose-400 font-normal flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Quitar logo (usar iniciales)
                  </button>
                )}
              </label>

              {/* Botón de subida de archivo con input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-industrial-700 bg-white dark:bg-noir-900 hover:border-gold-500 dark:hover:border-gold-500 transition-colors flex items-center gap-3 text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-gold-500/10 text-amber-600 dark:text-gold-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Subir desde Celular o PC
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-industrial-400 truncate">
                      PNG, JPG, WebP (Optimizado al instante)
                    </div>
                  </div>
                </button>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-industrial-800 bg-white dark:bg-noir-900 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-industrial-400 mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-amber-500" />
                    O pegar enlace directo URL
                  </span>
                  <input
                    type="url"
                    value={logoUrl.startsWith('data:') ? '' : logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setUploadFeedback(null);
                    }}
                    placeholder="https://ejemplo.com/logo.png"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-industrial-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              {uploadFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadFeedback}</span>
                </div>
              )}

              {/* Galería de Logos Prediseñados de Barbería */}
              <div className="pt-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-industrial-400 block mb-2 font-bold">
                  Catálogo de Logos Barbería Premium (1 Clic)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {PRESET_LOGOS.map((preset) => {
                    const isSelected = logoUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setLogoUrl(preset.url);
                          setUploadFeedback(`Seleccionado: ${preset.name}`);
                        }}
                        className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer relative group ${
                          isSelected
                            ? 'bg-amber-500/15 dark:bg-gold-500/15 border-amber-500 dark:border-gold-500 shadow-glow-gold'
                            : 'bg-white dark:bg-noir-900 border-slate-200 dark:border-industrial-800 hover:border-gold-500/50'
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="text-[9px] font-medium text-slate-700 dark:text-industrial-300 truncate w-full text-center">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold-500 text-black flex items-center justify-center text-[10px] font-black">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Campos de Información del Negocio */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-industrial-800">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-400 block">
                Datos de Contacto & Dirección del Salón
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nombre Comercial del Negocio *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Black & Gold Barber Club"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Eslogan o Lema Comercial
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ej. Estilo, Tradición & Vanguardia"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    WhatsApp de Atención / Reservas
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. +57 300 123 4567"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Municipio / Ciudad
                  </label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="Ej. Rionegro, Antioquia"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Dirección Física del Local
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ej. Carrera 50 # 48-12, Centro Comercial San Nicolás"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer con Botón Guardar */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-industrial-800 gap-3">
              <a
                href={barbershopInfo?.slug ? `/?slug=${barbershopInfo.slug}` : '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 dark:text-gold-400 hover:underline flex items-center gap-1 font-mono"
              >
                <span>Ver página pública de clientes</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:bg-slate-100 dark:hover:bg-noir-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 font-mono"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Identidad'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: MÓDULOS DEL SISTEMA */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-2xl flex-shrink-0 transition-colors ${
                      isStoreEnabled
                        ? 'bg-amber-500/15 dark:bg-gold-500/15 text-amber-600 dark:text-gold-400 border border-amber-500/30 dark:border-gold-500/30'
                        : 'bg-slate-100 dark:bg-noir-800 text-slate-400 dark:text-industrial-500 border border-slate-200 dark:border-industrial-700'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Módulo: Tienda Boutique & Catálogo Minorista
                      </h4>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                          isStoreEnabled
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-200 dark:bg-industrial-800 text-slate-600 dark:text-industrial-400'
                        }`}
                      >
                        {isStoreEnabled ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-industrial-400 mt-1 leading-relaxed">
                      Permite a tus clientes explorar y pedir ceras, aceites, champús y merchandising minorista directamente desde su móvil o la web pública.
                    </p>
                  </div>
                </div>

                {/* Switch iOS Style */}
                <button
                  type="button"
                  disabled={isUpdatingStore}
                  onClick={handleToggleStore}
                  className={`w-13 h-7 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none flex-shrink-0 ${
                    isStoreEnabled
                      ? 'bg-gradient-to-r from-amber-500 to-gold-400 dark:from-gold-500 dark:to-gold-300 shadow-glow-gold'
                      : 'bg-slate-300 dark:bg-industrial-700'
                  } ${isUpdatingStore ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={isStoreEnabled ? 'Desactivar Tienda' : 'Activar Tienda'}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                      isStoreEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div
                className={`p-3 rounded-xl text-xs border ${
                  isStoreEnabled
                    ? 'bg-amber-500/5 dark:bg-gold-500/5 border-amber-500/20 dark:border-gold-500/20 text-slate-700 dark:text-industrial-300'
                    : 'bg-slate-100 dark:bg-noir-950 border-slate-200 dark:border-industrial-800 text-slate-500 dark:text-industrial-400'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                  <span>Impacto en la experiencia del cliente:</span>
                </div>
                {isStoreEnabled ? (
                  <p>
                    En tu página pública se mostrará la pestaña <strong className="text-amber-700 dark:text-gold-300">[Tienda Boutique]</strong> junto a <strong className="text-amber-700 dark:text-gold-300">[Reservar Turno]</strong>, permitiendo venta cruzada de productos con pedidos vía WhatsApp o pasarela.
                  </p>
                ) : (
                  <p>
                    Tu página pública se simplifica al 100%: <strong>se ocultan todos los botones y pestañas de tienda</strong>, ofreciendo una experiencia minimalista orientada únicamente al agendamiento rápido de citas.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end border-t border-slate-200 dark:border-industrial-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer font-mono"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
