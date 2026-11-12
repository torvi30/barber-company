import { mockStore, isMock } from '../config/firebase.js';

/**
 * Iniciar sesión con validación de roles y asignación de barbería aislada
 */
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
    }

    // 1. Verificación de SuperAdmin
    if (role === 'SUPERADMIN' || email === 'superadmin@barberpulse.io') {
      if (password === 'SuperAdmin2026') {
        return res.json({
          success: true,
          user: {
            id: 'usr-superadmin',
            name: 'SuperAdmin Central',
            email: 'superadmin@barberpulse.io',
            role: 'SUPERADMIN',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
          }
        });
      } else {
        return res.status(401).json({ success: false, error: 'Credenciales de SuperAdmin inválidas' });
      }
    }

    // 2. Verificación de Dueño / Administrador de Barbería
    const user = (mockStore.users || []).find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Verifica tu correo y contraseña.'
      });
    }

    const barbershop = mockStore.barbershops?.[user.tenantId] || { name: 'Mi Barbería', id: user.tenantId };

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'OWNER',
        tenantId: user.tenantId,
        barbershopName: barbershop.name,
        avatar: user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=150&q=80'
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Invitar o crear credenciales para un Administrador de Barbería
 */
export const inviteAdmin = async (req, res) => {
  try {
    const { barbershopId, name, email, password, phone } = req.body;

    if (!barbershopId || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: barbershopId, name, email'
      });
    }

    const barbershop = mockStore.barbershops?.[barbershopId];
    if (!barbershop) {
      return res.status(404).json({ success: false, error: 'Barbería no encontrada' });
    }

    const autoPassword = password || `Barber${Math.floor(1000 + Math.random() * 9000)}!`;
    const cleanEmail = email.toLowerCase().trim();

    // Comprobar si ya existe
    const existingIndex = (mockStore.users || []).findIndex(u => u.email.toLowerCase() === cleanEmail);
    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: autoPassword,
      role: 'OWNER',
      tenantId: barbershopId,
      phone: phone || barbershop.whatsapp,
      active: true,
      invitedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      mockStore.users[existingIndex] = { ...mockStore.users[existingIndex], ...newUser };
    } else {
      if (!mockStore.users) mockStore.users = [];
      mockStore.users.push(newUser);
    }

    // Generar enlace directo de login con pre-rellenado
    const clientHost = req.headers.origin || 'http://localhost:5173';
    const invitationLink = `${clientHost}/?tenant=${barbershopId}&email=${encodeURIComponent(cleanEmail)}`;

    // Generar mensaje para WhatsApp
    const rawPhone = (phone || barbershop.whatsapp || '').replace(/[^\d]/g, '');
    const cleanPhone = rawPhone.length === 10 && rawPhone.startsWith('3') ? `57${rawPhone}` : rawPhone;
    const whatsappText = encodeURIComponent(
      `¡Hola ${name}! 💈 Bienvenido a BarberPulse OS.\n\n` +
      `Tu panel privado para gestionar *${barbershop.name}* está listo:\n\n` +
      `🔑 *Tus Accesos Exclusivos:*\n` +
      `• Panel Web: ${invitationLink}\n` +
      `• Usuario: ${cleanEmail}\n` +
      `• Clave Temporal: ${autoPassword}\n\n` +
      `Solo tú y tu equipo tendrán acceso a las métricas, caja y turnos de tu barbería.`
    );
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappText}` : null;

    return res.status(201).json({
      success: true,
      message: `Invitación generada para ${name} (${barbershop.name})`,
      user: newUser,
      invitationLink,
      whatsappUrl,
      whatsappMessage: decodeURIComponent(whatsappText)
    });
  } catch (error) {
    console.error('Error al invitar administrador:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Listar administradores registrados de una barbería
 */
export const getAdminsByBarbershop = async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const users = (mockStore.users || []).filter(u => u.tenantId === barbershopId);
    return res.json({
      success: true,
      count: users.length,
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        tenantId: u.tenantId,
        invitedAt: u.invitedAt || u.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar configuración de la barbería (ej. Módulo Tienda Boutique)
 */
export const updateBarbershopSettings = async (req, res) => {
  try {
    const { barbershopId } = req.params;
    const { storeEnabled, name, address, whatsapp } = req.body;

    const barbershop = mockStore.barbershops[barbershopId];
    if (!barbershop) {
      return res.status(404).json({ success: false, error: 'Barbería no encontrada' });
    }

    if (storeEnabled !== undefined) barbershop.storeEnabled = Boolean(storeEnabled);
    if (name) barbershop.name = name;
    if (address) barbershop.address = address;
    if (whatsapp) barbershop.whatsapp = whatsapp;

    const io = req.app.get('io');
    if (io) {
      io.to(`barbershop:${barbershopId}`).emit('barbershop:settings_updated', barbershop);
      io.emit('tenant:updated', barbershop);
    }

    return res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: barbershop
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

