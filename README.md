# 💈 BarberPulse OS — The Next-Gen Barbershop Management Cloud

**BarberPulse OS** es una plataforma SaaS de alto rendimiento, multi-inquilino (multi-tenant) y reactiva en tiempo real diseñada para la gestión integral de barberías de alta demanda, cadenas de salones y barberos independientes de élite.

---

## 🏛️ Arquitectura del Sistema

### 1. Modelo de Datos Firestore Multi-Tenant
El sistema aísla estrictamente la información de cada negocio a través de una jerarquía de subcolecciones bajo el identificador único del negocio (`barbershopId`):

```
/barbershops/{barbershopId}
  ├── barbers/           -> Perfiles de barberos, porcentajes de comisión, turnos semanales y estado en vivo
  ├── appointments/      -> Citas, turnos de recepción (Walk-ins), estados de sillón
  ├── inventory/         -> Catálogo de productos boutique, control de stock y POS retail
  ├── clients/           -> Directorio CRM, Fichas técnicas de corte y fidelización VIP
  └── cash_closures/     -> Histórico auditado de cierres de caja y arqueos
```

### 2. Sincronización en Tiempo Real (Socket.io Rooms)
- Cada cliente web se une automáticamente a la sala privada de su tenant: `socket.join('barbershop:{barbershopId}')`.
- Eventos transmitidos:
  - `appointment:created`: Nuevos turnos de recepción o citas reservadas.
  - `appointment:updated`: Transición entre estados (`WAITING` ➔ `IN_CHAIR` ➔ `COMPLETED`).
  - `barber:status_updated`: Barberos disponibles, en atención o en descanso.
  - `cash:closed`: Sincronización de corte de caja auditado.

### 3. Motor Financiero & Cierre de Caja (Cash Drop Engine)
- **Arqueo Físico (Cash Drop):** Concilia el saldo inicial de caja (`openingCash`) más los cobros en efectivo con el recuento físico en gaveta (`actualCashInDrawer`), detectando al instante desviaciones (`SURPLUS`, `DEFICIT` o `BALANCED`).
- **Retiro de Caja Fuerte:** Sugiere la extracción de efectivo acumulado manteniendo el fondo base intacto.
- **Distribución de Comisiones:** Reparte automáticamente la ganancia por cada servicio entre la barbería y el barbero según su tasa pactada (ej. 50%/50%), asignando el 100% de las propinas de forma nominal.

---

## 🚀 Inicio Rápido en Ubuntu 24.04 LTS

### Requisitos Previos
- **Node.js:** v20+ (`node -v`)
- **NPM:** v10+ (`npm -v`)

### Paso 1: Clonar e Instalar Dependencias
En la raíz del proyecto `/home/victor/Escritorio/barberia`:

```bash
# 1. Instalar dependencias del Backend
cd server
npm install

# 2. Instalar dependencias del Frontend
cd ../client
npm install
```

### Paso 2: Configuración de Variables de Entorno
Copia el archivo de ejemplo en el backend:

```bash
cd /home/victor/Escritorio/barberia/server
cp .env.example .env
```
> **Nota:** Por defecto viene configurado con `USE_MOCK_FIRESTORE=true`, lo que permite probar la aplicación de inmediato sin necesidad de credenciales de Google Cloud. Para producción, agrega tu archivo de credenciales de Firebase Admin SDK.

### Paso 3: Ejecución de Servidores

**Terminal 1 — Backend (Express + Socket.io):**
```bash
cd /home/victor/Escritorio/barberia/server
npm run dev
# Servidor escuchando en: http://localhost:5000
# Health check: http://localhost:5000/api/health
```

**Terminal 2 — Frontend (Vite + React + Tailwind):**
```bash
cd /home/victor/Escritorio/barberia/client
npm run dev
# Aplicación web disponible en: http://localhost:5173
```

---

## 🛡️ Endpoints Principales (REST API)

Todas las peticiones a la API requieren la cabecera `x-barbershop-id` para identificar el tenant:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor y sockets activos |
| `GET` | `/api/appointments` | Listado de citas y turnos de la barbería |
| `POST` | `/api/appointments` | Crear nuevo turno (Walk-in o cita) |
| `PATCH`| `/api/appointments/:id/status`| Transición de estado (`IN_CHAIR`, `COMPLETED`) |
| `GET` | `/api/commissions/barbers` | Listado de barberos activos y porcentaje |
| `GET` | `/api/cash-closures/summary` | Cálculo dinámico de arqueo y comisiones |
| `POST` | `/api/cash-closures/close` | Ejecutar auditoría y cierre formal de caja |
| `GET` | `/api/analytics/revenue` | Evolución de facturación y mix de pago |
| `GET` | `/api/analytics/peak-hours` | Mapa de calor de horas pico de demanda |
| `GET` | `/api/analytics/barber-performance` | Ranking comparativo y productividad de staff |
| `GET` | `/api/analytics/export/csv` | Descarga de reporte contable en CSV |
| `GET` | `/api/notifications/settings` | Configuración de canales WhatsApp, Email y Webhooks |
| `PATCH`| `/api/notifications/settings`| Actualizar plantillas y disparadores automáticos |
| `GET` | `/api/notifications/logs` | Registro de auditoría de notificaciones enviadas |
| `POST` | `/api/notifications/test-dispatch` | Prueba de disparo manual en vivo |

