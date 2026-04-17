# 🚀 Captus - Guía de Instalación y Ejecución

## 📋 Requisitos Previos

### **Software Necesario:**
- **Node.js** (versión 18 o superior)
- **npm** (viene con Node.js)
- **Git** (para clonar el repositorio)

### **Verificar Instalación:**
```bash
node --version
npm --version
git --version
```

---

## 🛠️ Instalación

### **1. Clonar el Repositorio**
```bash
git clone <repository-url>
cd Captus
```

### **2. Instalación Automática (Recomendado)**
```bash
npm run setup
```

### **3. Instalación Manual**
```bash
# Instalar dependencias de la raíz
npm install

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

---

## ⚙️ Configuración

### **1. Variables de Entorno**

#### **Backend (`backend/.env`):**
```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
PORT=4000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

#### **Frontend (`frontend/.env`):**
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_API_URL=http://localhost:4000
NODE_ENV=development
```

### **2. Obtener Credenciales de Supabase**
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a Settings > API
4. Copia la URL y las keys necesarias

---

## 🚀 Ejecución

### **Opción 1: Ejecutar Ambos Servicios (Recomendado)**
```bash
# Desde la raíz del proyecto
npm run dev
```

### **Opción 2: Ejecutar Servicios por Separado**
```bash
# Terminal 1 - Backend
npm run backend:dev

# Terminal 2 - Frontend
npm run frontend:dev
```

### **Opción 3: Script Personalizado**
```bash
node scripts/start-dev.js
```

---

## 🔍 Verificación

### **Verificar Puertos**
```bash
npm run check:ports
```

### **Verificar Salud del Backend**
```bash
npm run health
```

### **URLs de Acceso**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000/api
- **Documentación API:** http://localhost:4000/api-docs
- **Health Check:** http://localhost:4000/api/health

---

## 🛠️ Comandos Disponibles

### **Desde la Raíz:**
```bash
npm run dev              # Ejecutar ambos servicios
npm run start            # Ejecutar en modo producción
npm run install:all      # Instalar todas las dependencias
npm run setup            # Configuración completa
npm run check:ports      # Verificar puertos
npm run health           # Verificar salud del backend
```

### **Frontend:**
```bash
npm run frontend:dev     # Servidor de desarrollo
npm run frontend:build   # Build para producción
npm run frontend:preview # Preview del build
npm run frontend:lint    # Verificar código
```

### **Backend:**
```bash
npm run backend:dev      # Servidor de desarrollo
npm run backend:start    # Servidor de producción
npm run backend:test     # Ejecutar tests
```

---

## ⚠️ Solución de Problemas

### **Puerto Ocupado**
```bash
# Verificar qué proceso usa el puerto
netstat -ano | findstr :4000
netstat -ano | findstr :5173

# Cambiar puerto del backend
PORT=4001 npm run backend:dev
```

### **Error de Dependencias**
```bash
# Limpiar cache y reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **Error de Supabase**
- Verificar que las variables de entorno estén configuradas
- Verificar que las credenciales sean correctas
- Verificar que el proyecto de Supabase esté activo

### **Error de CORS**
- Verificar que `FRONTEND_URL` en el backend coincida con la URL del frontend
- Verificar que el proxy en `vite.config.js` esté configurado correctamente

---

## 📁 Estructura del Proyecto

```
Captus/
├── backend/                 # Servidor Node.js/Express
│   ├── src/
│   │   ├── routes/         # Rutas de la API
│   │   ├── services/       # Lógica de negocio
│   │   └── models/         # Modelos de datos
│   ├── server.js           # Punto de entrada del servidor
│   └── package.json
├── frontend/               # Aplicación React/Vite
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── features/      # Funcionalidades por módulo
│   │   ├── shared/        # Componentes compartidos
│   │   └── ui/            # Componentes UI
│   ├── vite.config.js     # Configuración de Vite
│   └── package.json
├── scripts/                # Scripts de utilidad
├── docs/                   # Documentación
└── package.json           # Configuración del monorepo
```

---

## 🎯 Orden de Ejecución Recomendado

1. **Backend primero** - El frontend necesita la API disponible
2. **Frontend segundo** - Se conecta al backend via proxy
3. **Verificar conexión** - Usar los comandos de health check

---

## 💡 Consejos para Estudiantes

- **Siempre ejecuta `npm run setup` la primera vez**
- **Verifica los puertos antes de ejecutar**
- **Mantén ambos servicios ejecutándose durante el desarrollo**
- **Usa `npm run check:ports` si tienes problemas de conexión**
- **Revisa la consola del navegador para errores de CORS**

---

## 🆘 Soporte

Si tienes problemas:
1. Verifica que Node.js esté instalado correctamente
2. Ejecuta `npm run check:ports`
3. Verifica las variables de entorno
4. Revisa los logs en la consola
5. Consulta la documentación de Supabase
