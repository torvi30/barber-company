import React, { useState, useEffect } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { showSuccessAlert, showErrorAlert, showConfirmDialog } from '../lib/swal';
import {
  Package,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  CheckCircle,
  Tag,
  DollarSign,
  TrendingDown,
  Trash2,
  Edit3,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  Eye,
  Layers,
  Check
} from 'lucide-react';

const PRESET_PRODUCT_IMAGES = [
  { label: 'Pomada Mate', url: 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?fit=crop&w=400&q=80' },
  { label: 'Aceite Barba', url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?fit=crop&w=400&q=80' },
  { label: 'Bálsamo After', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?fit=crop&w=400&q=80' },
  { label: 'Cera en Polvo', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?fit=crop&w=400&q=80' },
  { label: 'Shaving Gel', url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?fit=crop&w=400&q=80' },
  { label: 'Navaja Clásica', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?fit=crop&w=400&q=80' }
];

export const Inventory = () => {
  const { tenantId, barbershopInfo } = useBarbershop();
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [metrics, setMetrics] = useState({ totalItems: 0, lowStockCount: 0, totalValuation: 0, totalInvestment: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form states de producto
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Pomadas & Ceras');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(3);
  const [unitPrice, setUnitPrice] = useState(35000);
  const [costPrice, setCostPrice] = useState(18000);
  const [imageUrl, setImageUrl] = useState(PRESET_PRODUCT_IMAGES[0].url);
  const [showInStore, setShowInStore] = useState(true);

  // Form state de nueva categoría
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory(tenantId);
      if (res.success) {
        setInventory(res.data || []);
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        } else {
          setCategories(['Pomadas & Ceras', 'Cuidado Barba', 'Afeitado & Afters', 'Herramientas & Navajas']);
        }
        if (res.metrics) setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Error al obtener inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchInventory();
    }
  }, [tenantId]);

  const handleAdjustStock = async (id, delta) => {
    try {
      const res = await api.updateStock(tenantId, id, delta);
      if (res.success) {
        setInventory(prev =>
          prev.map(item => (item.id === id ? { ...item, stock: res.data.stock ?? (item.stock + delta) } : item))
        );
        fetchInventory();
      }
    } catch (err) {
      showErrorAlert('Error de Stock', err.message);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory(categories[0] || 'Pomadas & Ceras');
    setDescription('');
    setStock(10);
    setMinStock(3);
    setUnitPrice(35000);
    setCostPrice(18000);
    setImageUrl(PRESET_PRODUCT_IMAGES[0].url);
    setShowInStore(true);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setName(prod.name || '');
    setSku(prod.sku || '');
    setCategory(prod.category || 'Pomadas & Ceras');
    setDescription(prod.description || '');
    setStock(prod.stock || 0);
    setMinStock(prod.minStock || 2);
    setUnitPrice(prod.unitPrice || 0);
    setCostPrice(prod.costPrice || 0);
    setImageUrl(prod.imageUrl || PRESET_PRODUCT_IMAGES[0].url);
    setShowInStore(prod.isPublic !== false);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      category: category.trim() || 'General',
      description,
      stock: Number(stock),
      minStock: Number(minStock),
      unitPrice: Number(unitPrice),
      costPrice: Number(costPrice),
      imageUrl,
      isPublic: showInStore
    };

    try {
      if (editingProduct) {
        await api.updateProduct(tenantId, editingProduct.id, payload);
        showSuccessAlert('Producto Actualizado', `"${name}" ha sido actualizado correctamente.`);
      } else {
        await api.createProduct(tenantId, payload);
        showSuccessAlert('Producto Publicado', `"${name}" fue subido con éxito a la tienda y stock.`);
      }

      setIsProductModalOpen(false);
      fetchInventory();
    } catch (err) {
      showErrorAlert('Error al guardar', err.message || 'No fue posible guardar el producto.');
    }
  };

  const handleDeleteProduct = async (prod) => {
    const confirmed = await showConfirmDialog({
      title: '¿Eliminar producto?',
      text: `Se retirará "${prod.name}" de la tienda y del inventario.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (confirmed.isConfirmed) {
      try {
        await api.deleteProduct(tenantId, prod.id);
        showSuccessAlert('Eliminado', 'El producto fue retirado de la tienda.');
        fetchInventory();
      } catch (err) {
        showErrorAlert('Error al eliminar', err.message);
      }
    }
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const cat = newCategoryName.trim();
    if (!categories.includes(cat)) {
      setCategories(prev => [...prev, cat]);
      setCategory(cat);
    }
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
    showSuccessAlert('Categoría Creada', `Categoría "${cat}" lista para asignar a tus productos.`);
  };

  // Filtrado reactivo por texto y categoría
  const filteredItems = inventory.filter(item => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Header con Título y Acciones Pro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-industrial-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-amber-700 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-2 font-mono">
            <Sparkles className="w-3.5 h-3.5" /> Grooming Store & Stock Profesional
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2.5">
            <Package className="w-7 h-7 text-amber-600 dark:text-gold-400" />
            Tienda Boutique & Control de Inventario
          </h2>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-1 max-w-2xl">
            Sube tus productos de reventa para que los clientes los compren en la web, gestiona categorías de autor y controla el stock físico del salón.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón Nueva Categoría */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-noir-900 hover:bg-slate-200 dark:hover:bg-noir-850 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Tag className="w-4 h-4 text-amber-500" />
            <span>+ Nueva Categoría</span>
          </button>

          {/* Botón Subir Producto a la Tienda */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Producto a Tienda</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Productos en Tienda"
          value={metrics.totalItems || inventory.length}
          icon={ShoppingBag}
          subtitle="Catálogo activo para clientes"
        />

        <StatCard
          title="Categorías Creadas"
          value={categories.length}
          icon={Layers}
          subtitle="Secciones en la boutique"
        />

        <StatCard
          title="Alertas de Stock"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          highlight={metrics.lowStockCount > 0}
          subtitle={metrics.lowStockCount > 0 ? 'Requiere reabastecimiento' : 'Stock en niveles óptimos'}
        />

        <StatCard
          title="Valoración Catálogo (PVP)"
          value={`$${Number(metrics.totalValuation || inventory.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.stock || 0)), 0)).toLocaleString()}`}
          icon={DollarSign}
          subtitle={`Inversión: $${Number(metrics.totalInvestment || inventory.reduce((s, i) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0)).toLocaleString()}`}
        />
      </div>

      {/* Selector de Categorías (Pills con 1 Clic) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-semibold text-slate-500 dark:text-industrial-400 uppercase tracking-wider font-mono mr-1 flex items-center gap-1 flex-shrink-0">
          <Tag className="w-3.5 h-3.5" /> Categorías:
        </span>

        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-noir-950 font-bold shadow-sm'
              : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Todas ({inventory.length})
        </button>

        {categories.map((cat) => {
          const count = inventory.filter(i => i.category === cat).length;
          const isSelected = selectedCategory === cat;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-noir-950 font-bold shadow-sm'
                  : 'bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 text-slate-600 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-noir-950/20 text-noir-950 font-black' : 'bg-slate-100 dark:bg-noir-950 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-2.5 py-1.5 rounded-xl border border-dashed border-amber-500/40 text-amber-600 dark:text-gold-400 hover:bg-amber-500/10 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
        >
          + Nueva
        </button>
      </div>

      {/* Barra de Búsqueda y Visualización */}
      <div className="bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-industrial-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-industrial-500" />
            <input
              type="text"
              placeholder="Buscar por producto, categoría o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-industrial-400">
            <span>Mostrando <strong>{filteredItems.length}</strong> de <strong>{inventory.length}</strong> productos</span>
          </div>
        </div>

        {/* Grilla / Catálogo de Productos con Tarjetas Visuales Pro */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 dark:text-industrial-500 space-y-3">
              <Package className="w-12 h-12 mx-auto text-industrial-600" />
              <p className="text-sm font-semibold">No se encontraron productos en esta categoría.</p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-gold-500 text-noir-950 font-bold text-xs uppercase cursor-pointer"
              >
                + Subir el Primer Producto
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLow = Number(item.stock) <= Number(item.minStock);

              return (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-gold-500/40 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Imagen y Badges */}
                    <div className="relative aspect-video sm:aspect-square w-full rounded-xl overflow-hidden bg-noir-900 border border-slate-200 dark:border-industrial-800">
                      <img
                        src={item.imageUrl || PRESET_PRODUCT_IMAGES[0].url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Badge Categoría */}
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-lg bg-noir-950/80 backdrop-blur-md border border-industrial-700 text-gold-300 font-mono text-[10px] font-bold">
                        {item.category || 'General'}
                      </span>

                      {/* Badge Tienda Online Activa */}
                      {item.isPublic !== false ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-emerald-500/90 text-noir-950 font-sans text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                          <Eye className="w-3 h-3" /> En Tienda
                        </span>
                      ) : (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 text-[10px] font-medium">
                          Oculto
                        </span>
                      )}
                    </div>

                    {/* Información */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-industrial-500 font-mono">
                        <span>SKU: {item.sku}</span>
                        <span>Costo: ${Number(item.costPrice || 0).toLocaleString()}</span>
                      </div>
                      <h4 className="font-display font-bold text-slate-900 dark:text-white text-base mt-1 line-clamp-1" title={item.name}>
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-industrial-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Precios, Stock y Ajuste Rápido */}
                  <div className="pt-4 mt-3 border-t border-slate-200 dark:border-industrial-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-industrial-500 block">Precio PVP</span>
                        <span className="text-lg font-bold font-mono text-amber-600 dark:text-gold-400">
                          ${Number(item.unitPrice || 0).toLocaleString()} COP
                        </span>
                      </div>

                      {/* Stock Badge */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-industrial-500 block">Stock Disponible</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                          isLow
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.stock} uds {isLow && '(Bajo)'}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Ajuste y Acciones */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Ajuste Rápido (+ / -) */}
                      <div className="flex items-center gap-1.5 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-800 rounded-xl px-2 py-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, -1)}
                          disabled={item.stock <= 0}
                          title="Restar 1 (Venta / Consumo)"
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-500 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {item.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, 1)}
                          title="Sumar 1 (Reabastecimiento)"
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-noir-800 text-slate-500 hover:text-emerald-500 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Editar y Eliminar */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-noir-900 hover:bg-slate-200 dark:hover:bg-noir-800 text-slate-600 dark:text-industrial-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="Editar Producto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                          title="Eliminar de la Tienda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL REGISTRAR / EDITAR PRODUCTO */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Editar Producto de Tienda & Stock' : 'Subir Nuevo Producto a la Tienda'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {/* Nombre Comercial */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
              Nombre Comercial del Producto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cera Fijación Mate Extra Fuerte (100ml)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Categoría y SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider">
                  Categoría *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[10px] text-amber-600 dark:text-gold-400 font-bold hover:underline"
                >
                  + Crear Nueva
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-gold-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-noir-950 text-slate-900 dark:text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
                Código SKU / Referencia
              </label>
              <input
                type="text"
                placeholder="POM-MAT-01"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Precios ($ COP) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
                Precio Venta al Público ($ COP) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="500"
                placeholder="35000"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
                Costo de Compra ($ COP)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                placeholder="18000"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Stock Inicial y Stock Mínimo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
                Stock Inicial en Salón *
              </label>
              <input
                type="number"
                required
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
                Stock Mínimo para Alerta
              </label>
              <input
                type="number"
                min="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {/* Descripción para la Tienda */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
              Descripción del Producto (Para el cliente en la web)
            </label>
            <textarea
              rows={2}
              placeholder="Beneficios, modo de uso, aroma o fijación..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Foto del Producto: Selector de Fotos Pro con 1 Clic */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Foto del Producto</span>
              <span className="text-[10px] text-industrial-400">Elige una foto pro o pega tu enlace</span>
            </label>

            {/* Galería rápida de fotos con 1 toque */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              {PRESET_PRODUCT_IMAGES.map((img) => (
                <button
                  key={img.label}
                  type="button"
                  onClick={() => setImageUrl(img.url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    imageUrl === img.url
                      ? 'border-gold-500 ring-2 ring-gold-500/50 scale-105'
                      : 'border-slate-200 dark:border-industrial-800 hover:border-gold-500/40 opacity-70 hover:opacity-100'
                  }`}
                  title={img.label}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  {imageUrl === img.url && (
                    <span className="absolute inset-0 bg-gold-500/30 flex items-center justify-center text-noir-950 font-bold text-xs">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* URL personalizada */}
            <input
              type="url"
              placeholder="https://ejemplo.com/foto-producto.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* Interruptor: Mostrar en Tienda Online */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800">
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                Publicar en la Tienda Online
              </span>
              <span className="text-[10px] text-slate-500 dark:text-industrial-400">
                Visible para que los clientes lo reserven desde la web de la barbería.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowInStore(!showInStore)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                showInStore ? 'bg-gold-500' : 'bg-slate-300 dark:bg-industrial-800'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white dark:bg-noir-950 transition-transform ${
                  showInStore ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer"
            >
              {editingProduct ? 'Guardar Cambios' : 'Publicar Producto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL CREAR NUEVA CATEGORÍA */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Crear Nueva Categoría de Tienda"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cuidado de la Barba, Ceras & Pomadas, Gorras & Merch..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-gold-300">
            💡 Las categorías organizan automáticamente los productos en la tienda pública web y permiten filtrar el stock en recepción.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer"
            >
              Crear Categoría
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
