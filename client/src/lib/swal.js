import Swal from 'sweetalert2';

/**
 * BarberPulse OS - SweetAlert2 Custom Theme
 * Soporta modo oscuro y modo claro con acento dorado
 */
export const swalCustom = Swal.mixin({
  background: '#121316',
  color: '#f8fafc',
  confirmButtonColor: '#eab308',
  cancelButtonColor: '#334155',
  customClass: {
    popup: 'rounded-3xl border border-industrial-700 shadow-2xl p-6 text-slate-100 font-sans',
    title: 'font-display font-bold text-white text-lg sm:text-xl tracking-wide',
    htmlContainer: 'text-xs sm:text-sm text-industrial-300 leading-relaxed',
    confirmButton: 'px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-noir-950 font-bold text-xs uppercase tracking-wider shadow-glow-gold hover:from-gold-500 hover:to-gold-300 transition-all cursor-pointer border-none font-mono',
    cancelButton: 'px-5 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-slate-200 font-semibold text-xs transition-all cursor-pointer border border-industrial-700 mr-2 font-mono'
  },
  buttonsStyling: false
});

export const showSuccessAlert = (title, text) => {
  return swalCustom.fire({
    icon: 'success',
    title,
    text,
    timer: 3500,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: 'Genial / Entendido'
  });
};

export const showErrorAlert = (title, text) => {
  return swalCustom.fire({
    icon: 'error',
    title: title || 'Error',
    text: text || 'Ocurrió un error inesperado al procesar la solicitud.',
    confirmButtonText: 'Entendido'
  });
};

export const showConfirmDialog = async ({
  title,
  text,
  confirmText = 'Sí, continuar',
  cancelText = 'Cancelar',
  icon = 'warning'
}) => {
  return swalCustom.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true
  });
};

export default swalCustom;

