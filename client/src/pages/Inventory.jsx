import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import {
  Package,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  CheckCircle,
  Tag,
  DollarSign,
  TrendingDown
} from 'lucide-react';

export const Inventory = () => {
  const { tenantId } = useBarbershop();
  const [inventory, setInventory] = useState([]);
  const [metrics, setMetrics] = useState({ totalItems: 0, lowStockCount: 0, lowStockItems: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Nuevo item form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(3);
  const [unitPrice, setUnitPrice] = useState(15);
  const [costPrice, setCostPrice] = useState(7);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory(tenantId);
      if (res.success) {
        setInventory(res.data);
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Error al obtener inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [tenantId]);

  const handleAdjustStock = async (id, delta) => {
    try {
      const res = await api.updateStock(tenantId, id, delta);
      if (res.success) {
        setInventory(prev =>
          prev.map(item => (item.id === id ? { ...item, stock: res.data.stock ?? (item.stock + delta) } : item))
        );
        // Actualizar métricas locales
        fetchInventory();
      }
    } catch (err) {
      console.error('Error al ajustar stock:', err);
    }
  };

  const filteredItems = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
            <Package className="w-6 h-6 text-gold-400" />
            Control de Inventario & Consumos de Barbería
          </h2>
          <p className="text-xs text-industrial-400 mt-1">
            Gestión de productos de venta al público y suministros internos de uso técnico (pomadas, aceites, cuchillas).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-sm shadow-glow-gold transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Registrar Producto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Referencias (SKUs)"
          value={metrics.totalItems}
          icon={Tag}
          subtitle="Catálogo activo del tenant"
        />

        <StatCard
          title="Alertas Stock Crítico"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          highlight={metrics.lowStockCount > 0}
          subtitle={metrics.lowStockCount > 0 ? 'Requiere reabastecimiento urgente' : 'Niveles de stock normales'}
        />

        <StatCard
          title="Valoración del Stock (PVP)"
          value={`$${inventory.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.stock || 0)), 0).toFixed(2)}`}
          icon={DollarSign}
          subtitle={`Costo inversión: $${inventory.reduce((sum, item) => sum + (Number(item.costPrice || 0) * Number(item.stock || 0)), 0).toFixed(2)}`}
        />
      </div>

      {/* Tabla y Buscador */}
      <div className="bg-noir-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-industrial-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-industrial-500" />
            <input
              type="text"
              placeholder="Buscar por nombre de producto o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <span className="text-xs text-industrial-400">
            Mostrando {filteredItems.length} de {inventory.length} productos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-noir-950/80 text-industrial-400 border-b border-industrial-800 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">SKU</th>
                <th className="px-6 py-3.5">Producto</th>
                <th className="px-6 py-3.5">Precio Venta</th>
                <th className="px-6 py-3.5">Costo Unit.</th>
                <th className="px-6 py-3.5">Mínimo</th>
                <th className="px-6 py-3.5">Stock Actual</th>
                <th className="px-6 py-3.5 text-right">Ajuste Rápido (+ / -)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-industrial-500">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = Number(item.stock) <= Number(item.minStock);
                  return (
                    <tr key={item.id} className="hover:bg-noir-850/60 transition-colors">
                      <td className="px-6 py-4 font-mono text-gold-400">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        ${Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-industrial-400">
                        ${Number(item.costPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-industrial-400">
                        {item.minStock} uds
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          isLow
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.stock} unidades {isLow && '(Bajo)'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1 bg-noir-950 border border-industrial-800 rounded-lg p-0.5">
                          <button
                            onClick={() => handleAdjustStock(item.id, -1)}
                            disabled={item.stock <= 0}
                            title="Restar 1 (Consumo / Venta)"
                            className="p-1 rounded hover:bg-noir-800 text-industrial-400 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-industrial-400 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-white">
                            {item.stock}
                          </span>
                          <button
                            onClick={() => handleAdjustStock(item.id, 1)}
                            title="Sumar 1 (Reabastecimiento)"
                            className="p-1 rounded hover:bg-noir-800 text-industrial-400 hover:text-emerald-400 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
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

      {/* Modal Registrar Producto */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Registrar Nuevo Producto en Inventario"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const newItem = {
              id: `inv-${Date.now()}`,
              name,
              sku,
              stock: Number(stock),
              minStock: Number(minStock),
              unitPrice: Number(unitPrice),
              costPrice: Number(costPrice)
            };
            setInventory(prev => [newItem, ...prev]);
            setIsAddModalOpen(false);
            setName('');
            setSku('');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
              Nombre Comercial del Producto
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cera Fijación Mate Extra Fuerte (150ml)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Código SKU
              </label>
              <input
                type="text"
                required
                placeholder="CER-MAT-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Stock Inicial
              </label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Stock Mínimo
              </label>
              <input
                type="number"
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Precio PVP ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-industrial-400 uppercase mb-1">
                Costo Compra ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-industrial-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-industrial-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs shadow-glow-gold"
            >
              Guardar en Inventario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

