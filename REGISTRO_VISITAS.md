# Registro público de visitantes

Formulario: `asistencia/index.html`. Consulta y CSV para Excel: `asistencia/gestion.html`.

Las respuestas se guardan en Supabase, proyecto SEXTA-COMPANIA, esquema privado `registro_visitas_privado`, tabla `inscripciones`. GitHub contiene código, nunca respuestas. La demo anterior no guardaba datos: no se pueden recuperar respuestas de esa etapa.

## Acceso y uso

- Cualquier visitante puede enviar una inscripción con titular, patente opcional y hasta diez acompañantes. El aviso de uso de datos se acepta antes del envío. No acredita identidad ni presencia física.
- La consulta y descarga requieren el correo confirmado ayudantesexta@bomberosiquique.cl y una cuenta habilitada del padrón existente y cargo CAPITÁN, TENIENTE PRIMERO o AYUDANTE. El servidor revisa estos permisos en cada consulta, incluso durante una descarga de varias páginas.
- El CSV UTF-8 con BOM y separador punto y coma se abre en Excel. Una fila por persona; el comprobante agrupa titular y acompañantes. Incluye fechas UTC y Chile, RUT y patente. Se escapan comillas y se neutralizan fórmulas de hojas de cálculo.
- Se exportan todas las páginas del rango solicitado; no hay truncamiento silencioso a 500 filas. Fechas inclusivas por día en America/Santiago, según recepción.
- Los registros no se borran al cerrar o recargar. No hay borrado automático ni formulario de edición/borrado en esta versión. El administrador de la base debe atender solicitudes de corrección, eliminación y definir el período de conservación aplicable.

## Protección

- Tablas privadas con RLS y sin permisos directos de lectura, escritura, actualización o borrado para anon/authenticated.
- RPC públicas SECURITY INVOKER, con funciones privadas SECURITY DEFINER de alcance reducido, search_path vacío y permisos EXECUTE explícitos. La única operación pública sin sesión es enviar: valida y escribe, devuelve solo comprobante, fecha y cantidades. No permite buscar personas ni consultar respuestas.
- La función de lectura verifica auth.uid(), correo confirmado de Ayudantía en auth.users, habilitación y cargo en el padrón del servidor. No usa metadatos editables ni roles del navegador. Se registra actor, fecha, tipo de consulta y cantidad, sin copiar RUT en la bitácora.
- Validación de RUT, patente, nombres, consentimiento, límite de acompañantes y personas repetidas en servidor. Cada envío es atómico; reintentar el mismo UUID y contenido devuelve el mismo comprobante sin duplicar. Un UUID existente con contenido distinto se rechaza.
- Control básico de frecuencia por huella diaria de conexión (30 envíos nuevos por diez minutos). No es un CAPTCHA ni protección completa contra abuso distribuido; redes compartidas pueden alcanzar el límite.
- Formularios sin almacenamiento local de respuestas, servicios de analítica ni recursos de terceros. HTTPS directo al backend; ninguna clave secreta se publica. Solo la clave publicable de Supabase se incluye en el cliente. CSP restringe las conexiones al proyecto.
- Consulta administrativa con token en memoria; al recargar se necesita iniciar sesión otra vez. Los archivos exportados contienen datos personales y quedan bajo custodia de quien los descarga.

## Verificación

`database/registro-visitas-test.sql` comprueba con roles PostgreSQL reales: escritura, reintento, validaciones, denegación de lectura pública/directa, permisos y revocación, auditoría, paginación de más de 500 filas y fechas Chile. Todo se ejecuta con ROLLBACK y fixtures ficticios. No ejecutar fragmentos sin el rollback.

`database/registro-visitas.sql` es la definición para instalación nueva; no repetir sobre el proyecto existente. Instalado mediante migraciones `registro_visitas_privado` y `registro_visitas_fechas_chile`.

La disponibilidad, cuotas y copias de respaldo dependen del plan de Supabase; la persistencia de la tabla no sustituye una política de respaldo. Usar descargas periódicas protegidas para las necesidades operativas.

La tarjeta «Registro actividades externas» de acceso.html abre la consulta existente. Los totales incluyen titulares, acompañantes, personas y vehículos; son parciales mientras queden páginas por cargar. La exportación recorre todas las páginas y no genera archivos vacíos. Es CSV compatible con Excel, no XLSX.
