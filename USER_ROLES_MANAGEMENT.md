# 👥 Gestión de Usuarios y Roles

## 🔧 Configuración Actual

### Registro de Usuarios
- **Rol por defecto**: `VIEWER` 
- **Acceso inicial**: Dashboard, apuestas, finanzas personales
- **Sin acceso**: Paneles de administración

### Roles Disponibles
- `VIEWER`: Usuario normal (apostador)
- `ADMIN`: Acceso completo al sistema
- `FINANCE`: Gestión de depósitos y retiros
- `STREAMING`: Gestión de eventos y transmisiones

## 🚀 Cómo Crear un Usuario Admin

### Opción 1: Promoción Manual (Recomendado)

1. **Registra un usuario normal** en la aplicación
2. **Ve a Firebase Console** → Authentication
3. **Copia el UID** del usuario
4. **Abre la consola del navegador** en la app
5. **Ejecuta el comando**:
   ```javascript
   promoteUserByUID("PASTE_UID_HERE", "admin")
   ```

### Opción 2: Desde Firebase Console

1. Ve a **Firestore Database** → `users` collection
2. Busca el documento del usuario por su UID
3. Edita el campo `role` y cambialo a `"admin"`
4. El usuario debe **recargar la página** para ver los cambios

## 🛠️ Comandos de Consola Disponibles

```javascript
// Promover usuario a admin
promoteUserByUID("uid_del_usuario", "admin")

// Promover usuario a finance
promoteUserByUID("uid_del_usuario", "finance") 

// Promover usuario a streaming
promoteUserByUID("uid_del_usuario", "streaming")

// Ver roles disponibles
console.log(UserRole)
```

## 📝 Ejemplo Paso a Paso

1. **Regístrate** en: http://localhost:5174/register
   - Email: admin@xxxtremo.com
   - Password: admin123
   - Nombre: Administrador

2. **Ve a Firebase Console** → Authentication
   - Busca: admin@xxxtremo.com
   - Copia el UID (ej: `abc123def456...`)

3. **Abre consola del navegador** (F12)
   ```javascript
   promoteUserByUID("abc123def456...", "admin")
   ```

4. **Recarga la página** y verás el menú admin

## 🔒 Seguridad en Producción

- ❌ **NO usar** estas funciones en producción
- ✅ **Implementar** sistema de invitación por email
- ✅ **Crear** interfaz admin para gestión de roles
- ✅ **Usar** Firebase Admin SDK en el backend

## 🐛 Troubleshooting

### Error: "Usuario no encontrado"
- Verifica que el UID sea correcto
- Asegúrate de que el usuario esté registrado

### Error: "Permission denied"
- Revisa las reglas de Firestore
- Verifica que estés logueado

### Los cambios no se reflejan
- Recarga la página completamente
- Cierra sesión y vuelve a iniciar

---

**🎯 Estado**: Configurado para desarrollo
**⚠️ Importante**: Cambiar a sistema seguro antes de producción
