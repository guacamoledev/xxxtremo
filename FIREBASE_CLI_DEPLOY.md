# 🚀 Deploy de Reglas Firebase desde Consola

## 📋 Opciones Disponibles

### 🎯 Opción 1: Script Automatizado (Recomendado)
```bash
# Ejecutar el script interactivo
./deploy-firebase.sh

# O usando npm
npm run firebase:deploy
```

### 🛠️ Opción 2: Comandos NPM Directos
```bash
# Login en Firebase (solo la primera vez)
npm run firebase:login

# Ver proyectos disponibles
npm run firebase:status

# Deploy reglas de desarrollo (permisivas)
npm run firebase:rules:dev

# Deploy reglas de producción (seguras)
npm run firebase:rules:prod

# Deploy índices
npm run firebase:indexes
```

### ⚡ Opción 3: Firebase CLI Directo
```bash
# Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# Login
firebase login

# Seleccionar proyecto
firebase use xxxtremo-dev

# Deploy solo reglas
firebase deploy --only firestore:rules

# Deploy solo índices
firebase deploy --only firestore:indexes

# Deploy reglas e índices
firebase deploy --only firestore
```

## 🎮 Pasos Rápidos

### 1. Preparación (Solo Primera Vez)
```bash
cd /Users/leox01/Desktop/XXXTREMO

# Si no tienes Firebase CLI
npm install -g firebase-tools

# Login en Firebase
firebase login
```

### 2. Deploy Reglas de Desarrollo
```bash
# Opción A: Script automático
./deploy-firebase.sh

# Opción B: Directo
firebase use xxxtremo-dev
firebase deploy --only firestore:rules
```

### 3. Verificación
- Ve a: https://console.firebase.google.com/project/xxxtremo-dev/firestore/rules
- Las reglas deberían estar actualizadas

## 📁 Archivos de Configuración

### `firebase.json`
```json
{
  "firestore": {
    "rules": "firestore.dev.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### Reglas Disponibles:
- **`firestore.dev.rules`**: Permisivas para desarrollo
- **`firestore.rules`**: Seguras para producción

### Índices:
- **`firestore.indexes.json`**: Índices compuestos para mejor rendimiento

## ⚙️ Configuración Avanzada

### Cambiar Entre Reglas Dev/Prod:
```bash
# Para desarrollo
sed -i '' 's/"rules": ".*"/"rules": "firestore.dev.rules"/' firebase.json
firebase deploy --only firestore:rules

# Para producción
sed -i '' 's/"rules": ".*"/"rules": "firestore.rules"/' firebase.json
firebase deploy --only firestore:rules
```

### Deploy Todo de Una Vez:
```bash
# Deploy reglas, índices y hosting
firebase deploy

# Solo Firestore (reglas + índices)
firebase deploy --only firestore
```

## 🐛 Troubleshooting

### Error: "No project selected"
```bash
firebase use xxxtremo-dev
```

### Error: "Permission denied"
```bash
firebase login
# Selecciona la cuenta correcta
```

### Error: "Rules file not found"
```bash
# Verifica que el archivo existe
ls -la firestore*.rules

# Actualiza firebase.json con la ruta correcta
```

### Verificar Estado:
```bash
# Ver proyecto actual
firebase use

# Ver reglas actuales
firebase firestore:rules:get

# Ver índices
firebase firestore:indexes
```

## 🎯 Estado Actual

Después del deploy:
- ✅ **Reglas aplicadas**: Usuarios autenticados pueden leer/escribir
- ✅ **Proyecto configurado**: xxxtremo-dev
- ✅ **Scripts listos**: npm run firebase:*
- ✅ **Archivos creados**: firebase.json, reglas, índices

## ⏱️ Tiempo Estimado

- **Primera vez**: 5-10 minutos (incluye instalación y login)
- **Deploys posteriores**: 30 segundos - 2 minutos
- **Efecto**: Inmediato después del deploy

---

**💡 Recomendación**: Usa el script `./deploy-firebase.sh` para una experiencia interactiva y guiada.
