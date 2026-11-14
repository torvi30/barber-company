import React, { useState, useEffect, useRef } from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { showSuccessAlert, showErrorAlert, showConfirmDialog } from '../lib/swal';
import { compressImageFile, uploadToCloudinary, getOptimizedImageUrl } from '../services/cloudinaryService';
import {
  saveFirestoreProduct,
  fetchFirestoreProducts,
  deleteFirestoreProduct
} from '../services/firestoreService';
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
  Check,
  Upload,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Crop,
  Move
} from 'lucide-react';

const PRESET_PRODUCT_IMAGES = [
  { label: 'Pomada Mate', url: 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?auto=format&fit=crop&w=400&q=75' },
  { label: 'Aceite Barba', url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=400&q=75' },
  { label: 'Bálsamo After', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=75' },
  { label: 'Cera en Polvo', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=75' },
  { label: 'Shaving Gel', url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=75' },
  { label: 'Navaja Clásica', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=75' }
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

  // Selector de categoría desplegable seguro (sin salirse de la pantalla)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Estados de carga, visor interactivo (Cropper) y auto-compresión (<60KB)
  const fileInputRef = useRef(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [compressionBadge, setCompressionBadge] = useState(null);

  // Estados del Visor Interactivo de Encuadre
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperRawSrc, setCropperRawSrc] = useState(null);
  const [cropperRawFile, setCropperRawFile] = useState(null);
  const [cropperZoom, setCropperZoom] = useState(1);
  const [cropperRotation, setCropperRotation] = useState(0);
  const [cropperPan, setCropperPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Cuando el usuario elige una foto desde su celular o PC, abre el visor interactivo de inmediato
  const handleUploadImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCropperRawFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperRawSrc(event.target.result);
      setCropperZoom(1);
      setCropperRotation(0);
      setCropperPan({ x: 0, y: 0 });
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Abrir el visor con la foto actual para reacomodarla
  const handleOpenCropperWithCurrent = () => {
    if (!imageUrl) return;
    setCropperRawSrc(imageUrl);
    setCropperRawFile(null);
    setCropperZoom(1);
    setCropperRotation(0);
    setCropperPan({ x: 0, y: 0 });
    setIsCropperOpen(true);
  };

  // Drag / Pan con mouse o toque táctil en el visor
  const handlePointerDown = (clientX, clientY) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX - cropperPan.x,
      y: clientY - cropperPan.y
    };
  };

  const handlePointerMove = (clientX, clientY) => {
    if (!isDragging) return;
    setCropperPan({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Procesar y recortar la imagen en el visor a resolución 600x600 y comprimirla a WebP (<60KB)
  const handleApplyCropping = async () => {
    if (!cropperRawSrc) return;

    try {
      setCompressingImage(true);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = cropperRawSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar la imagen para encuadrarla'));
      });

      const outputSize = 600;
      const previewBoxSize = 280; // tamaño base del visor
      const scaleFactor = outputSize / previewBoxSize;

      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fondo neutro elegante
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, outputSize, outputSize);

      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.translate(cropperPan.x * scaleFactor, cropperPan.y * scaleFactor);
      ctx.rotate((cropperRotation * Math.PI) / 180);
      ctx.scale(cropperZoom, cropperZoom);

      const aspect = img.width / img.height;
      let drawW = outputSize;
      let drawH = outputSize;
      if (aspect > 1) {
        drawW = outputSize * aspect;
      } else {
        drawH = outputSize / aspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            showErrorAlert('Error', 'No se pudo generar la imagen');
            return;
          }

          const compKb = Math.round(blob.size / 1024);
          const origKb = cropperRawFile ? Math.round(cropperRawFile.size / 1024) : null;
          setCompressionBadge(
            origKb ? `Optimizada: ${origKb}KB → ${compKb}KB (-${Math.round(((origKb - compKb) / origKb) * 100)}%)` : `Foto optimizada: ${compKb}KB`
          );

          const optimizedDataUrl = canvas.toDataURL('image/webp', 0.78);
          setImageUrl(optimizedDataUrl);
          setIsCropperOpen(false);

          // Subir a Cloudinary para persistencia de CDN si está disponible
          try {
            const uploadRes = await uploadToCloudinary(blob, 'productos');
            if (uploadRes?.url) {
              setImageUrl(uploadRes.url);
            }
          } catch (cloudErr) {
            console.warn('Almacenando imagen localmente en alta velocidad:', cloudErr);
          }
        },
        'image/webp',
        0.78
      );
    } catch (err) {
      showErrorAlert('Error al encuadrar imagen', err.message);
    } finally {
      setCompressingImage(false);
    }
  };

  // Form state de nueva categoría
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [backendRes, fsProducts] = await Promise.all([
        api.getInventory(tenantId).catch(() => ({ success: false })),
        fetchFirestoreProducts(tenantId).catch(() => [])
      ]);

      const productMap = new Map();
      (fsProducts || []).forEach(p => { if (p && p.id) productMap.set(p.id, p); });
      if (backendRes.success && Array.isArray(backendRes.data)) {
        backendRes.data.forEach(p => {
          if (p && p.id) productMap.set(p.id, { ...(productMap.get(p.id) || {}), ...p });
        });
      }

      const mergedData = Array.from(productMap.values());
      const finalData = mergedData.length > 0 ? mergedData : (backendRes.data || []);

      setInventory(finalData);

      const activeCategories = Array.from(new Set(finalData.map(i => i.category).filter(Boolean)));
      if (activeCategories.length > 0) {
        setCategories(activeCategories);
      } else {
        setCategories(['Pomadas & Ceras', 'Cuidado Barba', 'Afeitado & Afters', 'Herramientas & Navajas']);
      }

      const lowStockAlerts = finalData.filter(i => Number(i.stock) <= Number(i.minStock));
      setMetrics({
        totalItems: finalData.length,
        lowStockCount: lowStockAlerts.length,
        lowStockItems: lowStockAlerts,
        totalValuation: finalData.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.stock || 0)), 0),
        totalInvestment: finalData.reduce((s, i) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0)
      });
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
      const res = await api.updateStock(tenantId, id, delta).catch(() => ({ success: false }));
      const newStock = res.success && res.data?.stock !== undefined ? res.data.stock : null;
      setInventory(prev =>
        prev.map(item => {
          if (item.id === id) {
            const updatedStock = newStock !== null ? newStock : Math.max(0, item.stock + delta);
            saveFirestoreProduct(tenantId, { ...item, stock: updatedStock }).catch(console.warn);
            return { ...item, stock: updatedStock };
          }
          return item;
        })
      );
      fetchInventory();
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
        await api.updateProduct(tenantId, editingProduct.id, payload).catch(console.warn);
        await saveFirestoreProduct(tenantId, { ...payload, id: editingProduct.id });
        showSuccessAlert('Producto Actualizado', `"${name}" ha sido actualizado correctamente.`);
      } else {
        const res = await api.createProduct(tenantId, payload).catch(() => ({ success: false }));
        const createdId = res.success && res.data?.id ? res.data.id : `prod_${Date.now()}`;
        await saveFirestoreProduct(tenantId, { ...payload, id: createdId });
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
        await api.deleteProduct(tenantId, prod.id).catch(console.warn);
        await deleteFirestoreProduct(tenantId, prod.id);
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
      {/* Header con Título y Acciones Pro (Diseño Compacto y Optimizado) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-industrial-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-amber-700 dark:text-gold-400 text-[10px] font-semibold uppercase tracking-wider mb-1 font-mono">
            <Sparkles className="w-3 h-3" /> Grooming Store & Stock
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-gold-400 flex-shrink-0" />
            <span>Tienda Boutique & Inventario</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-industrial-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
            Catálogo de productos para clientes y control de stock físico del salón.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Nueva Categoría */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-noir-900 hover:bg-slate-200 dark:hover:bg-noir-850 border border-slate-200 dark:border-industrial-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">+ Nueva Categoría</span>
            <span className="sm:hidden">+ Categoría</span>
          </button>

          {/* Botón Subir Producto a la Tienda */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Subir Producto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Métricas Compactas (2 Columnas en Móvil para que no empujen los productos abajo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          compact={true}
          title="Productos"
          value={metrics.totalItems || inventory.length}
          icon={ShoppingBag}
          subtitle="Catálogo activo"
        />

        <StatCard
          compact={true}
          title="Categorías"
          value={categories.length}
          icon={Layers}
          subtitle="Secciones boutique"
        />

        <StatCard
          compact={true}
          title="Alertas Stock"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          highlight={metrics.lowStockCount > 0}
          subtitle={metrics.lowStockCount > 0 ? 'Bajo inventario' : 'Stock óptimo'}
        />

        <StatCard
          compact={true}
          title="Valoración PVP"
          value={`$${Number(metrics.totalValuation || inventory.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.stock || 0)), 0)).toLocaleString()}`}
          icon={DollarSign}
          subtitle={`Costo: $${Number(metrics.totalInvestment || inventory.reduce((s, i) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0)).toLocaleString()}`}
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
                    {/* Imagen y Badges con Optimización CDN */}
                    <div className="relative aspect-video sm:aspect-square w-full rounded-xl overflow-hidden bg-noir-900 border border-slate-200 dark:border-industrial-800">
                      <img
                        src={getOptimizedImageUrl(item.imageUrl || PRESET_PRODUCT_IMAGES[0].url, { width: 500, height: 500 })}
                        alt={item.name}
                        loading="lazy"
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
            <div className="relative" ref={categoryDropdownRef}>
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

              {/* Botón selector custom sin popout nativo desalineado */}
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold flex items-center justify-between focus:outline-none focus:border-gold-500 cursor-pointer shadow-sm hover:border-gold-500/50 transition-all text-left"
              >
                <span className="truncate">{category || 'Selecciona Categoría'}</span>
                <ChevronDown className={`w-4 h-4 text-industrial-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180 text-gold-400' : ''}`} />
              </button>

              {/* Menú desplegable flotante contenido y adaptado a móviles */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-noir-900 border border-slate-200 dark:border-industrial-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto p-1 backdrop-blur-md animate-fadeIn">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        category === cat
                          ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-noir-800'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {category === cat && <Check className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryDropdownOpen(false);
                      setIsCategoryModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-amber-600 dark:text-gold-400 hover:bg-gold-500/10 flex items-center gap-1.5 border-t border-slate-100 dark:border-industrial-800 mt-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear nueva categoría...</span>
                  </button>
                </div>
              )}
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

          {/* Precios ($ COP) - Etiquetas concisas para no amontonarse en móvil */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1 truncate" title="Precio Venta ($ COP)">
                Precio Venta ($ COP) *
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1 truncate" title="Costo Compra ($ COP)">
                Costo Compra ($ COP)
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

          {/* Stock Inicial y Stock Mínimo - Etiquetas concisas para móvil */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1 truncate" title="Stock Inicial *">
                Stock Inicial *
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider mb-1 truncate" title="Stock Mínimo Alerta">
                Stock Mínimo Alerta
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

          {/* Foto del Producto: Visor Interactivo (<60KB) + Galería Rápida */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-industrial-300 uppercase tracking-wider">
                Foto del Producto
              </label>
              <span className="text-[10px] text-emerald-500 font-mono font-bold flex items-center gap-1">
                <span>⚡ Auto-comprimida a &lt;60KB</span>
              </span>
            </div>

            {/* Tarjeta de previsualización y acciones de visor */}
            <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-noir-950 border border-slate-200 dark:border-industrial-800">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-noir-900 border border-gold-500/40 flex-shrink-0 group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-industrial-500">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[9px] mt-1">Sin foto</span>
                  </div>
                )}
                {imageUrl && (
                  <button
                    type="button"
                    onClick={handleOpenCropperWithCurrent}
                    title="Acomodar encuadre en visor"
                    className="absolute inset-0 bg-noir-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-gold-400 transition-opacity cursor-pointer"
                  >
                    <Crop className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImageFile}
                  className="hidden"
                />
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={compressingImage}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-gold-500/20 hover:from-amber-500/30 hover:to-gold-500/30 border border-gold-500/40 text-gold-600 dark:text-gold-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{compressingImage ? 'Procesando...' : 'Subir desde Celular o PC'}</span>
                  </button>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleOpenCropperWithCurrent}
                      className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-industrial-800 hover:bg-slate-300 dark:hover:bg-industrial-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-gold-400" />
                      <span>Acomodar en Visor</span>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 dark:text-industrial-400 leading-tight">
                  Al subir tu foto se abrirá el visor para centrar y hacer zoom al gusto. Se comprime a &lt;60KB para que tu catálogo cargue al instante.
                </p>
              </div>
            </div>

            {compressionBadge && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{compressionBadge}</span>
              </div>
            )}

            {/* Galería rápida de fotos con 1 toque */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-industrial-400 block font-medium">O elige una foto prediseñada en 1 clic:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_PRODUCT_IMAGES.map((img) => (
                  <button
                    key={img.label}
                    type="button"
                    onClick={() => {
                      setImageUrl(img.url);
                      setCompressionBadge(null);
                    }}
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
            </div>

            {/* URL personalizada */}
            <input
              type="url"
              placeholder="O pega un enlace de imagen (https://...)"
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

      {/* MODAL VISOR INTERACTIVO DE ENCUADRE Y RECORTE (<60KB) */}
      <Modal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        title="Visor de Encuadre de Foto del Producto"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Arrastra con el dedo o mouse para centrar tu producto, ajusta el zoom y rota según lo necesites. Al confirmar, se optimizará automáticamente a formato WebP ultra-liviano (&lt;60KB).
          </p>

          {/* Área de Visualización y Encuadre Cuadrado */}
          <div
            className="relative mx-auto w-[280px] h-[280px] rounded-2xl overflow-hidden border-2 border-gold-500/60 bg-noir-950 shadow-2xl cursor-grab active:cursor-grabbing select-none touch-none"
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handlePointerUp}
          >
            {/* Imagen centrada y transformada según pan, rotación y zoom */}
            {cropperRawSrc && (
              <img
                src={cropperRawSrc}
                alt="Encuadre"
                draggable={false}
                className="absolute max-w-none origin-center pointer-events-none transition-transform duration-75"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${cropperPan.x}px, ${cropperPan.y}px) rotate(${cropperRotation}deg) scale(${cropperZoom})`,
                  minWidth: '100%',
                  minHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            )}

            {/* Cuadrícula de tercios guía para encuadre pro */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-gold-500/20">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div></div>
            </div>

            {/* Guía visual de arrastre */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-noir-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-gold-500/30 text-[10px] text-gold-300 font-medium flex items-center gap-1.5 pointer-events-none">
              <Move className="w-3 h-3" />
              <span>Arrastra para acomodar</span>
            </div>
          </div>

          {/* Barra de Controles: Zoom, Rotación y Centrado */}
          <div className="space-y-3 bg-slate-50 dark:bg-noir-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-industrial-800">
            {/* Control de Zoom */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCropperZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={cropperZoom}
                onChange={(e) => setCropperZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setCropperZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-industrial-400 dark:hover:text-white"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-gold-400 w-12 text-right">
                {cropperZoom.toFixed(1)}x
              </span>
            </div>

            {/* Botones de acción rápida: Rotar y Centrar */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-industrial-800">
              <button
                type="button"
                onClick={() => setCropperRotation((prev) => (prev + 90) % 360)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-industrial-800 hover:bg-slate-300 dark:hover:bg-industrial-700 text-xs text-slate-800 dark:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-600 dark:text-gold-400" />
                <span>Rotar 90° ({cropperRotation}°)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCropperPan({ x: 0, y: 0 });
                  setCropperZoom(1);
                  setCropperRotation(0);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-industrial-800 hover:bg-slate-300 dark:hover:bg-industrial-700 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors cursor-pointer"
              >
                Resetear Posición
              </button>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-industrial-800">
            <button
              type="button"
              onClick={() => setIsCropperOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-500 dark:text-industrial-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApplyCropping}
              disabled={compressingImage}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Crop className="w-4 h-4" />
              <span>{compressingImage ? 'Guardando...' : 'Aplicar Encuadre (<60KB)'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
