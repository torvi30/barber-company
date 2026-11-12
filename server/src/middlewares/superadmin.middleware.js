/**
 * BarberPulse OS - SuperAdmin Authorization Middleware
 * 
 * Protege el Central Control Plane (Casa Nodriza).
 * Valida Custom Claims de Firebase Auth (role === 'superadmin') o cabecera x-admin-key / x-role.
 */

export const requireSuperAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const userRole = req.headers['x-user-role'] || req.headers['x-role'];
  const masterSecret = process.env.SUPERADMIN_MASTER_KEY || 'superadmin-secret-nodriza-2026';

  // Validación por master key o rol explícito de superadmin
  const isAuthorized =
    adminKey === masterSecret ||
    userRole === 'SUPERADMIN' ||
    req.user?.role === 'superadmin' ||
    req.user?.superadmin === true;

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      error: 'Acceso Denegado - SuperAdmin Exclusivo',
      message: 'Se requiere rol SuperAdmin o Custom Claim administrativo para acceder a la Casa Nodriza.'
    });
  }

  req.isSuperAdmin = true;
  next();
};

export default requireSuperAdmin;


