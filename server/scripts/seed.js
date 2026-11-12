/**
 * BarberPulse OS — Tenant Provisioning & Seeder Script
 * Uso: node scripts/seed.js <nuevo-tenant-id> "<Nombre Barberia>"
 */

import { getTenantCollection, isMock, db } from '../src/config/firebase.js';

const tenantId = process.argv[2] || 'elite-cuts-barber';
const barbershopName = process.argv[3] || 'Elite Cuts Studio';

console.log(`💈 Provisionando nuevo Tenant: "${tenantId}" [${barbershopName}]...`);

const sampleBarbers = [
  { id: 'b-01', name: 'Marcos "The Surgeon" Peña', commissionRate: 0.50, active: true, status: 'AVAILABLE' },
  { id: 'b-02', name: 'Alan "Razor" Varela', commissionRate: 0.45, active: true, status: 'AVAILABLE' },
  { id: 'b-03', name: 'Gabriel "Fade" Ramos', commissionRate: 0.50, active: true, status: 'AVAILABLE' }
];

const sampleInventory = [
  { id: 'prod-01', name: 'Pomada Arcilla Mate 120ml', sku: 'ARC-MAT-01', stock: 24, minStock: 6, unitPrice: 20.00, costPrice: 8.00 },
  { id: 'prod-02', name: 'Serum Barba Hidratante Argan', sku: 'SER-ARG-02', stock: 15, minStock: 5, unitPrice: 24.00, costPrice: 9.50 },
  { id: 'prod-03', name: 'Pack Cuchillas Platinum (100 uds)', sku: 'BLA-PLA-03', stock: 4, minStock: 5, unitPrice: 12.00, costPrice: 5.00 }
];

async function seed() {
  if (isMock) {
    console.log('⚡ Modo mock detectado. Los datos modelo están listos en memoria.');
    return;
  }

  const shopDoc = db.collection('barbershops').doc(tenantId);
  await shopDoc.set({
    id: tenantId,
    name: barbershopName,
    createdAt: new Date().toISOString(),
    settings: {
      currency: 'USD',
      openingCashDefault: 100
    }
  });

  const batch = db.batch();

  sampleBarbers.forEach(b => {
    const ref = shopDoc.collection('barbers').doc(b.id);
    batch.set(ref, b);
  });

  sampleInventory.forEach(inv => {
    const ref = shopDoc.collection('inventory').doc(inv.id);
    batch.set(ref, inv);
  });

  await batch.commit();
  console.log(`✅ Tenant "${tenantId}" provisionado exitosamente en Cloud Firestore.`);
}

seed().catch(console.error);

