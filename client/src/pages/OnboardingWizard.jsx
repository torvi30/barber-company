import React, { useState } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import {
  Scissors,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  User,
  Mail,
  Zap,
  Gift,
  CalendarCheck2,
  RefreshCw
} from 'lucide-react';

// Servicios y productos precargados por defecto al crear una barbería
const BARBERSHOP_DEFAULTS = {
  services: [
    { id: 'srv-1', name: 'Skin Fade + Ritual de Toalla Caliente', duration: 45, price: 35000, commissionRate: 0.50 },
    { id: 'srv-2', name: 'Corte Clásico a Tijera & Peinado', duration: 40, price: 30000, commissionRate: 0.50 },
    { id: 'srv-3', name: 'Perfilado de Barba con Navaja & Óleo', duration: 25, price: 20000, commissionRate: 0.50 },
    { id: 'srv-4', name: 'Black Mask Facial Puntos Negros', duration: 20, price: 18000, commissionRate: 0.40 },
    { id: 'srv-5', name: 'Corte + Barba Combo Express', duration: 50, price: 42000, commissionRate: 0.50 }
  ]
};

const MUNICIPIOS = [
  'Marinilla', 'Rionegro', 'Medellín', 'Envigado', 'El Carmen de Viboral',
  'La Ceja', 'Guarne', 'Itagüí', 'Sabaneta', 'Bogotá D.C.',
  'Cali', 'Barranquilla', 'Bucaramanga', 'Pereira', 'Otra Ciudad'
];

export const OnboardingWizard = ({ onComplete, onCancel }) => {
  const { registerNewTenant } = useBarbershop();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    municipality: 'Marinilla',
    address: '',
    whatsapp: '',
    ownerName: '',
    ownerEmail: '',
    currency: 'COP'
  });

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Ingresa el nombre de tu barbería para continuar.');
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await api.registerNewBusiness({
        ...formData,
        businessType: 'barbershop'
      });

      if (res.success && res.data?.tenant) {
        await registerNewTenant(res.data.tenant);
        if (onComplete) onComplete(res.data.tenant);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar la barbería. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 my-6 animate-fadeIn">
      {/* Barra de Progreso */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-mono text-industrial-400 mb-2">
          <span className="text-gold-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-gold-400" />
            Alta de Nueva Barbería • Asistente en 3 Pasos
          </span>
          <span>Paso {step} de 3</span>
        </div>
        <div className="h-1.5 w-full bg-noir-900 rounded-full overflow-hidden border border-industrial-800">
          <div
            className="h-full bg-gradient-to-r from-gold-500 to-amber-400 transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-5 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* PASO 1: Presentación */}
      {step === 1 && (
        <div className="space-y-6 animate-fadeIn text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-gold-600 to-gold-400 shadow-glow-gold mx-auto">
            <Scissors className="w-9 h-9 text-noir-950" />
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <h2 className="text-3xl font-display font-black text-white leading-tight">
              ¡Bienvenido a<br />
              <span className="text-gold-400">BarberPulse OS!</span>
            </h2>
            <p className="text-sm text-industrial-300 leading-relaxed">
              Vamos a configurar tu barbería en 2 minutos. Obtendrás un espacio completamente aislado con agenda en tiempo real, cierres de caja, comisiones automáticas y recordatorios por WhatsApp.
            </p>
          </div>

          {/* Garantías */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-left pt-2">
            {[
              { icon: '💈', label: '14 Días Gratis', desc: 'Sin tarjeta de crédito' },
              { icon: '⚡', label: 'Listo en 2 minutos', desc: 'Servicios precargados' },
              { icon: '🔒', label: 'Datos aislados 100%', desc: 'Multi-tenant seguro' }
            ].map((f) => (
              <div key={f.label} className="p-3.5 rounded-2xl bg-noir-900 border border-industrial-800 flex gap-3">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <div className="font-bold text-white">{f.label}</div>
                  <div className="text-[11px] text-industrial-400">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-industrial-400 hover:text-white border border-industrial-800 hover:border-industrial-700 transition-colors"
              >
                Volver al Panel
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-noir-950 font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-glow-gold transition-all"
            >
              Registrar Mi Barbería
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Datos del Negocio */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-2xl font-display font-black text-white">
              Datos de Tu Barbería
            </h2>
            <p className="text-xs text-industrial-400 mt-1">
              Esta información aparecerá en tu landing pública y en los mensajes de WhatsApp a tus clientes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-noir-900 border border-industrial-800 space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-mono font-semibold text-industrial-300 mb-1.5 uppercase tracking-wide">
                Nombre Comercial de la Barbería *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Black & Gold Barber, El Capitán, Fades & Blades..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-500 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>

            {/* Municipio + Dirección */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-industrial-300 mb-1.5 uppercase tracking-wide">
                  Municipio / Ciudad *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.municipality}
                    onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
                  >
                    {MUNICIPIOS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-industrial-300 mb-1.5 uppercase tracking-wide">
                  Dirección Exacta
                </label>
                <input
                  type="text"
                  placeholder="Cra 50 #49-20, Parque Principal"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-500 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>

            {/* WhatsApp + Dueño */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-industrial-300 mb-1.5 uppercase tracking-wide">
                  WhatsApp del Negocio *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+57 300 123 4567"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-500 focus:outline-none focus:border-gold-500 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-industrial-300 mb-1.5 uppercase tracking-wide">
                  Nombre del Dueño / Administrador
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ej: Carlos Ruiz, Juan FadeMaster..."
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-500 focus:outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-mono font-semibold text-industrial-300 mb-1.5 uppercase tracking-wide">
                Correo de Notificaciones & Facturas
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="contacto@tubarberia.com"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-500 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-industrial-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
            <button
              type="submit"
              className="px-7 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-gold transition-all"
            >
              Revisar y Lanzar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* PASO 3: Resumen y Confirmación */}
      {step === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-500 to-amber-300 mx-auto flex items-center justify-center shadow-glow-gold">
              <Gift className="w-7 h-7 text-noir-950" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              ¡Todo listo para encender tu barbería!
            </h2>
            <p className="text-xs text-industrial-400 max-w-sm mx-auto">
              Revisa el resumen, confirma y en segundos tendrás tu espacio operativo activo con 14 días del Plan Pro gratis.
            </p>
          </div>

          {/* Resumen */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-noir-900 to-noir-950 border border-gold-500/40 shadow-glow-gold/10 space-y-5">
            {/* Cabecera */}
            <div className="flex items-start justify-between pb-4 border-b border-industrial-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-gold-400 mb-1 uppercase">
                  <Scissors className="w-3.5 h-3.5" /> BARBERÍA
                </div>
                <h3 className="text-xl font-display font-black text-white">{formData.name}</h3>
                <p className="text-xs text-industrial-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-industrial-500" />
                  {formData.municipality}{formData.address ? ` • ${formData.address}` : ''}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex-shrink-0">
                14 DÍAS GRATIS
              </span>
            </div>

            {/* Servicios a precargar */}
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarCheck2 className="w-4 h-4 text-gold-400" />
                Servicios listos para agendar desde el día 1:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {BARBERSHOP_DEFAULTS.services.map((srv) => (
                  <div key={srv.id} className="p-2.5 rounded-xl bg-noir-950 border border-industrial-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-200 font-medium block">{srv.name}</span>
                      <span className="text-industrial-500 text-[10px]">{srv.duration} min</span>
                    </div>
                    <span className="font-mono text-gold-400 font-bold text-[11px] flex-shrink-0 ml-2">
                      ${srv.price.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Qué incluye */}
            <div className="p-3.5 rounded-xl bg-gold-500/8 border border-gold-500/20 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-gold-400 mb-1.5">
                <Zap className="w-4 h-4" /> Plan Pro Black — 14 días gratis, sin tarjeta
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-industrial-300">
                {[
                  'Agenda en tiempo real (Socket.io)',
                  'Recordatorios WhatsApp automáticos',
                  'Cierre de caja & arqueo diario',
                  'Comisiones por barbero',
                  'Inventario de productos',
                  'CRM de Clientes Fichas VIP',
                  'Analíticas & Heatmap de horas',
                  'Landing pública de reservas'
                ].map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-gold-400 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-industrial-400 hover:text-white flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Modificar Datos
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleFinish}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-noir-950 font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-glow-gold transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creando tu Barbería...
                </>
              ) : (
                <>
                  Lanzar Ahora
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;
