/**
 * BarberPulse OS - Real-time Socket.io Manager
 * Maneja la sincronización multi-sala aislada por barbershopId (Tenant Room)
 */

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Nuevo cliente conectado: ${socket.id}`);

    // Unirse a la sala de la barbería
    socket.on('tenant:join', ({ barbershopId }) => {
      if (!barbershopId) return;
      const room = `barbershop:${barbershopId}`;
      socket.join(room);
      console.log(`💈 [Socket.io] Cliente ${socket.id} unido al tenant: ${room}`);

      socket.emit('tenant:joined', {
        status: 'OK',
        room,
        timestamp: new Date().toISOString()
      });
    });

    // Desconexión de sala
    socket.on('tenant:leave', ({ barbershopId }) => {
      const room = `barbershop:${barbershopId}`;
      socket.leave(room);
      console.log(`🚪 [Socket.io] Cliente ${socket.id} abandonó ${room}`);
    });

    // Evento de actualización de estado de barbero (DISPONIBLE, EN SILLÓN, DESCANSO)
    socket.on('barber:status_change', ({ barbershopId, barberId, status }) => {
      io.to(`barbershop:${barbershopId}`).emit('barber:status_updated', {
        barberId,
        status,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ [Socket.io] Cliente desconectado: ${socket.id}`);
    });
  });
};

