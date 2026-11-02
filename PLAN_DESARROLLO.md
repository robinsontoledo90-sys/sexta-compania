# Continuidad del sistema — Sexta Compañía Sargento Aldea Nº6

Revisión técnica: 2026-11-02. Documento de planificación, no certificación de seguridad ni de despliegue.

## Funcionalidad observada en código
- Sitio institucional HTML/CSS.
- Pantalla de acceso con Supabase Auth y consulta de `voluntarios_autorizados`.
- Inventarios de B6 y RX6 con búsqueda, estado, observación y escritura en `inventario_estados` para cuentas con permiso.
- Consulta pública de inventarios basada en datos incluidos en HTML; la sincronización de estados de Supabase ocurre después de verificar autorización.
- Pantalla de guardias con botones aún sin comportamiento.

## Prioridades de desarrollo
1. **Seguridad y permisos (bloqueante antes del piloto):** verificar políticas RLS reales de Supabase para `voluntarios_autorizados` e `inventario_estados`, controles de edición desde base de datos, acceso a información sensible y reglas por cargo. No asumir seguridad solo por deshabilitar controles HTML. Revisar si la consulta pública debe restringirse.
2. **Integridad del inventario:** revisar la relación entre `id` y `vehiculo`, la política de conflictos de `upsert`, qué ocurre si falla una escritura y la sincronización de usuarios autorizados de solo lectura. Evitar que la interfaz confirme un cambio antes de persistirlo.
3. **Guardias:** implementar datos reales del turno diario y mensual, responsables de carga, fechas y permisos de publicación. Mientras no existan datos aprobados, mostrar claramente «En desarrollo».
4. **Roles:** implementar matriz acordada (Director, Capitán, Tenientes 1–4, Ayudante, Tesorero, Secretario, Voluntario, Aspirante y designaciones 06-A/06-B).
5. **Novedades y partes de emergencia:** reporte de daños/faltantes, responsables, seguimiento y cierre; conservar historial de cambios.
6. **Documentos y citaciones:** control de acceso por cargo, documentos de carros y de compañía, citaciones como avisos.
7. **Piloto de un mes para Director:** pruebas de ingreso, inventario, historial, guardias, accesibilidad móvil y respaldo/continuidad ante cortes de internet.

## Criterio de éxito
El Director y los oficiales pueden consultar información vigente, registrar hallazgos autorizados y saber quién resolvió cada novedad, sin exponer datos internos a visitantes públicos.

## Estado de validación
Este documento se basa en inspección del repositorio. No se verificó el estado operativo de Supabase, sus tablas ni sus políticas RLS. Tampoco se probó la web en navegador con usuarios reales.
