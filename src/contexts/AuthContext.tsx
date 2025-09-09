import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  type User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types';
import { UserRole } from '../types';
import { useUserBalance } from '../hooks/useFirestore';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string, birthdate: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { sendPasswordResetEmail } from 'firebase/auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook para balance en tiempo real
  const userBalance = useUserBalance(firebaseUser?.uid || '');

  const getUserData = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { id: uid, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const createUserData = async (firebaseUser: FirebaseUser, name: string, phone: string, birthdate: string): Promise<User> => {
    // Usuarios se registran como VIEWER por defecto
    // Los roles admin/finance/streaming se asignan manualmente
    const userData: Omit<User, 'id'> = {
      email: firebaseUser.email!,
      name,
      phone,
      birthdate,
      role: UserRole.VIEWER, // Rol por defecto para nuevos usuarios
      balance: 0,
      totalDeposited: 0,
      totalBet: 0,
      totalWon: 0,
      registrationDate: new Date() as any,
      active: true,
      withdrawalEligible: false,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    return { id: firebaseUser.uid, ...userData };
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, phone: string, birthdate: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserData(userCredential.user, name, phone, birthdate);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setFirebaseUser(firebaseUser);
          const userData = await getUserData(firebaseUser.uid);
          setCurrentUser(userData);
          // Si el usuario está desactivado, cerrar sesión automáticamente
          if (userData && userData.active === false) {
            await logout();
          }
        } else {
          setFirebaseUser(null);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setFirebaseUser(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Efecto para actualizar el balance del usuario en tiempo real
  useEffect(() => {
    if (userBalance.data && currentUser && userBalance.data.id === currentUser.id) {
      // Solo actualizar si el balance es diferente para evitar loops
      if (userBalance.data.balance !== currentUser.balance) {
        setCurrentUser(userBalance.data);
      }
    }
  }, [userBalance.data, currentUser]);


  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading: loading || userBalance.isLoading,
    login,
    register,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
