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
 * Aplica transformaciones automáticas de CDN de Cloudinary (WebP, compresión inteligente y resize)
 */
export function getOptimizedImageUrl(url, { width = 300, height = 300, crop = 'fill' } = {}) {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return url;
  }

  // Insertar transformaciones: f_auto,q_auto,w_${width},h_${height},c_${crop}
  const transformation = `f_auto,q_auto,w_${width},h_${height},c_${crop}`;
  return url.replace('/image/upload/', `/image/upload/${transformation}/`);
}

