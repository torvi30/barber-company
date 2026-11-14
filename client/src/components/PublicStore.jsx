import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { showErrorAlert } from '../lib/swal';
import {
  ShoppingBag,
  Plus,
  Minus,
  Check,
  X,
  Phone,
  Tag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Package,
  Store,
  ExternalLink
} from 'lucide-react';

export const PublicStore = ({ slug }) => {
  const effectiveSlug = (slug && String(slug).trim()) ? String(slug).trim() : 'black-gold';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form states for pickup checkout
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.getPublicProducts(effectiveSlug);
        if (res.success) {
          setProducts(res.data || []);
        }
      } catch (err) {
        console.error('Error al cargar catálogo de la tienda:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [effectiveSlug]);

  // Carrito helpers
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, qty: Math.min(product.stock, item.qty + 1) }
            : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const totalCartPrice = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.qty,
    0
  );

  const allCategories = [
    'Todos los Productos',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
  ];

  const filteredProducts =
    selectedCategory === 'Todos los Productos' || selectedCategory === 'ALL'
      ? products
      : products.filter(
          (p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase()
        );

  const handleCheckoutOrder = async (e) => {
    e.preventDefault();
    if (!clientName || !clientPhone || cart.length === 0) return;

    try {
      setSubmitting(true);
      const payload = {
        clientName,
        clientPhone,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          unitPrice: i.unitPrice,
          qty: i.qty
        })),
        paymentPreference: 'STORE_PICKUP',
        notes
      };

      const res = await api.createPublicOrder(effectiveSlug, payload);
      if (res.success) {
        setOrderConfirmed(res.data);
        setCart([]);
      }
    } catch (err) {
      showErrorAlert('Error en el pedido', err.message || 'Error al procesar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-24 sm:pb-12" style={{ touchAction: 'pan-y' }}>
      {/* Header de la Tienda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-industrial-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 font-mono">
            <Sparkles className="w-3 h-3 text-gold-400" /> Grooming Boutique & Barber Store
          </div>
          <h2 className="text-xl sm:text-3xl font-display font-bold text-white tracking-wide">
            Productos Profesionales de Barbería
          </h2>
          <p className="text-[11px] sm:text-xs text-industrial-400 mt-1">
            Fórmulas de autor, pomadas clásicas, aceites orgánicos y navajas premium para uso diario.
          </p>
        </div>

        {/* Solo en desktop/tablet y cuando hayan productos en la bolsa (en móvil se usa exclusivamente la barra flotante inferior) */}
        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs shadow-glow-gold hover:opacity-95 transition-all cursor-pointer self-start md:self-auto"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ver Bolsa ({cart.reduce((s, i) => s + i.qty, 0)})</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-lg font-mono text-[11px]">
              ${totalCartPrice.toFixed(2)}
            </span>
          </button>
        )}
      </div>

      {/* Categorías Filter Chips - Con touch seguro sin atrapar scroll vertical */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none overscroll-x-contain"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {allCategories.map((cat) => {
          const isSelected = selectedCategory === cat || (selectedCategory === 'ALL' && cat === 'Todos los Productos');
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gold-500 text-black shadow-glow-gold font-bold'
                  : 'bg-noir-900 border border-industrial-800 text-industrial-400 hover:text-white hover:border-industrial-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Catálogo de Productos Grid - Adaptativo 2 columnas en móvil y 3 en desktop */}
      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-industrial-400 animate-pulse">
          Cargando catálogo boutique de la barbería...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-xs text-industrial-500 bg-noir-900 border border-industrial-800 rounded-3xl">
          No hay productos disponibles en esta categoría actualmente.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
          {filteredProducts.map((product) => {
            const inCartItem = cart.find((i) => i.id === product.id);
            const isOutOfStock = product.stock <= 0;

            return (
              <div
                key={product.id}
                className="bg-noir-900 border border-industrial-800 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-gold-500/40 transition-all duration-300 flex flex-col group shadow-xl"
              >
                {/* Imagen con badge */}
                <div className="relative aspect-square sm:aspect-video w-full overflow-hidden bg-noir-950">
                  <img
                    src={product.imageUrl || product.image || 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?fit=crop&w=400&q=80'}
                    alt={product.name}
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100 select-none pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-noir-900 via-transparent to-transparent"></div>

                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-noir-950/80 backdrop-blur-md border border-industrial-700 text-[9px] sm:text-[10px] font-mono font-bold text-gold-400 uppercase truncate max-w-[80%]">
                    {product.category || 'Grooming'}
                  </span>

                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9px] sm:text-[10px] font-mono text-rose-300">
                      Últimas {product.stock}
                    </span>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xs sm:text-base group-hover:text-gold-300 transition-colors leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-industrial-400 mt-1 line-clamp-2 leading-relaxed hidden sm:block">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-industrial-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] sm:text-[10px] text-industrial-500 uppercase tracking-wider block">PVP</span>
                      <span className="text-xs sm:text-xl font-bold font-mono text-white truncate block">
                        ${Number(product.unitPrice).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`w-full sm:w-auto flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-xs transition-all cursor-pointer ${
                        isOutOfStock
                          ? 'bg-industrial-800 text-industrial-500 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-gold-500 hover:bg-gold-400 text-black shadow-glow-gold'
                      }`}
                    >
                      {isOutOfStock ? (
                        'Agotado'
                      ) : inCartItem ? (
                        <>
                          <Check className="w-3 h-3 flex-shrink-0" />
                          <span>En Bolsa ({inCartItem.qty})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 flex-shrink-0" />
                          <span>Comprar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar (Visible en Móvil si hay items) */}
      {cart.length > 0 && !isCartOpen && (
        <aside aria-label="Resumen de compra flotante" className="fixed bottom-4 left-4 right-4 sm:hidden z-40 animate-slideUp">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs shadow-glow-gold hover:opacity-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Ver Bolsa ({cart.reduce((s, i) => s + i.qty, 0)} productos)</span>
            </div>
            <span className="bg-black/20 px-2.5 py-1 rounded-lg font-mono">
              ${totalCartPrice.toFixed(2)} →
            </span>
          </button>
        </aside>
      )}

      {/* Modal / Bottom Sheet Profesional del Carrito */}
      {isCartOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsCartOpen(false); }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-noir-950/80 backdrop-blur-sm animate-fadeIn cursor-pointer p-0 sm:p-4 overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-noir-900 border-t sm:border border-industrial-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[88vh] overflow-y-auto overscroll-contain cursor-default shadow-2xl animate-slideUp flex flex-col space-y-4"
          >
            {/* Tirador táctil para móvil */}
            <div className="w-10 h-1 bg-industrial-700 rounded-full mx-auto sm:hidden -mt-1 mb-1"></div>

            {/* Cabecera compacta */}
            <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base leading-tight">
                    Bolsa de Productos
                  </h3>
                  <span className="text-[11px] text-industrial-400 font-mono">
                    {cart.reduce((s, i) => s + i.qty, 0)} {cart.reduce((s, i) => s + i.qty, 0) === 1 ? 'producto' : 'productos'} seleccionado(s)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl text-industrial-400 hover:text-white hover:bg-noir-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderConfirmed ? (
              <div className="py-6 text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-white text-lg">¡Pedido Reservado con Éxito!</h4>
                <p className="text-xs text-industrial-400 max-w-xs mx-auto leading-relaxed">
                  Tu reserva <strong className="font-mono text-gold-400">{orderConfirmed.id}</strong> fue guardada para pagar y recoger en el mostrador de la barbería.
                </p>

                <div className="p-3.5 rounded-2xl bg-noir-950 border border-industrial-800 text-left font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-industrial-400">Cliente:</span>
                    <span className="text-white font-bold">{orderConfirmed.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-industrial-400">Total a pagar:</span>
                    <span className="text-gold-400 font-bold">${Number(orderConfirmed.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hola! Acabo de hacer el pedido ${orderConfirmed.id} en la tienda online por un valor de $${Number(orderConfirmed.totalAmount).toFixed(2)}. Mi nombre es ${orderConfirmed.clientName}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Confirmar por WhatsApp con la Barbería</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setOrderConfirmed(null);
                    setIsCartOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-noir-800 hover:bg-noir-700 text-industrial-300 text-xs transition-colors cursor-pointer"
                >
                  Continuar explorando
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-industrial-600 mx-auto" />
                <p className="text-xs text-industrial-400">
                  Tu bolsa está vacía. Añade productos de autor de la barbería.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 rounded-xl bg-noir-800 text-xs text-gold-400 font-semibold cursor-pointer"
                >
                  Ver Catálogo
                </button>
              </div>
            ) : (
              <>
                {/* Lista de productos compacta y limpia */}
                <div className="divide-y divide-industrial-800/80 max-h-52 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                      <img
                        src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?fit=crop&w=400&q=80'}
                        alt={item.name}
                        className="w-11 h-11 rounded-xl object-cover border border-industrial-800 bg-noir-950 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white leading-tight truncate">
                          {item.name}
                        </h4>
                        <span className="text-xs font-mono text-gold-400 font-bold block mt-0.5">
                          ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-noir-950 border border-industrial-800 rounded-lg p-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-1 hover:text-rose-400 text-industrial-400 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono text-xs font-bold text-white">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          disabled={item.qty >= item.stock}
                          className="p-1 hover:text-emerald-400 text-industrial-400 disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen y formulario de reserva para recoger */}
                <form onSubmit={handleCheckoutOrder} className="pt-3 border-t border-industrial-800 space-y-3">
                  <div className="flex justify-between items-center bg-noir-950 p-3 rounded-xl border border-industrial-800">
                    <span className="text-xs text-industrial-400">Total a pagar en mostrador:</span>
                    <span className="text-lg font-bold font-mono text-gold-400">
                      ${totalCartPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Tu Nombre Completo *"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-gold-500 placeholder-industrial-500"
                    />

                    <input
                      type="tel"
                      required
                      placeholder="Teléfono / WhatsApp (+57 / +34...) *"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono placeholder-industrial-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Confirmando pedido...' : `Reservar para Recoger ($${totalCartPrice.toFixed(2)})`}
                  </button>

                  <p className="text-[10px] text-center text-industrial-400 leading-tight">
                    Pago directo en mostrador (efectivo o datáfono) al momento del servicio o retiro.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

