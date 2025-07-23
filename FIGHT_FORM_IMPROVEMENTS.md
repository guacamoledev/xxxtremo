# 🥊 Formulario de Peleas - Simplificación y Mejoras

## 📋 Cambios Implementados

### ✅ 1. Número de Pelea Consecutivo Automático
**Antes**: `fightNumber: 1` (valor fijo)
**Después**: Cálculo automático basado en el evento seleccionado

```typescript
const getNextFightNumber = (eventId: string): number => {
  const eventFights = fights.filter(f => f.eventId === eventId);
  const maxFightNumber = eventFights.reduce((max, fight) => 
    Math.max(max, fight.fightNumber || 0), 0
  );
  return maxFightNumber + 1;
};
```

### ✅ 2. Campos Removidos del Formulario

#### **Campos Eliminados**:
- ❌ **Raza** (`breed`) - Ya no se captura
- ❌ **Propietario** (`owner`) - Ya no se captura  
- ❌ **Fecha/Hora Manual** (`scheduledTime`) - Se usa la fecha del evento

#### **Campos Mantenidos**:
- ✅ **Nombre del Gallo** (obligatorio)
- ✅ **Peso** (en kilogramos)
- ✅ **Estado de la Pelea**
- ✅ **Apuesta Mínima**

### ✅ 3. Fecha Automática del Evento
**Antes**: Usuario ingresaba fecha manual
**Después**: Se usa automáticamente la fecha del evento seleccionado

```typescript
// La fecha se toma del evento seleccionado
scheduledTime: selectedEvent.startTime,
```

## 🎯 Estructura del Formulario Simplificado

### **Información Principal**:
```typescript
interface FightFormData {
  eventId: string;           // Evento donde ocurre la pelea
  cock1: {
    name: string;           // Nombre del primer gallo
    weight: number;         // Peso en kg
  };
  cock2: {
    name: string;           // Nombre del segundo gallo  
    weight: number;         // Peso en kg
  };
  status: FightStatus;      // Estado de la pelea
  minBet: number;          // Apuesta mínima
}
```

### **Campos Generados Automáticamente**:
- 🔢 **Número de Pelea**: Consecutivo por evento (1, 2, 3...)
- 📅 **Fecha**: La misma del evento seleccionado
- 🏷️ **Raza/Propietario**: Valores vacíos por defecto

## 🎨 Mejoras en la UI

### **Formulario**:
- 📋 **Layout más limpio** con solo campos esenciales
- ℹ️ **Alert informativo** explicando la asignación automática
- 🚨 **Validación simplificada** (solo nombre de gallos y evento)

### **Vista de Lista**:
- 🔢 **Número de pelea destacado** como título principal
- 🏷️ **Información simplificada** (solo peso, sin raza/propietario)
- 📅 **Fecha del evento** como referencia temporal

## 📱 Experiencia de Usuario

### **Antes** (Formulario Complejo):
1. Seleccionar evento
2. Ingresar nombre gallo 1
3. Ingresar raza gallo 1
4. Ingresar peso gallo 1  
5. Ingresar propietario gallo 1
6. Repetir para gallo 2
7. Seleccionar fecha/hora manual
8. Configurar estado y apuesta

### **Después** (Formulario Simplificado):
1. Seleccionar evento ✅
2. Ingresar nombre gallo 1 ✅
3. Ingresar peso gallo 1 ✅
4. Ingresar nombre gallo 2 ✅
5. Ingresar peso gallo 2 ✅
6. Configurar estado y apuesta ✅
7. **¡Crear pelea!** 🎉

## 🔄 Lógica de Negocio

### **Numeración Consecutiva**:
- Pelea 1, 2, 3... por cada evento
- Se calcula automáticamente al crear
- Se mantiene consistente por evento

### **Gestión de Fechas**:
- Una sola fecha de referencia: la del evento
- Simplifica la programación
- Evita inconsistencias temporales

### **Datos Defaults**:
```typescript
// Campos que se llenan automáticamente
cock1: {
  name: formData.cock1.name,
  breed: '',        // Vacío por defecto
  weight: formData.cock1.weight,
  owner: '',        // Vacío por defecto
},
```

## 🎯 Casos de Uso

### **Crear Nueva Pelea**:
1. Seleccionar evento existente
2. Ver alert: "La pelea será programada automáticamente..."
3. Completar datos básicos de gallos
4. Sistema asigna número consecutivo
5. Usa fecha del evento automáticamente

### **Editar Pelea Existente**:
- Mantiene número de pelea original
- Permite cambiar gallos y configuración
- Conserva fecha del evento

### **Visualización**:
- **Título**: "Pelea #3" (número prominente)
- **Subtítulo**: "Gallo A vs Gallo B"  
- **Info**: Solo peso y fecha del evento

## 🚀 Beneficios

### **Para Administradores**:
- ⏱️ **Proceso más rápido** de creación
- 🎯 **Menos errores** por campos requeridos
- 📊 **Organización automática** por números

### **Para el Sistema**:
- 🔢 **Numeración consistente** 
- 📅 **Fechas coherentes** con eventos
- 🗄️ **Datos más limpios** sin campos opcionales

### **Para Usuarios Finales**:
- 🎯 **Información esencial** más clara
- 🔢 **Identificación fácil** por número de pelea
- 📱 **UI más limpia** y enfocada

---

**🎉 Estado**: ✅ **COMPLETADO** - Formulario de peleas simplificado y optimizado

**🔗 Cambios Principales**:
- ✅ Número de pelea consecutivo automático
- ✅ Fecha heredada del evento
- ✅ Campos de raza y propietario removidos
- ✅ UI simplificada y más intuitiva
