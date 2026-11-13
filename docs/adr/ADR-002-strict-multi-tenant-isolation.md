# ADR 002: Strict Multi-Tenant Isolation (Aislamiento Estricto por Empresa)

## Estado
Aceptado

## Contexto
BarberPulse OS es un SaaS multi-tenant donde conviven múltiples empresas (barberías, salones, estudios de estética). Los datos de turnos, citas, clientes, ingresos, arqueos de caja e inventario pertenecen exclusivamente a la empresa que los generó. Ningún administrador de una barbería debe poder visualizar ni manipular los datos de otra barbería.

## Decisión
1. **Regla de Filtrado Obligatorio (Mandatory Tenant Filtering):** Toda entidad de negocio en la base de datos (citas, barberos, inventario, cierres de caja, clientes, configuración) debe incluir un campo `companyId` o `barbershopId`.
2. Las consultas a la base de datos o endpoints de API deben verificar rigurosamente la pertenencia del usuario al tenant solicitado:
   - Los administradores de empresa (`role: 'admin'`) solo pueden consultar y mutar registros donde `record.companyId === user.companyId`.
   - Cualquier intento de acceder a un `tenantId` ajeno es bloqueado con error HTTP 403 Forbidden.
3. El **Superadmin** es la única entidad autorizada para realizar lecturas y escrituras transversales entre tenants para fines de facturación, soporte y auditoría global.
4. **Base de Datos Limpia (Zero Hardcoded Data):** No existen empresas ni registros precargados o quemados en el código. Las empresas son creadas explícitamente en la base de datos por el Superadmin.

## Consecuencias
- Seguridad y privacidad garantizada para cada negocio cliente.
- Arquitectura lista para escalar horizontalmente a miles de barberías sin riesgo de cruce de datos.

