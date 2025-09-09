# Referencia Integral - Plataforma XXXTREMO

## 1. Flujos y Lógica de Apuestas
- Emparejamiento automático de apuestas con matches parciales/múltiples.
- Validación de saldo, estado de pelea y reglas de negocio.
- Descuento de saldo y creación de apuestas en estado `pending`.
- Emparejamiento inmediato o reembolso automático de residuales.

## 2. Servicios y Tipos
- CRUD completo para apuestas, usuarios, peleas, eventos, depósitos y retiros.
- Tipos detallados para User, Bet, Fight, Event, Deposit, Withdrawal, Transaction, Commission, Notification.

## 3. Roles y Seguridad
- Roles: admin, finance, streaming, viewer.
- Permisos granulares por colección y rol.
- Solo usuarios autenticados pueden operar.
- Promoción de roles vía comando o edición en Firestore.

## 4. Reglas de Negocio
- Mínimo de apuesta: $100 MXN.
- Máximo: saldo disponible.
- Comisión de retiro: 1%.
- Comisión de plataforma: 10% de apuestas.
- Para retirar, el usuario debe apostar el 100% de sus depósitos.
- Procesamiento de retiro: 48h.

## 5. Reportes y Notificaciones
- Reportes de apuestas, transacciones, comisiones por evento.
- Exportación a Excel.
- Notificaciones visuales centralizadas para feedback inmediato.

## 6. Estructura de Base de Datos (Firestore)
- `users`: Cuentas, roles, balances, historial.
- `palenques`: Sedes de peleas.
- `events` / `calendar-events`: Eventos de competencia.
- `fights`: Peleas individuales.
- `bets`: Registros de apuestas.
- `deposits`: Solicitudes de depósito.
- `withdrawals`: Solicitudes de retiro.
- `platform_balances`: Comisiones mensuales.
- `bet_corrections`: Correcciones de resultados.
- `transactions`: Movimientos de saldo.
- `notifications`: Notificaciones de sistema.

## 7. Algoritmo de Emparejamiento
- Matches parciales y múltiples por apuesta.
- Reembolsos automáticos de residuales.
- Logs detallados del proceso.

## 8. Resumen
- Flujos robustos y seguros para apuestas, finanzas y administración.
- Roles y reglas claros.
- Estructura de datos y reportes lista para auditoría y mejora continua.
