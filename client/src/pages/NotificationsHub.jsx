import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { showErrorAlert, showSuccessAlert } from '../lib/swal';
import {
  Bell,
  MessageSquare,
  Mail,
  Webhook,
  Send,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Code2,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export const NotificationsHub = () => {
  const { tenantId } = useBarbershop();
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test form state
  const [testPhone, setTestPhone] = useState('+34 600 123 456');
  const [testName, setTestName] = useState('Roberto Casado');
  const [testTrigger, setTestTrigger] = useState('BOOKING_CONFIRMED');
  const [testing, setTesting] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState('');

  const defaultSettings = {
    whatsappActive: true,
    senderPhone: '+57 300 000 0000',
    templates: {
      BOOKING_CONFIRMED: 'Hola {client_name}, tu cita en {barber_shop} con {barber_name} está confirmada para el {date} a las {time}.',
      REMINDER_2_HOURS: 'Hola {client_name}, te recordamos tu cita hoy a las {time} con {barber_name}.',
      REVIEW_REQUEST: '¡Gracias por visitarnos {client_name}! Califícanos en Google.'
    }
  };

  const fetchHubData = async () => {
    if (!tenantId) {
      setSettings(defaultSettings);
      setLogs([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        api.getNotificationSettings(tenantId),
        api.getNotificationLogs(tenantId)
      ]);

      if (settingsRes && settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      } else {
        setSettings(defaultSettings);
      }

      if (logsRes && logsRes.success) setLogs(logsRes.data || []);
      else setLogs([]);
    } catch (err) {
      console.error('Error al cargar centro de notificaciones:', err);
      setSettings(defaultSettings);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [tenantId]);

  const handleToggleChannel = (channelKey) => {
    setSettings(prev => ({
      ...prev,
      [channelKey]: !prev[channelKey]
    }));
  };

  const handleToggleTrigger = (triggerKey) => {
    setSettings(prev => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        [triggerKey]: {
          ...prev.triggers[triggerKey],
          active: !prev.triggers[triggerKey].active
        }
      }
    }));
  };

  const handleTemplateChange = (triggerKey, text) => {
    setSettings(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [triggerKey]: text
      }
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateNotificationSettings(tenantId, settings);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      showErrorAlert('Error de configuración', err.message || 'Error al guardar la configuración');
    }
  };

  const handleExecuteTest = async (e) => {
    e.preventDefault();
    try {
      setTesting(true);
      setTestSuccessMessage('');
      const res = await api.testDispatchNotification(tenantId, {
        triggerType: testTrigger,
        testPhone,
        testName
      });
      if (res.success) {
        setTestSuccessMessage('¡Notificación enviada exitosamente! Registro añadido a la auditoría.');
        fetchHubData();
        setTimeout(() => setTestSuccessMessage(''), 4000);
      }
    } catch (err) {
      showErrorAlert('Error en prueba', 'No se pudo enviar la notificación de prueba.');
    } finally {
      setTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-20 text-center font-mono text-xs text-industrial-400 animate-pulse">
        Cargando centro de automatizaciones & webhooks...
      </div>
    );
  }

  const triggersList = [
    { key: 'BOOKING_CONFIRMED', name: 'Confirmación Inmediata de Turno', timing: 'Al confirmar cita' },
    { key: 'REMINDER_2_HOURS', name: 'Recordatorio Previo de Cita', timing: '2 horas antes del turno' },
    { key: 'REVIEW_REQUEST', name: 'Petición de Reseña en Google', timing: '1 hora después del corte' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-industrial-800">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
            <Bell className="w-6 h-6 text-gold-400" />
            Centro de Notificaciones & Automatizaciones
          </h2>
          <p className="text-xs text-industrial-400 mt-1">
            Avisos automáticos por WhatsApp Cloud, recordatorios anti-olvido y webhooks para Zapier/Make.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs shadow-glow-gold transition-all"
        >
          <Save className="w-4 h-4" />
          Guardar Ajustes
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          ¡Configuración de automatizaciones y plantillas guardada exitosamente!
        </div>
      )}

      {/* Canales Maestros (Toggles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Channel */}
        <div className={`p-5 rounded-2xl border transition-all ${settings.whatsappEnabled ? 'bg-noir-900 border-gold-500/40 shadow-glow-subtle' : 'bg-noir-900/60 border-industrial-800'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">WhatsApp Cloud</h4>
                <span className="text-[10px] text-industrial-400">Mensajería Directa</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.whatsappEnabled}
              onChange={() => handleToggleChannel('whatsappEnabled')}
              className="w-5 h-5 rounded border-industrial-700 text-gold-500 focus:ring-gold-500 bg-noir-950 cursor-pointer"
            />
          </div>
          <p className="text-xs text-industrial-400 leading-relaxed">
            Envía avisos oficiales sin que el barbero deba escribir manualmente desde su móvil.
          </p>
        </div>

        {/* Email Channel */}
        <div className={`p-5 rounded-2xl border transition-all ${settings.emailEnabled ? 'bg-noir-900 border-gold-500/40 shadow-glow-subtle' : 'bg-noir-900/60 border-industrial-800'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Email Confirmations</h4>
                <span className="text-[10px] text-industrial-400">Tickets & Calendario</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={() => handleToggleChannel('emailEnabled')}
              className="w-5 h-5 rounded border-industrial-700 text-gold-500 focus:ring-gold-500 bg-noir-950 cursor-pointer"
            />
          </div>
          <p className="text-xs text-industrial-400 leading-relaxed">
            Confirmaciones con archivo adjunto `.ics` para añadir la cita a Google Calendar o iPhone.
          </p>
        </div>

        {/* Webhooks Channel */}
        <div className={`p-5 rounded-2xl border transition-all ${settings.webhookEnabled ? 'bg-noir-900 border-gold-500/40 shadow-glow-subtle' : 'bg-noir-900/60 border-industrial-800'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Webhooks Salientes</h4>
                <span className="text-[10px] text-industrial-400">Zapier / Make / API</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.webhookEnabled}
              onChange={() => handleToggleChannel('webhookEnabled')}
              className="w-5 h-5 rounded border-industrial-700 text-gold-500 focus:ring-gold-500 bg-noir-950 cursor-pointer"
            />
          </div>
          <p className="text-xs text-industrial-400 leading-relaxed">
            Transmite eventos en JSON hacia tus aplicaciones o CRMs externos en tiempo real.
          </p>
        </div>
      </div>

      {/* URL del Webhook si está activo */}
      {settings.webhookEnabled && (
        <div className="bg-noir-900 border border-purple-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs text-purple-300">
            <Code2 className="w-4 h-4 text-purple-400" />
            <span className="font-semibold">Endpoint Webhook Destino (POST):</span>
          </div>
          <input
            type="url"
            placeholder="https://hooks.zapier.com/..."
            value={settings.webhookUrl || ''}
            onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
            className="flex-1 max-w-lg bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
          />
        </div>
      )}

      {/* Configuración de Disparadores & Plantillas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white text-base">
              Disparadores & Plantillas de Mensajes
            </h3>
            <span className="text-[11px] font-mono text-gold-400">
              Variables: &#123;&#123;client_name&#125;&#125;, &#123;&#123;barber_name&#125;&#125;, &#123;&#123;time&#125;&#125;, &#123;&#123;date&#125;&#125;
            </span>
          </div>

          <div className="space-y-4">
            {triggersList.map((trig) => {
              const triggerState = settings.triggers?.[trig.key] || { active: false };
              const currentTemplate = settings.templates?.[trig.key] || '';

              return (
                <div key={trig.key} className="bg-noir-900 border border-industrial-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${triggerState.active ? 'bg-emerald-400' : 'bg-industrial-600'}`}></span>
                      <h4 className="font-bold text-white text-sm">{trig.name}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-industrial-400">{trig.timing}</span>
                      <input
                        type="checkbox"
                        checked={triggerState.active}
                        onChange={() => handleToggleTrigger(trig.key)}
                        className="rounded border-industrial-700 text-gold-500 focus:ring-gold-500 bg-noir-950 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows="3"
                      value={currentTemplate}
                      onChange={(e) => handleTemplateChange(trig.key, e.target.value)}
                      className="w-full bg-noir-950 border border-industrial-800 rounded-xl p-3 text-xs font-sans text-slate-200 focus:outline-none focus:border-gold-500 leading-relaxed"
                    ></textarea>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de Prueba de Disparo Manual */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-noir-900 border border-industrial-800 rounded-2xl p-6 shadow-xl">
            <h3 className="font-display font-bold text-white text-base mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-gold-400" />
              Simular / Probar Disparo
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Envía una notificación de prueba para verificar la interpolación de variables.
            </p>

            {testSuccessMessage && (
              <div className="p-3 mb-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {testSuccessMessage}
              </div>
            )}

            <form onSubmit={handleExecuteTest} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                  Evento / Disparador
                </label>
                <select
                  value={testTrigger}
                  onChange={(e) => setTestTrigger(e.target.value)}
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="BOOKING_CONFIRMED">Confirmación Inmediata de Turno</option>
                  <option value="REMINDER_2_HOURS">Recordatorio 2 Horas Antes</option>
                  <option value="REVIEW_REQUEST">Petición de Reseña en Google</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                  Nombre Cliente de Prueba
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-industrial-400 uppercase mb-1">
                  WhatsApp / Teléfono Destino
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold-500"
                />
              </div>

              <button
                type="submit"
                disabled={testing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs shadow-glow-gold hover:opacity-95 transition-opacity disabled:opacity-50 mt-2"
              >
                {testing ? 'Disparando...' : 'Lanzar Prueba en Vivo'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Registro de Auditoría de Envíos en Vivo (Dispatch Log Table) */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-400" />
            <h3 className="font-display font-bold text-white text-base">
              Auditoría de Notificaciones Emitidas
            </h3>
          </div>
          <span className="text-xs text-industrial-400 font-mono">
            Últimos registros en tiempo real: {logs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-noir-950/80 text-industrial-400 border-b border-industrial-800 font-semibold tracking-wider font-mono">
              <tr>
                <th className="px-6 py-3.5">Canal</th>
                <th className="px-6 py-3.5">Evento</th>
                <th className="px-6 py-3.5">Destinatario</th>
                <th className="px-6 py-3.5">Contenido Enviado</th>
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-industrial-500 font-mono">
                    Aún no se han emitido notificaciones en esta sesión.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-noir-850/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${log.type === 'WHATSAPP' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          log.type === 'EMAIL' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                            'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}>
                        {log.type}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-gold-400 text-xs">
                      {log.trigger}
                    </td>

                    <td className="px-6 py-4 text-white font-medium">
                      {log.recipientName}
                      <span className="block text-[10px] text-industrial-400 font-mono">{log.recipientPhone}</span>
                    </td>

                    <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                      {log.message}
                    </td>

                    <td className="px-6 py-4 font-mono text-industrial-400 text-[11px]">
                      {new Date(log.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3 h-3" /> {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

