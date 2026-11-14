/**
 * =========================================================================
 * Catálogo Tradicional de Servicios Básicos de Barbería
 * Nombres directos, claros y todas las combinaciones esenciales:
 * Corte, Barba, Cejas, Cera y sus combinaciones tradicionales.
 * Precios base en Pesos Colombianos (COP).
 * =========================================================================
 */

export const TRADITIONAL_SERVICES = [
  {
    id: 'srv-corte',
    name: 'Corte',
    shortName: 'Corte',
    price: 25000,
    duration: 30,
    icon: '✂️',
    description: 'Corte clásico o degradado (Fade / Skin Fade) con peinado y acabado.'
  },
  {
    id: 'srv-barba',
    name: 'Barba',
    shortName: 'Barba',
    price: 18000,
    duration: 20,
    icon: '🧔',
    description: 'Arreglo, toalla caliente y perfilado de barba con navaja.'
  },
  {
    id: 'srv-cejas',
    name: 'Cejas',
    shortName: 'Cejas',
    price: 10000,
    duration: 15,
    icon: '✨',
    description: 'Limpieza y diseño de cejas masculinas con navaja.'
  },
  {
    id: 'srv-cera',
    name: 'Cera',
    shortName: 'Cera',
    price: 12000,
    duration: 15,
    icon: '🍯',
    description: 'Depilación con cera en nariz, oídos o pómulos.'
  },
  {
    id: 'srv-corte-barba',
    name: 'Corte y Barba',
    shortName: 'Corte y Barba',
    price: 38000,
    duration: 45,
    icon: '🔥',
    description: 'Combo clásico tradicional: corte completo de cabello y ritual de barba.'
  },
  {
    id: 'srv-corte-cejas',
    name: 'Corte y Cejas',
    shortName: 'Corte y Cejas',
    price: 30000,
    duration: 35,
    icon: '⚡',
    description: 'Corte completo de cabello más diseño y perfilado de cejas.'
  },
  {
    id: 'srv-corte-cera',
    name: 'Corte y Cera',
    shortName: 'Corte y Cera',
    price: 32000,
    duration: 35,
    icon: '💈',
    description: 'Corte de cabello completo con aplicación de cera depilatoria facial.'
  },
  {
    id: 'srv-barba-cejas',
    name: 'Barba y Cejas',
    shortName: 'Barba y Cejas',
    price: 25000,
    duration: 25,
    icon: '😎',
    description: 'Arreglo de barba con navaja más limpieza y perfilado de cejas.'
  },
  {
    id: 'srv-barba-cera',
    name: 'Barba con Cera',
    shortName: 'Barba con Cera',
    price: 25000,
    duration: 25,
    icon: '🧼',
    description: 'Ritual de barba con toalla caliente y depilación de vellos con cera.'
  },
  {
    id: 'srv-cejas-cera',
    name: 'Cejas con Cera',
    shortName: 'Cejas con Cera',
    price: 18000,
    duration: 20,
    icon: '✨',
    description: 'Perfilado de cejas combinado con cera facial.'
  },
  {
    id: 'srv-corte-barba-cejas',
    name: 'Corte, Barba y Cejas',
    shortName: 'Corte, Barba y Cejas',
    price: 45000,
    duration: 50,
    icon: '👑',
    description: 'Combo tradicional completo: cabello, barba ritual y cejas.'
  },
  {
    id: 'srv-corte-barba-cera',
    name: 'Corte, Barba y Cera',
    shortName: 'Corte, Barba y Cera',
    price: 48000,
    duration: 50,
    icon: '🦁',
    description: 'Corte de cabello, arreglo de barba y depilación facial con cera.'
  },
  {
    id: 'srv-combo-completo',
    name: 'Combo Completo',
    shortName: 'Combo Completo',
    price: 55000,
    duration: 60,
    icon: '⭐',
    description: 'La experiencia total: Corte, Barba, Cejas y Cera en una sola sesión.'
  }
];
