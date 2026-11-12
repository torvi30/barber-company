import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { requireTenant } from './middlewares/tenant.js';
import { requireActiveSubscription } from './middlewares/subscription.middleware.js';
import { registerSocketHandlers } from './sockets/socketHandler.js';
import { initReminderCron } from './jobs/reminder.cron.js';

import appointmentRoutes from './routes/appointmentRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import cashClosureRoutes from './routes/cashClosureRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. Configuración de Socket.io con CORS
const io = new Server(server, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://localhost:5174', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Guardar instancia de Socket.io accesible globalmente en Express
app.set('io', io);

// 2. Middlewares Globales
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Webhook Raw Body Parser: DEBE ir antes de express.json() para preservar firma criptográfica de Stripe
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Inicializar Socket Handlers
registerSocketHandlers(io);

// 4. Health Check Endpoint (Sin necesidad de tenant)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BarberPulse OS Backend Engine',
    version: '1.0.0',
    uptime: process.uptime(),
    activeSockets: io.engine.clientsCount
  });
});

// 5. Rutas Públicas y Autenticación
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);

// 6. Rutas de Suscripciones SaaS (Manejo de planes, checkout, webhooks)
app.use('/api/subscriptions', subscriptionRoutes);

// 6.1 Consola Central SuperAdmin (Master Hub / Casa Nodriza)
app.use('/api/superadmin', superadminRoutes);

// 7. Rutas API con Aislamiento Multi-Tenant (Staff / Operaciones)
// Algunas operaciones críticas validan suscripción activa con requireActiveSubscription
app.use('/api/appointments', requireTenant, appointmentRoutes);
app.use('/api/commissions', requireTenant, commissionRoutes);
app.use('/api/inventory', requireTenant, inventoryRoutes);
app.use('/api/cash-closures', requireTenant, requireActiveSubscription, cashClosureRoutes);
app.use('/api/clients', requireTenant, clientRoutes);
app.use('/api/analytics', requireTenant, analyticsRoutes);
app.use('/api/notifications', requireTenant, notificationRoutes);

// 8. Manejo global de rutas 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint Not Found',
    path: req.originalUrl
  });
});

// 9. Manejo global de errores
app.use((err, req, res, next) => {
  console.error('💥 [Server Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// 10. Arrancar Servidor y Tareas en Segundo Plano
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`💈  BarberPulse OS Backend Engine v1.0.0`);
  console.log(`🚀  HTTP Server listo en: http://localhost:${PORT}`);
  console.log(`🔌  Socket.io escuchando eventos en tiempo real`);
  console.log(`🛡️  Modo de entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);

  // Inicializar Background Cron Job para Recordatorios de WhatsApp (cada 15 min)
  initReminderCron(io);
});
