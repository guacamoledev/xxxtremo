import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Función para debuggear el estado de autenticación
export const debugAuth = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    console.log('❌ No hay usuario autenticado');
    return;
  }
  
  console.log('✅ Usuario autenticado:', {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified
  });
  
  try {
    const token = await user.getIdToken();
    console.log('🔑 Token obtenido:', token.substring(0, 50) + '...');
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      console.log('👤 Datos de usuario:', userDoc.data());
    } else {
      console.log('⚠️ Documento de usuario no encontrado en Firestore');
    }
  } catch (error) {
    console.error('❌ Error obteniendo datos:', error);
  }
};

// Función para probar permisos de escritura
export const testFirestorePermissions = async () => {
  if (!auth.currentUser) {
    console.log('❌ Debes estar autenticado para probar permisos');
    return;
  }
  
  try {
    // Intentar leer la colección de usuarios
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      console.log('✅ Lectura permitida:', userDoc.data());
    } else {
      console.log('⚠️ Documento no encontrado pero lectura permitida');
    }
    
    // Esto se puede expandir para probar escritura
    console.log('ℹ️ Para probar escritura, usar la interfaz de la aplicación');
    
  } catch (error) {
    console.error('❌ Error de permisos:', error);
  }
};

// Agregar al window para uso en consola del navegador
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
  (window as any).testFirestorePermissions = testFirestorePermissions;
}
