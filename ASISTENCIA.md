# Asistencia de la Sexta Compañía

## Acceso
Desde acceso.html, abrir ASISTENCIA. Requiere una cuenta habilitada en voluntarios_autorizados.
Solo CAPITÁN y TENIENTE PRIMERO/SEGUNDO/TERCERO/CUARTO pueden crear actividades, designar encargados y corregir listas cerradas. Ser administrador de cuentas o Ayudante no concede este permiso.

El encargado asignado puede registrar a otros y cerrar su actividad. No puede delegar.
Nadie, incluidos capitán y tenientes, puede registrar o corregir su propia asistencia.
Otro mando autorizado debe validar la asistencia del encargado.
Los participantes pueden ver su estado, sin escribir ni acceder a listas ajenas.
La lista usa únicamente personas con cuenta autorizada; no permite nombres libres que eludan el control de identidad.
Sin registrar no equivale a ausente. No se hacen marcaciones automáticas.

## Integridad
Datos en esquema privado con RLS y sin acceso directo de anon/authenticated.
RPC público SECURITY INVOKER llama a una función privada SECURITY DEFINER con comprobación de auth.uid(), habilitación y cargo en cada llamada.
La función privada es el límite de autorización: todas las lecturas y escrituras comprueban el actor. No usa metadatos editables por usuarios.
Bloqueo de fila por actividad y versión esperada evitan guardar desde una lista desactualizada.
Las correcciones requieren motivo de 5 a 500 caracteres. La lista cerrada no se reabre.
Registro e historial se escriben en la misma transacción; clientes no pueden alterar o borrar el historial.
Este control impide autoinscripción, no acredita por sí solo presencia física ni evita colusión entre personas.

## Pruebas
- database/asistencia-security-test.sql: pruebas de roles reales de PostgreSQL con fixtures temporales y ROLLBACK. No ejecutar fragmentos aislados ni quitar ROLLBACK.
- tests/asistencia-ui.test.cjs: Node; prueba acceso, fila propia, cierre y fallo de escritura sin falso éxito.
- database/asistencia.sql: esquema consolidado para una instalación nueva, no repetir sobre la existente. Cambios aplicados por migraciones de Supabase.
- Pruebas de seguridad y UI aprobadas el 2026-11-02. Fixtures y registros de prueba: cero después del rollback.
- Falta una prueba operativa con cuentas reales del capitán/tenientes y encargado, que todavía no están habilitadas. No se cambió el cargo AYUDANTE de la cuenta existente.
- Auditor de Supabase: sin hallazgos del módulo. Advertencia preexistente: protección de contraseñas filtradas deshabilitada (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Límites de esta primera versión
Últimas 200 actividades y 300 entradas de historial por vista; el historial completo se conserva.
Fecha/hora introducidas en la zona horaria del dispositivo y almacenadas en UTC.
Nombres y cargos de la lista proceden del padrón actual; el nombre del autor queda copiado en cada entrada del historial.
No hay exportación, control biométrico, geolocalización ni QR.
