import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { useBarbershop } from '../context/BarbershopContext';
import { useAuth } from '../context/AuthContext';
import { showSuccessAlert, showErrorAlert } from '../lib/swal';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { normalizeWhatsAppPhone } from '../lib/phoneUtils';
import { TRADITIONAL_SERVICES } from '../constants/services';
import { SLOT_INTERVAL_OPTIONS, BUFFER_TIME_OPTIONS } from '../lib/slotEngine';
import {
  User,
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
  Eye,
  KeyRound,
  Shield,
  Mail,
  Camera,
  Scissors,
  Plus,
  RotateCcw,
  DollarSign,
  Clock,
  Save
} from 'lucide-react';

const AVATAR_PRESETS = [
  { label: 'Fade Master', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&q=80' },
  { label: 'Blade Classic', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&q=80' },
  { label: 'Scissors Pro', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?fit=crop&w=200&q=80' },
  { label: 'Sofía Stylist', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?fit=crop&w=200&q=80' },
  { label: 'Alejo Barber', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?fit=crop&w=200&q=80' },
  { label: 'Victor Master', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?fit=crop&w=200&q=80' },
  { label: 'Daniel Gold', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=200&q=80' },
  { label: 'Executive Cut', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?fit=crop&w=200&q=80' }
];

export const SettingsModal = ({ isOpen, onClose, initialTab = 'identity' }) => {
  const { barbershopInfo, updateCompanySettings, toggleStoreModule } = useBarbershop();
  const { currentUser, isSuperAdmin, updateCurrentUserProfile, resetPassword } = useAuth();

  const sanitizeTab = (t) => (typeof t === 'string' && ['profile', 'identity', 'services', 'modules'].includes(t)) ? t : 'identity';
  const [activeTab, setActiveTab] = useState(() => sanitizeTab(initialTab));

  // --- Estado de Perfil Personal ---
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userBio, setUserBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarUploadFeedback, setAvatarUploadFeedback] = useState(null);
  const avatarFileInputRef = useRef(null);

  // --- Estado de Identidad de Barbería ---
  const [salonName, setSalonName] = useState('');
  const [salonSlogan, setSalonSlogan] = useState('');
  const [salonLogoUrl, setSalonLogoUrl] = useState('');
  const [salonWhatsapp, setSalonWhatsapp] = useState('');
  const [salonAddress, setSalonAddress] = useState('');
  const [salonMunicipality, setSalonMunicipality] = useState('');
  const [logoUploadFeedback, setLogoUploadFeedback] = useState(null);
  const [isSavingSalon, setIsSavingSalon] = useState(false);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const logoFileInputRef = useRef(null);

  // --- Estado de Servicios & Precios de la Empresa ---
  const [salonServices, setSalonServices] = useState([]);
  const [salonSlotInterval, setSalonSlotInterval] = useState(30);
  const [salonBufferTime, setSalonBufferTime] = useState(0);
  const [isSavingServices, setIsSavingServices] = useState(false);

  const isStoreEnabled = barbershopInfo?.storeEnabled !== false;

  const cleanDisplayPhone = (raw) => {
    if (!raw) return '';
    let cleaned = String(raw).replace(/\D/g, '');
    if (cleaned.startsWith('57') && cleaned.length > 10) {
      cleaned = cleaned.slice(2);
    }
    return cleaned;
  };

  // Sincronizar datos al abrir modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(sanitizeTab(initialTab));
      if (currentUser) {
        setDisplayName(currentUser.displayName || currentUser.name || '');
        setAvatarUrl(currentUser.avatarUrl || currentUser.avatar || '');
        setUserPhone(currentUser.phone || '');
        setUserBio(currentUser.bio || '');
        setAvatarUploadFeedback(null);
      }
      if (barbershopInfo) {
        setSalonName(barbershopInfo.name || '');
        setSalonSlogan(barbershopInfo.slogan || '');
        setSalonLogoUrl(barbershopInfo.logoUrl || '');
        setSalonWhatsapp(barbershopInfo.whatsapp || '');
        setSalonAddress(barbershopInfo.address || '');
        setSalonMunicipality(barbershopInfo.municipality || 'Rionegro');
        setLogoUploadFeedback(null);

        const currentServices = (barbershopInfo.services && Array.isArray(barbershopInfo.services) && barbershopInfo.services.length > 0)
          ? barbershopInfo.services
          : TRADITIONAL_SERVICES;
        setSalonServices(JSON.parse(JSON.stringify(currentServices)));
        setSalonSlotInterval(Number(barbershopInfo.slotInterval || 30));
        setSalonBufferTime(Number(barbershopInfo.bufferTime || 0));
      }
    }
  }, [isOpen, initialTab, currentUser, barbershopInfo]);

  // Helper de compresión Canvas a 256x256 px JPEG ultra liviano (Spark Plan Ready)
  const compressImage = (file, callback) => {
    if (!file || !file.type.startsWith('image/')) {
      showErrorAlert('Archivo no válido', 'Por favor selecciona una imagen (PNG, JPG, SVG o WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const originalKb = Math.round(file.size / 1024);
        const compressedKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

        callback(compressedDataUrl, originalKb, compressedKb);
      };
      img.onerror = () => {
        showErrorAlert('Error al procesar imagen', 'No pudimos procesar el archivo seleccionado.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Carga de avatar de usuario a Cloudinary (carpeta: barber-company/avatars)
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploadFeedback('Optimizando y subiendo a Cloudinary...');

    compressImage(file, async (compressedDataUrl) => {
      // Mostrar preview inmediato
      setAvatarUrl(compressedDataUrl);

      try {
        const result = await uploadToCloudinary(compressedDataUrl, 'avatars');
        if (result?.url) {
          setAvatarUrl(result.url);
          setAvatarUploadFeedback('✓ Foto alojada en Cloudinary (barber-company/avatars)');
        }
      } catch (err) {
        console.warn('Fallo Cloudinary upload (fallback a imagen local):', err.message);
        setAvatarUploadFeedback('✓ Foto guardada localmente (modo offline)');
      }
    });
  };

  // Carga de logo de barbería a Cloudinary (carpeta: barber-company/logos)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploadFeedback('Optimizando y subiendo a Cloudinary...');

    compressImage(file, async (compressedDataUrl) => {
      // Mostrar preview inmediato
      setSalonLogoUrl(compressedDataUrl);

      try {
        const result = await uploadToCloudinary(compressedDataUrl, 'logos');
        if (result?.url) {
          setSalonLogoUrl(result.url);
          setLogoUploadFeedback('✓ Logo alojado en Cloudinary (barber-company/logos)');
        }
      } catch (err) {
        console.warn('Fallo Cloudinary upload (fallback a imagen local):', err.message);
        setLogoUploadFeedback('✓ Logo guardado localmente (modo offline)');
      }
    });
  };

  // Guardar Perfil de Usuario en Firebase Auth, Firestore y MongoDB
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!displayName.trim()) {
      showErrorAlert('Campo Requerido', 'Tu nombre no puede estar vacío.');
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateCurrentUserProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        phone: userPhone.trim(),
        bio: userBio.trim()
      });

      await showSuccessAlert(
        '¡Perfil Guardado!',
        'Tus datos personales y foto de perfil quedaron sincronizados en la base de datos.'
      );
    } catch (err) {
      showErrorAlert('Error al guardar perfil', err.message || 'No se pudieron guardar los cambios.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Enviar correo de restablecimiento de contraseña
  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      await resetPassword(currentUser.email);
      showSuccessAlert(
        'Enlace de Seguridad Enviado',
        `Hemos enviado un enlace a ${currentUser.email} para que actualices tu contraseña con seguridad.`
      );
    } catch (err) {
      showErrorAlert('Error al enviar correo', err.message);
    }
  };

  // Guardar Identidad de Barbería
  const handleSaveSalon = async (e) => {
    e?.preventDefault();
    if (!salonName.trim()) {
      showErrorAlert('Campo requerido', 'El nombre de la barbería no puede estar vacío.');
      return;
    }

    try {
      setIsSavingSalon(true);
      await updateCompanySettings({
        name: salonName.trim(),
        slogan: salonSlogan.trim(),
        logoUrl: salonLogoUrl.trim(),
        whatsapp: normalizeWhatsAppPhone(salonWhatsapp),
        address: salonAddress.trim(),
        municipality: salonMunicipality.trim()
      });

      await showSuccessAlert(
        '¡Identidad de Barbería Guardada!',
        `El logotipo y datos de ${salonName.trim()} se actualizaron en la base de datos y Firestore.`
      );
    } catch (err) {
      showErrorAlert('Error al guardar barbería', err.message || 'No se pudieron actualizar los ajustes.');
    } finally {
      setIsSavingSalon(false);
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

  // Modificar campo de un servicio específico
  const handleUpdateServiceField = (index, field, value) => {
    setSalonServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Agregar nuevo servicio al catálogo
  const handleAddService = () => {
    const newService = {
      id: `srv-${Date.now()}`,
      name: 'Nuevo Corte o Combo',
      shortName: 'Nuevo Servicio',
      price: 25000,
      duration: 30,
      icon: '✂️',
      description: 'Servicio personalizado'
    };
    setSalonServices(prev => [newService, ...prev]);
  };

  // Eliminar un servicio
  const handleDeleteService = (index) => {
    setSalonServices(prev => prev.filter((_, idx) => idx !== index));
  };

  // Restablecer catálogo a los sugeridos tradicionales
  const handleResetServicesToDefault = () => {
    setSalonServices(JSON.parse(JSON.stringify(TRADITIONAL_SERVICES)));
    showSuccessAlert('Catálogo Restablecido', 'Se han restablecido los cortes y precios sugeridos de barbería tradicional.');
  };

  // Guardar catálogo de servicios en la base de datos y Firestore
  const handleSaveServices = async (e) => {
    e?.preventDefault();
    if (!salonServices || salonServices.length === 0) {
      showErrorAlert('Catálogo Vacío', 'Debes tener al menos un servicio o corte configurado.');
      return;
    }

    for (const s of salonServices) {
      if (!s.name || !s.name.trim()) {
        showErrorAlert('Título Requerido', 'Todos los cortes o servicios deben tener un nombre o título.');
        return;
      }
      if (Number(s.price) < 0 || isNaN(Number(s.price))) {
        showErrorAlert('Precio Inválido', `El precio de "${s.name}" debe ser un valor válido.`);
        return;
      }
    }

    try {
      setIsSavingServices(true);
      const cleaned = salonServices.map((s, idx) => ({
        id: s.id || `srv-${idx}-${Date.now()}`,
        name: s.name.trim(),
        shortName: (s.shortName || s.name).trim(),
        price: Math.max(0, Math.round(Number(s.price))),
        duration: Math.max(5, Math.round(Number(s.duration || 30))),
        icon: s.icon || '✂️',
        description: (s.description || '').trim()
      }));

      await updateCompanySettings({
        services: cleaned,
        slotInterval: Number(salonSlotInterval || 30),
        bufferTime: Number(salonBufferTime || 0)
      });
      await showSuccessAlert(
        '¡Cortes & Precios Guardados!',
        'Las tarifas y títulos fueron sincronizados en la base de datos y Firestore. Ya están activos en tu agenda y la web de reservas.'
      );
    } catch (err) {
      showErrorAlert('Error al guardar servicios', err.message || 'No se pudieron actualizar los cortes.');
    } finally {
      setIsSavingServices(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Centro de Configuración & Perfil"
      subtitle={`Administra tu perfil personal y la configuración de ${barbershopInfo?.name || 'tu cuenta'}`}
      maxWidth="max-w-2xl"
      minHeight="min-h-[520px] sm:min-h-[600px]"
    >
      <div className="space-y-5">
        {/* Selector de Pestañas Ejecutivo Segmentado */}
        <div className="grid grid-cols-4 p-1 bg-slate-100 dark:bg-noir-950 rounded-2xl border border-slate-200 dark:border-industrial-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-noir-850 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-industrial-700'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 shrink-0" />
            <span className="truncate hidden sm:inline">Mi Perfil</span>
            <span className="truncate sm:hidden">Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`py-2 px-1 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'identity'
                ? 'bg-white dark:bg-noir-850 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-industrial-700'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 shrink-0" />
            <span className="truncate hidden sm:inline">Identidad & Logo</span>
            <span className="truncate sm:hidden">Marca</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-white dark:bg-noir-850 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-industrial-700'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 shrink-0" />
            <span className="truncate hidden sm:inline">Cortes & Precios</span>
            <span className="truncate sm:hidden">Cortes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`py-2 px-1 sm:px-3 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'modules'
                ? 'bg-white dark:bg-noir-850 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-industrial-700'
                : 'text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400 shrink-0" />
            <span className="truncate">Módulos</span>
          </button>
        </div>

        {/* TAB 1: MI PERFIL PERSONAL */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6 animate-fadeIn">
            {/* Header del Perfil con Foto y Datos Clave */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar con botón de cámara */}
              <div className="relative group flex-shrink-0">
                <img
                  src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={displayName || 'Avatar'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/50 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                  title="Subir foto desde tu dispositivo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center sm:text-left min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                    {displayName || 'Usuario'}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isSuperAdmin
                      ? 'bg-amber-500/15 text-amber-800 dark:text-gold-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {isSuperAdmin ? 'SUPERADMIN' : 'ADMINISTRADOR'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-industrial-400 font-mono mt-0.5 truncate flex items-center justify-center sm:justify-start gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{currentUser?.email || 'Sin correo registrado'}</span>
                </p>
                <p className="text-[11px] text-slate-600 dark:text-industrial-300 mt-1 italic">
                  {userBio || 'Especialista en estilismo profesional y gestión de salón'}
                </p>
              </div>
            </div>

            {/* Opciones para cambiar Foto de Perfil */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-600 dark:text-gold-400" />
                  Foto de Perfil & Avatar
                </span>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80');
                      setAvatarUploadFeedback(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white cursor-pointer transition-colors"
                  >
                    Restablecer
                  </button>
                )}
              </label>

              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-industrial-700 bg-white dark:bg-noir-900 hover:border-amber-500 dark:hover:border-amber-500 transition-colors flex items-center gap-3 text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-gold-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Subir Foto Personal
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-industrial-400 truncate">
                      PNG, JPG, WebP (Optimizado al instante)
                    </div>
                  </div>
                </button>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-industrial-800 bg-white dark:bg-noir-900 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-industrial-400 mb-1 flex items-center gap-1 font-semibold">
                    <LinkIcon className="w-3 h-3 text-amber-600 dark:text-gold-400" />
                    O pegar URL de imagen
                  </span>
                  <input
                    type="url"
                    value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarUploadFeedback(null);
                    }}
                    placeholder="https://ejemplo.com/mifoto.jpg"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-industrial-500 focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              {avatarUploadFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn font-medium">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{avatarUploadFeedback}</span>
                </div>
              )}

              {/* Presets de Avatares Barberos */}
              <div className="pt-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-industrial-400 block mb-2 font-bold">
                  Avatares de Estilistas Profesionales (1 Clic)
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATAR_PRESETS.map((p, idx) => {
                    const isSelected = avatarUrl === p.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(p.url);
                          setAvatarUploadFeedback(`Avatar seleccionado: ${p.label}`);
                        }}
                        className={`p-1 rounded-xl border transition-all flex flex-col items-center gap-1 cursor-pointer group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                            : 'border-slate-200 dark:border-industrial-800 hover:border-amber-500/40 bg-white dark:bg-noir-900'
                        }`}
                        title={p.label}
                      >
                        <img
                          src={p.url}
                          alt={p.label}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <span className="text-[8px] font-mono text-slate-600 dark:text-industrial-400 truncate w-full text-center">
                          {p.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Datos Personales */}
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-industrial-800">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-400 block">
                Datos de tu Cuenta
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. Victor Tamayo Pineda"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Teléfono / WhatsApp Móvil
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="Ej. +57 310 987 6543"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Especialidad o Breve Biografía
                  </label>
                  <input
                    type="text"
                    value={userBio}
                    onChange={(e) => setUserBio(e.target.value)}
                    placeholder="Ej. Master Barber especializado en cortes Fade y afeitado con toalla caliente"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
            </div>

            {/* Seguridad & Contraseña */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Seguridad de la Cuenta</div>
                  <div className="text-[10px] text-slate-500 dark:text-industrial-400">
                    Cambia o restablece tu contraseña mediante verificación segura por correo
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePasswordReset}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-noir-900 hover:bg-slate-300 dark:hover:bg-noir-800 text-slate-700 dark:text-slate-200 text-xs font-semibold font-mono transition-colors border border-slate-300 dark:border-industrial-700 cursor-pointer flex-shrink-0"
              >
                Cambiar Contraseña
              </button>
            </div>

            {/* Footer de Guardar Perfil */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-industrial-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:bg-slate-100 dark:hover:bg-noir-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:hover:from-gold-500 dark:hover:to-gold-300 dark:text-noir-950 font-bold text-xs uppercase tracking-wider shadow-sm dark:shadow-glow-gold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 font-mono"
              >
                {isSavingProfile ? 'Guardando...' : 'Guardar Mi Perfil'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: IDENTIDAD & LOGOTIPO DEL SALÓN */}
        {activeTab === 'identity' && (
          <form onSubmit={handleSaveSalon} className="space-y-6 animate-fadeIn">
            {/* Visualizador / Live Preview de Marca (100% Adaptativo y Nítido) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-industrial-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                  Previsualización de tu Marca
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-gold-300 border border-amber-500/20">
                  Vista en App
                </span>
              </div>

              {/* Simulación del Header / Navbar */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 flex items-center justify-between gap-3 shadow-xs transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {salonLogoUrl ? (
                    <img
                      src={salonLogoUrl}
                      alt={salonName || 'Logo'}
                      className="w-10 h-10 rounded-xl object-cover border border-amber-500/50 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-display font-black text-sm shadow-sm flex-shrink-0">
                      {salonName ? salonName.substring(0, 2).toUpperCase() : 'BP'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                        {salonName || 'Nombre de tu Barbería'}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-800 dark:text-gold-300 border border-amber-500/30 flex-shrink-0 font-bold">
                        ADMIN
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-industrial-400 flex items-center gap-1 truncate mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-amber-600 dark:text-gold-400 flex-shrink-0" />
                      <span>{salonMunicipality || 'Rionegro'}</span>
                      {salonSlogan && <span>• "{salonSlogan}"</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Opciones de Carga de Logotipo */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-600 dark:text-gold-400" />
                  Logotipo Oficial de la Barbería
                </span>
                {salonLogoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSalonLogoUrl('');
                      setLogoUploadFeedback(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400" />
                    Quitar logo (usar iniciales)
                  </button>
                )}
              </label>

              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-industrial-700 bg-white dark:bg-noir-900 hover:border-amber-500 dark:hover:border-amber-500 transition-colors flex items-center gap-3 text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-gold-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Subir Logo desde Celular o PC
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-industrial-400 truncate">
                      PNG, JPG, WebP (Optimizado al instante)
                    </div>
                  </div>
                </button>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-industrial-800 bg-white dark:bg-noir-900 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-industrial-400 mb-1 flex items-center gap-1 font-semibold">
                    <LinkIcon className="w-3 h-3 text-amber-600 dark:text-gold-400" />
                    O pegar enlace directo URL
                  </span>
                  <input
                    type="url"
                    value={salonLogoUrl.startsWith('data:') ? '' : salonLogoUrl}
                    onChange={(e) => {
                      setSalonLogoUrl(e.target.value);
                      setLogoUploadFeedback(null);
                    }}
                    placeholder="https://ejemplo.com/logo.png"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-industrial-500 focus:outline-none focus:border-amber-500 dark:focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              {logoUploadFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn font-medium">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{logoUploadFeedback}</span>
                </div>
              )}
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
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
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
                    value={salonSlogan}
                    onChange={(e) => setSalonSlogan(e.target.value)}
                    placeholder="Ej. Estilo, Tradición & Vanguardia"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      WhatsApp de Atención / Reservas
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono">
                      🇨🇴 Válido 322... o 57322...
                    </span>
                  </div>
                  <div className="flex items-center rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 focus-within:border-gold-500 overflow-hidden shadow-2xs">
                    <span className="px-3 py-2 text-xs font-mono font-bold text-slate-600 dark:text-industrial-300 bg-slate-100 dark:bg-noir-950 border-r border-slate-200 dark:border-industrial-800 flex items-center gap-1 select-none shrink-0">
                      🇨🇴 +57
                    </span>
                    <input
                      type="tel"
                      value={cleanDisplayPhone(salonWhatsapp)}
                      onChange={(e) => setSalonWhatsapp(e.target.value.replace(/\D/g, ''))}
                      placeholder="322 546 6673"
                      className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-white text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Municipio / Ciudad
                  </label>
                  <input
                    type="text"
                    value={salonMunicipality}
                    onChange={(e) => setSalonMunicipality(e.target.value)}
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
                    value={salonAddress}
                    onChange={(e) => setSalonAddress(e.target.value)}
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
                <span>Ver página pública</span>
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
                  disabled={isSavingSalon}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:hover:from-gold-500 dark:hover:to-gold-300 dark:text-noir-950 font-bold text-xs uppercase tracking-wider shadow-sm dark:shadow-glow-gold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 font-mono"
                >
                  {isSavingSalon ? 'Guardando...' : 'Guardar Identidad'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: SERVICIOS & PRECIOS DE LA EMPRESA */}
        {activeTab === 'services' && (
          <form onSubmit={handleSaveServices} className="space-y-4 animate-fadeIn">
            {/* Header de Gestión de Cortes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-amber-600 dark:text-gold-400" />
                    <span>Catálogo de Cortes, Barbas & Tarifas</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-800 dark:text-gold-300 border border-amber-500/30">
                    {salonServices.length} Servicios
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-industrial-400 mt-1 leading-relaxed">
                  Personaliza los nombres de tus cortes, duraciones y precios en pesos ($COP). Se actualizarán en la agenda y en la web de reservas.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetServicesToDefault}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-300 hover:bg-slate-100 dark:hover:bg-noir-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Restablecer cortes a los tradicionales sugeridos"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Restablecer</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Agregar Corte</span>
                </button>
              </div>
            </div>

            {/* Configuración de Cadencia de Agenda e Intervalo */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-slate-800 dark:text-white uppercase font-mono tracking-wider flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                  Cadencia Base de Agenda (Intervalo de Turnos)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-industrial-400 font-medium">
                  Define el ritmo entre citas del salón
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SLOT_INTERVAL_OPTIONS.map((opt) => {
                  const isSelected = salonSlotInterval === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSalonSlotInterval(opt.value)}
                      className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 text-slate-950 dark:text-noir-950 font-bold border-amber-500 dark:border-gold-400 shadow-sm dark:shadow-glow-gold'
                          : 'bg-white dark:bg-noir-900 border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-industrial-300 hover:border-gold-500/40 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-center gap-1">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </div>
                      <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-slate-950 dark:text-noir-900 font-semibold' : 'text-slate-400 dark:text-industrial-400'}`}>
                        {opt.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Colchón / Preparación entre Clientes */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-industrial-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Colchón entre citas: </span>
                  <span className="text-slate-500 dark:text-industrial-400 text-[11px] block sm:inline">
                    (Desinfección de navaja y descanso de máquinas)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {BUFFER_TIME_OPTIONS.map((buf) => {
                    const isSelected = salonBufferTime === buf.value;
                    return (
                      <button
                        key={buf.value}
                        type="button"
                        onClick={() => setSalonBufferTime(buf.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-900 dark:bg-gold-500/20 dark:text-gold-300 border border-amber-500/40 dark:border-gold-500/40 font-bold'
                            : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-white'
                        }`}
                      >
                        {buf.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lista Scrollable de Cortes y Servicios */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {salonServices.map((srv, idx) => {
                const popularEmojis = ['✂️', '🧔', '💈', '👑', '✨', '🔥', '⭐', '🧼', '🍯', '⚡', '😎', '🦁'];

                return (
                  <div
                    key={srv.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 transition-colors shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Selector Rápido de Emoji */}
                      <div className="relative group shrink-0">
                        <span className="w-9 h-9 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 flex items-center justify-center text-lg shadow-2xs select-none cursor-pointer">
                          {srv.icon || '✂️'}
                        </span>
                        <div className="hidden group-hover:flex absolute left-0 top-full mt-1 p-1 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-xl shadow-xl z-50 gap-1 flex-wrap w-44">
                          {popularEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleUpdateServiceField(idx, 'icon', emoji)}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-noir-800 text-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nombre Principal del Corte */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          value={srv.name}
                          onChange={(e) => handleUpdateServiceField(idx, 'name', e.target.value)}
                          placeholder="Nombre del servicio (ej. Corte Clásico, Skin Fade, Barba)"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                        />
                      </div>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDeleteService(idx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer shrink-0"
                        title="Eliminar este servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Precios, Duración y Descripción */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200/60 dark:border-industrial-800/60">
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-industrial-400 block mb-1">
                          Precio ($ COP)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-mono font-bold text-amber-600 dark:text-gold-400">
                            $
                          </span>
                          <input
                            type="number"
                            required
                            min="0"
                            step="500"
                            value={srv.price}
                            onChange={(e) => handleUpdateServiceField(idx, 'price', Number(e.target.value))}
                            className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-industrial-400 block mb-1">
                          Duración
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="5"
                            step="5"
                            value={srv.duration || 30}
                            onChange={(e) => handleUpdateServiceField(idx, 'duration', Number(e.target.value))}
                            className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400">
                            min
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-industrial-400 block mb-1">
                          Detalle / Resumen
                        </label>
                        <input
                          type="text"
                          value={srv.description || ''}
                          onChange={(e) => handleUpdateServiceField(idx, 'description', e.target.value)}
                          placeholder="Opcional (ej. Incluye lavado)"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-[11px] text-slate-700 dark:text-industrial-300 placeholder-slate-400 focus:outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer con Botón Guardar Catálogo */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-industrial-800 gap-3">
              <span className="text-xs text-slate-500 dark:text-industrial-400 font-mono hidden sm:inline">
                💡 Los cambios se sincronizan en tiempo real
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:bg-slate-100 dark:hover:bg-noir-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isSavingServices}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:hover:from-gold-500 dark:hover:to-gold-300 dark:text-noir-950 font-bold text-xs uppercase tracking-wider shadow-sm dark:shadow-glow-gold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 font-mono"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingServices ? 'Guardando...' : 'Guardar Cortes & Precios'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 4: MÓDULOS DEL SISTEMA */}
        {activeTab === 'modules' && (
          <div className="space-y-4 animate-fadeIn">
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
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 dark:bg-gradient-to-r dark:from-gold-600 dark:to-gold-400 dark:hover:from-gold-500 dark:hover:to-gold-300 dark:text-noir-950 font-bold text-xs uppercase tracking-wider shadow-sm dark:shadow-glow-gold transition-all cursor-pointer font-mono"
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
