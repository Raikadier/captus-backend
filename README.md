# 🎓 Captus - Plataforma de Gestión Académica Inteligente

Una aplicación web moderna para estudiantes de ingeniería que integra gestión de tareas, rachas de productividad, notificaciones inteligentes y asistencia con IA.

**Desarrollado por:** Estudiantes de Ingeniería de Sistemas - 6º semestre  
**Universidad:** Universidad Popular del Cesar  
**Tutor:** Wilman Jose Vega Castilla

---

## 🚀 Inicio Rápido

### **Requisitos Previos**
- **Node.js** (v18+)
- **npm**
- **Git**

### **Instalación y Ejecución**

1.  **Clonar el repositorio**
    ```bash
    git clone <repository-url>
    cd Captus
    ```

2.  **Instalación Automática**
    ```bash
    npm run setup
    ```
    *(Esto instalará dependencias en raíz, backend y frontend, y aplicará parches necesarios)*

3.  **Configuración de Variables de Entorno**
    *   Copia `backend/env.example` a `backend/.env`
    *   Copia `frontend/env.example` a `frontend/.env`
    *   Configura tus credenciales de **Supabase** en ambos archivos.

4.  **Ejecutar la Aplicación**
    ```bash
    npm run dev
    ```
    *   **Frontend:** http://localhost:5173
    *   **Backend:** http://localhost:4000
    *   **Dashboard TUI:** `npm run dev:ui` (Nueva interfaz de terminal)

## 📋 Características

- ✅ **Gestión de Tareas** - Crear, editar y completar tareas
- 🔥 **Sistema de Rachas** - Mantén tu productividad diaria
- 📊 **Dashboard Intuitivo** - Vista general de tu progreso
- 🎨 **Diseño Moderno** - UI limpia y fácil de usar
- 🔐 **Autenticación** - Login y registro seguros con Supabase
- 📱 **Responsive** - Funciona en todos los dispositivos

## 📁 Estructura del Proyecto

```
Captus/
├── backend/                 # API Node.js/Express
│   ├── src/
│   │   ├── routes/          # Endpoints
│   │   ├── services/        # Lógica de negocio
│   │   └── models/          # Modelos de datos
├── frontend/                # App React/Vite
│   ├── src/
│   │   ├── components/      # Componentes UI
│   │   ├── features/        # Módulos (Tasks, Auth, etc.)
│   │   └── shared/          # Utilidades compartidas
├── database/                # Esquemas SQL y Migraciones
├── scripts/                 # Scripts de utilidad (dev-runner, etc.)
└── docs/                    # Documentación adicional
    └── guides/              # Guías específicas
```

## 📚 Documentación y Guías

- **[Guía de Configuración de Gmail](./docs/guides/GMAIL_SETUP.md)**: Para activar notificaciones por correo.
- **[Guía de Cron Jobs](./docs/guides/CRON_GUIDE.md)**: Para tareas programadas.
- **[Arquitectura del Proyecto](./docs/guides/arquitectura.md)**: Visión técnica del sistema.

## 🛠️ Comandos Principales

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Ejecuta backend y frontend concurrentemente |
| `npm run dev:ui` | Ejecuta el Dashboard TUI interactivo |
| `npm run setup` | Instala dependencias y configura el entorno |
| `npm run check:ports` | Verifica puertos disponibles |
| `npm run health` | Verifica estado del backend |
| `npm run lint` | Ejecuta linter en frontend y backend |

## ⚠️ Solución de Problemas

### **Puerto Ocupado**
Si ves errores de `EADDRINUSE`, verifica qué proceso usa el puerto:
```bash
npm run check:ports
# O manualmente:
netstat -ano | findstr :4000
```

### **Error de Supabase**
*   Verifica que `SUPABASE_URL` y `SUPABASE_KEY` sean correctos en `.env`.
*   Asegúrate de que las políticas RLS en Supabase permitan las operaciones.

### **Error de CORS**
*   Verifica que `FRONTEND_URL` en `backend/.env` coincida con la URL donde corre tu frontend (ej. `http://localhost:5173`).

## 👥 Para Estudiantes

Este proyecto está diseñado específicamente para estudiantes de la Universidad Popular del Cesar. El código está bien comentado y la estructura es fácil de entender para principiantes.

## 📄 Licencia

Este proyecto es parte del currículo académico de Ingeniería de Sistemas en la Universidad Popular del Cesar.

---

## 🙏 Agradecimientos

- **Tutor:** Wilman Jose Vega Castilla
- **Estudiantes de 6º semestre** - Equipo de desarrollo
- **Universidad Popular del Cesar** - Infraestructura y soporte

---

**💡 Tip:** Mantén ambos servicios (frontend y backend) ejecutándose durante el desarrollo para una mejor experiencia.
