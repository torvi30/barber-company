# ADR 001: Firebase Authentication & Role-Based Access Control (RBAC)

## Estado
Aceptado

## Contexto
El sistema BarberPulse OS requiere autenticación unificada y segura en la nube para gestionar tanto usuarios con cuentas corporativas/personales de Google (@gmail.com u otros dominios) como usuarios con correo y contraseña. Además, la plataforma debe soportar tres niveles jerárquicos de acceso:
1. **Superadmin:** Administrador global de la plataforma (Casa Nodriza).
2. **Admin:** Administrador o dueño de una empresa/barbería específica.
3. **User:** Barbero, estilista o personal operativo asignado a una empresa.

## Decisión
1. Se utiliza **Firebase Authentication** como proveedor de identidad oficial (proyecto: `oriente-auth`).
2. Se habilita por defecto el inicio de sesión con **Google (Gmail)** y correo/contraseña con recuperación por enlace seguro.
3. Se define una lista blanca inmutable de correos de Superadministradores de la plataforma (`PLATFORM_SUPERADMIN_EMAILS`):
   - `victortamayopine@gmail.com`
   - `victortamayopinc@gmail.com`
   - `danielb.alzate1@gmail.com`
4. Cualquier usuario registrado cuyo correo esté en esta lista blanca obtiene automáticamente privilegios globales (`role: 'superadmin'`).
5. Cualquier usuario nuevo que se registre y no sea superadmin inicia con `companyId: null` y en estado de cuarentena/espera hasta que un Superadmin lo asigne a una empresa.

## Consecuencias
- Eliminación de contraseñas y usuarios quemados en código fuente.
- Flujo unificado con Google Sign-In con un clic.
- Control total sobre los accesos y credenciales delegadas a Google Cloud / Firebase.

