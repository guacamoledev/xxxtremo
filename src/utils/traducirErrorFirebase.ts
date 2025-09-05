// Traduce errores comunes de Firebase a mensajes en español para el usuario final
export function traducirErrorFirebase(error: any): string {
  if (!error || typeof error !== 'object') return 'Ocurrió un error inesperado. Intenta de nuevo.';
  const code = error.code || error.message || '';

  if (typeof code !== 'string') return 'Ocurrió un error inesperado. Intenta de nuevo.';

  if (code.includes('network') || code.includes('unavailable')) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
  }
  if (code.includes('permission-denied')) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (code.includes('not-found')) {
    return 'El recurso solicitado no existe.';
  }
  if (code.includes('cancelled')) {
    return 'La operación fue cancelada.';
  }
  if (code.includes('deadline-exceeded')) {
    return 'La operación tardó demasiado. Intenta de nuevo.';
  }
  if (code.includes('already-exists')) {
    return 'El recurso ya existe.';
  }
  if (code.includes('invalid-argument')) {
    return 'Uno de los datos enviados es inválido.';
  }
  if (code.includes('resource-exhausted')) {
    return 'Se ha excedido el límite de recursos. Intenta más tarde.';
  }
  if (code.includes('unauthenticated')) {
    return 'Debes iniciar sesión para realizar esta acción.';
  }
  if (code.includes('unavailable')) {
    return 'El servicio no está disponible. Intenta más tarde.';
  }
  if (code.includes('internal')) {
    return 'Ocurrió un error interno. Intenta de nuevo.';
  }
  // Mensaje por defecto
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
