/**
 * BarberPulse OS - SuperAdmin Authorization Middleware
 * 
 * Protege el Central Control Plane (Casa Nodriza).
 * Valida lista blanca de correos de SuperAdmin, Custom Claims o x-admin-key / x-role.
 */
import { SUPERADMIN_EMAILS } from '../controllers/authController.js';

export const requireSuperAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const userRole = (req.headers['x-user-role'] || req.headers['x-role'] || '').toUpperCase();
  const userEmail = (req.headers['x-user-email'] || req.user?.email || '').toLowerCase().trim();
  const masterSecret = process.env.SUPERADMIN_MASTER_KEY || 'superadmin-secret-nodriza-2026';

  const isEmailSuperAdmin = userEmail && SUPERADMIN_EMAILS.includes(userEmail);

  // Validación por master key, email en lista blanca, o rol explícito de superadmin
  const isAuthorized =
    isEmailSuperAdmin ||
    adminKey === masterSecret ||
    userRole === 'SUPERADMIN' ||
    req.user?.role === 'superadmin' ||
    req.user?.superadmin === true;

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: 'Acceso Denegado - SuperAdmin Exclusivo',
      message: 'Se requiere rol SuperAdmin o cuenta autorizada para acceder a la Casa Nodriza.'
    });
  }

  req.isSuperAdmin = true;
  next();
};

export default requireSuperAdmin;
