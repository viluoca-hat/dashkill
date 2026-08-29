# CyberForensic Lab

## Propósito
Este proyecto es un laboratorio educativo de ciberseguridad que demuestra técnicas de OSINT y recolección de datos de forma ética y con consentimiento explícito del usuario. Los datos recopilados se almacenan en **Firebase Realtime Database** para permitir un **dashboard en tiempo real** que muestra los últimos visitantes.

## Características principales
- Banner de consentimiento con almacenamiento de la decisión en `localStorage`.
- Recolección de información del dispositivo, IP pública, geolocalización (con permiso), fingerprint de canvas, información de WebGL y plugins.
- Envío seguro a Firebase y fallback a `localStorage`.
- Dashboard accesible mediante doble clic en el título o botón "Ver Dashboard".
- Diseño oscuro/tech responsivo y móvil.
- Documentación completa y política de privacidad.

## Estructura del proyecto
```
cyberforensic-lab/
├── public/
│   ├── index.html          # Página principal
│   ├── dashboard.html       # Dashboard en tiempo real
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── config.js
│   │   ├── collector.js
│   │   ├── firebase.js
│   │   └── dashboard.js
│   └── assets/images/       # Imágenes del proyecto
├── docs/
│   ├── README.md
│   ├── CONFIGURATION.md
│   └── PRIVACY.md
├── .env.example
├── .gitignore
├── firebase.json           # Configuración de Hosting (opcional)
└── firebase-rules.json    # Reglas de seguridad de Realtime Database
```

## Instalación y pruebas locales
1. **Instalar dependencias** (solo si utilizas el servidor opcional):
   ```bash
   npm init -y
   npm install firebase express
   ```
2. **Ejecutar con un servidor estático** (recomendado):
   ```bash
   npx serve public
   ```
   > El servidor se iniciará en `http://localhost:3000`.
3. **Abrir la página** en el navegador y aceptar el banner de consentimiento.
4. **Ver el dashboard** haciendo doble‑clic en el título "CyberForensic Lab" o pulsando el botón "Ver Dashboard".
5. **Comprobar datos** en la consola del navegador o en Firebase Realtime Database.

## Contribuciones
Las contribuciones son bienvenidas. Por favor, sigue la guía de estilo del proyecto y respeta la política de privacidad.
