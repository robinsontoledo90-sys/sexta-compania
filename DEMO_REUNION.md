# Presentación interactiva de perfiles

Ruta independiente: `demo/index.html`. No modifica el inicio público, el acceso real, bases de datos ni despliegues. No necesita instalar dependencias.

## Mostrar en este computador

Ejecutar `node demo/serve.cjs` desde la raíz y abrir http://127.0.0.1:4176. El servidor sirve exclusivamente los recursos de la demo y escucha solo en este computador. Mantenerlo abierto durante la reunión. Alternativa sin servidor: abrir `demo/index.html` directamente en un navegador.

| Perfil | Usuario ficticio | Contraseña pública de prueba |
| --- | --- | --- |
| Oficial | oficial.demo | OficialDemo6! |
| Voluntario | voluntario.demo | VoluntarioDemo6! |

1. Ingresar como Voluntario: consultar únicamente su asistencia a emergencias y academias, sin agregar, editar ni retirar asistencia.
2. Pulsar «Registrar asistencia a emergencia como OBAC» para abrir el formulario separado (fecha, clave y declaración ficticias). El envío solo confirma recepción demostrativa pendiente de revisión; no modifica la consulta personal.
3. Cerrar sesión de prueba e ingresar como Oficial: consultar el resumen y abrir/cerrar actividades ficticias. El voluntario nunca ve el resumen de dotación y sus consultas siguen siendo solo lectura.
4. Reiniciar demo restaura el estado inicial; recargar también borra todo.

## Aislamiento y límites

Las cuentas y claves son ficticias y públicas, comprobadas en el navegador. Ilustran el flujo de login y permisos, no son autenticación segura de producción. No usar información personal. Los datos son solo variables en memoria de una pestaña; no se sincronizan entre computadores, ventanas o dispositivos.

No se importa ningún cliente de backend ni se hacen peticiones externas. La política de contenido bloquea conexiones (`connect-src 'none'`) y envíos de formularios. El escudo es una copia del recurso institucional existente. La conexión en tiempo real requiere backend, autenticación, autorización en servidor y una implementación adicional. No se envían correos ni alertas.

## Validación y publicación

`node tests/demo-perfiles.test.cjs` verifica credenciales inválidas, separación de perfiles, consultas sin edición, registro OBAC separado, cierre de actividad, limpieza de resumen, reinicio y aislamiento. Verificación manual de navegador y ancho móvil: 390 px.

La rama `demo/perfiles-reunion` permite revisar sin modificar `main`. La vista previa local es la alternativa validada para la reunión. Si se requiere alojamiento público, publicar únicamente el directorio `demo` en un sitio de pruebas separado, sin secretos, dominio operativo ni variables de producción. No cambiar la rama/origen de GitHub Pages del sitio institucional para publicar una prueba. No fusionar ni desplegar producción como parte de esta preparación.

## Identidad visual y recorrido desde la portada

La dirección raíz de la vista previa ahora muestra `demo/inicio.html`: una copia de la portada actual del repositorio, con el mismo escudo, fotografías y colores azul marino, blanco, rojo y dorado. «Acceso voluntarios» lleva al login ficticio. `demo/css/style.css` es copia del estilo institucional y `demo/institucional.css` conserva los estilos incluidos en la portada. `node demo/build-home.cjs` regenera la portada de prueba y esos estilos incluidos. La hoja original y la portada de producción permanecen sin cambios. Los enlaces de acceso real se sustituyen por el login ficticio y no se carga código de autenticación. El apartado de guardias no tiene funciones en esta vista previa.
