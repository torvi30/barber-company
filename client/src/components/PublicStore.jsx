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
    setIsCartOpen(true);
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

  const categories = [
    { id: 'ALL', label: 'Todos los Productos' },
    { id: 'FIJACION', label: 'Pomadas & Ceras' },
    { id: 'CUIDADO_BARBA', label: 'Cuidado Barba' },
    { id: 'Afeitado', label: 'Afeitado & Afters' },
    { id: 'TRATAMIENTOS', label: 'Tratamientos' },
    { id: 'HERRAMIENTAS', label: 'Navajas & Accesorios' }
  ];

  const filteredProducts =
    selectedCategory === 'ALL'
      ? products
      : products.filter(
          (p) =>
            p.category?.toUpperCase() === selectedCategory.toUpperCase()
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
    <div className="space-y-8 animate-fadeIn">
      {/* Header de la Tienda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-industrial-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold uppercase tracking-wider mb-2 font-mono">
            <Sparkles className="w-3.5 h-3.5" /> Grooming Boutique & Barber Store
          </div>
          <h2 className="text-3xl font-display font-bold text-white tracking-wide">
            Productos Profesionales de Barbería
          </h2>
          <p className="text-xs text-industrial-400 mt-1">
            Fórmulas de autor, pomadas clásicas, aceites orgánicos y navajas premium para uso diario.
          </p>
        </div>

        {/* Botón flotante / barra de carrito */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs shadow-glow-gold hover:opacity-95 transition-opacity self-start"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Ver Carrito ({cart.reduce((s, i) => s + i.qty, 0)})</span>
          <span className="bg-black/20 px-2 py-0.5 rounded-lg font-mono">
            ${totalCartPrice.toFixed(2)}
          </span>
        </button>
      </div>

      {/* Categorías Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-gold-500 text-black shadow-glow-gold'
                : 'bg-noir-900 border border-industrial-800 text-industrial-400 hover:text-white hover:border-industrial-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Catálogo de Productos Grid */}
      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-industrial-400 animate-pulse">
          Cargando catálogo boutique de la barbería...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-xs text-industrial-500 bg-noir-900 border border-industrial-800 rounded-3xl">
          No hay productos disponibles en esta categoría actualmente.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const inCartItem = cart.find((i) => i.id === product.id);
            const isOutOfStock = product.stock <= 0;

            return (
              <div
                key={product.id}
                className="bg-noir-900 border border-industrial-800 rounded-3xl overflow-hidden hover:border-gold-500/40 transition-all duration-300 flex flex-col group shadow-xl"
              >
                {/* Imagen con badge */}
                <div className="relative h-48 w-full overflow-hidden bg-noir-950">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-noir-900 via-transparent to-transparent"></div>

                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-noir-950/80 backdrop-blur-md border border-industrial-700 text-[10px] font-mono font-bold text-gold-400 uppercase">
                    {product.category || 'Grooming'}
                  </span>

                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-mono text-rose-300">
                      ¡Últimas {product.stock} uds!
                    </span>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-gold-300 transition-colors leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs text-industrial-400 mt-2 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-industrial-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-industrial-500 uppercase tracking-wider block">PVP</span>
                      <span className="text-xl font-bold font-mono text-white">
                        ${Number(product.unitPrice).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
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
                          <Check className="w-3.5 h-3.5" />
                          En Carrito ({inCartItem.qty})
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Comprar
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

      {/* Cart Drawer Slide-Over Modal */}
      {isCartOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsCartOpen(false); }}
          className="fixed inset-0 z-50 flex justify-end bg-noir-950/80 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-noir-900 border-l border-industrial-800 h-full p-6 flex flex-col justify-between overflow-y-auto cursor-default"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-industrial-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-gold-400" />
                  <h3 className="font-display font-bold text-white text-base">
                    Bolsa de Productos ({cart.reduce((s, i) => s + i.qty, 0)})
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-xl text-industrial-400 hover:text-white hover:bg-noir-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {orderConfirmed ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-white text-lg">¡Pedido Reservado!</h4>
                  <p className="text-xs text-industrial-400 max-w-xs mx-auto">
                    Tu pedido <strong className="font-mono text-gold-400">{orderConfirmed.id}</strong> ha sido recibido por el equipo de la barbería.
                  </p>
                  <div className="p-4 rounded-xl bg-noir-950 border border-industrial-800 text-left font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-industrial-400">Cliente:</span>
                      <span className="text-white font-bold">{orderConfirmed.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-industrial-400">Total a pagar en tienda:</span>
                      <span className="text-gold-400 font-bold">${orderConfirmed.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola! Acabo de hacer el pedido ${orderConfirmed.id} en la tienda online por un valor de $${orderConfirmed.totalAmount}. Mi nombre es ${orderConfirmed.clientName}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 text-black font-bold text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Confirmar por WhatsApp con la Barbería
                  </a>

                  <button
                    onClick={() => {
                      setOrderConfirmed(null);
                      setIsCartOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-noir-800 text-industrial-300 text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="py-16 text-center text-xs text-industrial-500">
                  Tu carrito está vacío. Agrega productos de la tienda.
                </div>
              ) : (
                <div className="divide-y divide-industrial-800/80 my-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-3 flex items-center justify-between gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-industrial-800"
                      />
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-white leading-tight">{item.name}</h4>
                        <span className="text-xs font-mono text-gold-400 font-bold">
                          ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-noir-950 border border-industrial-800 rounded-lg p-1">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-1 hover:text-rose-400 text-industrial-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono text-xs font-bold text-white">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          disabled={item.qty >= item.stock}
                          className="p-1 hover:text-emerald-400 text-industrial-400 disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!orderConfirmed && cart.length > 0 && (
              <form onSubmit={handleCheckoutOrder} className="pt-4 border-t border-industrial-800 space-y-3">
                <div className="flex justify-between items-center text-sm font-mono pb-2">
                  <span className="text-industrial-400">Total Pedido:</span>
                  <span className="text-xl font-bold text-gold-400">${totalCartPrice.toFixed(2)}</span>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Tu Nombre Completo"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    required
                    placeholder="Móvil / WhatsApp (+34 600...)"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-noir-950 border border-industrial-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-bold text-xs tracking-wide shadow-glow-gold hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : `Reservar para Recoger ($${totalCartPrice.toFixed(2)})`}
                </button>
                <p className="text-[10px] text-center text-industrial-500">
                  Se paga directamente en mostrador al recoger tus productos.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

