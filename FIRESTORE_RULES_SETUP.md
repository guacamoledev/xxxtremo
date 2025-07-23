# 🔒 Configuración de Reglas de Firestore

## ⚠️ Problema: Missing or insufficient permissions

El error indica que las reglas de Firestore no permiten las operaciones de escritura. Necesitas actualizar las reglas en Firebase Console.

## 🚀 Solución Rápida (Desarrollo)

### 1. Ve a Firebase Console
https://console.firebase.google.com/project/xxxtremo-dev/firestore/rules

### 2. Reemplaza las reglas actuales con estas (SOLO PARA DESARROLLO):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DESARROLLO - Reglas permisivas para testing
    // ⚠️ NO USAR EN PRODUCCIÓN ⚠️
    
    match /{document=**} {
      // Permitir todas las operaciones para usuarios autenticados
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Haz clic en "Publish" para aplicar las reglas

## 🛡️ Para Producción (Usar después del desarrollo)

Usa las reglas del archivo `firestore.rules` que incluyen:

- ✅ **Autenticación requerida** para todas las operaciones
- ✅ **Control por roles** (admin, finance, streaming, viewer)
- ✅ **Permisos granulares** por colección
- ✅ **Propietarios** pueden ver sus propios datos
- ✅ **Admins** tienen acceso total
- ✅ **Finance** maneja depósitos/retiros
- ✅ **Streaming** maneja eventos/peleas

## 🔧 Configuración con Firebase CLI (Opcional)

Si tienes Firebase CLI instalado:

```bash
# Para desarrollo
firebase deploy --only firestore:rules --project xxxtremo-dev

# Con archivo específico
firebase deploy --only firestore:rules --project xxxtremo-dev --config firestore.dev.rules
```

## 📋 Verificación

Después de aplicar las reglas:

1. ✅ Ve a http://localhost:5174/login
2. ✅ Inicia sesión con tu cuenta
3. ✅ Ve a http://localhost:5174/admin/palenques
4. ✅ Intenta crear un nuevo palenque

## 🐛 Troubleshooting

### Si el error persiste:

1. **Verifica autenticación**: Asegúrate de estar logueado
2. **Revisa la consola**: Busca errores de autenticación
3. **Refresca la página**: Después de cambiar las reglas
4. **Verifica rol de usuario**: El usuario debe tener rol 'admin'

### Para verificar el token de autenticación:

```javascript
// En la consola del navegador
firebase.auth().currentUser.getIdTokenResult()
  .then(token => console.log(token.claims))
```

## 🎯 Estado Actual Esperado

Después de aplicar las reglas de desarrollo:
- ✅ **Crear palenques** debería funcionar
- ✅ **Editar eventos** debería funcionar  
- ✅ **Agregar peleas** debería funcionar
- ✅ **Todas las operaciones CRUD** deberían funcionar

---

**⏱️ Tiempo estimado**: 2-3 minutos para aplicar las reglas
**🔄 Efecto**: Inmediato después de publicar las reglas
