import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserRole } from '../types';

/**
 * Utilitdad para promover un usuario a un rol específico
 * USO: En la consola del navegador ejecutar promoteUserToAdmin('email@test.com')
 */
export const promoteUserToRole = async (email: string, role: UserRole) => {
  try {
    // Buscar usuario por email (esto requiere un índice en Firestore)
    // Por simplicidad, asumimos que tenemos el UID del usuario
    console.log(`Para promover ${email} a ${role}:`);
    console.log('1. Ve a Firebase Console > Authentication');
    console.log('2. Busca el usuario por email');
    console.log('3. Copia el UID del usuario');
    console.log('4. Ejecuta: promoteUserByUID("UID_COPIADO", "admin")');
    
    return false;
  } catch (error) {
    console.error('Error promoting user:', error);
    throw error;
  }
};

/**
 * Promover usuario por UID (más directo)
 */
export const promoteUserByUID = async (uid: string, role: UserRole) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Usuario no encontrado');
    }
    
    await updateDoc(userRef, {
      role: role
    });
    
    console.log(`✅ Usuario ${uid} promovido a ${role}`);
    console.log('🔄 Recarga la página para ver los cambios');
    
    return true;
  } catch (error) {
    console.error('Error promoting user by UID:', error);
    throw error;
  }
};

/**
 * Crear usuario admin de emergencia (solo para desarrollo)
 */
export const createEmergencyAdmin = async (_email: string, _name: string) => {
  console.log('🚨 Función de emergencia para crear admin:');
  console.log('1. Regístrate normalmente con la app');
  console.log('2. Copia tu UID de Firebase Console');
  console.log('3. Ejecuta: promoteUserByUID("TU_UID", "admin")');
};

// Exportar funciones globalmente para uso en consola
declare global {
  interface Window {
    promoteUserToRole: typeof promoteUserToRole;
    promoteUserByUID: typeof promoteUserByUID;
    createEmergencyAdmin: typeof createEmergencyAdmin;
    UserRole: typeof UserRole;
  }
}

if (typeof window !== 'undefined') {
  window.promoteUserToRole = promoteUserToRole;
  window.promoteUserByUID = promoteUserByUID;
  window.createEmergencyAdmin = createEmergencyAdmin;
  window.UserRole = UserRole;
}
