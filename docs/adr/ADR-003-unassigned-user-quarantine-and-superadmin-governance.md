# ADR 003: User Quarantine & Superadmin Platform Governance

## Estado
Aceptado

## Contexto
Cualquier persona puede registrarse en la plataforma a través de Google o correo electrónico. Sin embargo, registrarse no otorga acceso automático a los datos de ninguna barbería ni a la consola de administración. Se requiere un mecanismo de cuarentena para usuarios no vinculados y una gobernanza estricta donde solo el Superadmin pueda crear empresas y asignar personal.

## Decisión
1. **Estado de Cuarentena (Unassigned User):**
   - Cuando un usuario se crea en Firebase Auth, su documento de perfil en la colección `users` de Firestore se inicializa con `companyId: null` y `role: 'user'`.
   - Si un usuario no es Superadmin y tiene `companyId: null`, el frontend lo redirige automáticamente a la pantalla `UnassignedUserScreen`.
   - En esta pantalla, el usuario no puede acceder al panel del salón, ni a citas, ni a caja, ni a inventario; únicamente se le informa que debe ser asignado a una empresa por el Superadministrador.
2. **Autoridad Exclusiva del Superadmin:**
   - Solo el **Superadmin** tiene permisos para registrar y activar nuevas empresas en la plataforma.
   - Solo el **Superadmin** puede asignar a un usuario en espera (`companyId: null`) a una empresa concreta, definiendo su rol (`admin` para el dueño/administrador de sucursal o `user` para barbero/personal).
   - Una vez asignado, la interfaz del usuario se desbloquea en tiempo real mediante listeners reactivos de Firestore (`onSnapshot`).

## Consecuencias
- Cero accesos no autorizados a las empresas registradas.
- Flujo de incorporación limpio y centralizado.

