import { getTenantCollection, isMock, mockStore, persistStore, db } from '../config/firebase.js';

// Catálogo base profesional de barbería para inicializar salones
export const DEFAULT_BARBERSHOP_PRODUCTS = [
  {
    id: 'prod-01',
    name: 'Pomada Mate Fijación Fuerte (100ml)',
    sku: 'POM-MAT-01',
    category: 'Pomadas & Ceras',
    description: 'Acabado natural sin brillo, fijación alta para peinados clásicos y degradados todo el día.',
    unitPrice: 35000,
    costPrice: 18000,
    stock: 15,
    minStock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?fit=crop&w=400&q=80',
    isPublic: true
  },
  {
    id: 'prod-02',
    name: 'Aceite Orgánico Barba & Madera de Cedro (30ml)',
    sku: 'OIL-BAR-02',
    category: 'Cuidado Barba',
    description: 'Nutre la fibra capilar, hidrata la piel bajo la barba y aporta brillo con aroma a cedro.',
    unitPrice: 32000,
    costPrice: 15000,
    stock: 12,
    minStock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?fit=crop&w=400&q=80',
    isPublic: true
  },
  {
    id: 'prod-03',
    name: 'Bálsamo Calmante Post-Afeitado Eucalipto (150ml)',
    sku: 'BAL-AFT-03',
    category: 'Afeitado & Afters',
    description: 'Fórmula refrescante con aloe vera y eucalipto que cierra poros y previene irritación tras la navaja.',
    unitPrice: 28000,
    costPrice: 14000,
    stock: 10,
    minStock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?fit=crop&w=400&q=80',
    isPublic: true
  },
  {
    id: 'prod-04',
    name: 'Cera en Polvo Voluminizadora Matte Dust (20g)',
    sku: 'POW-VOL-04',
    category: 'Pomadas & Ceras',
    description: 'Volumen instantáneo y textura mate ideal para cabellos finos o peinados desestructurados.',
    unitPrice: 25000,
    costPrice: 12000,
    stock: 18,
    minStock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?fit=crop&w=400&q=80',
    isPublic: true
  },
  {
    id: 'prod-05',
    name: 'Shaving Gel Precisión Transparente (250ml)',
    sku: 'GEL-SHV-05',
    category: 'Afeitado & Afters',
    description: 'Gel no espumante que permite visibilidad perfecta para delineados precisos de barba y patillas.',
    unitPrice: 24000,
    costPrice: 11000,
    stock: 14,
    minStock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?fit=crop&w=400&q=80',
    isPublic: true
  },
  {
    id: 'prod-06',
    name: 'Navaja Tradicional Barbería Acero Inoxidable',
    sku: 'NAV-ACE-06',
    category: 'Herramientas & Navajas',
    description: 'Mango ergonómico con sujeción firme de media cuchilla estándar para rituales clásicos.',
    unitPrice: 45000,
    costPrice: 22000,
    stock: 8,
    minStock: 2,
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?fit=crop&w=400&q=80',
    isPublic: true
  }
];

export const getInventory = async (req, res) => {
  try {
    const { barbershopId } = req;
    const invCollection = getTenantCollection(barbershopId, 'inventory');

    let data = [];
    if (isMock) {
      if (!invCollection.data || invCollection.data.length === 0) {
        invCollection.data = JSON.parse(JSON.stringify(DEFAULT_BARBERSHOP_PRODUCTS));
        if (mockStore.inventory) {
          mockStore.inventory[barbershopId] = invCollection.data;
        }
        persistStore();
      }
      data = invCollection.data;
    } else {
      const snap = await invCollection.get();
      if (snap.empty) {
        // Sembrar catálogo profesional inicial
        for (const item of DEFAULT_BARBERSHOP_PRODUCTS) {
          await invCollection.doc(item.id).set(item);
        }
        data = DEFAULT_BARBERSHOP_PRODUCTS;
      } else {
        data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    }

    const lowStockAlerts = data.filter(item => Number(item.stock) <= Number(item.minStock));

    // Obtener lista única de categorías activas
    const categories = Array.from(new Set(data.map(item => item.category).filter(Boolean)));

    return res.json({
      success: true,
      data,
      categories,
      metrics: {
        totalItems: data.length,
        lowStockCount: lowStockAlerts.length,
        lowStockItems: lowStockAlerts,
        totalValuation: data.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.stock || 0)), 0),
        totalInvestment: data.reduce((s, i) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0)
      }
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { barbershopId } = req;
    const {
      name,
      sku,
      category = 'General',
      description = '',
      unitPrice = 0,
      costPrice = 0,
      stock = 0,
      minStock = 2,
      imageUrl = '',
      isPublic = true
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del producto es obligatorio.' });
    }

    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const finalSku = (sku && sku.trim()) ? sku.trim().toUpperCase() : `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProduct = {
      id,
      name: name.trim(),
      sku: finalSku,
      category: category.trim() || 'General',
      description: description.trim(),
      unitPrice: Number(unitPrice) || 0,
      costPrice: Number(costPrice) || 0,
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 2,
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1597852074816-d933c4d2b988?fit=crop&w=400&q=80',
      isPublic: isPublic !== false,
      createdAt: new Date().toISOString()
    };

    const invCollection = getTenantCollection(barbershopId, 'inventory');

    if (isMock) {
      if (!Array.isArray(invCollection.data)) invCollection.data = [];
      invCollection.data.unshift(newProduct);
      if (mockStore.inventory) {
        mockStore.inventory[barbershopId] = invCollection.data;
      }
      persistStore();
    } else {
      await invCollection.doc(id).set(newProduct);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('inventory:created', { product: newProduct });
    }

    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente.',
      data: newProduct
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const updates = req.body;

    const invCollection = getTenantCollection(barbershopId, 'inventory');

    if (isMock) {
      const index = (invCollection.data || []).findIndex(i => i.id === id);
      if (index === -1) return res.status(404).json({ success: false, error: 'Producto no encontrado.' });

      const updated = {
        ...invCollection.data[index],
        ...updates,
        ...(updates.unitPrice !== undefined && { unitPrice: Number(updates.unitPrice) }),
        ...(updates.costPrice !== undefined && { costPrice: Number(updates.costPrice) }),
        ...(updates.stock !== undefined && { stock: Number(updates.stock) }),
        ...(updates.minStock !== undefined && { minStock: Number(updates.minStock) }),
        updatedAt: new Date().toISOString()
      };

      invCollection.data[index] = updated;
      if (mockStore.inventory) {
        mockStore.inventory[barbershopId] = invCollection.data;
      }
      persistStore();

      const io = req.app.get('io');
      if (io) io.to(`barbershop:${barbershopId}`).emit('inventory:updated', { product: updated });

      return res.json({ success: true, message: 'Producto actualizado.', data: updated });
    }

    const docRef = invCollection.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Producto no encontrado.' });

    const payload = {
      ...updates,
      ...(updates.unitPrice !== undefined && { unitPrice: Number(updates.unitPrice) }),
      ...(updates.costPrice !== undefined && { costPrice: Number(updates.costPrice) }),
      ...(updates.stock !== undefined && { stock: Number(updates.stock) }),
      ...(updates.minStock !== undefined && { minStock: Number(updates.minStock) }),
      updatedAt: new Date().toISOString()
    };

    await docRef.update(payload);
    const updated = { id, ...snap.data(), ...payload };

    const io = req.app.get('io');
    if (io) io.to(`barbershop:${barbershopId}`).emit('inventory:updated', { product: updated });

    return res.json({ success: true, message: 'Producto actualizado.', data: updated });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;

    const invCollection = getTenantCollection(barbershopId, 'inventory');

    if (isMock) {
      invCollection.data = (invCollection.data || []).filter(i => i.id !== id);
      if (mockStore.inventory) {
        mockStore.inventory[barbershopId] = invCollection.data;
      }
      persistStore();
    } else {
      await invCollection.doc(id).delete();
    }

    const io = req.app.get('io');
    if (io) io.to(`barbershop:${barbershopId}`).emit('inventory:deleted', { id });

    return res.json({ success: true, message: 'Producto eliminado correctamente.', id });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { adjustment } = req.body;

    const invCollection = getTenantCollection(barbershopId, 'inventory');

    if (isMock) {
      const item = (invCollection.data || []).find(i => i.id === id);
      if (!item) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

      item.stock = Math.max(0, Number(item.stock) + Number(adjustment));
      persistStore();

      const io = req.app.get('io');
      if (io) {
        io.to(`barbershop:${barbershopId}`).emit('inventory:updated', { item });
      }

      return res.json({ success: true, data: item });
    }

    const docRef = invCollection.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    const currentStock = snap.data().stock || 0;
    const newStock = Math.max(0, currentStock + Number(adjustment));
    await docRef.update({ stock: newStock });

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('inventory:updated', { id, stock: newStock });
    }

    return res.json({ success: true, data: { id, stock: newStock } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
