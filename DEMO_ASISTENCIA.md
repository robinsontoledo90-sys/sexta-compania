# Demo de registro de emergencias — flujo revisado

Página: asistencia-demo.html. Implementación independiente del sistema real y sin conexiones a Supabase, servicios de correo ni almacenamiento persistente.

## Recorrido
1. Seleccionar un voluntario u oficial ficticio. Completar fecha, clave y asistentes del padrón de ejemplo; agregar observaciones y declarar que estuvo a cargo.
2. La identidad del creador queda fija como responsable. Su asistencia se incluye porque declara presencia. No se designa a otra persona y no hay QR.
3. Al enviar, el creador recibe únicamente confirmación. El formulario se limpia y no dispone de consulta del contenido enviado ni de estado de validación.
4. Ayudante y todos los oficiales ficticios reciben un aviso genérico en la página. La bandeja de correos es una simulación explícita, NO ENVIADA; los dominios ejemplo.invalid son ficticios. No contiene detalles ni acceso al registro.
5. Solo las identidades AYUDANTE pueden consultar el contenido completo, estados, historial, informes y exportaciones. Pueden validar o devolver un registro pendiente. No pueden validar un registro creado por sí mismas: se incluye un segundo ayudante ficticio para demostrar esa situación.
6. La devolución crea una solicitud visible solo para el creador con la indicación escrita por el ayudante. Excepción mínima de interacción: recibe la indicación y un formulario vacío; debe reingresar los datos corregidos. No puede abrir la versión anterior ni consultar su estado. El historial conserva ambos valores; al reenviar vuelve a revisión.
7. Registros validados no se sobrescriben. El historial incluye autor, momento, antes y después.

## Consulta y exportación
Rango de fechas inclusivo por fecha de emergencia. Cantidad de emergencias por estado, asistentes y responsable de cada emergencia, asistencias validadas/pendientes/devueltas por bombero.
Dos CSV UTF-8 con BOM, separador punto y coma, compatibles con Excel: emergencias y totales por bombero. Se etiquetan como CSV, no XLSX. Las celdas que podrían interpretarse como fórmulas llevan prefijo de texto.
Solo el ayudante genera la exportación.

## Límites
- La declaración de haber estado a cargo no constituye prueba independiente. La revisión del ayudante es el control de esta propuesta.
- Los permisos se simulan en el navegador: cualquiera que cambia de identidad en la demo puede explorar esos roles. No es seguridad de producción.
- No se envían correos, no se guardan registros reales, no hay cuentas reales ni persistencia al recargar.
- Se muestran dos registros ficticios iniciales (uno pendiente y otro validado) y se pueden reiniciar.
- El sistema real asistencia.html y sus políticas de Supabase conservan el flujo anterior; esta actualización afecta únicamente la demo. Llevarla a producción requiere autorización y otra implementación de permisos y entrega de correo.
- Pruebas: tests/asistencia-demo-v2.test.cjs. Incluyen privacidad por rol, declaración, identidad, corrección sin lectura completa, autoría, historial, estados, totales, rango inclusivo, CSV, aislamiento y reinicio.

## Ampliación: asistencia en vivo y academias

El panel superior ofrece dos actividades ficticias independientes: emergencia y academia. Cada una muestra fecha, hora, responsable/instructor y estado. El voluntario registra y consulta su propia participación; el oficial supervisa la lista, cierra la actividad y exporta CSV. El perfil oficial usa rojo y el voluntario gris con rótulos explícitos. No hay asistencia duplicada por identidad ni altas tras el cierre.

El formulario complementario permite nombre y RUT del titular, patente opcional y hasta diez acompañantes con nombre y RUT. Valida dígito verificador, duplicados dentro del grupo y formato de patente. Las visitas se muestran solo al perfil oficial y no se suman a la dotación. Al cambiar de actividad o identidad se limpian los campos sin enviar.

El panel es una simulación en memoria de esta pestaña: no hay sincronización entre dispositivos, cuentas, conexión al backend ni persistencia. Reiniciar simulación en vivo restaura este panel; Reiniciar demo restaura el circuito formal inferior. Recargar restaura ambos. El circuito formal de revisión por ayudante conserva sus permisos.

### Verificación de esta ampliación
- Navegador: asistencia en emergencia, cambio a oficial, supervisión, academia independiente, prevención de duplicado y cierre que bloquea nuevas asistencias y grupos.
- Formulario: titular sin patente y acompañante válido aceptados; RUT incorrecto y RUT repetido rechazados; eliminación de acompañante comprobada.
- Privacidad visual: voluntario ve únicamente su participación y no ve grupos complementarios.
- Consola del navegador sin errores durante el recorrido. Sintaxis JavaScript y pruebas del motor anterior correctas.
- La prueba antigua asistencia-ui.test.cjs falla en su expectativa de que el voluntario no pueda crear actividades en el sistema real. Esa discrepancia ya existe en la base y no corresponde a los archivos modificados por esta demo.
