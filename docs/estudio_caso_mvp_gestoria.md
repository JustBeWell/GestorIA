# Estudio del caso y definición MVP - GestorIA

## 1. Identificación del caso

**Proyecto:** GestorIA  
**Tipo de solución:** Aplicación web de gestión interna para una gestoría pequeña  
**Objetivo del documento:** dejar definido el caso de uso real, el alcance operativo, el MVP (*Minimum Viable Product*, es decir, la versión mínima viable que ya aporta valor real y permite empezar a usar el sistema) y la base funcional/técnica necesaria para comenzar el desarrollo.

---

## 2. Contexto del problema

El problema parte de un entorno de gestoría pequeña o empresa con operativa administrativa reducida, donde el control de jornada laboral, la gestión de clientes, el seguimiento de trabajos y el control económico suelen apoyarse en hojas de cálculo, documentos manuales y procesos dispersos. Esta forma de trabajo introduce varios problemas:

- duplicidad de datos,
- errores humanos en el registro,
- falta de trazabilidad,
- pérdida de tiempo en tareas repetitivas,
- dificultad para consolidar información mensual,
- dependencia excesiva de trabajo manual para preparar documentación.

Según el anteproyecto, la necesidad surge de digitalizar el fichaje de empleados y centralizar la gestión de clientes, trabajos, pagos y documentación mensual en un único sistema, reduciendo errores y esfuerzo humano. Además, el sistema debe poder evolucionar hacia automatización documental asistida por IA y una arquitectura preparada para crecer en el futuro. fileciteturn2file0

---

## 3. Problema de negocio a resolver

El software debe resolver, de forma integrada, estos cuatro bloques de negocio:

### 3.1. Control legal de jornada
La organización necesita registrar entradas y salidas de empleados de forma fiable, conservar esa información y poder generar documentación mensual válida y revisable.

### 3.2. Gestión operativa
La empresa necesita saber:

- qué clientes existen,
- qué trabajos hay abiertos,
- quién es responsable de cada trabajo,
- en qué estado se encuentra cada tarea,
- qué incidencias o adjuntos están asociados.

### 3.3. Control económico
La empresa necesita registrar facturas, pagos parciales o completos, y conocer la deuda viva por cliente, es decir, el importe que sigue pendiente de cobro.

### 3.4. Cierre mensual
La gerencia necesita consolidar el estado de la actividad del mes: horas trabajadas, incidencias de fichaje, trabajos, ingresos, deudas y alertas. En una fase posterior, esto se complementa con IA para detectar anomalías y proponer correcciones, manteniendo siempre validación humana. fileciteturn2file1 fileciteturn2file2

---

## 4. Objetivo del sistema

El objetivo general del sistema es desarrollar una aplicación de gestión para una gestoría pequeña que digitalice el fichaje de empleados y centralice la gestión operativa y económica, automatizando la generación del documento mensual de fichaje con garantías de seguridad, privacidad y trazabilidad. fileciteturn2file0

Traducido a producto software, esto implica construir una plataforma que permita:

1. registrar fichajes con reglas de negocio,
2. administrar empleados y permisos,
3. gestionar clientes,
4. gestionar trabajos y asignaciones,
5. registrar facturación y pagos,
6. obtener informes y resúmenes,
7. dejar preparada la automatización documental con IA,
8. conservar auditoría suficiente sobre acciones críticas.

---

## 5. Actores del sistema

A partir del DGR, los actores principales del sistema son los siguientes: fileciteturn2file2

### 5.1. Gerente / Administrador
Es el actor principal de control. Configura reglas, gestiona usuarios y permisos, supervisa fichajes, revisa informes, administra clientes, trabajos y facturación.

### 5.2. Empleado
Realiza fichajes, consulta sus asignaciones y, en fases posteriores, actualiza el estado de trabajos y añade adjuntos o comentarios.

### 5.3. Gestoría externa
No actúa directamente sobre el sistema en el MVP, pero es destinataria de documentación mensual o resúmenes exportados.

### 5.4. Cliente
Aparece en la documentación como posible actor para una versión posterior mediante portal cliente, por lo que **no forma parte del MVP**. fileciteturn2file2

---

## 6. Necesidades principales detectadas

Del análisis conjunto de anteproyecto y DGR, las necesidades reales del sistema son:

- disponer de un **núcleo legal mínimo** para fichaje y conservación de registros,
- centralizar datos de empleados y clientes,
- poder relacionar clientes con trabajos y empleados,
- llevar un control económico básico con deuda por cliente,
- generar documentación mensual,
- tener un sistema trazable, con control de acceso por roles,
- reducir trabajo manual repetitivo,
- preparar el terreno para automatizaciones posteriores.

Estas necesidades están priorizadas en la documentación por iteraciones, donde el camino crítico comienza por fichaje, base de datos, empleados y clientes, antes de evolucionar hacia trabajos, facturación, informes y auditoría. fileciteturn2file2

---

## 7. Alcance funcional total del producto

El alcance completo definido en los documentos incluye: fichaje legal, gestión de empleados, clientes, trabajos, facturación básica, deudas, informes, panel de control, exportaciones y automatización documental con IA. fileciteturn2file2

Sin embargo, para empezar el desarrollo de manera realista, conviene separar:

- **qué entra en MVP**,
- **qué entra en versión 1 posterior**,
- **qué se deja para evolución avanzada**.

---

## 8. Delimitación del MVP

## 8.1. Qué debe cumplir el MVP

El MVP debe cumplir una condición muy clara: **ser usable en un entorno real reducido desde el primer despliegue**, aunque todavía no incluya todas las automatizaciones avanzadas.

Debe permitir que una gestoría pequeña pueda:

- dar de alta empleados,
- autenticar usuarios,
- fichar entradas y salidas,
- gestionar clientes,
- registrar trabajos,
- registrar facturas y pagos,
- consultar deuda por cliente,
- generar exportaciones básicas,
- disponer de una base de trazabilidad mínima,
- dejar preparado el flujo de cierre mensual.

## 8.2. Qué entra en el MVP

### Módulo 1. Autenticación y autorización
Incluye:

- login con email y contraseña,
- control de acceso por roles mediante RBAC (*Role-Based Access Control*, es decir, control de permisos según el rol del usuario),
- usuarios con rol **Administrador/Gerente** y **Empleado**,
- política básica de contraseñas,
- bloqueo básico por intentos fallidos si se implementa de forma sencilla.

Esto aparece como requisito transversal del sistema y dependencia del módulo de fichaje. fileciteturn2file2

### Módulo 2. Gestión de empleados
Incluye:

- alta, baja lógica y edición de empleados,
- activación/desactivación,
- asignación de rol,
- vista resumida de fichajes por empleado.

Se apoya en RF3 del DGR. fileciteturn2file2

### Módulo 3. Fichaje
Incluye:

- registro de entrada,
- registro de salida,
- validación para impedir dos entradas consecutivas,
- cálculo de duración diaria,
- consulta por fecha o rango,
- exportación básica CSV/PDF.

En el DGR este es el núcleo legal inicial y el primer requisito funcional prioritario. fileciteturn2file2

### Módulo 4. Gestión de clientes
Incluye:

- alta/edición/baja lógica,
- datos fiscales y de contacto,
- validación de CIF/NIF,
- búsqueda por nombre, CIF o email.

El historial documental avanzado puede dejarse simplificado para una segunda fase. fileciteturn2file2

### Módulo 5. Gestión de trabajos
Incluye:

- alta de trabajo vinculado a un cliente,
- asignación de uno o varios empleados,
- estados básicos: Pendiente, En curso, Bloqueado, Finalizado, Cancelado,
- comentarios internos simples,
- filtro por estado y cliente.

Los adjuntos pueden mantenerse en una primera versión muy simple o posponerse si retrasan demasiado el arranque. fileciteturn2file2

### Módulo 6. Facturación y pagos
Incluye:

- registro de factura,
- importe, IVA, método y vencimiento,
- registro de pago parcial o total,
- cálculo automático de deuda viva por cliente,
- listado de facturas pendientes.

Las alertas automáticas por impago pueden empezar como vista filtrable en lugar de notificación automática. fileciteturn2file2

### Módulo 7. Resumen operativo mínimo
Incluye un panel básico para gerente con:

- horas trabajadas del mes,
- número de trabajos activos,
- facturación emitida,
- deuda pendiente,
- fichajes con incidencia detectada por reglas básicas.

No hace falta un dashboard muy avanzado al principio; basta con una vista clara de supervisión.

### Módulo 8. Exportaciones mínimas
Incluye:

- exportación de fichajes por rango de fechas,
- exportación de listado de facturas/deudas,
- generación básica del documento mensual de fichaje sin IA avanzada.

### Módulo 9. Auditoría mínima
Incluye trazabilidad básica sobre acciones críticas:

- corrección manual de fichajes,
- alta/edición de empleados,
- alta/edición de clientes,
- alta/edición de facturas/pagos.

No es necesario construir en el primer sprint un módulo de auditoría complejo con interfaz avanzada, pero sí conviene almacenar eventos desde el inicio.

---

## 9. Qué queda fuera del MVP

Para no sobredimensionar la primera entrega, debería quedar fuera del MVP:

### 9.1. IA avanzada
Se pospone:

- generación de texto ejecutivo avanzado,
- análisis histórico complejo,
- etiquetado de riesgo sofisticado,
- explicabilidad detallada enlazada a datos fuente.

El DGR sitúa esta parte en iteraciones posteriores y además indica dependencia de histórico suficiente. fileciteturn2file2

### 9.2. Portal cliente
No entra en la primera versión. Está definido como opcional/v1+ y como extensión SaaS futura. fileciteturn2file2

### 9.3. Integraciones externas complejas
Fuera del MVP:

- banca,
- calendarios,
- firma avanzada,
- multiempresa,
- integraciones plenas con terceros.

### 9.4. Notificaciones avanzadas
Las notificaciones automáticas por email o in-app pueden quedar para la v1, siempre que en el MVP existan listados filtrables de pendientes e incidencias.

### 9.5. Antifraude fuerte
Geolocalización o control por IP pueden prepararse a nivel de diseño, pero no deberían bloquear el inicio del desarrollo. El propio DGR lo marca como política opcional. fileciteturn2file2

### 9.6. 2FA obligatoria
La autenticación en dos factores (*Two-Factor Authentication*, segundo factor adicional al password) puede quedar preparada como mejora posterior. En documentos aparece como opcional, no como requisito imprescindible del arranque. fileciteturn2file2

---

## 10. Propuesta de alcance definitivo para el MVP

El MVP queda definido así:

### Entra en MVP
- autenticación + roles,
- gestión de empleados,
- fichaje entrada/salida,
- gestión de clientes,
- gestión de trabajos,
- facturación y pagos,
- cálculo de deuda,
- resumen operativo básico,
- exportaciones mínimas,
- auditoría mínima,
- seguridad base,
- pruebas iniciales.

### No entra en MVP
- portal cliente,
- IA avanzada,
- notificaciones automáticas complejas,
- firma avanzada,
- multiempresa,
- integraciones externas sofisticadas,
- analítica histórica avanzada.

Esta delimitación respeta el camino crítico del DGR y permite arrancar por los módulos con mayor valor inmediato. fileciteturn2file2

---

## 11. Requisitos funcionales del MVP reorganizados para desarrollo

A continuación se reordenan los requisitos desde el punto de vista de implementación.

### RF-MVP-01. Gestión de acceso
El sistema debe permitir autenticación de usuarios y autorización por roles.

### RF-MVP-02. Gestión de empleados
El gerente debe poder crear, editar, activar o desactivar empleados y asignarles rol.

### RF-MVP-03. Registro de fichaje
El empleado debe poder registrar entrada y salida con marca temporal exacta.

### RF-MVP-04. Validaciones de fichaje
El sistema debe impedir secuencias inconsistentes, por ejemplo dos entradas seguidas sin salida intermedia.

### RF-MVP-05. Cálculo de jornada
El sistema debe calcular automáticamente el tiempo trabajado por día a partir de pares entrada-salida.

### RF-MVP-06. Gestión de clientes
El gerente debe poder administrar clientes y consultar sus datos fiscales y de contacto.

### RF-MVP-07. Gestión de trabajos
El gerente debe poder registrar trabajos por cliente, asignar responsables y cambiar su estado.

### RF-MVP-08. Gestión de facturas
El gerente debe poder registrar facturas emitidas y sus datos principales.

### RF-MVP-09. Gestión de pagos
El gerente debe poder registrar pagos parciales o totales y recalcular automáticamente la deuda pendiente.

### RF-MVP-10. Resumen básico del negocio
El gerente debe poder ver un resumen del estado operativo y económico del mes.

### RF-MVP-11. Exportación
El sistema debe poder exportar fichajes y listados económicos a formatos interoperables.

### RF-MVP-12. Trazabilidad mínima
El sistema debe registrar acciones clave sobre datos sensibles.

---

## 12. Reglas de negocio mínimas del MVP

Estas reglas son especialmente importantes porque condicionan la lógica del backend.

### 12.1. Reglas de fichaje
- Un empleado activo y autenticado puede fichar.
- No se permiten dos entradas consecutivas.
- No se permiten dos salidas consecutivas.
- La salida solo puede registrarse si existe una entrada previa abierta.
- Las correcciones manuales solo las realiza el gerente.
- Toda corrección manual debe dejar evidencia en auditoría.

### 12.2. Reglas de empleados
- Cada usuario tiene un único rol principal en el MVP.
- No se puede fichar si el empleado está inactivo.

### 12.3. Reglas de clientes
- El CIF/NIF debe ser único.
- Deben existir campos obligatorios mínimos para alta.

### 12.4. Reglas de trabajos
- Todo trabajo debe pertenecer a un cliente.
- Todo trabajo debe tener al menos un estado.
- Un trabajo puede tener uno o varios empleados asignados.

### 12.5. Reglas de facturación
- Toda factura debe estar asociada a un cliente.
- La deuda viva se calcula como: **importe total facturado - suma de pagos registrados**.
- No debe permitirse registrar pagos que superen el total de la factura, salvo que se implemente una lógica específica de anticipo o regularización.

---

## 13. Casos de uso principales del MVP

Los casos de uso que mejor describen el producto mínimo son los siguientes, alineados con el DGR. fileciteturn2file2

### CU-MVP-01. Iniciar sesión
**Actor:** Empleado / Gerente  
**Resultado:** acceso al sistema según permisos.

### CU-MVP-02. Registrar fichaje
**Actor:** Empleado  
**Flujo:** accede al módulo, pulsa fichar, el sistema registra entrada o salida según el estado previo.

### CU-MVP-03. Corregir fichaje
**Actor:** Gerente  
**Flujo:** consulta fichajes, modifica un registro inconsistente, se guarda traza.

### CU-MVP-04. Crear empleado
**Actor:** Gerente  
**Flujo:** crea usuario, asigna rol y estado.

### CU-MVP-05. Crear cliente
**Actor:** Gerente  
**Flujo:** introduce datos fiscales, el sistema valida unicidad y guarda.

### CU-MVP-06. Crear trabajo
**Actor:** Gerente  
**Flujo:** selecciona cliente, define trabajo, asigna empleado/s y estado inicial.

### CU-MVP-07. Registrar factura
**Actor:** Gerente  
**Flujo:** selecciona cliente, introduce datos económicos, guarda factura.

### CU-MVP-08. Registrar pago
**Actor:** Gerente  
**Flujo:** selecciona factura, registra pago parcial o total, el sistema recalcula deuda.

### CU-MVP-09. Consultar resumen del mes
**Actor:** Gerente  
**Flujo:** visualiza horas, trabajos, facturación y deuda.

### CU-MVP-10. Exportar documento de fichaje
**Actor:** Gerente  
**Flujo:** elige rango o mes, genera documento exportable.

---

## 14. Priorización real para arrancar desarrollo

La documentación ya establece un camino crítico: RF1 -> RF2 -> (RF3, RF4) -> RF5 -> RF6 -> (RF7, RF8) -> (RF9, RF10). fileciteturn2file2

Para desarrollo práctico, lo convertiría en este orden:

### Sprint técnico 0
- repositorio,
- estructura del backend,
- configuración de base de datos,
- migraciones,
- autenticación base,
- modelo de usuarios/roles.

### Sprint 1
- empleados,
- fichajes,
- validaciones de fichaje,
- consultas y exportación básica de fichajes.

### Sprint 2
- clientes,
- trabajos,
- asignaciones,
- filtros por estado y cliente.

### Sprint 3
- facturas,
- pagos,
- deuda viva,
- vistas de seguimiento económico.

### Sprint 4
- resumen mensual básico,
- generación de documento mensual,
- auditoría mínima,
- endurecimiento de seguridad,
- pruebas integradas.

Este orden es coherente con las iteraciones ya definidas en los documentos, pero las convierte en una secuencia más operativa para empezar a programar. fileciteturn2file0 fileciteturn2file2

---

## 15. Modelo conceptual mínimo del dominio

Para empezar el software, el dominio mínimo debería incluir estas entidades:

### 15.1. Usuario
Representa la identidad de acceso.

Campos sugeridos:
- id,
- email,
- password_hash,
- rol,
- activo,
- fecha_creacion,
- ultimo_acceso.

### 15.2. Empleado
Representa a la persona trabajadora.

Campos sugeridos:
- id,
- usuario_id,
- nombre,
- apellidos,
- nif,
- telefono,
- activo.

### 15.3. Fichaje
Representa un evento de entrada o salida.

Campos sugeridos:
- id,
- empleado_id,
- tipo_evento (entrada/salida),
- fecha_hora,
- origen,
- observaciones,
- creado_por,
- corregido.

### 15.4. Cliente
Representa a una entidad o persona cliente.

Campos sugeridos:
- id,
- nombre_fiscal,
- cif_nif,
- email,
- telefono,
- direccion,
- etiquetas,
- activo.

### 15.5. Trabajo
Representa una actividad o expediente gestionado para un cliente.

Campos sugeridos:
- id,
- cliente_id,
- titulo,
- descripcion,
- estado,
- fecha_objetivo,
- prioridad,
- creado_por.

### 15.6. TrabajoEmpleado
Tabla intermedia para relación muchos a muchos entre trabajos y empleados.

### 15.7. Factura
Campos sugeridos:
- id,
- cliente_id,
- numero,
- fecha_emision,
- fecha_vencimiento,
- base_imponible,
- iva,
- total,
- estado.

### 15.8. Pago
Campos sugeridos:
- id,
- factura_id,
- fecha_pago,
- importe,
- metodo_pago,
- referencia.

### 15.9. AuditoriaEvento
Campos sugeridos:
- id,
- actor_usuario_id,
- entidad,
- entidad_id,
- accion,
- fecha_hora,
- detalle_json,
- ip.

Este modelo cubre el núcleo del MVP sin introducir complejidad innecesaria.

---

## 16. Requisitos no funcionales mínimos para arrancar

El DGR define varios RNF importantes: rendimiento, disponibilidad, seguridad, privacidad, accesibilidad, mantenibilidad, compatibilidad, observabilidad y recuperación. fileciteturn2file2

Para el MVP, conviene aterrizarlos así:

### 16.1. Seguridad
- contraseñas cifradas con hash seguro,
- autenticación mediante tokens,
- autorización por rol,
- conexión protegida por HTTPS en despliegue.

### 16.2. Privacidad
- recogida mínima de datos,
- conservación justificada,
- control de acceso a datos personales,
- registro de acciones sensibles.

### 16.3. Rendimiento
- listados paginados,
- filtros indexados en base de datos,
- consultas por cliente, estado y fecha optimizadas.

### 16.4. Usabilidad
- interfaz clara,
- acciones frecuentes accesibles en pocos clics,
- errores comprensibles y con mensaje accionable.

### 16.5. Accesibilidad
No hace falta agotar toda WCAG 2.1 AA en el primer día, pero sí conviene empezar bien:

- formularios con etiquetas claras,
- navegación por teclado razonable,
- contraste correcto,
- mensajes de validación legibles.

### 16.6. Mantenibilidad
- arquitectura modular,
- separación entre dominio, aplicación e infraestructura,
- pruebas unitarias en lógica crítica,
- migraciones controladas.

---

## 17. Decisiones técnicas recomendadas para el MVP

Los documentos proponen como stack principal Electron + React en frontend y FastAPI en backend, con PostgreSQL como base de datos, y RabbitMQ o Redis para mensajería asíncrona. fileciteturn2file3

Para un MVP, la decisión más sensata sería:

### Backend
**FastAPI + SQLAlchemy + PostgreSQL**

Motivo:
- encaja con lo ya planteado,
- permite construir API REST de forma rápida,
- tiene buena integración con validación y documentación automática,
- facilita escalar más adelante.

### Frontend
Hay dos rutas posibles:

#### Opción A. React web puro
Es la mejor opción para arrancar rápido si no necesitas aplicación de escritorio desde el día 1.

#### Opción B. Electron + React
Solo compensa si el requisito de escritorio es real e inmediato.

### Recomendación práctica
Para dejar el producto en términos de MVP puro, **arrancaría con frontend web en React** y dejaría Electron como envoltorio posterior si fuera necesario. Electron añade una capa adicional de empaquetado y mantenimiento que no aporta valor directo al negocio en el arranque.

### Mensajería
**No es obligatoria en el MVP inicial.** Se puede empezar sin broker y añadir Redis/RabbitMQ cuando entren notificaciones o procesos asíncronos más pesados.

### IA
Debe diseñarse como módulo desacoplado. Para el MVP, bastaría con una capa de reglas de negocio y un punto de extensión para IA futura.

---

## 18. Riesgos del caso y mitigación

Los riesgos principales ya aparecen reflejados en el DGR. Los reformulo desde el punto de vista del arranque del desarrollo. fileciteturn2file2

### Riesgo 1. Intentar construir demasiado en la primera versión
**Problema:** retraso del desarrollo y producto incompleto.  
**Mitigación:** limitar el MVP al flujo operacional mínimo y posponer IA avanzada, portal cliente e integraciones.

### Riesgo 2. Sobrecarga técnica por arquitectura prematura
**Problema:** demasiadas piezas desde el inicio: Electron, broker, IA, automatizaciones complejas.  
**Mitigación:** arquitectura modular, pero implementación simple al principio.

### Riesgo 3. Fichajes inconsistentes
**Problema:** pérdida de fiabilidad del módulo legal.  
**Mitigación:** reglas estrictas de secuencia y trazabilidad de correcciones.

### Riesgo 4. Datos económicos inconsistentes
**Problema:** cálculos incorrectos de deuda.  
**Mitigación:** reglas de validación de pagos y pruebas sobre casos límite.

### Riesgo 5. Falta de trazabilidad
**Problema:** imposibilidad de justificar cambios.  
**Mitigación:** auditoría mínima desde el primer sprint.

### Riesgo 6. Complejidad temprana de la IA
**Problema:** bloquear el proyecto por dependencia de histórico y tuning.  
**Mitigación:** empezar por reglas deterministas y dejar la IA como mejora incremental.

---

## 19. Backlog inicial recomendado

## 19.1. Épicas

### Épica 1. Acceso y seguridad
- login,
- logout,
- gestión de sesión,
- roles.

### Épica 2. Empleados y fichaje
- CRUD de empleados,
- registro de entrada/salida,
- cálculo de jornada,
- exportación de fichajes.

### Épica 3. Clientes y trabajos
- CRUD de clientes,
- CRUD de trabajos,
- asignación de empleados,
- filtros y consulta.

### Épica 4. Facturación
- CRUD de facturas,
- registro de pagos,
- cálculo de deuda,
- listado de impagos.

### Épica 5. Supervisión
- resumen mensual,
- auditoría mínima,
- exportaciones.

## 19.2. Historias MVP mínimas

1. Como empleado, quiero iniciar sesión para acceder a mis funciones.
2. Como empleado, quiero fichar entrada y salida para registrar mi jornada.
3. Como gerente, quiero dar de alta empleados para gestionar el equipo.
4. Como gerente, quiero corregir fichajes para resolver incidencias.
5. Como gerente, quiero dar de alta clientes para centralizar la gestión.
6. Como gerente, quiero crear trabajos para cada cliente y asignar responsables.
7. Como gerente, quiero registrar facturas para controlar ingresos.
8. Como gerente, quiero registrar pagos para calcular deudas pendientes.
9. Como gerente, quiero consultar un resumen mensual básico.
10. Como gerente, quiero exportar fichajes y listados económicos.

---

## 20. Definición de “hecho” del MVP

Se considerará que el MVP está terminado cuando se cumplan estos criterios:

- el sistema permite autenticación con roles,
- se pueden gestionar empleados y clientes,
- se puede fichar correctamente,
- se pueden crear trabajos y asignarlos,
- se pueden registrar facturas y pagos,
- el sistema calcula deuda pendiente,
- existe un resumen mensual básico,
- se generan exportaciones esenciales,
- quedan registradas acciones críticas en auditoría,
- existen pruebas básicas sobre la lógica central,
- el sistema puede desplegarse y utilizarse en un entorno de prueba real.

---

## 21. Conclusión ejecutiva

A la vista de los documentos proporcionados, el caso está bien orientado y tiene una lógica de negocio clara. El valor principal no está en construir desde el principio una plataforma compleja con todas las integraciones posibles, sino en resolver correctamente el flujo central de una gestoría pequeña: **fichaje legal + empleados + clientes + trabajos + facturación + deuda + cierre mensual básico**. Esto coincide con el propósito, el alcance y la priorización por iteraciones descritos en el DGR y en el anteproyecto. fileciteturn2file0 fileciteturn2file2

Por tanto, el MVP recomendado para empezar el desarrollo es:

- backend con FastAPI y PostgreSQL,
- frontend web en React,
- autenticación y RBAC,
- módulos de empleados, fichaje, clientes, trabajos, facturación y pagos,
- resumen operativo básico,
- exportaciones mínimas,
- auditoría básica desde el inicio,
- IA solo como extensión futura o versión asistida simple.

Esta decisión reduce riesgo, mantiene coherencia con la planificación original y deja una base sólida para iterar hacia una versión más avanzada sin rehacer el núcleo.

---

## 22. Anexo - Mapa de módulos para empezar a programar

```text
GestorIA
├── Auth
│   ├── login
│   ├── roles
│   └── permisos
├── Empleados
│   ├── alta/edición/baja lógica
│   └── consulta
├── Fichajes
│   ├── entrada/salida
│   ├── validaciones
│   ├── cálculo de jornada
│   └── exportación
├── Clientes
│   ├── alta/edición/baja lógica
│   └── búsqueda
├── Trabajos
│   ├── creación
│   ├── asignación
│   ├── estados
│   └── comentarios
├── Facturación
│   ├── facturas
│   ├── pagos
│   └── deuda viva
├── Resumen mensual
│   ├── horas
│   ├── trabajos
│   ├── ingresos
│   └── deuda
└── Auditoría
    └── eventos clave
```

---

## 23. Fuentes base utilizadas

Este estudio se ha construido a partir de:

- el anteproyecto del TFG, que define el problema, objetivos, metodología, temporización y stack tecnológico, fileciteturn2file0
- el documento de análisis de requisitos (DGR), que define alcance, stakeholders, roadmap por iteraciones, requisitos funcionales y no funcionales, casos de uso, camino crítico y riesgos. fileciteturn2file2
