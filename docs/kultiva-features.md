# Kultiva - Documento de Funcionalidades

> Plataforma SaaS multi-tenant de Recursos Humanos

## Tabla de Contenidos

1. [Evaluacion 360 / Feedback](#1-evaluacion-360--feedback)
2. [ATS - Applicant Tracking System](#2-ats---applicant-tracking-system)
3. [Onboarding](#3-onboarding)
4. [Clima Laboral / Work Environment](#4-clima-laboral--work-environment)

---

## Arquitectura de Modulos

Kultiva opera bajo un modelo modular donde cada empresa (tenant) puede habilitar o deshabilitar modulos segun sus necesidades. El modulo de **Evaluacion 360 / Feedback** es el modulo central y siempre se encuentra habilitado. Los demas modulos (ATS, Onboarding, Clima Laboral) son opcionales y pueden activarse de forma independiente.

### Roles del Sistema

| Rol | Descripcion |
|-----|-------------|
| **Super Admin** | Administrador de la plataforma Kultiva. Gestiona tenants, planes y configuracion global. |
| **Admin** | Administrador de la empresa/tenant. Configura modulos, gestiona usuarios y accede a todos los reportes. |
| **Manager** | Lider de equipo o departamento. Gestiona su equipo, aprueba solicitudes y revisa reportes de su area. |
| **Empleado** | Usuario estandar de la plataforma. Participa en evaluaciones, encuestas y procesos asignados. |
| **Candidato** | Usuario externo que aplica a vacantes a traves del portal de carreras (solo modulo ATS). |

---

## 1. Evaluacion 360 / Feedback

> Modulo central de la plataforma. Siempre habilitado para todos los tenants.

Este modulo permite a las organizaciones ejecutar ciclos completos de evaluacion de desempeno con retroalimentacion de multiples fuentes (360 grados), incluyendo auto-evaluacion, evaluacion de pares, reportes directos y managers.

---

### 1.1 Ciclos de Evaluacion

**Nombre del feature:** Ciclos de Evaluacion

**Descripcion detallada:**
Un ciclo de evaluacion es el contenedor principal que agrupa todo el proceso de evaluacion 360 dentro de un periodo determinado. Cada ciclo tiene un nombre, fechas de inicio y fin, una plantilla de evaluacion asociada, y pasa por distintos estados a lo largo de su vida util. Los ciclos permiten a la organizacion ejecutar evaluaciones periodicas (trimestrales, semestrales, anuales) de manera estructurada y repetible.

Los estados del ciclo son:
- **Borrador:** El ciclo ha sido creado pero aun no esta activo. Se pueden modificar todos sus parametros.
- **Nominacion:** El ciclo esta abierto para que managers y empleados nominen a sus evaluadores.
- **En Progreso:** Las evaluaciones han sido asignadas y los evaluadores pueden completar sus formularios.
- **Completado:** Todas las evaluaciones han sido recopiladas (o el plazo ha vencido) y los reportes estan disponibles.

**Flujo de trabajo:**

1. El **Admin** crea un nuevo ciclo de evaluacion desde el panel de administracion.
2. Configura los parametros del ciclo: nombre, descripcion, fechas de inicio y cierre, plantilla de evaluacion a utilizar, y departamentos/equipos incluidos.
3. Define las reglas de nominacion: numero minimo y maximo de evaluadores por tipo (pares, reportes directos), si la auto-evaluacion es obligatoria, y si el manager es asignado automaticamente.
4. El **Admin** cambia el estado del ciclo a "Nominacion".
5. Los **Managers** y **Empleados** reciben notificaciones para iniciar el proceso de nominacion.
6. Una vez cerrado el periodo de nominacion, el **Admin** revisa y aprueba las nominaciones.
7. El **Admin** cambia el estado a "En Progreso", lo que genera las asignaciones de revision y notifica a todos los evaluadores.
8. Los evaluadores completan sus formularios dentro del plazo establecido.
9. El **Admin** puede monitorear el progreso en tiempo real y enviar recordatorios a quienes no han completado.
10. Al vencer el plazo o cuando todas las evaluaciones se completan, el **Admin** cambia el estado a "Completado".
11. Se generan los reportes individuales y se habilita el acceso segun los permisos configurados.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Super Admin | Visualizacion global de ciclos de todos los tenants. Configuracion de limites por plan. |
| Admin | Creacion, configuracion, gestion de estados, monitoreo y cierre de ciclos. Acceso a todos los reportes. |
| Manager | Participacion en nominaciones de su equipo. Visualizacion de reportes de sus reportes directos. |
| Empleado | Participacion en nominaciones propias. Completar evaluaciones asignadas. Ver su propio reporte individual. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Ciclo de Evaluacion | id, nombre, descripcion, fecha_inicio, fecha_fin, estado, plantilla_id, tenant_id, creado_por, configuracion_nominacion |
| Estado del Ciclo | borrador, nominacion, en_progreso, completado |
| Configuracion del Ciclo | auto_evaluacion_obligatoria, min_pares, max_pares, min_reportes_directos, aprobacion_nominaciones, departamentos_incluidos |

---

### 1.2 Plantillas de Evaluacion

**Nombre del feature:** Plantillas de Evaluacion

**Descripcion detallada:**
Las plantillas de evaluacion definen la estructura y contenido de los formularios que los evaluadores deben completar. Cada plantilla se compone de secciones tematicas, y cada seccion contiene una o mas preguntas. Las preguntas pueden ser de distintos tipos: escala numerica (por ejemplo, 1 a 5), texto libre, o seleccion de opcion multiple. Las plantillas son reutilizables entre ciclos y pueden asociarse a competencias organizacionales.

Una plantilla puede tener versiones diferentes segun el tipo de evaluador (auto-evaluacion, par, reporte directo, manager), permitiendo adaptar las preguntas al contexto de la relacion laboral.

**Flujo de trabajo:**

1. El **Admin** accede al modulo de plantillas y selecciona "Crear nueva plantilla".
2. Define el nombre, descripcion y tipo de la plantilla (generica o por tipo de evaluador).
3. Agrega secciones tematicas (por ejemplo: "Competencias Tecnicas", "Liderazgo", "Trabajo en Equipo").
4. Dentro de cada seccion, agrega preguntas especificando el tipo (escala, texto, opcion multiple), el texto de la pregunta, y si es obligatoria.
5. Para preguntas tipo escala, configura el rango (por ejemplo, 1-5) y las etiquetas de cada nivel.
6. Para preguntas de opcion multiple, define las opciones disponibles.
7. Opcionalmente, vincula preguntas a competencias organizacionales definidas.
8. Previsualiza la plantilla como la verian los evaluadores.
9. Guarda la plantilla como borrador o la publica para que este disponible al crear ciclos.
10. Al crear un ciclo de evaluacion, el **Admin** selecciona la plantilla que se usara.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Super Admin | Puede crear plantillas globales disponibles para todos los tenants. |
| Admin | Creacion, edicion, duplicacion y eliminacion de plantillas del tenant. |
| Manager | Sin acceso a la gestion de plantillas. |
| Empleado | Sin acceso a la gestion de plantillas. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Plantilla | id, nombre, descripcion, estado (borrador/publicada), tenant_id, tipo_evaluador, version |
| Seccion | id, plantilla_id, nombre, descripcion, orden, peso_porcentual |
| Pregunta | id, seccion_id, texto, tipo (escala/texto/opcion_multiple), obligatoria, orden, competencia_id |
| Opcion de Pregunta | id, pregunta_id, texto, valor_numerico, orden |
| Configuracion de Escala | pregunta_id, valor_minimo, valor_maximo, etiquetas_por_nivel |

---

### 1.3 Nominaciones de Evaluadores

**Nombre del feature:** Nominaciones de Evaluadores

**Descripcion detallada:**
El proceso de nominacion permite definir quien evaluara a quien dentro de un ciclo de evaluacion. Existen cuatro tipos de evaluadores: auto-evaluacion (el empleado se evalua a si mismo), pares (colegas del mismo nivel), reportes directos (colaboradores que reportan al evaluado), y manager (el supervisor directo). El sistema soporta tanto la asignacion automatica (por ejemplo, el manager se asigna automaticamente segun la estructura organizacional) como la nominacion manual donde empleados y managers proponen evaluadores.

Las nominaciones pueden requerir aprobacion del manager o del Admin antes de convertirse en asignaciones formales.

**Flujo de trabajo:**

1. El **Admin** activa la fase de nominacion del ciclo de evaluacion.
2. Cada **Empleado** recibe una notificacion para nominar a sus evaluadores pares.
3. El **Empleado** selecciona colegas de la organizacion como evaluadores pares, respetando los limites configurados (minimo y maximo).
4. El **Manager** recibe notificacion para revisar y validar las nominaciones de su equipo.
5. El **Manager** puede aprobar, rechazar o agregar nominaciones adicionales para cada miembro de su equipo.
6. El **Manager** tambien nomina los reportes directos que evaluaran a cada empleado (si aplica).
7. El sistema asigna automaticamente las auto-evaluaciones y las evaluaciones de manager segun la estructura organizacional.
8. El **Admin** revisa el resumen de nominaciones global y puede realizar ajustes finales.
9. El **Admin** cierra la fase de nominacion y el sistema genera las asignaciones de revision correspondientes.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de reglas de nominacion. Revision global. Ajustes y aprobacion final. |
| Manager | Revision y aprobacion de nominaciones de su equipo. Nominacion de reportes directos. |
| Empleado | Nominacion de pares dentro de los limites configurados. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Nominacion | id, ciclo_id, evaluado_id, evaluador_id, tipo_evaluador (auto/par/reporte_directo/manager), estado (pendiente/aprobada/rechazada), nominado_por |
| Regla de Nominacion | ciclo_id, tipo_evaluador, minimo, maximo, requiere_aprobacion, asignacion_automatica |

---

### 1.4 Asignacion de Revisiones y Seguimiento de Progreso

**Nombre del feature:** Asignacion de Revisiones y Seguimiento de Progreso

**Descripcion detallada:**
Una vez cerrada la fase de nominacion, el sistema genera automaticamente las asignaciones de revision. Cada asignacion representa una evaluacion especifica que un evaluador debe completar sobre un evaluado, utilizando la plantilla configurada en el ciclo. El sistema proporciona herramientas de seguimiento en tiempo real para que el Admin y los Managers puedan monitorear el avance, identificar evaluaciones pendientes y enviar recordatorios.

**Flujo de trabajo:**

1. El sistema genera automaticamente las asignaciones a partir de las nominaciones aprobadas.
2. Cada **Evaluador** (Empleado/Manager) recibe una notificacion con la lista de evaluaciones que debe completar.
3. El evaluador accede a su bandeja de evaluaciones pendientes.
4. Selecciona una evaluacion y completa el formulario seccion por seccion.
5. Puede guardar progreso parcial y continuar mas tarde.
6. Al completar todas las secciones, envia la evaluacion.
7. El **Admin** monitorea el progreso general del ciclo desde un dashboard que muestra: porcentaje de completitud global, por departamento y por tipo de evaluador.
8. El **Admin** o **Manager** puede enviar recordatorios masivos o individuales a evaluadores con revisiones pendientes.
9. El sistema envia recordatorios automaticos segun la configuracion (por ejemplo, 7 dias, 3 dias y 1 dia antes del cierre).
10. Las evaluaciones no completadas al vencimiento del plazo se marcan como "expiradas".

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Dashboard de seguimiento global. Envio de recordatorios. Visualizacion de metricas de completitud. Extension de plazos. |
| Manager | Dashboard de seguimiento de su equipo. Envio de recordatorios a su equipo. Completar sus propias evaluaciones. |
| Empleado | Completar evaluaciones asignadas. Ver su propio progreso. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Asignacion de Revision | id, ciclo_id, evaluador_id, evaluado_id, tipo_evaluador, plantilla_id, estado (pendiente/en_progreso/completada/expirada), fecha_asignacion, fecha_completada |
| Respuesta | id, asignacion_id, pregunta_id, valor_numerico, valor_texto, opcion_seleccionada_id |
| Recordatorio | id, asignacion_id, tipo (automatico/manual), fecha_envio, enviado_por |

---

### 1.5 Reportes Individuales con Scores Agregados

**Nombre del feature:** Reportes Individuales con Scores Agregados por Tipo de Evaluador

**Descripcion detallada:**
Al finalizar un ciclo de evaluacion, el sistema genera reportes individuales para cada empleado evaluado. Estos reportes agregan las respuestas recibidas por tipo de evaluador (auto-evaluacion, pares, reportes directos, manager), calculando promedios por seccion, por competencia y globales. El reporte presenta visualizaciones comparativas que permiten al empleado identificar brechas entre su auto-percepcion y la percepcion de otros, asi como fortalezas y areas de mejora.

Para proteger la confidencialidad, las respuestas de pares y reportes directos se muestran de forma agregada, requiriendo un minimo configurable de evaluadores por tipo para mostrar resultados (generalmente 3). Las respuestas de texto libre se anonimisan y se muestran sin atribucion individual.

**Flujo de trabajo:**

1. El **Admin** marca el ciclo como "Completado".
2. El sistema calcula automaticamente los scores agregados para cada empleado evaluado.
3. Los scores se calculan por: pregunta individual, seccion, competencia, y promedio global, desglosados por tipo de evaluador.
4. El sistema genera el reporte individual con graficos comparativos (radar charts, barras agrupadas).
5. El **Admin** revisa los reportes y decide cuando hacerlos visibles.
6. El **Admin** habilita la visibilidad de reportes (puede ser global o por departamento).
7. Cada **Empleado** recibe notificacion de que su reporte esta disponible.
8. El **Empleado** accede a su reporte y puede descargar una version en PDF.
9. El **Manager** accede a los reportes de sus reportes directos para preparar conversaciones de retroalimentacion.
10. El **Manager** agenda sesiones de retroalimentacion con cada miembro de su equipo.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Generacion y publicacion de reportes. Acceso a todos los reportes del tenant. Configuracion de visibilidad. Exportacion masiva. |
| Manager | Acceso a reportes de sus reportes directos. Acceso a su propio reporte. |
| Empleado | Acceso unicamente a su propio reporte individual. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Reporte Individual | id, ciclo_id, empleado_id, score_global, fecha_generacion, estado (generado/publicado) |
| Score por Seccion | reporte_id, seccion_id, tipo_evaluador, promedio, cantidad_respuestas |
| Score por Competencia | reporte_id, competencia_id, tipo_evaluador, promedio, cantidad_respuestas |
| Comentario Anonimizado | reporte_id, pregunta_id, tipo_evaluador, texto_anonimizado |

---

### 1.6 Competencias Organizacionales

**Nombre del feature:** Competencias Organizacionales

**Descripcion detallada:**
Las competencias organizacionales representan los comportamientos, habilidades y valores que la organizacion considera clave para su exito. Este feature permite definir un catalogo de competencias con sus descripciones y niveles de dominio esperados. Las competencias se vinculan a preguntas de las plantillas de evaluacion, lo que permite generar reportes por competencia ademas de por seccion.

Las competencias pueden ser de tipo "organizacional" (aplican a todos los empleados), "funcional" (especificas de un area o departamento) o "de liderazgo" (aplican a roles de gestion).

**Flujo de trabajo:**

1. El **Admin** accede al catalogo de competencias y selecciona "Crear competencia".
2. Define el nombre, descripcion, tipo (organizacional/funcional/liderazgo) y los niveles de dominio (por ejemplo: basico, intermedio, avanzado, experto).
3. Para cada nivel de dominio, describe los comportamientos observables esperados.
4. Opcionalmente, asigna la competencia a departamentos o roles especificos.
5. Al crear o editar plantillas de evaluacion, el **Admin** vincula preguntas a competencias del catalogo.
6. Durante la evaluacion, los evaluadores responden las preguntas normalmente.
7. Al generar reportes, el sistema agrupa los scores por competencia, calculando el nivel de dominio alcanzado segun las respuestas.
8. Los reportes muestran el mapa de competencias del empleado con comparativas por tipo de evaluador.
9. El **Admin** puede generar reportes organizacionales de competencias para identificar fortalezas y brechas a nivel de equipo o empresa.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion, edicion y gestion del catalogo de competencias. Asignacion a departamentos y roles. Reportes organizacionales. |
| Manager | Visualizacion del mapa de competencias de su equipo. |
| Empleado | Visualizacion de sus propias competencias en el reporte individual. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Competencia | id, nombre, descripcion, tipo (organizacional/funcional/liderazgo), tenant_id, estado (activa/inactiva) |
| Nivel de Dominio | id, competencia_id, nombre, descripcion_comportamientos, orden, valor_numerico |
| Competencia-Departamento | competencia_id, departamento_id |
| Competencia-Pregunta | competencia_id, pregunta_id |

---

## 2. ATS - Applicant Tracking System

> Modulo opcional. Permite gestionar el proceso completo de reclutamiento y seleccion de personal.

Este modulo proporciona herramientas para publicar vacantes, recibir y gestionar candidaturas, coordinar entrevistas, evaluar candidatos y gestionar ofertas laborales, todo dentro de un pipeline configurable.

---

### 2.1 Publicacion de Vacantes

**Nombre del feature:** Publicacion de Vacantes

**Descripcion detallada:**
Permite a la organizacion crear y publicar ofertas de empleo con toda la informacion relevante para atraer candidatos. Cada vacante incluye titulo del puesto, descripcion detallada de responsabilidades y requisitos, departamento, ubicacion (presencial, remota o hibrida), tipo de contrato (tiempo completo, medio tiempo, freelance, temporal), rango salarial (opcional), y fecha limite de aplicacion. Las vacantes pueden publicarse en el portal de carreras de la empresa y sincronizarse con bolsas de empleo externas.

**Flujo de trabajo:**

1. El **Admin** o **Manager** crea una nueva vacante desde el modulo ATS.
2. Completa los campos obligatorios: titulo, departamento, ubicacion, tipo de contrato, descripcion del puesto, requisitos minimos y deseables.
3. Opcionalmente configura: rango salarial, beneficios, fecha limite, numero de posiciones disponibles.
4. Selecciona o crea el pipeline de reclutamiento que se usara para esta vacante (ver seccion 2.3).
5. Configura los formularios de aplicacion: campos requeridos del candidato, preguntas de filtro adicionales.
6. Selecciona los canales de publicacion: portal de carreras interno, bolsas de empleo externas.
7. Envia la vacante a revision/aprobacion si la politica de la empresa lo requiere.
8. El **Admin** aprueba la publicacion.
9. La vacante se publica automaticamente en los canales seleccionados.
10. El sistema genera un enlace unico compartible para la vacante.
11. La vacante puede pausarse, cerrarse o reabrirse segun las necesidades.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion, edicion, aprobacion y cierre de vacantes. Gestion de canales de publicacion. Acceso global a todas las vacantes. |
| Manager | Creacion de vacantes para su departamento. Requiere aprobacion del Admin para publicar. Gestion de vacantes propias. |
| Empleado | Visualizacion de vacantes internas (si se habilita movilidad interna). |
| Candidato | Visualizacion de vacantes publicadas. Aplicacion a vacantes. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Vacante | id, titulo, descripcion, departamento_id, ubicacion, tipo_ubicacion (presencial/remota/hibrida), tipo_contrato, rango_salarial_min, rango_salarial_max, moneda, fecha_limite, posiciones_disponibles, estado (borrador/publicada/pausada/cerrada), pipeline_id, creada_por, tenant_id |
| Formulario de Aplicacion | id, vacante_id, campos_requeridos, preguntas_filtro |
| Canal de Publicacion | id, vacante_id, tipo (portal_carreras/bolsa_empleo/linkedin/indeed), url_publicacion, estado |

---

### 2.2 Portal de Candidatos / Pagina de Carreras

**Nombre del feature:** Portal de Candidatos / Pagina de Carreras

**Descripcion detallada:**
Un portal web personalizable donde la empresa muestra su marca empleadora y las vacantes disponibles. Los candidatos pueden explorar oportunidades, conocer la cultura de la empresa, y aplicar directamente. El portal se genera automaticamente con el branding del tenant (logo, colores, descripcion de la empresa) y permite a los candidatos crear una cuenta para dar seguimiento a sus aplicaciones.

**Flujo de trabajo:**

1. El **Admin** configura la pagina de carreras: logo, colores de marca, descripcion de la empresa, imagenes, valores y cultura.
2. Las vacantes publicadas aparecen automaticamente en el portal.
3. Un **Candidato** externo visita la pagina de carreras de la empresa.
4. Explora las vacantes disponibles usando filtros por departamento, ubicacion y tipo de contrato.
5. Selecciona una vacante y revisa la descripcion completa.
6. Hace clic en "Aplicar" y completa el formulario de aplicacion: datos personales, experiencia laboral, educacion, habilidades.
7. Adjunta su CV y otros documentos relevantes (carta de presentacion, portafolio).
8. Responde las preguntas de filtro configuradas para la vacante.
9. Envia su aplicacion y recibe una confirmacion por correo electronico.
10. El **Candidato** puede crear una cuenta para dar seguimiento al estado de su aplicacion.
11. Desde su cuenta, el candidato ve el historial de aplicaciones y el estado actual de cada una.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion del portal (branding, contenido, secciones visibles). |
| Candidato | Navegacion del portal, busqueda de vacantes, aplicacion, seguimiento de candidaturas. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Configuracion del Portal | tenant_id, logo_url, colores_marca, descripcion_empresa, imagenes, secciones_habilitadas |
| Cuenta de Candidato | id, email, nombre, apellido, telefono, cv_url, perfil_linkedin, contrasena_hash |
| Aplicacion | id, vacante_id, candidato_id, fecha_aplicacion, estado, respuestas_filtro, archivos_adjuntos |

---

### 2.3 Pipeline de Reclutamiento

**Nombre del feature:** Pipeline de Reclutamiento con Etapas Configurables

**Descripcion detallada:**
El pipeline define las etapas por las que pasa un candidato desde que aplica hasta que es contratado o descartado. Las etapas son configurables por la organizacion y pueden adaptarse por vacante. Un pipeline tipico incluye: Aplicacion, Filtro Inicial, Entrevista Telefonica, Entrevista Tecnica, Entrevista Cultural, Oferta y Contratacion. Cada etapa puede tener acciones automaticas asociadas (envio de correos, notificaciones, tareas).

La visualizacion tipo Kanban permite ver a todos los candidatos de una vacante organizados por etapa, facilitando el seguimiento y la toma de decisiones.

**Flujo de trabajo:**

1. El **Admin** crea un pipeline de reclutamiento definiendo las etapas en orden secuencial.
2. Para cada etapa configura: nombre, descripcion, acciones automaticas (emails, notificaciones), duracion esperada, y si requiere scorecard.
3. Al publicar una vacante, se selecciona el pipeline que se utilizara.
4. Cuando un **Candidato** aplica, entra automaticamente a la primera etapa (Aplicacion).
5. El **Admin** o **Manager** revisa los candidatos en la etapa actual.
6. Para avanzar un candidato a la siguiente etapa, lo arrastra en la vista Kanban o cambia su estado manualmente.
7. El sistema ejecuta las acciones automaticas configuradas para la nueva etapa (por ejemplo, enviar correo de invitacion a entrevista).
8. Si el candidato es descartado, se mueve a la etapa "Rechazado" con un motivo obligatorio.
9. El candidato recibe notificaciones automaticas segun los cambios de etapa configurados.
10. El pipeline avanza hasta que el candidato llega a la etapa de "Contratacion" o es descartado.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion y configuracion de pipelines. Movimiento de candidatos entre todas las etapas. Configuracion de automatizaciones. |
| Manager | Movimiento de candidatos entre etapas dentro de vacantes de su departamento. |
| Candidato | Visualizacion del estado general de su aplicacion (sin detalle de etapas internas). |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Pipeline | id, nombre, descripcion, tenant_id, es_predeterminado |
| Etapa del Pipeline | id, pipeline_id, nombre, descripcion, orden, duracion_esperada_dias, requiere_scorecard, acciones_automaticas |
| Candidato en Etapa | id, aplicacion_id, etapa_id, fecha_ingreso, fecha_salida, movido_por |
| Accion Automatica | id, etapa_id, tipo (email/notificacion/tarea), configuracion, momento (al_entrar/al_salir) |

---

### 2.4 Gestion de Candidatos

**Nombre del feature:** Gestion de Candidatos

**Descripcion detallada:**
Centraliza toda la informacion de cada candidato en un perfil completo que incluye datos personales, experiencia laboral, educacion, habilidades, documentos adjuntos, historial de interacciones, notas del equipo de reclutamiento, evaluaciones y el estado actual en el pipeline. Permite buscar y filtrar candidatos por multiples criterios, crear pools de talento para futuras vacantes, y mantener un historial completo de cada candidatura.

**Flujo de trabajo:**

1. Cuando un **Candidato** aplica a una vacante, el sistema crea o actualiza su perfil automaticamente con la informacion proporcionada.
2. El **Admin** o **Manager** accede al perfil del candidato para revisar su informacion completa.
3. Puede agregar notas internas visibles solo para el equipo de reclutamiento.
4. Adjunta documentos adicionales (resultados de pruebas, referencias, etc.).
5. Revisa el historial de todas las aplicaciones del candidato (si aplico a multiples vacantes).
6. Puede etiquetar al candidato para facilitar busquedas futuras (por ejemplo: "perfil tecnico senior", "potencial para otro rol").
7. Si el candidato no es seleccionado para la vacante actual, puede moverlo a un pool de talento para considerarlo en futuras oportunidades.
8. El sistema mantiene una linea de tiempo de todas las interacciones: correos enviados, entrevistas realizadas, cambios de etapa, notas agregadas.
9. El **Admin** puede buscar en la base de candidatos por habilidades, experiencia, ubicacion o etiquetas.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Acceso completo a todos los perfiles. Gestion de pools de talento. Busqueda global. |
| Manager | Acceso a candidatos de vacantes de su departamento. Agregar notas y etiquetas. |
| Candidato | Edicion de su propio perfil y documentos. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Perfil de Candidato | id, nombre, apellido, email, telefono, ubicacion, cv_url, perfil_linkedin, experiencia_anos, educacion, habilidades, etiquetas, tenant_id |
| Nota | id, candidato_id, autor_id, texto, fecha, es_privada |
| Documento Adjunto | id, candidato_id, nombre_archivo, url, tipo, subido_por, fecha |
| Historial de Interacciones | id, candidato_id, tipo (email/entrevista/nota/cambio_etapa), descripcion, fecha, realizado_por |
| Pool de Talento | id, nombre, descripcion, tenant_id |
| Candidato-Pool | candidato_id, pool_id, fecha_agregado, agregado_por |

---

### 2.5 Programacion de Entrevistas

**Nombre del feature:** Programacion de Entrevistas

**Descripcion detallada:**
Facilita la coordinacion y programacion de entrevistas entre el equipo de reclutamiento y los candidatos. Permite definir paneles de entrevistadores, encontrar disponibilidad comun, enviar invitaciones con enlace de videoconferencia, y gestionar reprogramaciones y cancelaciones. Soporta entrevistas individuales, en panel y secuenciales.

**Flujo de trabajo:**

1. Cuando un candidato avanza a una etapa que requiere entrevista, el **Admin** o **Manager** inicia la programacion.
2. Selecciona el tipo de entrevista: individual (1 a 1), panel (multiples entrevistadores simultaneos), o secuencial (multiples entrevistas consecutivas).
3. Selecciona los entrevistadores del equipo.
4. El sistema muestra la disponibilidad de los entrevistadores (integracion con Google Calendar / Outlook).
5. Selecciona un horario disponible para todos los participantes.
6. Configura la duracion de la entrevista y el formato (presencial, videoconferencia, telefonica).
7. Para videoconferencias, el sistema genera automaticamente un enlace de reunion (Google Meet, Zoom, Teams).
8. El sistema envia invitaciones por correo electronico al candidato y a los entrevistadores con todos los detalles.
9. El **Candidato** confirma su asistencia o solicita reprogramacion.
10. Los entrevistadores reciben recordatorios antes de la entrevista.
11. Despues de la entrevista, los entrevistadores completan la scorecard de evaluacion.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Programacion de entrevistas para todas las vacantes. Gestion de calendarios. Configuracion de integraciones. |
| Manager | Programacion de entrevistas de su departamento. Participacion como entrevistador. |
| Empleado | Participacion como entrevistador cuando es asignado. |
| Candidato | Confirmacion de disponibilidad. Solicitud de reprogramacion. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Entrevista | id, aplicacion_id, tipo (individual/panel/secuencial), formato (presencial/videoconferencia/telefonica), fecha_hora, duracion_minutos, ubicacion_o_enlace, estado (programada/confirmada/reprogramada/completada/cancelada) |
| Entrevistador | id, entrevista_id, usuario_id, es_lider_panel, estado_confirmacion |
| Disponibilidad | usuario_id, fecha, hora_inicio, hora_fin, recurrente |

---

### 2.6 Scorecards de Evaluacion de Candidatos

**Nombre del feature:** Scorecards de Evaluacion de Candidatos

**Descripcion detallada:**
Las scorecards son formularios estructurados que los entrevistadores completan despues de cada interaccion con un candidato. Permiten evaluar de manera objetiva y consistente aspectos como competencias tecnicas, habilidades blandas, ajuste cultural y potencial de crecimiento. Cada criterio se califica en una escala predefinida y se acompana de comentarios cualitativos. Los scores se agregan para facilitar la comparacion entre candidatos.

**Flujo de trabajo:**

1. El **Admin** crea plantillas de scorecard con criterios de evaluacion especificos por tipo de entrevista o rol.
2. Cada criterio tiene un nombre, descripcion, escala de evaluacion (por ejemplo: no cumple, cumple parcialmente, cumple, supera expectativas) y peso.
3. La scorecard se asocia a una etapa del pipeline.
4. Despues de una entrevista, cada **Entrevistador** recibe una notificacion para completar la scorecard.
5. El entrevistador califica cada criterio y agrega comentarios cualitativos.
6. Emite una recomendacion general: "Fuerte si", "Si", "No", "Fuerte no".
7. La scorecard se guarda y es visible para el equipo de reclutamiento.
8. El **Admin** o **Manager** revisa todas las scorecards de un candidato en una vista consolidada.
9. Los scores agregados facilitan la comparacion objetiva entre candidatos en la misma etapa.
10. La decision de avanzar o rechazar al candidato se toma considerando los scores y comentarios de todos los entrevistadores.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion de plantillas de scorecard. Visualizacion de todas las evaluaciones. Vista consolidada. |
| Manager | Visualizacion de scorecards de candidatos de su departamento. Completar scorecards como entrevistador. |
| Empleado | Completar scorecards cuando participa como entrevistador. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Plantilla Scorecard | id, nombre, tenant_id, criterios |
| Criterio de Evaluacion | id, plantilla_scorecard_id, nombre, descripcion, peso, escala |
| Scorecard Completada | id, entrevista_id, entrevistador_id, recomendacion_general, comentario_general, fecha |
| Calificacion de Criterio | id, scorecard_id, criterio_id, valor, comentario |

---

### 2.7 Ofertas Laborales y Cartas de Oferta

**Nombre del feature:** Ofertas Laborales y Cartas de Oferta

**Descripcion detallada:**
Gestiona la creacion, aprobacion y envio de ofertas de empleo formales a los candidatos seleccionados. Incluye la generacion de cartas de oferta personalizadas a partir de plantillas configurables, flujos de aprobacion interna, y seguimiento del estado de la oferta (enviada, aceptada, rechazada, negociacion, expirada). Permite gestionar multiples versiones de una oferta durante negociaciones.

**Flujo de trabajo:**

1. Una vez que un candidato supera todas las etapas del pipeline, el **Manager** o **Admin** inicia la creacion de una oferta.
2. Selecciona la plantilla de carta de oferta y completa los campos: puesto, departamento, salario, beneficios, fecha de inicio propuesta, tipo de contrato, condiciones especiales.
3. Previsualiza la carta de oferta generada.
4. Envia la oferta a un flujo de aprobacion interna (por ejemplo: Manager -> Director -> RRHH -> Admin).
5. Cada aprobador revisa y aprueba o solicita modificaciones.
6. Una vez aprobada, el **Admin** envia la oferta al **Candidato** por correo electronico.
7. El **Candidato** revisa la oferta y puede: aceptar, rechazar, o solicitar negociacion.
8. Si el candidato solicita negociacion, el **Admin** crea una nueva version de la oferta con los ajustes.
9. El proceso de aprobacion y envio se repite si es necesario.
10. Al aceptar, el candidato firma electronicamente la carta de oferta.
11. La oferta aceptada se registra en el sistema y el candidato pasa a la etapa de "Contratacion".
12. Opcionalmente, se inicia automaticamente el proceso de onboarding (si el modulo esta habilitado).

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion y gestion de plantillas de oferta. Creacion, aprobacion y envio de ofertas. Gestion de negociaciones. |
| Manager | Solicitud de creacion de ofertas para su departamento. Participacion en flujo de aprobacion. |
| Candidato | Recepcion, revision, aceptacion/rechazo de ofertas. Firma electronica. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Oferta | id, aplicacion_id, version, puesto, departamento_id, salario, moneda, beneficios, fecha_inicio, tipo_contrato, estado (borrador/en_aprobacion/aprobada/enviada/aceptada/rechazada/negociacion/expirada), fecha_expiracion |
| Plantilla de Oferta | id, nombre, contenido_html, variables, tenant_id |
| Aprobacion de Oferta | id, oferta_id, aprobador_id, estado (pendiente/aprobada/rechazada), comentario, fecha |
| Firma Electronica | id, oferta_id, candidato_id, firma_url, ip_address, fecha_firma |

---

### 2.8 Reportes de Reclutamiento

**Nombre del feature:** Reportes de Reclutamiento

**Descripcion detallada:**
Proporciona dashboards y reportes analiticos sobre el proceso de reclutamiento. Las metricas clave incluyen: tiempo promedio de contratacion (desde publicacion hasta oferta aceptada), tasa de conversion entre etapas del pipeline, fuentes de candidatos mas efectivas, volumen de aplicaciones por vacante, costo por contratacion, y diversidad del pipeline. Los reportes pueden segmentarse por departamento, periodo, tipo de puesto y fuente.

**Flujo de trabajo:**

1. El **Admin** accede al modulo de reportes de reclutamiento.
2. Selecciona el tipo de reporte: tiempo de contratacion, analisis de fuentes, conversion de pipeline, volumen de aplicaciones, o reporte personalizado.
3. Configura los filtros: periodo de tiempo, departamento, vacante especifica, ubicacion.
4. El sistema genera el dashboard interactivo con graficos y tablas.
5. Puede hacer drill-down en los datos para explorar detalles especificos.
6. Exporta los reportes en formato PDF o CSV para compartir con stakeholders.
7. Configura reportes automaticos que se envian periodicamente por correo electronico.
8. Usa los insights para optimizar el proceso de reclutamiento: identificar cuellos de botella, mejorar fuentes de candidatos, reducir tiempos de contratacion.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Acceso a todos los reportes. Configuracion de reportes automaticos. Exportacion. |
| Manager | Acceso a reportes de vacantes de su departamento. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Metrica de Reclutamiento | id, tipo, vacante_id, departamento_id, valor, periodo, fecha_calculo |
| Fuente de Candidato | id, nombre (portal_carreras/linkedin/indeed/referido/directo/otro), aplicacion_id |
| Reporte Programado | id, tipo_reporte, filtros, destinatarios, frecuencia, formato, tenant_id |

---

### 2.9 Integracion con Bolsas de Empleo

**Nombre del feature:** Integracion con Bolsas de Empleo

**Descripcion detallada:**
Permite publicar vacantes automaticamente en multiples plataformas de empleo externas y recibir aplicaciones de vuelta al ATS de Kultiva. Las integraciones soportadas incluyen plataformas como LinkedIn Jobs, Indeed, Glassdoor, Computrabajo, OCC Mundial, y otras plataformas regionales. La integracion es bidireccional: publica vacantes hacia afuera y recibe aplicaciones de vuelta, centralizando toda la gestion en el ATS.

**Flujo de trabajo:**

1. El **Admin** accede a la configuracion de integraciones del ATS.
2. Conecta las cuentas de bolsas de empleo proporcionando credenciales API o autorizacion OAuth.
3. Configura los mapeos de campos entre Kultiva y cada plataforma (titulo, ubicacion, salario, etc.).
4. Al publicar una vacante, selecciona en que plataformas externas desea publicar.
5. El sistema adapta el formato de la vacante segun los requisitos de cada plataforma y la publica automaticamente.
6. Cuando un candidato aplica desde una plataforma externa, la aplicacion se importa automaticamente al ATS con la fuente identificada.
7. El candidato recibe un correo de confirmacion y puede completar su perfil en el portal de Kultiva.
8. El **Admin** puede monitorear el rendimiento de cada plataforma (aplicaciones recibidas, calidad de candidatos, costo).
9. Las vacantes se actualizan o cierran automaticamente en las plataformas externas cuando cambian de estado en Kultiva.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de integraciones. Gestion de credenciales. Seleccion de plataformas por vacante. Monitoreo de rendimiento. |
| Manager | Seleccion de plataformas al crear vacantes (si tiene permisos). |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Integracion Bolsa de Empleo | id, tenant_id, plataforma, credenciales_encriptadas, estado (activa/inactiva), configuracion_mapeo |
| Publicacion Externa | id, vacante_id, integracion_id, id_externo, url_publicacion, estado (publicada/pausada/cerrada), fecha_publicacion |
| Importacion de Aplicacion | id, publicacion_externa_id, aplicacion_id, datos_originales, fecha_importacion |

---

## 3. Onboarding

> Modulo opcional. Gestiona la incorporacion estructurada de nuevos empleados a la organizacion.

Este modulo permite crear planes de onboarding personalizados con checklists de tareas, asignacion de mentores, seguimiento de progreso y encuestas de experiencia, asegurando que cada nuevo empleado tenga una incorporacion efectiva y consistente.

---

### 3.1 Planes de Onboarding

**Nombre del feature:** Planes de Onboarding con Checklists Configurables

**Descripcion detallada:**
Un plan de onboarding es una plantilla que define todas las actividades, tareas y hitos que un nuevo empleado debe completar durante su periodo de incorporacion. Los planes son configurables por rol, departamento o nivel jerarquico, y consisten en checklists organizados por fases temporales (pre-ingreso, primera semana, primer mes, primeros 90 dias). Cada tarea del checklist tiene un responsable, una fecha limite relativa al ingreso, y puede ser obligatoria u opcional.

**Flujo de trabajo:**

1. El **Admin** crea un nuevo plan de onboarding especificando el nombre, descripcion y ambito de aplicacion (departamento, rol o nivel).
2. Define las fases temporales del plan (por ejemplo: "Pre-ingreso", "Dia 1", "Primera semana", "Primer mes", "Primeros 90 dias").
3. Dentro de cada fase, crea tareas con: titulo, descripcion, responsable (nuevo empleado, manager, RRHH, TI, etc.), fecha limite relativa (por ejemplo: "ingreso + 3 dias"), y si es obligatoria.
4. Las tareas pueden ser de distintos tipos: formulario a completar, documento a firmar, reunion a asistir, video/material a revisar, o tarea libre.
5. El **Admin** puede duplicar planes existentes para crear variaciones por departamento.
6. Cuando un nuevo empleado es dado de alta en el sistema (manualmente o desde el ATS), el **Admin** asigna un plan de onboarding.
7. El sistema genera automaticamente la instancia del plan con las fechas reales calculadas a partir de la fecha de ingreso.
8. Se notifica a todos los responsables de tareas sobre sus asignaciones.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion, edicion y asignacion de planes de onboarding. Monitoreo global del progreso. |
| Manager | Visualizacion y seguimiento del plan de sus nuevos reportes directos. Completar tareas asignadas al manager. |
| Empleado (nuevo) | Visualizacion de su plan de onboarding. Completar tareas asignadas. Marcar hitos como completados. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Plan de Onboarding | id, nombre, descripcion, departamento_id, rol_id, tenant_id, estado (activo/inactivo) |
| Fase del Plan | id, plan_id, nombre, orden, dias_desde_ingreso_inicio, dias_desde_ingreso_fin |
| Tarea del Plan (plantilla) | id, fase_id, titulo, descripcion, tipo (formulario/documento/reunion/material/libre), responsable_tipo (empleado/manager/rrhh/ti), dias_limite_relativo, obligatoria |
| Instancia de Onboarding | id, plan_id, empleado_id, fecha_ingreso, estado (en_progreso/completado), progreso_porcentaje |
| Tarea Asignada | id, instancia_id, tarea_plantilla_id, responsable_id, fecha_limite, estado (pendiente/en_progreso/completada/vencida), fecha_completada |

---

### 3.2 Tareas Automaticas

**Nombre del feature:** Tareas Automaticas de Onboarding

**Descripcion detallada:**
Automatiza las tareas operativas recurrentes del proceso de incorporacion como la solicitud de documentacion, la creacion de accesos a sistemas, la asignacion de equipos de trabajo, y la inscripcion en programas de capacitacion obligatoria. Estas automatizaciones reducen la carga administrativa y aseguran que ningun paso critico sea omitido. Las tareas se disparan automaticamente segun reglas configuradas y se asignan a los equipos responsables.

**Flujo de trabajo:**

1. El **Admin** configura las reglas de automatizacion para las tareas recurrentes del onboarding.
2. Para documentacion: define los documentos requeridos por tipo de contrato o pais (identificacion, contrato firmado, datos bancarios, etc.) y configura la solicitud automatica al nuevo empleado.
3. Para accesos: configura las solicitudes automaticas de creacion de cuentas a TI (email corporativo, acceso a herramientas, VPN) segun el departamento y rol.
4. Para equipos: genera automaticamente solicitudes al area de TI o logistica para la preparacion del equipo de trabajo (laptop, monitor, teclado, etc.).
5. Para capacitacion: inscribe automaticamente al nuevo empleado en los cursos obligatorios segun su rol.
6. Cuando se inicia una instancia de onboarding, el sistema ejecuta las automatizaciones configuradas.
7. Se generan tareas asignadas a los equipos correspondientes con fechas limite.
8. Los responsables reciben notificaciones y completan las tareas.
9. El sistema envia recordatorios automaticos para tareas pendientes.
10. El **Admin** monitorea el cumplimiento de todas las tareas automaticas.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de reglas de automatizacion. Monitoreo de cumplimiento. |
| Manager | Visualizacion del estado de las tareas de su nuevo empleado. |
| Empleado (nuevo) | Completar las tareas de documentacion asignadas. Subir documentos requeridos. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Regla de Automatizacion | id, tipo (documentacion/accesos/equipos/capacitacion), condiciones (departamento/rol/pais/contrato), acciones, tenant_id |
| Solicitud de Documento | id, instancia_onboarding_id, tipo_documento, estado (pendiente/subido/verificado/rechazado), url_documento |
| Solicitud de Acceso | id, instancia_onboarding_id, sistema, tipo_acceso, estado (pendiente/creado/fallido), asignado_a |
| Solicitud de Equipo | id, instancia_onboarding_id, descripcion_equipo, estado (pendiente/en_preparacion/entregado), asignado_a |

---

### 3.3 Asignacion de Buddy/Mentor

**Nombre del feature:** Asignacion de Buddy/Mentor

**Descripcion detallada:**
Permite asignar un companero experimentado (buddy) y/o un mentor formal a cada nuevo empleado durante su periodo de onboarding. El buddy proporciona apoyo informal para integrarse a la cultura y dinamicas del equipo, mientras que el mentor ofrece guia profesional y de desarrollo. El sistema facilita la comunicacion entre ambos, establece puntos de encuentro programados y mide la efectividad de la relacion.

**Flujo de trabajo:**

1. El **Admin** configura las reglas de asignacion de buddies: criterios de elegibilidad (antiguedad minima, mismo departamento o diferente, nivel jerarquico), limite de buddies activos por persona.
2. El sistema sugiere candidatos a buddy basandose en los criterios configurados.
3. El **Admin** o **Manager** asigna un buddy al nuevo empleado.
4. Opcionalmente, asigna tambien un mentor formal si el plan lo incluye.
5. El **Buddy** y el **Mentor** reciben notificacion de su asignacion con informacion sobre el nuevo empleado y guias de su rol.
6. El sistema programa automaticamente reuniones de seguimiento entre el buddy/mentor y el nuevo empleado (por ejemplo: semanal durante el primer mes, quincenal durante el segundo y tercer mes).
7. Despues de cada reunion, el buddy/mentor puede registrar notas sobre el progreso del nuevo empleado.
8. El nuevo **Empleado** puede calificar la experiencia con su buddy/mentor.
9. Al finalizar el periodo de onboarding, se genera un resumen de la relacion buddy/mentor.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de reglas de asignacion. Asignacion de buddies y mentores. Monitoreo de relaciones activas. |
| Manager | Sugerencia y asignacion de buddies para su equipo. Seguimiento. |
| Empleado (buddy/mentor) | Aceptar asignacion. Registrar notas de reuniones. Guiar al nuevo empleado. |
| Empleado (nuevo) | Comunicarse con su buddy/mentor. Calificar la experiencia. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Asignacion Buddy/Mentor | id, instancia_onboarding_id, nuevo_empleado_id, buddy_mentor_id, tipo (buddy/mentor), fecha_inicio, fecha_fin, estado (activa/completada/cancelada) |
| Reunion Programada | id, asignacion_id, fecha_hora, duracion, estado (programada/completada/cancelada), notas |
| Evaluacion de Relacion | id, asignacion_id, calificacion, comentario, evaluado_por, fecha |

---

### 3.4 Seguimiento de Progreso del Nuevo Empleado

**Nombre del feature:** Seguimiento de Progreso del Nuevo Empleado

**Descripcion detallada:**
Proporciona un dashboard de seguimiento en tiempo real del progreso de cada nuevo empleado a lo largo de su plan de onboarding. Muestra el porcentaje de completitud general, tareas completadas vs pendientes, tareas vencidas, y progreso por fase. Permite al Admin y al Manager identificar rapidamente nuevos empleados que necesitan atencion adicional y tomar acciones correctivas.

**Flujo de trabajo:**

1. Desde el momento en que se activa una instancia de onboarding, el sistema comienza a rastrear el progreso.
2. El **Admin** accede al dashboard de onboarding que muestra: lista de nuevos empleados activos, progreso individual de cada uno, alertas de tareas vencidas.
3. Puede filtrar por departamento, fecha de ingreso, plan de onboarding.
4. Al seleccionar un empleado especifico, ve el detalle de su plan: tareas completadas (verde), en progreso (amarillo), pendientes (gris), vencidas (rojo).
5. El **Manager** accede a una vista similar filtrada a sus reportes directos.
6. El sistema genera alertas automaticas cuando: una tarea critica esta vencida, el progreso general esta por debajo de lo esperado, o han pasado X dias sin actividad.
7. El **Admin** o **Manager** pueden agregar notas de seguimiento o reprogramar tareas vencidas.
8. Al completar todas las tareas obligatorias, la instancia de onboarding se marca como "completada" y se notifica al Admin y Manager.
9. Se genera un resumen final del proceso de onboarding del empleado.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Dashboard global de todos los onboardings activos. Alertas. Acciones correctivas. Reportes. |
| Manager | Dashboard de onboardings de su equipo. Seguimiento de sus reportes directos. |
| Empleado (nuevo) | Visualizacion de su propio progreso. Completar tareas pendientes. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Progreso de Onboarding | instancia_id, tareas_totales, tareas_completadas, tareas_vencidas, porcentaje_completitud, ultima_actividad |
| Alerta de Onboarding | id, instancia_id, tipo (tarea_vencida/progreso_bajo/sin_actividad), mensaje, fecha, leida |
| Nota de Seguimiento | id, instancia_id, autor_id, texto, fecha |

---

### 3.5 Encuestas de Experiencia de Onboarding

**Nombre del feature:** Encuestas de Experiencia de Onboarding (30/60/90 dias)

**Descripcion detallada:**
Encuestas automatizadas que se envian al nuevo empleado en intervalos clave (30, 60 y 90 dias despues de su ingreso) para medir su experiencia de incorporacion, nivel de integracion al equipo, claridad de rol, satisfaccion con el proceso, y percepcion de la cultura organizacional. Los resultados alimentan metricas de efectividad del onboarding y permiten identificar areas de mejora en el proceso.

**Flujo de trabajo:**

1. El **Admin** configura las plantillas de encuestas de onboarding para cada hito temporal (30, 60 y 90 dias).
2. Define las preguntas: combinacion de escala (satisfaccion 1-5), opcion multiple y texto libre.
3. Las dimensiones tipicas incluyen: claridad de rol, apoyo del manager, relacion con el equipo, calidad de la capacitacion, herramientas y recursos, cultura organizacional.
4. El sistema programa automaticamente el envio de encuestas basandose en la fecha de ingreso de cada nuevo empleado.
5. Al cumplirse el hito (30/60/90 dias), el **Empleado** recibe la encuesta por correo y notificacion en plataforma.
6. El empleado completa la encuesta (anonimato configurable).
7. Los resultados se agregan en el dashboard de encuestas de onboarding.
8. El **Admin** puede comparar resultados entre periodos, departamentos y planes de onboarding.
9. Se generan alertas cuando un empleado reporta baja satisfaccion.
10. El **Admin** usa los insights para mejorar los planes y procesos de onboarding.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion y configuracion de encuestas. Dashboard de resultados. Analisis y comparativas. |
| Manager | Visualizacion de resultados agregados de su equipo (respetando anonimato si aplica). |
| Empleado (nuevo) | Completar encuestas en los hitos programados. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Plantilla Encuesta Onboarding | id, hito_dias (30/60/90), preguntas, tenant_id |
| Encuesta Programada | id, plantilla_id, instancia_onboarding_id, fecha_envio, estado (pendiente/enviada/completada/expirada) |
| Respuesta de Encuesta | id, encuesta_programada_id, pregunta_id, valor, texto |
| Resultado Agregado | hito_dias, dimension, promedio, periodo, departamento_id, tenant_id |

---

### 3.6 Firma Electronica de Documentos

**Nombre del feature:** Firma Electronica de Documentos

**Descripcion detallada:**
Permite al nuevo empleado revisar y firmar electronicamente documentos requeridos durante el onboarding directamente desde la plataforma, sin necesidad de impresiones o escaneos. Los documentos tipicos incluyen: contrato de trabajo, acuerdos de confidencialidad, politicas internas, declaracion de conflicto de intereses, y formularios de datos personales. La firma electronica tiene validez legal y se almacena con evidencia de la identidad del firmante (IP, fecha/hora, email verificado).

**Flujo de trabajo:**

1. El **Admin** sube las plantillas de documentos que requieren firma (formatos PDF o generados desde plantillas HTML).
2. Configura los campos de firma, iniciales, fecha y campos de datos que el empleado debe completar.
3. Asocia los documentos a planes de onboarding o los envia manualmente a empleados especificos.
4. Cuando se inicia el onboarding, los documentos se generan automaticamente con los datos del empleado prellenados.
5. El **Empleado** recibe notificacion de documentos pendientes de firma.
6. Accede al documento desde su portal de onboarding.
7. Revisa el documento completo.
8. Completa los campos requeridos y coloca su firma electronica (trazado digital o tipo nombre).
9. Confirma la firma y el sistema registra la evidencia: IP, timestamp, email, navegador.
10. El documento firmado se almacena de forma segura y es accesible tanto para el empleado como para el Admin.
11. El **Admin** recibe notificacion de la firma completada y puede descargar el documento con certificado de firma.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Gestion de plantillas de documentos. Envio de documentos. Descarga de documentos firmados. Monitoreo de pendientes. |
| Manager | Visualizacion del estado de documentos de su equipo. |
| Empleado (nuevo) | Revision y firma de documentos asignados. Descarga de copias firmadas. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Plantilla de Documento | id, nombre, tipo (pdf_subido/generado_html), contenido, campos_firma, tenant_id |
| Documento para Firma | id, plantilla_id, empleado_id, instancia_onboarding_id, estado (pendiente/visto/firmado), url_documento_final |
| Registro de Firma | id, documento_id, firmante_id, firma_data, ip_address, user_agent, timestamp, hash_documento |

---

### 3.7 Portal del Nuevo Empleado

**Nombre del feature:** Portal del Nuevo Empleado

**Descripcion detallada:**
Un espacio centralizado y personalizado donde el nuevo empleado accede a toda la informacion relevante para su incorporacion: informacion de la empresa (mision, vision, valores, historia), su equipo de trabajo (organigrama, contactos), recursos de capacitacion, documentos importantes, directorio de la empresa, calendario de actividades de onboarding, y un checklist interactivo de sus tareas pendientes. El portal sirve como punto de referencia unico durante todo el proceso de incorporacion.

**Flujo de trabajo:**

1. El **Admin** configura el contenido del portal: informacion de la empresa, recursos generales, paginas de bienvenida, videos introductorios.
2. Cuando un nuevo empleado inicia su onboarding, el sistema genera automaticamente su portal personalizado.
3. El portal incluye: mensaje de bienvenida personalizado, foto y datos de su manager, foto y datos de su buddy/mentor, informacion de su equipo.
4. El nuevo **Empleado** accede al portal desde su primer dia (o incluso antes si se habilita acceso pre-ingreso).
5. Explora la informacion de la empresa y sus recursos.
6. Visualiza su equipo de trabajo y organigrama inmediato.
7. Accede a su checklist de tareas de onboarding y puede completar tareas directamente.
8. Revisa y firma documentos pendientes.
9. Consulta el calendario con reuniones y eventos programados.
10. Accede a materiales de capacitacion y guias de herramientas.
11. Puede comunicarse con su buddy, mentor o manager directamente desde el portal.
12. El portal permanece accesible durante todo el periodo de onboarding y despues como referencia.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion del contenido del portal. Personalizacion por departamento/rol. Gestion de recursos. |
| Manager | Sin gestion directa del portal, pero su informacion se muestra automaticamente. |
| Empleado (nuevo) | Acceso completo a su portal personalizado. Interaccion con contenido y tareas. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Configuracion del Portal | tenant_id, mensaje_bienvenida, contenido_empresa, recursos_generales, secciones_habilitadas |
| Portal Personalizado | id, empleado_id, instancia_onboarding_id, contenido_personalizado, acceso_pre_ingreso |
| Recurso | id, nombre, tipo (documento/video/enlace/guia), url, categoria, departamento_id, tenant_id |
| Seccion del Portal | id, portal_id, tipo (bienvenida/equipo/tareas/documentos/capacitacion/directorio), orden, visible |

---

## 4. Clima Laboral / Work Environment

> Modulo opcional. Permite medir, analizar y mejorar el ambiente de trabajo y el compromiso de los empleados.

Este modulo proporciona herramientas para realizar encuestas de clima organizacional y de pulso, analizar los resultados con dashboards interactivos, identificar tendencias y areas de riesgo, y crear planes de accion con seguimiento.

---

### 4.1 Encuestas de Clima Organizacional

**Nombre del feature:** Encuestas de Clima Organizacional

**Descripcion detallada:**
Las encuestas de clima son evaluaciones periodicas y comprehensivas que miden la percepcion de los empleados sobre multiples dimensiones del ambiente laboral. Son tipicamente anuales o semestrales, anonimas, y cubren todas las dimensiones relevantes de la organizacion. Permiten obtener una fotografia completa del estado del clima organizacional y establecer una linea base para medir progreso.

Las encuestas pueden personalizarse con preguntas propias de la organizacion, ademas de incluir un banco de preguntas validadas por dimension.

**Flujo de trabajo:**

1. El **Admin** crea una nueva encuesta de clima seleccionando "Encuesta de Clima Organizacional".
2. Configura los parametros: nombre, descripcion, fecha de inicio y cierre, anonimato (anonima/confidencial), poblacion objetivo (toda la empresa o departamentos especificos).
3. Selecciona las dimensiones a evaluar: satisfaccion general, compromiso, liderazgo, comunicacion, bienestar, desarrollo profesional, trabajo en equipo, reconocimiento, compensacion, ambiente fisico.
4. Para cada dimension, selecciona preguntas del banco predefinido o agrega preguntas personalizadas.
5. Agrega preguntas eNPS (Employee Net Promoter Score): "En una escala del 0 al 10, que tan probable es que recomiendes esta empresa como lugar de trabajo?"
6. Configura las preguntas demograficas para segmentacion: departamento, antiguedad, nivel jerarquico (sin comprometer el anonimato).
7. Previsualiza la encuesta y realiza ajustes.
8. Lanza la encuesta: todos los **Empleados** incluidos reciben notificacion por correo y en plataforma.
9. Los empleados completan la encuesta de forma anonima.
10. El **Admin** monitorea la tasa de participacion en tiempo real y envia recordatorios a los departamentos con baja participacion.
11. Al cerrar la encuesta, se generan los reportes y dashboards de resultados.
12. El **Admin** revisa los resultados y decide cuando compartirlos con los Managers y la organizacion.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion, configuracion y lanzamiento de encuestas. Monitoreo de participacion. Acceso a todos los resultados. Publicacion de resultados. |
| Manager | Acceso a resultados de su departamento (si el Admin lo habilita). Participacion como empleado. |
| Empleado | Completar la encuesta de forma anonima. Visualizacion de resultados generales (si se comparten). |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Encuesta de Clima | id, nombre, descripcion, tipo (clima_organizacional), fecha_inicio, fecha_cierre, anonima, estado (borrador/activa/cerrada), tenant_id |
| Dimension | id, nombre, descripcion, categoria |
| Pregunta de Encuesta | id, encuesta_id, dimension_id, texto, tipo (escala/texto/opcion_multiple/enps), obligatoria, orden |
| Respuesta Anonima | id, encuesta_id, pregunta_id, valor, texto, datos_demograficos_hash |
| Tasa de Participacion | encuesta_id, departamento_id, total_invitados, total_completados, porcentaje |

---

### 4.2 Encuestas de Pulso

**Nombre del feature:** Encuestas de Pulso

**Descripcion detallada:**
Las encuestas de pulso son evaluaciones cortas y frecuentes (semanal, quincenal o mensual) disenadas para capturar el sentimiento de los empleados de forma continua. Tipicamente contienen entre 3 y 10 preguntas, se completan en menos de 2 minutos, y permiten detectar cambios de tendencia rapidamente. Son anonimas y se centran en las dimensiones mas criticas o en temas especificos de interes para la organizacion.

**Flujo de trabajo:**

1. El **Admin** configura un programa de encuestas de pulso definiendo: frecuencia (semanal/quincenal/mensual), dia y hora de envio, duracion de respuesta.
2. Selecciona el modo de preguntas: rotacion automatica del banco de preguntas, seleccion manual de preguntas por envio, o preguntas fijas recurrentes.
3. Define el numero de preguntas por pulso (recomendado: 3-5).
4. Configura la poblacion objetivo y si es anonima.
5. Activa el programa de pulso.
6. Segun la frecuencia configurada, el sistema envia automaticamente la encuesta de pulso a los **Empleados**.
7. Los empleados reciben la encuesta por correo o notificacion push y la completan en pocos minutos.
8. Los resultados se agregan al dashboard de pulso en tiempo real.
9. El sistema detecta automaticamente tendencias: mejoras, deterioros y anomalias.
10. El **Admin** recibe alertas cuando las metricas de alguna dimension o departamento caen por debajo de umbrales configurados.
11. Los resultados se acumulan semanalmente, permitiendo ver tendencias a lo largo del tiempo.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion del programa de pulso. Seleccion de preguntas. Dashboard de resultados y tendencias. Alertas. |
| Manager | Acceso a resultados de pulso de su departamento (si se habilita). |
| Empleado | Completar encuestas de pulso. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Programa de Pulso | id, nombre, frecuencia (semanal/quincenal/mensual), dia_envio, hora_envio, duracion_respuesta_horas, modo_preguntas (rotacion/manual/fijo), num_preguntas, anonimo, estado (activo/pausado), tenant_id |
| Envio de Pulso | id, programa_id, fecha_envio, preguntas_seleccionadas, estado (enviado/cerrado) |
| Respuesta de Pulso | id, envio_id, pregunta_id, valor, texto, datos_demograficos_hash |
| Tendencia | dimension_id, departamento_id, periodo, valor_promedio, cambio_vs_anterior, tendencia (mejora/estable/deterioro) |

---

### 4.3 Dimensiones Medidas

**Nombre del feature:** Dimensiones de Medicion del Clima Laboral

**Descripcion detallada:**
Las dimensiones son las categorias fundamentales que se evaluan en las encuestas de clima y pulso. Cada dimension representa un aspecto critico del ambiente de trabajo y contiene un conjunto de preguntas validadas. Las dimensiones estandar de Kultiva son:

- **Satisfaccion General:** Nivel de contento del empleado con su trabajo y la organizacion en su conjunto.
- **Compromiso (Engagement):** Grado de conexion emocional y motivacion del empleado con su trabajo y la organizacion.
- **Liderazgo:** Percepcion sobre la calidad del liderazgo directo y organizacional, incluyendo comunicacion, apoyo y direccion.
- **Comunicacion:** Efectividad de la comunicacion interna, transparencia y flujo de informacion.
- **Bienestar:** Equilibrio vida-trabajo, salud mental, estres laboral y condiciones fisicas de trabajo.
- **Desarrollo Profesional:** Oportunidades de crecimiento, capacitacion, plan de carrera y retroalimentacion.
- **Trabajo en Equipo:** Colaboracion, confianza entre companeros, dinamicas de equipo y cooperacion interdepartamental.
- **Reconocimiento:** Frecuencia y calidad del reconocimiento recibido por logros y contribuciones.

Las organizaciones pueden agregar dimensiones personalizadas o desactivar las que no sean relevantes.

**Flujo de trabajo:**

1. El **Admin** accede al catalogo de dimensiones y revisa las dimensiones estandar disponibles.
2. Para cada dimension, puede ver las preguntas predefinidas y su descripcion.
3. El **Admin** puede activar o desactivar dimensiones segun las prioridades de la organizacion.
4. Puede crear dimensiones personalizadas con sus propias preguntas.
5. Al crear una encuesta de clima o configurar un programa de pulso, selecciona las dimensiones a incluir.
6. Las preguntas asociadas a cada dimension se incorporan a la encuesta.
7. Los resultados se calculan y presentan agrupados por dimension, permitiendo identificar las areas mas fuertes y las que requieren atencion.
8. Las dimensiones se mantienen consistentes entre encuestas para permitir comparacion temporal.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Gestion del catalogo de dimensiones. Creacion de dimensiones personalizadas. Configuracion de preguntas por dimension. |
| Manager | Visualizacion de resultados por dimension de su equipo. |
| Empleado | Sin acceso a la gestion de dimensiones. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Dimension | id, nombre, descripcion, tipo (estandar/personalizada), estado (activa/inactiva), tenant_id |
| Banco de Preguntas | id, dimension_id, texto, tipo (escala/texto/opcion_multiple), idioma, validada |
| Dimension-Encuesta | dimension_id, encuesta_id, orden, peso |

---

### 4.4 Analisis de Resultados con Dashboards Interactivos

**Nombre del feature:** Analisis de Resultados con Dashboards Interactivos

**Descripcion detallada:**
Dashboards visuales e interactivos que presentan los resultados de encuestas de clima y pulso de manera clara y accionable. Incluyen graficos de barras, lineas de tendencia, mapas de calor, diagramas de radar y tablas comparativas. Los dashboards permiten aplicar filtros dinamicos, hacer drill-down por dimension, departamento o periodo, y exportar visualizaciones para presentaciones.

**Flujo de trabajo:**

1. Al cerrarse una encuesta de clima o pulso, los resultados se procesan automaticamente y se cargan en el dashboard.
2. El **Admin** accede al dashboard principal que muestra un resumen ejecutivo: score general, dimensiones destacadas (mejor y peor), tasa de participacion, eNPS.
3. Puede navegar a vistas detalladas por dimension, donde se muestran los promedios por pregunta, distribucion de respuestas, y comentarios cualitativos agrupados.
4. Aplica filtros para segmentar los resultados: por departamento, antiguedad, nivel jerarquico.
5. Cambia a la vista de mapa de calor para identificar visualmente las areas criticas por departamento y dimension.
6. Revisa las tendencias temporales en graficos de linea para ver la evolucion de cada dimension.
7. Compara resultados entre departamentos en graficos de radar superpuestos.
8. Exporta dashboards y graficos individuales como imagenes o PDF para presentaciones ejecutivas.
9. El **Admin** puede compartir vistas especificas del dashboard con Managers a traves de enlaces con permisos.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Acceso completo a todos los dashboards y segmentaciones. Exportacion. Compartir vistas. |
| Manager | Acceso a dashboard de su departamento (filtrado automaticamente). Comparacion con promedios globales. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Resultado Agregado | id, encuesta_id, dimension_id, departamento_id, antiguedad_rango, nivel, promedio, desviacion_estandar, num_respuestas |
| Score General | encuesta_id, departamento_id, score_promedio, enps_score, tasa_participacion |
| Vista Compartida | id, dashboard_tipo, filtros, creada_por, compartida_con, permisos, fecha_expiracion |

---

### 4.5 Comparacion Temporal

**Nombre del feature:** Comparacion Temporal (Trimestre a Trimestre, Ano a Ano)

**Descripcion detallada:**
Permite comparar resultados de encuestas de clima y pulso a lo largo del tiempo para identificar tendencias de mejora o deterioro. Las comparaciones pueden realizarse trimestre a trimestre, semestre a semestre, o ano a ano. El sistema calcula automaticamente las variaciones (deltas) y las clasifica como mejora significativa, mejora leve, estable, deterioro leve o deterioro significativo. Esta funcionalidad es fundamental para medir el impacto de las iniciativas de mejora implementadas.

**Flujo de trabajo:**

1. El **Admin** accede a la seccion de comparacion temporal del dashboard.
2. Selecciona los periodos a comparar (por ejemplo: Q1 2026 vs Q4 2025, o Ano 2025 vs Ano 2024).
3. El sistema muestra una tabla comparativa con los scores por dimension para ambos periodos, las variaciones absolutas y porcentuales, y la clasificacion de tendencia.
4. Las variaciones se destacan visualmente con colores: verde para mejoras, rojo para deterioros, gris para estable.
5. Puede hacer drill-down por dimension para ver el detalle de preguntas que mejoraron o empeoraron.
6. Puede segmentar la comparacion por departamento para identificar donde se estan produciendo los cambios.
7. El sistema genera graficos de evolucion temporal que muestran la trayectoria de cada dimension a lo largo de multiples periodos.
8. El **Admin** puede generar un reporte de comparacion temporal para presentar a la direccion.
9. Los insights de la comparacion alimentan la creacion de planes de accion.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Acceso completo a comparaciones temporales. Seleccion de periodos. Drill-down. Exportacion. |
| Manager | Comparacion temporal de su departamento. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Comparacion Temporal | id, encuesta_actual_id, encuesta_anterior_id, tipo_comparacion (trimestral/semestral/anual) |
| Variacion por Dimension | comparacion_id, dimension_id, departamento_id, score_actual, score_anterior, delta_absoluto, delta_porcentual, clasificacion (mejora_significativa/mejora_leve/estable/deterioro_leve/deterioro_significativo) |

---

### 4.6 Segmentacion por Departamento, Antiguedad y Rol

**Nombre del feature:** Segmentacion de Resultados

**Descripcion detallada:**
Permite analizar los resultados de encuestas desagregados por variables demograficas y organizacionales clave: departamento o area, antiguedad en la empresa (rangos configurables), nivel jerarquico o rol, ubicacion, y otras variables personalizadas. La segmentacion respeta el anonimato al requerir un numero minimo de respuestas por segmento para mostrar resultados (generalmente 5 o mas). Esto permite identificar diferencias significativas entre grupos y focalizar las acciones de mejora.

**Flujo de trabajo:**

1. Al configurar una encuesta, el **Admin** define las variables de segmentacion que se incluiran (sin comprometer el anonimato).
2. Establece el numero minimo de respuestas por segmento para mostrar resultados (por defecto: 5).
3. Una vez cerrada la encuesta, accede a los resultados y selecciona la variable de segmentacion.
4. El sistema muestra los resultados desagregados por el segmento seleccionado (por ejemplo: resultados por departamento).
5. Los segmentos con menos respuestas que el minimo se muestran como "insuficiente" para proteger el anonimato.
6. El **Admin** puede combinar multiples variables de segmentacion (por ejemplo: departamento + antiguedad) siempre que se respete el minimo de respuestas.
7. Puede comparar segmentos entre si para identificar brechas (por ejemplo: diferencia entre empleados con menos de 1 ano vs mas de 5 anos).
8. Los insights de segmentacion se integran con el modulo de planes de accion para crear iniciativas focalizadas.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de variables de segmentacion. Analisis segmentado completo. |
| Manager | Visualizacion de segmentacion dentro de su departamento (si cumple minimos de anonimato). |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Variable de Segmentacion | id, nombre, tipo (departamento/antiguedad/nivel/ubicacion/personalizada), opciones, encuesta_id |
| Resultado Segmentado | id, encuesta_id, dimension_id, variable_id, valor_segmento, promedio, num_respuestas, es_suficiente |
| Configuracion de Anonimato | tenant_id, min_respuestas_por_segmento |

---

### 4.7 Planes de Accion con Seguimiento

**Nombre del feature:** Planes de Accion con Seguimiento

**Descripcion detallada:**
Permite transformar los insights de las encuestas de clima en acciones concretas con responsables, fechas y seguimiento. Los planes de accion se crean a partir de areas de oportunidad identificadas en los resultados y se asignan a responsables (tipicamente Managers o lideres de RRHH). Cada plan contiene acciones especificas, medibles, con fecha de implementacion y metricas de exito. El sistema proporciona seguimiento del avance y permite evaluar el impacto de las acciones en encuestas futuras.

**Flujo de trabajo:**

1. A partir de los resultados de una encuesta, el **Admin** identifica dimensiones o departamentos que requieren atencion.
2. Crea un plan de accion vinculado a la dimension y/o departamento especifico.
3. Define el objetivo del plan (por ejemplo: "Mejorar la percepcion de reconocimiento en el departamento de TI del 3.2 al 4.0 para el proximo semestre").
4. Agrega acciones concretas al plan: titulo, descripcion, responsable, fecha limite, prioridad (alta/media/baja), indicador de exito.
5. Asigna el plan a un **Manager** o grupo de responsables.
6. Los responsables reciben notificacion del plan y sus acciones asignadas.
7. Los responsables actualizan el estado de cada accion (pendiente, en progreso, completada, cancelada) y agregan notas de avance.
8. El **Admin** monitorea el progreso de todos los planes activos desde un dashboard centralizado.
9. El sistema envia recordatorios automaticos de acciones con fecha limite proxima.
10. Al ejecutarse la siguiente encuesta de clima o pulso, el sistema permite comparar los resultados de la dimension/departamento objetivo para evaluar el impacto del plan.
11. El plan se marca como completado cuando todas sus acciones se finalizan y se documentan los resultados.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Creacion de planes de accion. Asignacion de responsables. Monitoreo global. Evaluacion de impacto. |
| Manager | Ejecucion de acciones asignadas. Actualizacion de progreso. Creacion de planes para su departamento (si se habilita). |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Plan de Accion | id, nombre, objetivo, encuesta_origen_id, dimension_id, departamento_id, responsable_id, fecha_inicio, fecha_objetivo, estado (activo/completado/cancelado), tenant_id |
| Accion | id, plan_id, titulo, descripcion, responsable_id, fecha_limite, prioridad (alta/media/baja), estado (pendiente/en_progreso/completada/cancelada), indicador_exito |
| Avance de Accion | id, accion_id, nota, autor_id, fecha, porcentaje_avance |
| Evaluacion de Impacto | plan_id, dimension_id, score_antes, score_despues, delta, encuesta_antes_id, encuesta_despues_id |

---

### 4.8 eNPS (Employee Net Promoter Score)

**Nombre del feature:** eNPS (Employee Net Promoter Score)

**Descripcion detallada:**
El eNPS es una metrica que mide la lealtad y satisfaccion de los empleados basandose en una pregunta central: "En una escala del 0 al 10, que tan probable es que recomiendes esta empresa como un excelente lugar para trabajar?". Los empleados se clasifican en tres categorias segun su respuesta: Promotores (9-10), Pasivos (7-8) y Detractores (0-6). El eNPS se calcula como el porcentaje de promotores menos el porcentaje de detractores, resultando en un score entre -100 y +100. Es una metrica de referencia ampliamente utilizada para evaluar el compromiso organizacional.

**Flujo de trabajo:**

1. El **Admin** incluye la pregunta eNPS en encuestas de clima o pulso.
2. Los **Empleados** responden la pregunta en una escala del 0 al 10.
3. Opcionalmente, se incluye una pregunta abierta: "Cual es la razon principal de tu calificacion?"
4. El sistema clasifica automaticamente cada respuesta en Promotor, Pasivo o Detractor.
5. Calcula el eNPS global y por segmento (departamento, antiguedad, nivel).
6. Presenta el resultado en el dashboard con la distribucion de las tres categorias.
7. Muestra la evolucion del eNPS a lo largo del tiempo en un grafico de tendencia.
8. Compara el eNPS entre departamentos para identificar diferencias.
9. Los comentarios abiertos se categorizan automaticamente para identificar temas recurrentes entre promotores y detractores.
10. El **Admin** usa el eNPS como indicador clave para medir el impacto de iniciativas organizacionales.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de la pregunta eNPS. Dashboard de resultados. Analisis de tendencias y segmentos. |
| Manager | Visualizacion del eNPS de su departamento. |
| Empleado | Responder la pregunta eNPS como parte de las encuestas. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Respuesta eNPS | id, encuesta_id, valor (0-10), categoria (promotor/pasivo/detractor), comentario, datos_demograficos_hash |
| Calculo eNPS | id, encuesta_id, departamento_id, porcentaje_promotores, porcentaje_pasivos, porcentaje_detractores, enps_score, num_respuestas |
| Tendencia eNPS | periodo, departamento_id, enps_score, cambio_vs_anterior |

---

### 4.9 Alertas Tempranas de Riesgo de Rotacion

**Nombre del feature:** Alertas Tempranas de Riesgo de Rotacion

**Descripcion detallada:**
Sistema de deteccion proactiva que identifica senales de riesgo de rotacion de empleados basandose en patrones de respuestas en encuestas de clima y pulso. El sistema analiza multiples indicadores: caida sostenida de scores individuales (en encuestas no anonimas) o departamentales, bajas puntuaciones en dimensiones criticas (compromiso, satisfaccion, liderazgo), comentarios con sentimiento negativo, y baja participacion en encuestas. Las alertas se clasifican por nivel de severidad y se envian a los responsables para tomar acciones preventivas.

**Flujo de trabajo:**

1. El **Admin** configura las reglas de alerta: umbrales por dimension (por ejemplo: compromiso menor a 3.0), caida porcentual entre periodos (por ejemplo: -15%), patrones de baja participacion.
2. Configura los niveles de severidad: bajo (monitoreo), medio (atencion requerida), alto (accion inmediata).
3. El sistema analiza continuamente los resultados de encuestas de pulso y clima.
4. Cuando se detecta un patron que cumple con las reglas configuradas, se genera una alerta.
5. La alerta se asigna al nivel de severidad correspondiente e incluye: departamento o segmento afectado, dimension deteriorada, datos historicos, tendencia, y acciones sugeridas.
6. El **Admin** recibe la alerta por correo y en el dashboard de alertas.
7. Para alertas de nivel alto, tambien se notifica al **Manager** del departamento afectado.
8. El responsable revisa la alerta, investiga las causas y toma acciones (puede crear un plan de accion directamente desde la alerta).
9. La alerta se cierra cuando se implementan acciones o cuando los scores mejoran en periodos posteriores.
10. El sistema mantiene un historial de alertas para analisis retrospectivo.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Configuracion de reglas de alerta. Recepcion y gestion de todas las alertas. Creacion de planes de accion desde alertas. |
| Manager | Recepcion de alertas de nivel alto de su departamento. Implementacion de acciones. |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Regla de Alerta | id, dimension_id, tipo (umbral_absoluto/caida_porcentual/baja_participacion/sentimiento), valor_umbral, severidad, tenant_id |
| Alerta | id, regla_id, departamento_id, dimension_id, severidad (bajo/medio/alto), descripcion, datos_soporte, estado (activa/en_investigacion/resuelta/cerrada), fecha_generacion |
| Accion de Alerta | id, alerta_id, descripcion, responsable_id, estado, fecha, plan_accion_id |

---

### 4.10 Benchmarking Interno entre Departamentos

**Nombre del feature:** Benchmarking Interno entre Departamentos

**Descripcion detallada:**
Permite comparar los resultados de clima laboral entre diferentes departamentos, areas o equipos de la organizacion para identificar mejores practicas internas y areas que necesitan apoyo. El benchmarking muestra rankings de departamentos por dimension, identifica los departamentos con mejores scores (para aprender de sus practicas) y los que tienen scores mas bajos (para priorizar acciones). Las comparaciones se presentan de forma constructiva, enfocandose en el aprendizaje y la mejora, no en la competencia.

**Flujo de trabajo:**

1. Al cerrarse una encuesta, el sistema calcula automaticamente los resultados por departamento y dimension.
2. El **Admin** accede a la vista de benchmarking interno.
3. Selecciona la dimension a comparar o visualiza el score general.
4. El sistema muestra un ranking de departamentos con sus scores, destacando los que estan por encima y por debajo del promedio organizacional.
5. Puede seleccionar departamentos especificos para comparacion directa en un grafico de radar.
6. Identifica las brechas mas significativas entre departamentos.
7. Revisa los departamentos con mejores practicas para documentar y replicar sus iniciativas.
8. Para los departamentos con scores bajos, puede iniciar planes de accion focalizados.
9. La comparacion se enriquece con datos temporales: como ha evolucionado cada departamento respecto a su propio historico.
10. El **Admin** puede generar reportes de benchmarking para presentar al comite directivo con recomendaciones basadas en datos.

**Roles involucrados:**

| Rol | Permisos |
|-----|----------|
| Admin | Acceso completo al benchmarking entre todos los departamentos. Generacion de reportes comparativos. |
| Manager | Visualizacion de la posicion de su departamento respecto al promedio organizacional (sin ver detalle de otros departamentos individuales, a menos que se configure lo contrario). |

**Datos/entidades principales:**

| Entidad | Campos clave |
|---------|-------------|
| Benchmark Departamental | id, encuesta_id, departamento_id, dimension_id, score, ranking, diferencia_vs_promedio, clasificacion (por_encima/en_promedio/por_debajo) |
| Promedio Organizacional | encuesta_id, dimension_id, score_promedio, desviacion_estandar |
| Comparacion de Departamentos | id, departamento_a_id, departamento_b_id, encuesta_id, dimensiones_comparadas, generada_por, fecha |

---

## Apendice: Glosario de Terminos

| Termino | Definicion |
|---------|-----------|
| **Tenant** | Una empresa u organizacion que utiliza la plataforma Kultiva. Cada tenant tiene su propio espacio aislado de datos. |
| **Ciclo de evaluacion** | Periodo definido durante el cual se ejecuta un proceso completo de evaluacion 360. |
| **Pipeline** | Secuencia de etapas por las que pasa un candidato en un proceso de reclutamiento. |
| **Scorecard** | Formulario estructurado para evaluar objetivamente a un candidato despues de una entrevista. |
| **eNPS** | Employee Net Promoter Score. Metrica que mide la probabilidad de que un empleado recomiende la empresa como lugar de trabajo. |
| **Dimension** | Categoria o aspecto del clima laboral que se evalua (por ejemplo: liderazgo, comunicacion, bienestar). |
| **Encuesta de pulso** | Encuesta corta y frecuente que mide el sentimiento de los empleados de manera continua. |
| **Buddy** | Companero experimentado asignado a un nuevo empleado para apoyo informal durante el onboarding. |
| **Competencia** | Comportamiento, habilidad o valor organizacional clave que se evalua en el proceso de evaluacion 360. |
| **Segmentacion** | Desagregacion de resultados por variables demograficas u organizacionales para analisis detallado. |
