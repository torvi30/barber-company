import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initSocket = (tenantId = 'demo-barbershop-01') => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.io Client] Conectado al cluster en tiempo real.');
      socket.emit('tenant:join', { barbershopId: tenantId });
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ [Socket.io Client] Desconectado:', reason);
    });
  }

  return socket;
};

export const getSocket = () => socket;

