/**
 * =========================================================================
 * BarberPulse OS — Cloudinary Media Storage Service
 * Cloud Name: bchdrvef
 * Upload Preset: barber-company (Unsigned)
 * Carpeta aislada: barber-company/[subcarpeta]
 * =========================================================================
 */

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'bchdrvef',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'barber-company',
  defaultFolder: 'barber-company'
};

/**
 * Sube una imagen (archivo File, Blob o DataURL en base64) directo a Cloudinary.
 * @param {File|Blob|string} fileOrDataUrl - Archivo o DataURL en base64
 * @param {string} subfolder - Subcarpeta dentro de barber-company (ej: 'logos', 'avatars', 'cortes')
 * @returns {Promise<{ url: string, publicId: string, bytes: number }>}
 */
export async function uploadToCloudinary(fileOrDataUrl, subfolder = '') {
  if (!fileOrDataUrl) throw new Error('No se proporcionó archivo o imagen');

  const folder = subfolder ? `barber-company/${subfolder}` : 'barber-company';

  const formData = new FormData();
  formData.append('file', fileOrDataUrl);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Error al subir imagen a Cloudinary');
  }

  const data = await response.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    bytes: data.bytes,
    format: data.format,
    width: data.width,
    height: data.height
  };
}

/**
 * Comprime y redimensiona una imagen en el cliente (Browser Canvas) antes de subirla.
 * Transforma fotos pesadas de teléfonos (3MB - 10MB) en archivos ultralivianos (~30KB - 70KB)
 * ideales para soportar cientos de barberías y catálogos masivos sin sobrecargar el servidor ni agotar cuotas.
 * 
 * @param {File|Blob} file - Archivo de imagen original
 * @param {object} options - Opciones de tamaño y calidad
 * @returns {Promise<{ blob: Blob, dataUrl: string, originalSize: number, compressedSize: number, reduction: number }>}
 */
export async function compressImageFile(file, { maxWidth = 600, maxHeight = 600, quality = 0.75 } = {}) {
  if (!file) throw new Error('No se proporcionó archivo para comprimir');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener proporción de aspecto dentro del límite máximo
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Suavizado bicúbico de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Intentar exportar en WebP (estándar moderno más liviano), con fallback a JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Error al comprimir imagen en canvas'));
            }
            const originalSize = file.size;
            const compressedSize = blob.size;
            const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);

            resolve({
              blob,
              dataUrl,
              originalSize,
              compressedSize,
              reduction: reduction > 0 ? reduction : 0,
              width,
              height
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = (err) => reject(new Error('No se pudo decodificar la imagen: ' + err.message));
    };

    reader.onerror = (err) => reject(new Error('Error al leer el archivo: ' + err.message));
  });
}

/**
 * Aplica transformaciones automáticas de CDN (Cloudinary / Unsplash)
 * para servir WebP con compresión automática y resolución justa de pantalla.
 */
export function getOptimizedImageUrl(url, { width = 400, height = 400, crop = 'fill' } = {}) {
  if (!url || typeof url !== 'string') return url;

  // Optimización para Cloudinary
  if (url.includes('cloudinary.com')) {
    const transformation = `f_auto,q_auto:good,w_${width},h_${height},c_${crop}`;
    if (!url.includes('/image/upload/f_auto')) {
      return url.replace('/image/upload/', `/image/upload/${transformation}/`);
    }
    return url;
  }

  // Optimización para Unsplash (format=webp, quality=75, tamaño controlado)
  if (url.includes('images.unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    // Si ya tiene parámetros de width/quality, reemplazarlos o agregarlos
    return `${url}${separator}auto=format&fit=crop&w=${width}&q=75`;
  }

  return url;
}

