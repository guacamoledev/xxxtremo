import { FirestoreError } from 'firebase/firestore';

export interface RealtimeErrorInfo {
  code: string;
  message: string;
  isNetworkError: boolean;
  shouldRetry: boolean;
  retryDelay: number;
}

export const analyzeRealtimeError = (error: FirestoreError): RealtimeErrorInfo => {
  const errorInfo: RealtimeErrorInfo = {
    code: error.code,
    message: error.message,
    isNetworkError: false,
    shouldRetry: false,
    retryDelay: 5000, // 5 segundos por defecto
  };

  switch (error.code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'resource-exhausted':
      errorInfo.isNetworkError = true;
      errorInfo.shouldRetry = true;
      errorInfo.retryDelay = 5000;
      errorInfo.message = 'Problema de conexión. Reintentando...';
      break;

    case 'permission-denied':
      errorInfo.isNetworkError = false;
      errorInfo.shouldRetry = false;
      errorInfo.message = 'Sin permisos para acceder a los datos';
      break;

    case 'failed-precondition':
      errorInfo.isNetworkError = false;
      errorInfo.shouldRetry = false;
      errorInfo.message = 'Error de configuración en la base de datos';
      break;

    case 'internal':
      errorInfo.isNetworkError = true;
      errorInfo.shouldRetry = true;
      errorInfo.retryDelay = 10000; // 10 segundos para errores internos
      errorInfo.message = 'Error interno del servidor. Reintentando...';
      break;

    case 'unauthenticated':
      errorInfo.isNetworkError = false;
      errorInfo.shouldRetry = false;
      errorInfo.message = 'Sesión expirada. Por favor, inicia sesión nuevamente';
      break;

    default:
      errorInfo.isNetworkError = true;
      errorInfo.shouldRetry = true;
      errorInfo.retryDelay = 5000;
      errorInfo.message = 'Error de conexión. Reintentando...';
  }

  return errorInfo;
};

export const createRetryableListener = (
  listenerFn: () => (() => void),
  onError: (error: RealtimeErrorInfo) => void,
  maxRetries: number = 3
) => {
  let retryCount = 0;
  let currentUnsubscribe: (() => void) | null = null;
  let retryTimeout: NodeJS.Timeout | null = null;

  const startListener = () => {
    try {
      currentUnsubscribe = listenerFn();
    } catch (error) {
      const errorInfo = analyzeRealtimeError(error as FirestoreError);
      handleError(errorInfo);
    }
  };

  const handleError = (errorInfo: RealtimeErrorInfo) => {
    console.error('🔥 Realtime listener error:', errorInfo);
    
    if (errorInfo.shouldRetry && retryCount < maxRetries) {
      retryCount++;
      console.log(`🔄 Retrying listener (attempt ${retryCount}/${maxRetries}) in ${errorInfo.retryDelay}ms`);
      
      retryTimeout = setTimeout(() => {
        startListener();
      }, errorInfo.retryDelay);
    } else {
      // No más reintentos o error no recuperable
      onError(errorInfo);
    }
  };

  const cleanup = () => {
    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    retryCount = 0;
  };

  // Iniciar el listener
  startListener();

  return cleanup;
};
