# 🔥 Solución Completa: Error de Permisos Firebase

## 📋 Problema
`Error creating palenque: FirebaseError: Missing or insufficient permissions`

## 🛠️ Soluciones Implementadas

### 1. ✅ Reglas de Firestore Actualizadas
- **Archivo creado**: `firestore.dev.rules` (reglas permisivas para desarrollo)
- **Archivo creado**: `firestore.rules` (reglas seguras para producción)
- **Archivo creado**: `FIRESTORE_RULES_SETUP.md` (instrucciones detalladas)

### 2. ✅ Usuario Admin por Defecto
- **Modificado**: `src/contexts/AuthContext.tsx`
- **Cambio**: Nuevos usuarios se crean con rol `admin` (temporal para desarrollo)

### 3. ✅ Utilidades de Debug
- **Creado**: `src/utils/debugAuth.ts`
- **Funciones**: `debugAuth()` y `testFirestorePermissions()`
- **Disponible en consola**: `window.debugAuth()` y `window.testFirestorePermissions()`

## 🚀 Pasos para Resolver

### Paso 1: Actualizar Reglas de Firestore
1. Ve a: https://console.firebase.google.com/project/xxxtremo-dev/firestore/rules
2. Reemplaza las reglas actuales con:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
3. Haz clic en **"Publish"**

### Paso 2: Verificar Autenticación
1. Ve a http://localhost:5174/login
2. Si no tienes cuenta, registra una nueva
3. El nuevo usuario tendrá rol `admin` automáticamente

### Paso 3: Probar Funcionalidad
1. Ve a http://localhost:5174/admin/palenques
2. Intenta crear un nuevo palenque
3. Debería funcionar sin errores

## 🐛 Debug Tools

### En la Consola del Navegador:
```javascript
// Verificar estado de autenticación
debugAuth()

// Probar permisos de Firestore
testFirestorePermissions()
```

## ⚡ Resultado Esperado

Después de aplicar las reglas:
- ✅ **Crear palenques** funcionará
- ✅ **Editar eventos** funcionará  
- ✅ **Agregar peleas** funcionará
- ✅ **Todas las operaciones CRUD** funcionarán

## 🔄 Revertir para Producción

Cuando vayas a producción:
1. Usa las reglas de `firestore.rules` (más seguras)
2. Cambia `UserRole.ADMIN` a `UserRole.VIEWER` en AuthContext
3. Implementa sistema de asignación de roles manual

## 📞 Support

Si el problema persiste:
1. Verifica que las reglas se publicaron correctamente
2. Refresca la página después de cambiar reglas
3. Verifica en la consola del navegador si hay errores adicionales
4. Usa las funciones de debug para más información

---
**⏱️ Tiempo estimado de solución**: 2-3 minutos
**🎯 Estado**: Listo para probar
