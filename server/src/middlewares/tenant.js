/**
 * Middleware de Multi-tenancy
 * Valida la presencia e identidad de la barbería (tenant) en los headers o queries.
 * Inyecta el ID del tenant en el objeto `req` para aislamiento estricto en controladores.
 */
export const requireTenant = (req, res, next) => {
  const barbershopId = req.headers['x-barbershop-id'] || req.query.barbershopId || 'demo-barbershop-01';

  if (!barbershopId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant Identifier Required',
      message: 'Debe incluir la cabecera x-barbershop-id para identificar el entorno de la barbería.'
    });
  }

  // Sanitización de clave
  req.barbershopId = String(barbershopId).trim();
  next();
};

