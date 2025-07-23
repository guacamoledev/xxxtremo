# Firebase Firestore Indexes Setup

Este documento explica cómo configurar los índices compuestos necesarios para las consultas de XXXTREMO.

## ⚠️ Problema Solucionado Temporalmente

Las consultas que combinan `where()` y `orderBy()` en diferentes campos requieren índices compuestos en Firestore. Hemos modificado las consultas para funcionar sin índices, pero para mejor rendimiento en producción deberías crear los índices.

## 🔧 Solución Temporal Implementada

### Antes (Requería Índices):
```javascript
// Palenques activos ordenados por fecha
query(
  collection(db, 'palenques'), 
  where('active', '==', true),
  orderBy('creationDate', 'desc')
)

// Eventos por palenque ordenados por fecha  
query(
  collection(db, 'events'),
  where('palenqueId', '==', palenqueId),
  orderBy('date', 'desc')
)

// Eventos próximos
query(
  collection(db, 'events'),
  where('date', '>=', now),
  where('status', '==', 'scheduled'),
  orderBy('date', 'asc')
)
```

### Después (Sin Índices Requeridos):
```javascript
// Consulta simple + ordenamiento manual en JavaScript
query(collection(db, 'palenques'), where('active', '==', true))
// Luego: palenques.sort((a, b) => b.creationDate.toMillis() - a.creationDate.toMillis())
```

## 🚀 Configuración de Índices para Producción

### 1. Accede a Firebase Console
https://console.firebase.google.com/project/xxxtremo-dev/firestore/indexes

### 2. Crea los siguientes índices compuestos:

#### Índice para Palenques:
- **Colección**: `palenques`
- **Campos**:
  - `active` (Ascending)
  - `creationDate` (Descending)

#### Índice para Eventos por Palenque:
- **Colección**: `events`  
- **Campos**:
  - `palenqueId` (Ascending)
  - `date` (Descending)

#### Índice para Eventos Próximos:
- **Colección**: `events`
- **Campos**:
  - `date` (Ascending)
  - `status` (Ascending)
  - `date` (Ascending) // Para orderBy

#### Índice para Peleas por Evento:
- **Colección**: `fights`
- **Campos**:
  - `eventId` (Ascending)
  - `fightNumber` (Ascending)

### 3. Después de crear los índices, puedes revertir a las consultas optimizadas:

```javascript
// Restaurar en src/services/firestore.ts después de crear índices
const q = query(
  collection(db, 'palenques'), 
  where('active', '==', true),
  orderBy('creationDate', 'desc')
);
```

## 📊 Ventajas de los Índices:

- **Rendimiento**: Consultas más rápidas
- **Escalabilidad**: Mejor rendimiento con grandes volúmenes de datos  
- **Costos**: Menos reads de Firestore
- **UX**: Mejor experiencia de usuario

## 🔄 Estado Actual:

✅ **Funcionando**: Las consultas funcionan sin índices  
⚡ **Rendimiento**: Aceptable para desarrollo y pequeña escala  
🎯 **Recomendación**: Crear índices antes de producción  

## 🛠️ Comando para Verificar:

```bash
# Si tienes Firebase CLI instalado:
firebase firestore:indexes

# Para deploy de índices desde archivo:
firebase deploy --only firestore:indexes
```

---

**Nota**: El error que viste inicialmente se resolvió modificando las consultas. La aplicación ahora funciona correctamente sin requerir índices inmediatamente.
