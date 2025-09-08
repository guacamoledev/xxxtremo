// Traduce errores comunes de Firebase a mensajes en español para el usuario final
export function traducirErrorFirebase(error: any): string {
  if (!error || typeof error !== 'object') return 'Ocurrió un error inesperado. Intenta de nuevo.';

  // 3. Buscar código en subpropiedades anidadas
  let code = error.code || error.message || '';
  if (!code && error.error && (error.error.code || error.error.message)) {
    code = error.error.code || error.error.message;
  }

  if (typeof code !== 'string') return 'Ocurrió un error inesperado. Intenta de nuevo.';

  // 2. Normalizar a minúsculas
  const codeNorm = code.toLowerCase();

  // 1. Más códigos comunes de Firebase
  if (codeNorm.includes('auth/email-already-in-use') || codeNorm.includes('email-already-in-use')) {
    return 'El correo electrónico ya está en uso.';
  }
  if (codeNorm.includes('auth/too-many-requests')) {
    return 'Demasiados intentos. Intenta más tarde.';
  }
  if (codeNorm.includes('auth/weak-password')) {
    return 'La contraseña es demasiado débil.';
  }
  if (codeNorm.includes('auth/invalid-email')) {
    return 'El correo electrónico no es válido.';
  }
  if (codeNorm.includes('auth/user-disabled')) {
    return 'La cuenta de usuario está deshabilitada.';
  }
  if (codeNorm.includes('storage/unauthorized')) {
    return 'No tienes permisos para acceder al archivo.';
  }
  if (codeNorm.includes('storage/canceled')) {
    return 'La operación de almacenamiento fue cancelada.';
  }
  if (codeNorm.includes('storage/quota-exceeded')) {
    return 'Se ha excedido la cuota de almacenamiento.';
  }
  if (codeNorm.includes('firestore/unavailable')) {
    return 'El servicio de base de datos no está disponible. Intenta más tarde.';
  }

  // Errores de autenticación comunes en login
  if (
    codeNorm.includes('auth/invalid-credential') ||
    codeNorm.includes('auth/wrong-password') ||
    codeNorm.includes('auth/user-not-found')
  ) {
    return 'Usuario o contraseña incorrectos.';
  }

  if (codeNorm.includes('network') || codeNorm.includes('unavailable')) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
  }
  if (codeNorm.includes('permission-denied')) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (codeNorm.includes('not-found')) {
    return 'El recurso solicitado no existe.';
  }
  if (codeNorm.includes('cancelled')) {
    return 'La operación fue cancelada.';
  }
  if (codeNorm.includes('deadline-exceeded')) {
    return 'La operación tardó demasiado. Intenta de nuevo.';
  }
  if (codeNorm.includes('already-exists')) {
    return 'El recurso ya existe.';
  }
  if (codeNorm.includes('invalid-argument')) {
    return 'Uno de los datos enviados es inválido.';
  }
  if (codeNorm.includes('resource-exhausted')) {
    return 'Se ha excedido el límite de recursos. Intenta más tarde.';
  }
  if (codeNorm.includes('unauthenticated')) {
    return 'Debes iniciar sesión para realizar esta acción.';
  }
  if (codeNorm.includes('unavailable')) {
    return 'El servicio no está disponible. Intenta más tarde.';
  }
  if (codeNorm.includes('internal')) {
    return 'Ocurrió un error interno. Intenta de nuevo.';
  }
  // Mensaje por defecto
  return `Ocurrió un error inesperado. Intenta de nuevo. [${code}]`;
}
