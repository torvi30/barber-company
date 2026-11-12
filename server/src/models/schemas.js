/**
 * Esquemas de validación y definición de entidades de dominio
 * BarberPulse OS
 */

export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  WAITING: 'WAITING',
  IN_CHAIR: 'IN_CHAIR',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER'
};

export const validateAppointment = (data) => {
  const errors = [];
  if (!data.barberId) errors.push('El campo "barberId" es obligatorio.');
  if (!data.clientName) errors.push('El campo "clientName" es obligatorio.');
  if (!data.serviceName) errors.push('El campo "serviceName" es obligatorio.');
  if (data.price === undefined || isNaN(Number(data.price))) errors.push('El "price" debe ser un número válido.');
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateInventoryItem = (data) => {
  const errors = [];
  if (!data.name) errors.push('El nombre del producto es obligatorio.');
  if (!data.sku) errors.push('El SKU es obligatorio.');
  if (data.stock === undefined || isNaN(Number(data.stock))) errors.push('El stock debe ser numérico.');
  if (data.unitPrice === undefined || isNaN(Number(data.unitPrice))) errors.push('El unitPrice debe ser numérico.');
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCashClosure = (data) => {
  const errors = [];
  if (data.openingCash === undefined || isNaN(Number(data.openingCash))) {
    errors.push('El saldo inicial en caja (openingCash) es requerido.');
  }
  if (data.actualCashInDrawer === undefined || isNaN(Number(data.actualCashInDrawer))) {
    errors.push('El recuento físico de efectivo en gaveta (actualCashInDrawer) es requerido.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

