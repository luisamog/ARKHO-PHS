# ARKHO - Project Health Status (PHS)

## Descripción General
**ARKHO-PHS** es una aplicación web diseñada para el seguimiento y monitoreo del estado de salud de proyectos. Permite a los Delivery Managers y Líderes de Proyecto registrar evaluaciones semanales basadas en múltiples dimensiones críticas, visualizar tendencias de salud y gestionar un portafolio de proyectos activos e históricos.

La aplicación utiliza un sistema de "Semáforo" (Traffic Light) para indicar visualmente el riesgo y la salud de cada proyecto basándose en métricas cuantitativas y cualitativas.

---

## Tecnologías y Lenguajes
La aplicación está construida siguiendo una arquitectura de **Single Page Application (SPA)** ligera, sin dependencias de servidor pesadas, priorizando la velocidad y la facilidad de despliegue.

- **Lenguaje Principal:** JavaScript (ES6+)
- **Estructura:** HTML5 Semántico
- **Estilos:** CSS3 (Vanilla) con variables para el sistema de diseño.
- **Entorno:** Web Browser (Client-side)

---

## Librerías y Frameworks
Se han seleccionado librerías ligeras y específicas para mantener el rendimiento:

1.  **[Chart.js](https://www.chartjs.org/):** Utilizada para la generación de gráficos de tendencias en el dashboard y en la vista de detalles del proyecto.
2.  **[Google Fonts (Inter)](https://fonts.google.com/specimen/Inter):** Sistema tipográfico para una interfaz moderna y legible.
3.  **[Font Awesome / Emojis]:** Para iconografía visual rápida.

---

## Arquitectura de Datos
La aplicación utiliza un modelo de persistencia local para garantizar la disponibilidad inmediata sin necesidad de una base de datos relacional externa en esta fase.

- **Base de Datos:** `localStorage` del navegador.
- **Formato de Datos:** JSON.
- **Estructura Principal:**
    - `projects`: Array de objetos que contienen metadatos del proyecto (nombre, cliente, roles, estado).
    - `ratings`: Array anidado dentro de cada proyecto que almacena las evaluaciones semanales, puntuaciones por dimensión y justificaciones.

---

## Motor de Reglas (Traffic Light Logic)
El núcleo de la aplicación es su motor de reglas de salud, que calcula el estado basado en los siguientes rangos:

| Puntaje | Estado | Color | Significado |
| :--- | :--- | :--- | :--- |
| **4.5 - 5.0** | Saludable | Verde | Proyecto en excelente estado. |
| **3.0 - 4.4** | Estable | Amarillo | Requiere atención o monitoreo. |
| **1.0 - 2.9** | Crítico | Rojo | Riesgo alto, requiere intervención inmediata. |

### Dimensiones Evaluadas:
- **EN (Entrega):** Cronograma, velocidad, calidad.
- **EQ (Equipo):** Motivación, carga de trabajo, seguridad psicológica.
- **SH (Stakeholders):** Satisfacción, alineamiento, confianza.
- **VA (Valor):** Métricas de éxito, adopción, caso de negocio.
- **RI (Riesgos):** Técnicos, dependencias, deuda técnica.

---

## Guía para Desarrolladores

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Edge, Safari).
- Servidor web local (opcional, p.ej. `python3 -m http.server`).

### Estructura de Archivos
```text
/health-tracker
├── index.html          # Dashboard principal y filtros
├── create.html         # Formulario de registro y edición
├── details.html        # Vista detallada y gráfico de evolución
├── css/
│   └── styles.css      # Sistema de diseño y componentes
└── js/
    └── app.js          # Lógica de negocio, cálculos y persistencia
```

### Flujo de Trabajo
1.  **Registro:** Los proyectos se crean con roles definidos (DM, TL, PL).
2.  **Evaluación:** Semanalmente se ingresan notas del 1 al 5 por cada subdimensión.
3.  **Justificación:** Se requiere/permite un texto de hasta 1500 caracteres para explicar desviaciones.
4.  **Visualización:** El dashboard agrega los datos y muestra el estado consolidado.
5.  **Cierre:** Los proyectos finalizados se mueven al "Histórico" para mantener limpio el portafolio activo.

---

## Instalación y Despliegue
Para ejecutar el proyecto localmente:
1. Clonar el repositorio: `git clone https://github.com/luisamog/ARKHO-PHS.git`
2. Abrir `index.html` en el navegador o usar un servidor local:
   ```bash
   python3 -m http.server 8080
   ```
3. Acceder a `http://localhost:8080`

---
*Desarrollado para el seguimiento estratégico de proyectos ARKHO.*
