import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  getDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Interfaces
export interface Deposit {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  reference: string;
  receipt?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    status: 'uploading' | 'uploaded' | 'failed';
    uploadedAt: Date | null;
    fileUrl: string | null;
    storagePath: string | null;
  } | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  commission: number;
  netAmount: number;
  bankAccount: string;
  clabe: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
}

// Hook para obtener depósitos pendientes
export const usePendingDeposits = () => {
  return useQuery({
    queryKey: ['deposits', 'pending'],
    queryFn: async () => {
      console.log('🔍 usePendingDeposits: Fetching pending deposits...');
      
      try {
        const depositsRef = collection(db, 'deposits');
        const q = query(
          depositsRef,
          where('status', '==', 'pending')
          // Removing orderBy temporarily to avoid index issues
          // orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        console.log('🔍 usePendingDeposits: Query result:', {
          size: snapshot.size,
          empty: snapshot.empty
        });
        
        const deposits = snapshot.docs.map(doc => {
          console.log('🔍 usePendingDeposits: Document:', { id: doc.id, ...doc.data() });
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          };
        }) as Deposit[];
        
        // Sort manually by createdAt
        deposits.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log('🔍 usePendingDeposits: Final deposits:', deposits);
        return deposits;
        
      } catch (error) {
        console.error('❌ Error fetching pending deposits:', error);
        throw error; // Throw error instead of returning mock data
      }
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
    retry: 1, // Only retry once to see errors faster
  });
};

// Hook para obtener retiros pendientes
export const usePendingWithdrawals = () => {
  return useQuery({
    queryKey: ['withdrawals', 'pending'],
    queryFn: async () => {
      console.log('🔍 usePendingWithdrawals: Fetching pending withdrawals...');
      
      try {
        const withdrawalsRef = collection(db, 'withdrawals');
        const q = query(
          withdrawalsRef,
          where('status', '==', 'pending')
          // Removing orderBy temporarily to avoid index issues
          // orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        console.log('🔍 usePendingWithdrawals: Query result:', {
          size: snapshot.size,
          empty: snapshot.empty
        });
        
        const withdrawals = snapshot.docs.map(doc => {
          console.log('🔍 usePendingWithdrawals: Document:', { id: doc.id, ...doc.data() });
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          };
        }) as Withdrawal[];
        
        // Sort manually by createdAt
        withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log('🔍 usePendingWithdrawals: Final withdrawals:', withdrawals);
        return withdrawals;
        
      } catch (error) {
        console.error('❌ Error fetching pending withdrawals:', error);
        throw error; // Throw error instead of returning mock data
      }
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refrescar cada minuto
    retry: 1, // Only retry once to see errors faster
  });
};

// Hook para obtener historial completo de transacciones
export const useTransactionHistory = () => {
  return useQuery({
    queryKey: ['transactions', 'history'],
    queryFn: async () => {
      console.log('🔍 useTransactionHistory: Fetching transaction history...');
      
      try {
        // Obtener depósitos
        const depositsRef = collection(db, 'deposits');
        const depositsQuery = query(depositsRef); // Remove orderBy temporarily
        const depositsSnapshot = await getDocs(depositsQuery);
        
        const deposits = depositsSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'deposit' as const,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));

        // Obtener retiros
        const withdrawalsRef = collection(db, 'withdrawals');
        const withdrawalsQuery = query(withdrawalsRef); // Remove orderBy temporarily
        const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
        
        const withdrawals = withdrawalsSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'withdrawal' as const,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));

        // Combinar y ordenar por fecha
        const allTransactions = [...deposits, ...withdrawals];
        allTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log('🔍 useTransactionHistory: Final transactions:', allTransactions);
        return allTransactions;
        
      } catch (error) {
        console.error('❌ Error fetching transaction history:', error);
        throw error; // Throw error instead of returning mock data
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1, // Only retry once to see errors faster
  });
};

// Mutation para aprobar un depósito
export const useApproveDeposit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ depositId, adminId }: { depositId: string; adminId: string }) => {
      console.log('🔍 useApproveDeposit: Approving deposit', { depositId, adminId });
      
      // Obtener datos del depósito antes de actualizarlo
      const depositRef = doc(db, 'deposits', depositId);
      const depositSnap = await getDoc(depositRef);
      
      if (!depositSnap.exists()) {
        throw new Error('Depósito no encontrado');
      }
      
      const depositData = depositSnap.data();
      const userId = depositData.userId;
      const amount = depositData.amount;
      
      console.log('💰 Updating user balance:', { userId, amount });
      
      // Actualizar el estado del depósito
      await updateDoc(depositRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: adminId
      });
      
      // Actualizar el balance del usuario
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(amount),
        totalDeposited: increment(amount),
        lastDepositAt: serverTimestamp()
      });
      
      console.log('✅ Deposit approved and user balance updated');
      
      return { depositId, userId, amount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      // También invalidar queries relacionadas con usuarios
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

// Mutation para rechazar un depósito
export const useRejectDeposit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      depositId, 
      adminId, 
      reason 
    }: { 
      depositId: string; 
      adminId: string; 
      reason: string; 
    }) => {
      const depositRef = doc(db, 'deposits', depositId);
      await updateDoc(depositRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: adminId,
        rejectionReason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

// Mutation para aprobar un retiro
export const useApproveWithdrawal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ withdrawalId, adminId }: { withdrawalId: string; adminId: string }) => {
      // Actualizar el estado del retiro
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      await updateDoc(withdrawalRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: adminId
      });
      
      // El balance ya fue deducido cuando el usuario solicitó el retiro,
      // por lo que no necesitamos hacer más cambios al balance aquí
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
  });
};

// Mutation para rechazar un retiro
export const useRejectWithdrawal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      withdrawalId, 
      adminId, 
      reason 
    }: { 
      withdrawalId: string; 
      adminId: string; 
      reason: string; 
    }) => {
      // Obtener los datos del retiro
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      
      if (!withdrawalDoc.exists()) {
        throw new Error('Withdrawal not found');
      }
      
      const withdrawalData = withdrawalDoc.data();
      const userId = withdrawalData.userId;
      const amount = withdrawalData.amount;
      
      // Actualizar el estado del retiro
      await updateDoc(withdrawalRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: adminId,
        rejectionReason: reason
      });
      
      // Devolver el balance al usuario (ya que fue deducido cuando solicitó el retiro)
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      // Invalidar específicamente el balance del usuario afectado
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
  });
};

// Mutation para agregar una corrección de transacción
export const useAddTransactionCorrection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      transactionId,
      transactionType,
      correctionType,
      adminId,
      reason,
      originalAmount,
      newAmount
    }: {
      transactionId: string;
      transactionType: 'deposit' | 'withdrawal';
      correctionType: 'approve' | 'reject' | 'modify';
      adminId: string;
      reason: string;
      originalAmount?: number;
      newAmount?: number;
    }) => {
      const correctionRef = collection(db, 'transaction_corrections');
      await addDoc(correctionRef, {
        transactionId,
        transactionType,
        correctionType,
        adminId,
        reason,
        originalAmount,
        newAmount,
        createdAt: serverTimestamp()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
