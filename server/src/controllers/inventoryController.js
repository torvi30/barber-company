import { getTenantCollection, isMock } from '../config/firebase.js';
import { validateInventoryItem } from '../models/schemas.js';

export const getInventory = async (req, res) => {
  try {
    const { barbershopId } = req;
    const invCollection = getTenantCollection(barbershopId, 'inventory');

    const data = isMock
      ? invCollection.data
      : (await invCollection.get()).docs.map(d => ({ id: d.id, ...d.data() }));

    const lowStockAlerts = data.filter(item => Number(item.stock) <= Number(item.minStock));

    return res.json({
      success: true,
      data,
      metrics: {
        totalItems: data.length,
        lowStockCount: lowStockAlerts.length,
        lowStockItems: lowStockAlerts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { barbershopId } = req;
    const { id } = req.params;
    const { adjustment } = req.body; // e.g. -1 for service use or sale

    const invCollection = getTenantCollection(barbershopId, 'inventory');

    if (isMock) {
      const item = invCollection.data.find(i => i.id === id);
      if (!item) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

      item.stock = Math.max(0, Number(item.stock) + Number(adjustment));

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

