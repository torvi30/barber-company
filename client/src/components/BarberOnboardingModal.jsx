import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { saveFirestoreBarber } from '../services/firestoreService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { showSuccessAlert, showErrorAlert } from '../lib/swal';
import {
  Scissors,
  User,
  Phone,
  KeyRound,
  Sparkles,
  Camera,
  CheckCircle2,
  Plus,
  X,
  Upload
} from 'lucide-react';

const AVATAR_PRESETS = [
  { label: 'Fade / Corto', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=300&q=80' },
  { label: 'Pompadour / Largo', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=300&q=80' },
  { label: 'Afro / Rizado', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=300&q=80' }
];

const DEFAULT_SERVICES = [
  'Corte',
  'Barba',
  'Cejas',
  'Cera',
  'Corte y Barba',
  'Corte y Cejas',
  'Combo Completo'
];

export const BarberOnboardingModal = ({
  isOpen,
  onClose,
  tenantId,
  barbershopInfo,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [selectedServices, setSelectedServices] = useState(['Corte', 'Barba']);
  const [customService, setCustomService] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0].url);
  const [photoFeedback, setPhotoFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const shopName = barbershopInfo?.name || 'Imperio Barbershop';
  const effectiveTenantId = tenantId || barbershopInfo?.id || 'imperio-barbershop';

  const toggleService = (srv) => {
    setSelectedServices(prev =>
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  const handleAddCustom = () => {
    const trimmed = customService.trim();
    if (!trimmed) return;
    if (!selectedServices.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedServices(prev => [...prev, trimmed]);
    }
    setCustomService('');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFeedback('Subiendo foto...');
    try {
      const result = await uploadToCloudinary(file, 'barberos');
      if (result?.url) {
        setAvatar(result.url);
        setPhotoFeedback('✓ Foto cargada exitosamente');
      }
    } catch (err) {
      setPhotoFeedback('Error al subir: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      await showErrorAlert('Nombre Requerido', 'Por favor ingresa tu nombre completo o apodo profesional.');
      return;
    }

    const cleanPin = pin.replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) {
      await showErrorAlert('PIN Inválido', 'Tu PIN personal de acceso debe ser de 4 dígitos numéricos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const barberId = `barb_${Date.now()}`;
      const payload = {
        id: barberId,
        name: name.trim(),
        phone: phone.trim(),
        pin: cleanPin,
        commissionRate: 0.5,
        commissionPercent: 50,
        dailyTarget: 150000,
        specialties: selectedServices,
        avatar,
        status: 'AVAILABLE',
        role: 'barber',
        barbershopId: effectiveTenantId,
        barbershopName: shopName,
        createdAt: new Date().toISOString()
      };

      // 1. Guardar en Firestore directo (permitido por reglas)
      await saveFirestoreBarber(effectiveTenantId, payload);

      // 2. Intentar registrar en API backend
      api.createBarber(effectiveTenantId, payload).catch(() => {});

      // 3. Crear sesión local inmediata del sillón
      const sessionData = {
        ...payload,
        loginTimestamp: Date.now()
      };
      localStorage.setItem('barberpulse_barber_session', JSON.stringify(sessionData));

      // 4. Limpiar query params de la URL
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}

      await showSuccessAlert(
        `¡Bienvenido, ${name.split(' ')[0]}!`,
        `Tu sillón en ${shopName} ha sido activado con éxito.\n\nTu PIN de acceso es: ${cleanPin}\n\nTu sesión quedará guardada en este celular para que gestiones tus clientes y comisiones.`
      );

      if (onSuccess) {
        onSuccess(sessionData);
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      await showErrorAlert('Error al Activar Sillón', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Activa tu Sillón de Especialista"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner de Bienvenida */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-gold-500/10 to-transparent border border-amber-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-gold-400 flex items-center justify-center flex-shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-sm">
              Únete a {shopName}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-industrial-300 leading-tight mt-0.5">
              Ingresa tus datos una sola vez. Tu celular quedará vinculado a tu propio sillón de trabajo.
            </p>
          </div>
        </div>

        {/* Nombre del Barbero */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase mb-1">
            Tu Nombre Completo / Apodo *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Andrés 'Fader' Castro"
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-300 dark:border-industrial-750 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-400 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Teléfono Móvil */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase mb-1">
              WhatsApp / Teléfono *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 322 546 6673"
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-300 dark:border-industrial-750 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-gold-400 font-mono"
              />
            </div>
          </div>

          {/* PIN de 4 Dígitos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase">
                PIN de Acceso (4 Dígitos) *
              </label>
              <button
                type="button"
                onClick={() => setPin(String(Math.floor(1000 + Math.random() * 9000)))}
                className="text-[10px] text-amber-600 dark:text-gold-400 font-bold hover:underline cursor-pointer"
              >
                ⚡ Aleatorio
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-300 dark:border-industrial-750 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold tracking-widest text-center focus:outline-none focus:border-amber-500 dark:focus:border-gold-400"
              />
            </div>
          </div>
        </div>

        {/* Cortes y Servicios */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-white uppercase font-mono tracking-wider flex items-center justify-between">
            <span>¿Qué cortes y servicios realizas?</span>
            <span className="text-[10px] text-amber-600 dark:text-gold-400 font-normal">
              {selectedServices.length} seleccionados
            </span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_SERVICES.map((srv) => {
              const active = selectedServices.includes(srv);
              return (
                <button
                  key={srv}
                  type="button"
                  onClick={() => toggleService(srv)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    active
                      ? 'bg-amber-500 text-slate-950 dark:bg-gold-500 dark:text-noir-950 font-bold border border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-noir-900 border border-slate-300 dark:border-industrial-700 text-slate-700 dark:text-industrial-300 hover:border-amber-500'
                  }`}
                >
                  {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{srv}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder="Otro servicio (ej: Tinte, Diseño...)"
              className="flex-1 bg-white dark:bg-noir-900 border border-slate-300 dark:border-industrial-750 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-noir-800 hover:bg-amber-500 hover:text-slate-950 text-slate-800 dark:text-industrial-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* Foto de Perfil */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
              <span>Foto de Perfil</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-gold-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-amber-500/30"
            >
              <Upload className="w-3 h-3" />
              <span>Subir Mi Foto</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={avatar}
              alt="Avatar seleccionado"
              className="w-12 h-12 rounded-xl object-cover border-2 border-amber-500 shadow-sm flex-shrink-0"
            />
            <div className="flex-1 flex gap-2">
              {AVATAR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(p.url)}
                  className={`flex-1 p-1 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                    avatar === p.url
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-gold-300'
                      : 'border-slate-300 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:border-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {photoFeedback && (
            <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              {photoFeedback}
            </p>
          )}
        </div>

        {/* Botón de Envío */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-gold-600 via-amber-500 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-display font-black text-sm uppercase tracking-wider shadow-glow-gold hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{isSubmitting ? 'Activando Sillón...' : '🚀 ¡Activar Mi Sillón y Empezar!'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BarberOnboardingModal;
