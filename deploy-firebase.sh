#!/bin/bash

# 🔥 Script de Deploy para Firebase Firestore Rules
# Autor: XXXTREMO Platform
# Fecha: $(date)

echo "🚀 XXXTREMO Firebase Deploy Script"
echo "=================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI no está instalado"
    print_info "Instálalo con: npm install -g firebase-tools"
    exit 1
fi

print_status "Firebase CLI encontrado"

# Verificar si está logueado
if ! firebase projects:list &> /dev/null; then
    print_warning "No estás logueado en Firebase"
    print_info "Ejecutando: firebase login"
    firebase login
fi

# Mostrar proyectos disponibles
print_info "Proyectos disponibles:"
firebase projects:list

# Verificar si existe el proyecto
print_info "Configurando proyecto xxxtremo-dev..."
firebase use xxxtremo-dev

if [ $? -ne 0 ]; then
    print_error "Error al seleccionar el proyecto"
    print_info "Asegúrate de que el proyecto 'xxxtremo-dev' existe"
    exit 1
fi

print_status "Proyecto configurado correctamente"

# Mostrar archivos de reglas disponibles
echo ""
print_info "Archivos de reglas disponibles:"
ls -la firestore*.rules 2>/dev/null || print_warning "No se encontraron archivos .rules"

# Preguntar qué reglas desplegar
echo ""
echo "¿Qué reglas quieres desplegar?"
echo "1) firestore.dev.rules (Desarrollo - Permisivo)"
echo "2) firestore.rules (Producción - Seguro)"
echo "3) Cancelar"
read -p "Selecciona una opción (1-3): " choice

case $choice in
    1)
        RULES_FILE="firestore.dev.rules"
        print_warning "Desplegando reglas de DESARROLLO (permisivas)"
        ;;
    2)
        RULES_FILE="firestore.rules"
        print_status "Desplegando reglas de PRODUCCIÓN (seguras)"
        ;;
    3)
        print_info "Deploy cancelado"
        exit 0
        ;;
    *)
        print_error "Opción inválida"
        exit 1
        ;;
esac

# Verificar que el archivo existe
if [ ! -f "$RULES_FILE" ]; then
    print_error "Archivo $RULES_FILE no encontrado"
    exit 1
fi

# Actualizar firebase.json para usar el archivo correcto
print_info "Actualizando firebase.json..."
cat > firebase.json << EOF
{
  "firestore": {
    "rules": "$RULES_FILE",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF

print_status "firebase.json actualizado"

# Hacer deploy de las reglas
print_info "Desplegando reglas de Firestore..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    print_status "¡Reglas desplegadas exitosamente!"
    print_info "Las reglas de $RULES_FILE están ahora activas en xxxtremo-dev"
else
    print_error "Error al desplegar las reglas"
    exit 1
fi

# Preguntar si también quiere desplegar índices
echo ""
read -p "¿También quieres desplegar los índices de Firestore? (y/n): " deploy_indexes

if [[ $deploy_indexes == "y" || $deploy_indexes == "Y" ]]; then
    print_info "Desplegando índices de Firestore..."
    firebase deploy --only firestore:indexes
    
    if [ $? -eq 0 ]; then
        print_status "¡Índices desplegados exitosamente!"
    else
        print_error "Error al desplegar los índices"
    fi
fi

echo ""
print_status "Deploy completado"
print_info "Puedes verificar los cambios en:"
print_info "https://console.firebase.google.com/project/xxxtremo-dev/firestore/rules"
print_info "https://console.firebase.google.com/project/xxxtremo-dev/firestore/indexes"

echo ""
print_info "Para revertir a las consultas optimizadas después de desplegar índices,"
print_info "ejecuta: npm run restore-queries"
