# Test de Flujo de Retiros - Manual de Pruebas

## Cambios Implementados

Se ha corregido el flujo de retiros para asegurar el manejo correcto del saldo del usuario:

### 1. **Creación de Retiro** (`useCreateWithdrawal`)
- ✅ **ANTES**: No se descontaba el saldo del usuario
- ✅ **AHORA**: Se descuenta inmediatamente el monto del saldo del usuario

### 2. **Aprobación de Retiro** (`useApproveWithdrawal`)
- ✅ **ANTES**: No hacía cambios al saldo (correcto)
- ✅ **AHORA**: Sigue sin hacer cambios al saldo (el dinero ya fue descontado)

### 3. **Rechazo de Retiro** (`useRejectWithdrawal`)
- ✅ **ANTES**: Ya devolvía el saldo al usuario (correcto)
- ✅ **AHORA**: Sigue devolviendo el saldo + invalidación mejorada de queries

## Flujo Correcto de Retiros

### Paso 1: Usuario Solicita Retiro
```
Saldo Inicial: $1000
Retiro Solicitado: $200
Resultado: Saldo = $800, Status = 'pending'
```

### Paso 2A: Admin Aprueba el Retiro
```
Saldo Permanece: $800
Status: 'approved'
Dinero se transfiere al usuario externamente
```

### Paso 2B: Admin Rechaza el Retiro
```
Saldo Restaurado: $1000 (se devuelve el monto)
Status: 'rejected'
```

## Pruebas Manuales Recomendadas

1. **Crear un retiro:**
   - Verificar que el saldo se descuenta inmediatamente
   - Verificar que el retiro aparece como 'pending'

2. **Aprobar un retiro:**
   - Verificar que el saldo no cambia
   - Verificar que el status cambia a 'approved'

3. **Rechazar un retiro:**
   - Verificar que el saldo se restaura
   - Verificar que el status cambia a 'rejected'

## Archivos Modificados

- `src/hooks/useUserFinances.ts`: Agregado descuento de saldo al crear retiro
- `src/hooks/useFinanceAdmin.ts`: Mejoradas invalidaciones de queries
- `src/pages/FinancesPage.tsx`: Mejorada UI de elegibilidad
- `src/pages/admin/FinanceAdminPage.tsx`: Corregido error de hooks + cálculo dinámico

## Logs para Depuración

En la consola del navegador se pueden ver:
- `✅ Retiro creado con ID: [id]`
- `💰 Saldo descontado: [monto] Nuevo saldo: [nuevo_saldo]`
