import React, { useState, useEffect } from 'react';
import { Scissors, Crown, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

/**
 * Pantalla de Login para BarberPulse OS
 * Dos modos: SuperAdmin (control total) y Owner (una barbería)
 */
export const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('owner'); // 'owner' | 'superadmin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detectar invitaciones por URL (?email=...&tenant=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setMode('owner');
    }
  }, []);

  // Credenciales de demo (en producción real vendrían de Firebase Auth)
  const DEMO_CREDENTIALS = {
    superadmin: { email: 'superadmin@barberpulse.io', password: 'SuperAdmin2026', role: 'SUPERADMIN', name: 'Control Central' },
    owner: [
      { email: 'mateo@blackgoldbarber.com',  password: 'Demo2026', role: 'OWNER', tenantId: 'demo-barbershop-01', name: 'Mateo Osorio' },
      { email: 'julian@elcapitanbarber.com', password: 'Demo2026', role: 'OWNER', tenantId: 'el-capitan-02',      name: 'Julián Gómez' },
      { email: 'alejandro@elitecuts.co',     password: 'Demo2026', role: 'OWNER', tenantId: 'elite-cuts-medellin', name: 'Alejandro Ramírez' },
    ]
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      try {
        const res = await api.loginUser({
          email: email.trim(),
          password,
          role: mode === 'superadmin' ? 'SUPERADMIN' : 'OWNER'
        });
        if (res.success && res.user) {
          onLogin(res.user);
          return;
        }
      } catch (apiErr) {
        console.warn('API login error, intentando demo local:', apiErr.message);
      }

      // Fallback con credenciales demo locales
      if (mode === 'superadmin') {
        const sa = DEMO_CREDENTIALS.superadmin;
        if (email.toLowerCase() === sa.email.toLowerCase() && password === sa.password) {
          onLogin({ role: 'SUPERADMIN', name: sa.name, email });
        } else {
          setError('Credenciales de SuperAdmin incorrectas.');
        }
      } else {
        const owner = DEMO_CREDENTIALS.owner.find(
          o => o.email.toLowerCase() === email.toLowerCase().trim() && o.password === password
        );
        if (owner) {
          onLogin({ role: 'OWNER', name: owner.name, email, tenantId: owner.tenantId });
        } else {
          setError('Email o contraseña incorrectos. Revisa las credenciales de demo abajo.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => {
    setEmail(email);
    setPassword(password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-noir-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-600 to-gold-400 shadow-glow-gold mb-4">
            <span className="font-display font-black text-black text-2xl">BP</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white">BarberPulse OS</h1>
          <p className="text-sm text-industrial-400 mt-1">Sistema de Gestión para Barberías Profesionales</p>
        </div>

        {/* Selector de Modo */}
        <div className="flex gap-2 p-1 bg-noir-900 rounded-2xl border border-industrial-800 mb-6">
          <button
            type="button"
            onClick={() => { setMode('owner'); setError(''); setEmail(''); setPassword(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === 'owner'
                ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Dueño / Admin</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('superadmin'); setError(''); setEmail(''); setPassword(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === 'superadmin'
                ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>SuperAdmin</span>
          </button>
        </div>

        {/* Card de Login */}
        <div className={`bg-noir-900 border rounded-2xl p-6 shadow-2xl ${
          mode === 'superadmin' ? 'border-gold-500/40' : 'border-industrial-800'
        }`}>
          {mode === 'superadmin' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gold-500/10 border border-gold-500/30 mb-5">
              <Crown className="w-5 h-5 text-gold-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-gold-300">Acceso SuperAdmin — Casa Nodriza</p>
                <p className="text-[11px] text-industrial-400 mt-0.5">Gestiona todas las barberías, suscripciones y facturación desde este panel central.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-industrial-400 uppercase tracking-wider block mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={mode === 'superadmin' ? 'superadmin@barberpulse.io' : 'admin@tubarberia.com'}
                required
                className="w-full px-4 py-2.5 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-600 focus:outline-none focus:border-gold-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-industrial-400 uppercase tracking-wider block mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-11 bg-noir-950 border border-industrial-700 rounded-xl text-sm text-white placeholder-industrial-600 focus:outline-none focus:border-gold-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-amber-400 hover:to-gold-300 text-noir-950 font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-gold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-noir-900/60 border-t-noir-900 rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  {mode === 'superadmin' ? <Crown className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  <span>{mode === 'superadmin' ? 'Entrar a Casa Nodriza' : 'Entrar a Mi Barbería'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Credenciales de Demo */}
        <div className="mt-5 bg-noir-900/60 border border-industrial-800 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider font-mono mb-3">
            🔑 Credenciales de Demostración
          </p>

          <div className="space-y-2">
            {mode === 'superadmin' ? (
              <button
                type="button"
                onClick={() => fillDemo('superadmin@barberpulse.io', 'SuperAdmin2026')}
                className="w-full text-left p-2.5 rounded-xl bg-noir-950 border border-gold-500/20 hover:border-gold-500/50 transition-colors text-xs group"
              >
                <div className="flex items-center gap-2 text-gold-400 font-bold mb-1">
                  <Crown className="w-3.5 h-3.5" />
                  <span>SuperAdmin Central</span>
                </div>
                <div className="text-industrial-500 font-mono">superadmin@barberpulse.io / SuperAdmin2026</div>
              </button>
            ) : (
              DEMO_CREDENTIALS.owner.map((o) => (
                <button
                  key={o.tenantId}
                  type="button"
                  onClick={() => fillDemo(o.email, o.password)}
                  className="w-full text-left p-2.5 rounded-xl bg-noir-950 border border-industrial-800 hover:border-gold-500/30 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
                    <Scissors className="w-3 h-3 text-gold-500" />
                    <span>{o.name}</span>
                  </div>
                  <div className="text-industrial-500 font-mono">{o.email} / {o.password}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-industrial-600 mt-4 font-mono">
          BarberPulse OS v1.0 • SaaS Multi-Tenant • Cloud Firestore
        </p>
      </div>
    </div>
  );
};

