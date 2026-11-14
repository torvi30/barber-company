/**
 * BarberPulse OS - Phone & WhatsApp Normalization Utilities
 *
 * Resuelve y unifica números de teléfono para WhatsApp, garantizando que tanto
 * formatos locales colombianos (ej. 3225466673) como con código de país (ej. 573225466673, +57...)
 * se abran SIEMPRE en Colombia (+57) y nunca en Bélgica (+32).
 */

export const normalizeWhatsAppPhone = (phone, defaultCountryCode = '57') => {
  if (!phone) return '';
  const digits = String(phone).replace(/[^\d]/g, '');
  if (!digits) return '';

  // 1. Si ya tiene 12 dígitos y empieza con 573 (Colombia celular completo: 573XXXXXXXXX)
  if (digits.startsWith('57') && digits.length === 12) {
    return digits;
  }

  // 2. Si tiene 10 dígitos y empieza por 3 (celular estándar de Colombia: 300, 310, 320, 321, 322, 350, etc.)
  if (digits.length === 10 && digits.startsWith('3')) {
    return `${defaultCountryCode}${digits}`;
  }

  // 3. Si tiene prefijos internacionales con ceros 0057...
  if (digits.startsWith('0057')) {
    return digits.slice(2);
  }

  // 4. Si tiene 11 dígitos y empieza por 03 (prefijo de marcación antigua en Colombia)
  if (digits.length === 11 && digits.startsWith('03')) {
    return `${defaultCountryCode}${digits.slice(2)}`;
  }

  // 5. Si tiene 10 dígitos y el país por defecto es Colombia
  if (digits.length === 10 && defaultCountryCode === '57') {
    return `57${digits}`;
  }

  // 6. Otros números internacionales (ej. España +34, EEUU +1...)
  return digits;
};

/**
 * Formato visual elegante y legible para el usuario en pantalla (ej: +57 322 546 6673)
 */
export const formatDisplayPhone = (phone) => {
  const norm = normalizeWhatsAppPhone(phone);
  if (!norm) return phone || '';

  if (norm.startsWith('57') && norm.length === 12) {
    const p = norm.slice(2);
    return `+57 ${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`;
  }

  if (norm.length === 10) {
    return `${norm.slice(0, 3)} ${norm.slice(3, 6)} ${norm.slice(6)}`;
  }

  return `+${norm}`;
};

/**
 * Construye el enlace universal a WhatsApp oficial (wa.me)
 */
export const buildWhatsAppLink = (phone, message = '') => {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  if (!cleanPhone) return '#';
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleanPhone}${query}`;
};
