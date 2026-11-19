import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isHttps && !isLocalhost && (!envUrl || envUrl.includes('localhost'))) {
      return null;
    }
  }
  return envUrl || 'http://localhost:5000';
};

let socket = null;

export const initSocket = (tenantId = 'nodriza-global') => {
  const socketUrl = getSocketUrl();
  if (!socketUrl) {
    return {
      connected: false,
      emit: () => {},
      on: () => {},
      off: () => {}
    };
  }

  if (!socket) {
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.io Client] Conectado al cluster en tiempo real.');
      if (tenantId) {
        socket.emit('tenant:join', { barbershopId: tenantId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ [Socket.io Client] Desconectado:', reason);
    });
  } else if (tenantId && socket.connected) {
    socket.emit('tenant:join', { barbershopId: tenantId });
  }

  return socket;
};

export const getSocket = () => socket;

