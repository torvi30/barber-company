/**
 * =========================================================================
 * Catálogo Tradicional de Servicios de Barbería
 * Servicios esenciales y tradicionales (Corte, Barba, Cejas y sus Combos)
 * Precios base en Pesos Colombianos (COP) adaptados a la realidad comercial
 * =========================================================================
 */

export const TRADITIONAL_SERVICES = [
  {
    id: 'srv-corte',
    name: 'Corte de Cabello (Fade / Clásico)',
    shortName: 'Corte',
    price: 25000,
    duration: 35,
    icon: '✂️',
    description: 'Corte clásico a tijera o degradado (Fade / Skin Fade) con peinado y acabado estructurado.'
  },
  {
    id: 'srv-barba',
    name: 'Arreglo & Ritual de Barba',
    shortName: 'Barba',
    price: 18000,
    duration: 25,
    icon: '🧔',
    description: 'Perfilado milimétrico con navaja, toalla caliente y aplicación de bálsamo/óleo hidratante.'
  },
  {
    id: 'srv-cejas',
    name: 'Perfilado de Cejas con Navaja',
    shortName: 'Cejas',
    price: 10000,
    duration: 15,
    icon: '✨',
    description: 'Limpieza y diseño de cejas masculinas con navaja tradicional y desinfección.'
  },
  {
    id: 'srv-corte-barba',
    name: 'Combo Tradicional: Corte + Barba',
    shortName: 'Corte + Barba',
    price: 38000,
    duration: 50,
    icon: '🔥',
    description: 'El combo por excelencia: corte de precisión completo y ritual de toalla para la barba.'
  },
  {
    id: 'srv-corte-cejas',
    name: 'Combo: Corte + Cejas',
    shortName: 'Corte + Cejas',
    price: 30000,
    duration: 40,
    icon: '⚡',
    description: 'Corte de cabello completo más perfilado y alineación de cejas.'
  },
  {
    id: 'srv-completo',
    name: 'Combo VIP: Corte + Barba + Cejas',
    shortName: 'Corte + Barba + Cejas',
    price: 45000,
    duration: 60,
    icon: '👑',
    description: 'Servicio completo de barbería tradicional: cabello, barba ritual y cejas en una sola sesión.'
  }
];
