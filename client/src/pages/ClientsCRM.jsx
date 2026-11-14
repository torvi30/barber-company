import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { showErrorAlert, showSuccessAlert } from '../lib/swal';
import {
  Users,
  Search,
  Award,
  Clock,
  Scissors,
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  FileText,
  UserPlus,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  AlertCircle,
  Plus
} from 'lucide-react';

export const ClientsCRM = () => {
  const { tenantId, barbers } = useBarbershop();
  const [clients, setClients] = useState([]);
  const [metrics, setMetrics] = useState({ totalClients: 0, vipClients: 0, dueForReminder: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');

  // Drawer / Modal de Ficha Técnica
  const [selectedClient, setSelectedClient] = useState(null);
  const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal Nuevo Cliente
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPreferredBarber, setNewPreferredBarber] = useState(barbers[0]?.id || 'barber-01');

  // Registro Manual de Visita / Historial
  const [isAddingVisitOpen, setIsAddingVisitOpen] = useState(false);
  const [visitService, setVisitService] = useState('Skin Fade + Barba');
  const [visitBarber, setVisitBarber] = useState(barbers[0]?.name || 'Carlos FadeMaster');
  const [visitPrice, setVisitPrice] = useState(35000);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitNotes, setVisitNotes] = useState('');
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.getClients(tenantId, searchTerm, selectedTier);
      if (res.success) {
        setClients(res.data || []);
        setMetrics(res.metrics || { totalClients: 0, vipClients: 0, dueForReminder: 0 });
      }
    } catch (err) {
      console.error('Error al cargar clientes CRM:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [tenantId, selectedTier]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClients();
  };

  const openStyleSheet = (client) => {
    setSelectedClient(client);
    setEditingStyle({
      haircutType: client.styleProfile?.haircutType || '',
      guardSides: client.styleProfile?.guardSides || '',
      topLength: client.styleProfile?.topLength || '',
      beardNotes: client.styleProfile?.beardNotes || '',
      productPreference: client.styleProfile?.productPreference || '',
      technicalNotes: client.styleProfile?.technicalNotes || ''
    });
    setSaveSuccess(false);
    setIsStyleSheetOpen(true);
  };

  const handleSaveStyleSheet = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await api.updateClientStyleProfile(tenantId, selectedClient.id, editingStyle);
      if (res.success) {
        setSaveSuccess(true);
        setSelectedClient(res.data);
        setClients(prev => prev.map(c => c.id === selectedClient.id ? res.data : c));
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      showErrorAlert('Error al guardar', err.message || 'Error al guardar la ficha técnica');
    }
  };

  const handleSendReminder = async (client) => {
    try {
      const res = await api.getWhatsAppReminder(tenantId, client.id);
      if (res.success && res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err) {
      showErrorAlert('Recordatorio de WhatsApp', 'Error al generar el recordatorio.');
    }
  };

  const handleAddVisit = async (e) => {
    e.preventDefault();
    if (!selectedClient?.id || !visitService.trim()) return;

    try {
      setIsSavingVisit(true);
      const res = await api.addClientVisit(tenantId, selectedClient.id, {
        service: visitService.trim(),
        barber: visitBarber || (barbers[0]?.name || 'Carlos FadeMaster'),
        price: Number(visitPrice) || 0,
        date: visitDate,
        notes: visitNotes.trim()
      });

      if (res.success && res.data) {
        setSelectedClient(res.data);
        setClients(prev => prev.map(c => c.id === selectedClient.id ? res.data : c));
        setIsAddingVisitOpen(false);
        setVisitNotes('');
        showSuccessAlert('¡Visita Registrada!', 'El servicio se ha guardado en el historial del cliente.');
      }
    } catch (err) {
      showErrorAlert('Error al registrar visita', err.message);
    } finally {
      setIsSavingVisit(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const assignedBarber = barbers.find(b => b.id === newPreferredBarber);
      const payload = {
        name: newName,
        phone: newPhone,
        email: newEmail,
        preferredBarberId: newPreferredBarber,
        preferredBarberName: assignedBarber ? assignedBarber.name : 'Carlos FadeMaster',
        styleProfile: {
          haircutType: 'Corte por definir en primera cita',
          guardSides: 'A convenir',
          topLength: 'A convenir',
          beardNotes: 'A convenir',
          productPreference: 'Pomada Mate',
          technicalNotes: 'Cliente registrado desde CRM'
        }
      };

      const res = await api.createClient(tenantId, payload);
      if (res.success) {
        setIsNewClientModalOpen(false);
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        fetchClients();
        showSuccessAlert('Cliente Registrado', `${newName} fue añadido con éxito al CRM.`);
      }
    } catch (err) {
      showErrorAlert('Error al registrar cliente', err.message);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-gold-500" />
            Clientes & CRM
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-industrial-400 mt-0.5">
            Ficha de corte, historial y fidelización VIP.
          </p>
        </div>

        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-noir-950 font-bold text-xs shadow-glow-gold transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Cliente</span>
        </button>
      </div>

      {/* KPI Cards: Grid de 3 columnas compactas */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatCard
          title="Directorio"
          value={metrics.totalClients}
          icon={Users}
          subtitle="Registrados"
        />

        <StatCard
          title="VIP"
          value={metrics.vipClients}
          icon={Award}
          highlight={true}
          subtitle="Fidelizados"
        />

        <StatCard
          title="Recordar"
          value={metrics.dueForReminder}
          icon={MessageCircle}
          subtitle=">25 días"
        />
      </div>

      {/* Directorio de Clientes con Filtros */}
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-industrial-800 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Buscador */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono de cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
            />
          </form>

          {/* Filtros por Segmento */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'VIP', label: 'VIP' },
              { id: 'REGULAR', label: 'Frecuentes' },
              { id: 'REENGAGEMENT_DUE', label: 'Por Re-enganchar' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedTier === t.id
                    ? 'bg-gold-500 text-noir-950 shadow-glow-gold'
                    : 'bg-slate-100 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vista Móvil (Tarjetas Limpias y Táctiles) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-industrial-800/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-industrial-500 font-mono">
                Cargando directorio...
              </div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-industrial-500 font-mono">
                No se encontraron clientes.
              </div>
            ) : (
              clients.map((client) => {
                const rawPhone = (client.phone || '').replace(/[^\d]/g, '');
                const cleanPhone = rawPhone.length === 10 && rawPhone.startsWith('3') ? `57${rawPhone}` : rawPhone;
                const waUrl = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${client.name} 💈 te saludamos de BarberPulse. ¿Te gustaría agendar tu próximo corte?`)}`
                  : null;

                return (
                  <div key={client.id} className="p-4 space-y-3 bg-white dark:bg-transparent">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{client.name}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                            client.tier === 'VIP'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-gold-400 border border-amber-500/30 dark:border-gold-500/30'
                              : client.tier === 'REENGAGEMENT_DUE'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-slate-100 dark:bg-industrial-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-industrial-700'
                          }`}>
                            {client.tier === 'VIP' ? '★ VIP' : client.tier === 'REENGAGEMENT_DUE' ? 'Avisar' : 'Frecuente'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-gold-400 font-mono mt-0.5 flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          {client.styleProfile?.haircutType || 'Sin ficha de corte'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-gold-400">
                          ${Number(client.totalSpent || 0).toFixed(0)}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-industrial-500 block font-mono">
                          {client.totalVisits || 1} visitas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-industrial-400 pt-2 border-t border-slate-100 dark:border-industrial-800/40">
                      <span className="font-mono">📞 {client.phone}</span>

                      <div className="flex items-center gap-2">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          </a>
                        )}

                        <button
                          onClick={() => openStyleSheet(client)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 dark:bg-gold-500/10 border border-amber-500/30 dark:border-gold-500/30 text-amber-700 dark:text-gold-400 text-xs font-semibold"
                        >
                          Ficha
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vista Desktop (Tabla Tradicional) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-noir-950/80 text-slate-500 dark:text-industrial-400 border-b border-slate-200 dark:border-industrial-800 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-6 py-3.5">Contacto</th>
                  <th className="px-6 py-3.5">Segmento</th>
                  <th className="px-6 py-3.5">Visitas</th>
                  <th className="px-6 py-3.5">Gasto Total</th>
                  <th className="px-6 py-3.5">Última Visita</th>
                  <th className="px-6 py-3.5">Barbero Habitual</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-industrial-800/60 font-sans text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400 dark:text-industrial-500 font-mono">
                      Cargando directorio de clientes...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400 dark:text-industrial-500 font-mono">
                      No se encontraron clientes coincidentes.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => {
                    return (
                      <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-noir-850/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{client.name}</div>
                          <div className="text-[11px] text-amber-600 dark:text-gold-400 font-mono flex items-center gap-1 mt-0.5">
                            <Scissors className="w-3 h-3" />
                            {client.styleProfile?.haircutType || 'Sin ficha de corte'}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 dark:text-industrial-500" />
                            {client.phone}
                          </div>
                          {client.email && (
                            <div className="text-[10px] text-slate-400 dark:text-industrial-500 flex items-center gap-1 mt-0.5 font-sans">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${client.tier === 'VIP'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-gold-400 border border-amber-500/30 dark:border-gold-500/30'
                              : client.tier === 'REENGAGEMENT_DUE'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 animate-pulse'
                                : 'bg-slate-100 dark:bg-industrial-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-industrial-700'
                            }`}>
                          {client.tier === 'VIP' ? '★ VIP' :
                            client.tier === 'REENGAGEMENT_DUE' ? 'Avisar' : 'Frecuente'}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {client.totalVisits || 1}
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-amber-600 dark:text-gold-400">
                        $ {Number(client.totalSpent || 0).toLocaleString('es-CO')} COP
                      </td>

                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-industrial-400 text-xs">
                        {client.lastVisit || 'Reciente'}
                      </td>

                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-xs">
                        {client.preferredBarberName || 'Cualquiera'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openStyleSheet(client)}
                            title="Ver Ficha Técnica de Estilo"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500 hover:text-black text-gold-400 text-xs font-semibold transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ficha Técnica
                          </button>

                          <button
                            onClick={() => handleSendReminder(client)}
                            title="Enviar Recordatorio por WhatsApp"
                            className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer / Modal de Ficha Técnica de Estilo */}
      <Modal
        isOpen={isStyleSheetOpen}
        onClose={() => setIsStyleSheetOpen(false)}
        title={selectedClient ? `Ficha Técnica: ${selectedClient.name}` : 'Ficha Técnica'}
      >
        {selectedClient && editingStyle && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header del Cliente */}
            <div className="bg-slate-50 dark:bg-noir-950 p-4 rounded-2xl border border-slate-200 dark:border-industrial-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-600 dark:text-gold-400 font-mono uppercase tracking-wider block">
                  Cliente {selectedClient.tier}
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{selectedClient.name}</h4>
                <p className="text-xs text-slate-500 dark:text-industrial-400 font-mono mt-0.5">{selectedClient.phone}</p>
              </div>

              <button
                onClick={() => handleSendReminder(selectedClient)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                ¡Ficha técnica guardada con éxito!
              </div>
            )}

            {/* Formulario Editable de la Ficha Técnica */}
            <form onSubmit={handleSaveStyleSheet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                  Estilo / Tipo de Corte Principal
                </label>
                <input
                  type="text"
                  value={editingStyle.haircutType}
                  onChange={(e) => setEditingStyle({ ...editingStyle, haircutType: e.target.value })}
                  placeholder="Ej. Low Skin Fade + Crop texturizado"
                  className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                    Laterales / Nuca (Peines & Palanca)
                  </label>
                  <input
                    type="text"
                    value={editingStyle.guardSides}
                    onChange={(e) => setEditingStyle({ ...editingStyle, guardSides: e.target.value })}
                    placeholder="Ej. 0.5 a navaja, palanca abierta a 1.5"
                    className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                    Zona Superior (Tijera / Textura)
                  </label>
                  <input
                    type="text"
                    value={editingStyle.topLength}
                    onChange={(e) => setEditingStyle({ ...editingStyle, topLength: e.target.value })}
                    placeholder="Ej. Tijera de entresacar 3cm, peinado derecha"
                    className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                    Ritual de Barba & Navaja
                  </label>
                  <input
                    type="text"
                    value={editingStyle.beardNotes}
                    onChange={(e) => setEditingStyle({ ...editingStyle, beardNotes: e.target.value })}
                    placeholder="Ej. Perfilado recto, degradado patillas"
                    className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-industrial-400 uppercase mb-1">
                    Producto de Acabado Preferido
                  </label>
                  <input
                    type="text"
                    value={editingStyle.productPreference}
                    onChange={(e) => setEditingStyle({ ...editingStyle, productPreference: e.target.value })}
                    placeholder="Ej. Pomada Mate Fijación Fuerte"
                    className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                  Notas de Sensibilidad / Preferencias Técnicas
                </label>
                <textarea
                  rows="2"
                  value={editingStyle.technicalNotes}
                  onChange={(e) => setEditingStyle({ ...editingStyle, technicalNotes: e.target.value })}
                  placeholder="Ej. Remolino en coronilla, piel sensible al aftershave con alcohol..."
                  className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs shadow-glow-gold flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Guardar Especificaciones de Estilo
              </button>
            </form>

            {/* Historial Cronológico de Visitas */}
            <div className="pt-4 border-t border-slate-200 dark:border-industrial-800">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
                  Historial de Servicios & Cortes ({selectedClient.visitHistory?.length || 0})
                </h5>
                <button
                  type="button"
                  onClick={() => setIsAddingVisitOpen(!isAddingVisitOpen)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-gold-400 border border-amber-500/30 text-[11px] font-bold font-mono transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingVisitOpen ? 'Cancelar' : '+ Agregar Visita'}</span>
                </button>
              </div>

              {/* Formulario para Registrar Visita Manual */}
              {isAddingVisitOpen && (
                <form onSubmit={handleAddVisit} className="p-3.5 rounded-xl bg-slate-100 dark:bg-noir-900 border border-slate-300 dark:border-industrial-700/80 mb-3 space-y-3 animate-fadeIn">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-gold-500" />
                    <span>Registrar Corte / Servicio al Historial</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-industrial-400 block mb-1">Servicio Realizado *</label>
                      <input
                        type="text"
                        required
                        value={visitService}
                        onChange={(e) => setVisitService(e.target.value)}
                        placeholder="Ej: Skin Fade + Barba Ritual"
                        className="w-full bg-white dark:bg-noir-950 border border-slate-300 dark:border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-industrial-400 block mb-1">Barbero *</label>
                      <select
                        value={visitBarber}
                        onChange={(e) => setVisitBarber(e.target.value)}
                        className="w-full bg-white dark:bg-noir-950 border border-slate-300 dark:border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                      >
                        {barbers.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-industrial-400 block mb-1">Precio Cobrado ($ COP) *</label>
                      <input
                        type="number"
                        required
                        value={visitPrice}
                        onChange={(e) => setVisitPrice(e.target.value)}
                        className="w-full bg-white dark:bg-noir-950 border border-slate-300 dark:border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-industrial-400 block mb-1">Fecha *</label>
                      <input
                        type="date"
                        required
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full bg-white dark:bg-noir-950 border border-slate-300 dark:border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase font-mono text-slate-500 dark:text-industrial-400 block mb-1">Detalles / Notas de este Corte</label>
                      <input
                        type="text"
                        value={visitNotes}
                        onChange={(e) => setVisitNotes(e.target.value)}
                        placeholder="Ej: Degradado a navaja, navaja lateral, aceite sándalo"
                        className="w-full bg-white dark:bg-noir-950 border border-slate-300 dark:border-industrial-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingVisitOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-industrial-800 text-xs text-slate-600 dark:text-industrial-400 hover:bg-slate-200 dark:hover:bg-noir-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingVisit}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-400 hover:from-gold-500 hover:to-gold-300 text-noir-950 font-bold text-xs uppercase font-mono shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSavingVisit ? 'Guardando...' : 'Guardar en Historial'}
                    </button>
                  </div>
                </form>
              )}

              {selectedClient.visitHistory?.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedClient.visitHistory.map((v, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-noir-950 p-3 rounded-xl border border-slate-200 dark:border-industrial-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{v.service}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            v.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : v.status === 'IN_CHAIR'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-gold-300 border border-amber-500/30'
                          }`}>
                            {v.status === 'COMPLETED' ? 'Completado' : v.status === 'IN_CHAIR' ? 'En Sillón' : 'Agendado'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-industrial-400 mt-0.5">
                          Atendido por {v.barber}
                          {v.notes && <span className="ml-1 italic text-slate-400 dark:text-industrial-500">• "{v.notes}"</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-bold text-amber-600 dark:text-gold-400">
                          $ {Number(v.price || 0).toLocaleString('es-CO')} COP
                        </span>
                        <div className="text-[10px] text-slate-400 dark:text-industrial-500 font-mono">
                          {v.date} {v.time ? `• ${v.time}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-industrial-500">Primer registro en el sistema. Al agendar citas o registrarlas manualmente aparecerán aquí.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Nuevo Cliente */}
      <Modal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        title="Registrar Nuevo Cliente en el CRM"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              placeholder="Ej. Andrés Valencia"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">Móvil / WhatsApp *</label>
              <input
                type="tel"
                required
                placeholder="+34 600 000 000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">Email</label>
              <input
                type="email"
                placeholder="andres@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">Barbero Habitual Asignado</label>
            <select
              value={newPreferredBarber}
              onChange={(e) => setNewPreferredBarber(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-industrial-800">
            <button
              type="button"
              onClick={() => setIsNewClientModalOpen(false)}
              className="px-4 py-2 rounded-xl text-industrial-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs shadow-glow-gold"
            >
              Guardar en Directorio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

