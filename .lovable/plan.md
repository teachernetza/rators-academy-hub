## Plan de implementación

1. **Arreglar el bloqueo de Firebase/Lovable Cloud al crear usuarios y cursos**
   - Revisar y corregir permisos del backend para que las tablas de perfiles, cursos, inscripciones, actividades, secciones, entregas, comentarios y tareas sean accesibles por las funciones internas.
   - Ajustar las funciones de creación para que no dependan de permisos inexistentes y muestren errores claros si falta sesión o rol.
   - Validar flujo completo: crear estudiante, crear teacher y crear curso desde admin/teacher.

2. **Limpiar el login antes de entregar accesos reales**
   - Quitar del login la sección visible de cuentas demo.
   - Dejar un formulario limpio para alumnos/teachers/admin.
   - Mantener ocultos los accesos de prueba. El acceso teacher demo actual es: `teacher@ratorsacademy.com` / `Teacher1234!`.

3. **Perfil/listado de estudiante con botón “Asignar actividad”**
   - Mejorar la vista de estudiantes para que cada alumno tenga una acción clara: “Asignar actividad”.
   - Si ya existe el diálogo, asegurar que cargue actividades correctamente y permita seleccionar actividad, nivel y fecha límite.
   - Opcionalmente abrir un detalle rápido del estudiante con actividades asignadas y estado, usando lo que ya existe en la app.

4. **Motor de creación de actividades más completo**
   - Ampliar el editor actual para soportar tipos prácticos de actividad:
     - Respuesta abierta.
     - Unir parejas.
     - Ordenar palabras/frases.
     - Opción múltiple.
     - Selección múltiple.
     - Link de video con preview embebida y preguntas asociadas.
     - Audio/link de audio con reproductor y preguntas asociadas.
   - Actualizar la vista del estudiante para responder esos nuevos tipos.
   - Actualizar la vista del teacher para revisar respuestas y dar retroalimentación.

5. **Comunicación teacher-estudiante dentro de la plataforma**
   - Aprovechar el sistema existente de comentarios y revisión de actividades.
   - Asegurar que cuando el alumno envía una actividad, el teacher la vea en su inbox.
   - Asegurar que las observaciones del teacher regresen al alumno y que pueda reenviar si se piden cambios.
   - Mantener comentarios en lecciones como canal de comunicación por curso.

6. **Volver la plataforma descargable/instalable**
   - Corregir la configuración PWA actual: manifest, nombre, colores `#0f3b4b`, iconos actuales y service worker.
   - Reemplazar referencias viejas a iconos inexistentes (`icon-192.png`, `icon-512.png`) por los assets actuales.
   - Confirmar que el botón de instalar/“Agregar a pantalla de inicio” vuelva a funcionar en la app publicada.

7. **Verificación final**
   - Probar en preview: login, crear student, crear teacher, crear curso, crear actividad, asignarla a estudiante y revisar flujo básico de entrega/revisión.
   - Revisar que no aparezcan cuentas demo en login.
   - Revisar que la PWA tenga manifest e icono válidos para descarga.

## Notas técnicas

- No se agregará Firebase; la app debe funcionar con el backend ya conectado.
- El problema de permisos apunta a que las tablas públicas no tienen grants para los roles usados por el backend, así que se solucionará con migración de permisos y, si hace falta, ajustes mínimos en funciones.
- El motor de actividades se construirá sobre las tablas y componentes existentes (`activities`, `activity_sections`, asignaciones y submissions), evitando rehacer la app desde cero.