import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// Interface para crear un nuevo depósito
interface CreateDepositData {
  amount: number;
  method: string;
  reference: string;
  receipt: File; // Ahora es obligatorio el comprobante
}

// Interface para crear un nuevo retiro
interface CreateWithdrawalData {
  amount: number;
  bankAccount: string;
  clabe: string;
  holderName: string;
}

// Interface para depósito desde Firebase
interface UserDeposit {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  reference: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  receiptUrl?: string;
  rejectionReason?: string;
}

// Interface para retiro desde Firebase
interface UserWithdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  commission: number;
  netAmount: number;
  bankAccount: string;
  clabe: string;
  holderName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  rejectionReason?: string;
}

// Hook para crear un depósito
export const useCreateDeposit = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (depositData: CreateDepositData) => {
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Validar que se proporcione un comprobante
      if (!depositData.receipt) {
        throw new Error('El comprobante de pago es obligatorio para realizar un depósito');
      }

      // Validar que el archivo sea una imagen válida
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(depositData.receipt.type)) {
        throw new Error('El comprobante debe ser una imagen (JPG, PNG, WEBP) o PDF');
      }

      // Validar tamaño del archivo (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (depositData.receipt.size > maxSize) {
        throw new Error('El comprobante no puede superar los 5MB');
      }

      console.log('🔍 useCreateDeposit: Creating deposit with data:', {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        amount: depositData.amount,
        method: depositData.method,
        reference: depositData.reference,
        hasReceipt: !!depositData.receipt
      });

      // Calcular comisión si es necesario (por ahora 0 para depósitos)
      const commission = 0;
      const netAmount = depositData.amount - commission;

      // Crear el depósito en Firestore primero
      const depositsRef = collection(db, 'deposits');
      const docRef = await addDoc(depositsRef, {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        amount: depositData.amount,
        method: depositData.method,
        reference: depositData.reference,
        receipt: {
          fileName: depositData.receipt.name,
          fileSize: depositData.receipt.size,
          fileType: depositData.receipt.type,
          status: 'uploading', // Estado inicial
          uploadedAt: null,
          fileUrl: null,
          storagePath: null
        },
        status: 'pending',
        createdAt: serverTimestamp(),
        commission,
        netAmount
      });

      console.log('✅ Depósito creado con ID:', docRef.id);

      // Subir el comprobante a Firebase Storage (ahora siempre hay archivo)
      try {
        console.log('📤 Subiendo comprobante...');
        
  // Subir archivo a Storage
  const fileName = `${Date.now()}_${depositData.receipt.name}`;
  const storagePath = `receipts/deposits/${currentUser.id}/${docRef.id}/${fileName}`;
  // Log para depuración de permisos
  console.log('Subiendo comprobante a:', storagePath, 'currentUser.id:', currentUser.id);
  const fileRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(fileRef, depositData.receipt);
  const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Actualizar el documento con la información del archivo subido
        await updateDoc(doc(db, 'deposits', docRef.id), {
          receipt: {
            fileName: depositData.receipt.name,
            fileSize: depositData.receipt.size,
            fileType: depositData.receipt.type,
            status: 'uploaded',
            uploadedAt: serverTimestamp(),
            fileUrl: downloadURL,
            storagePath: storagePath
          }
        });
        
        console.log('✅ Comprobante subido exitosamente:', downloadURL);
      } catch (uploadError) {
        console.error('❌ Error subiendo comprobante:', uploadError);
        
        // Actualizar el estado del archivo como fallido
        await updateDoc(doc(db, 'deposits', docRef.id), {
          'receipt.status': 'failed'
        });
        
        // Lanzar error porque el comprobante es obligatorio
        throw new Error(`Error al subir el comprobante: ${uploadError instanceof Error ? uploadError.message : 'Error desconocido'}`);
      }

      return docRef.id;
    },
    onSuccess: () => {
      console.log('✅ useCreateDeposit: Success, invalidating queries for user:', currentUser?.id);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['user-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
    },
    onError: (error) => {
      console.error('❌ Error creando depósito:', error);
    }
    ,
    retry: false
  });
};

// Hook para crear un retiro
export const useCreateWithdrawal = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (withdrawalData: CreateWithdrawalData) => {
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Calcular elegibilidad dinámicamente basado en apuestas reales
      // Obtener apuestas del usuario
      const betsQuery = query(
        collection(db, 'bets'),
        where('userId', '==', currentUser.id)
      );
      const betsSnapshot = await getDocs(betsQuery);
      const userBets = betsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calcular total apostado (usando matchedAmount si existe, sino amount)
      const totalBetAmount = userBets.reduce((sum: number, bet: any) => 
        sum + (bet.matchedAmount || bet.amount), 0
      );

      // Obtener depósitos aprobados del usuario
      const depositsQuery = query(
        collection(db, 'deposits'),
        where('userId', '==', currentUser.id),
        where('status', '==', 'approved')
      );
      const depositsSnapshot = await getDocs(depositsQuery);
      const approvedDeposits = depositsSnapshot.docs.reduce((sum: number, doc: any) => 
        sum + doc.data().amount, 0
      );

      // Verificar elegibilidad para retiro (debe haber apostado 100% de depósitos)
      const isEligibleForWithdrawal = totalBetAmount >= approvedDeposits;
      
      if (!isEligibleForWithdrawal) {
        const remainingToWager = approvedDeposits - totalBetAmount;
        throw new Error(
          `No eres elegible para retiros. Has apostado $${totalBetAmount.toLocaleString()} de $${approvedDeposits.toLocaleString()} depositados. Debes apostar $${remainingToWager.toLocaleString()} MXN más.`
        );
      }

      // Verificar balance suficiente
      if (currentUser.balance < withdrawalData.amount) {
        throw new Error('Balance insuficiente');
      }

      // Calcular comisión (1%)
      const commission = withdrawalData.amount * 0.01;
      const netAmount = withdrawalData.amount - commission;

      // Crear el retiro en Firestore
      const withdrawalsRef = collection(db, 'withdrawals');
      const docRef = await addDoc(withdrawalsRef, {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        amount: withdrawalData.amount,
        commission,
        netAmount,
        bankAccount: withdrawalData.bankAccount,
        clabe: withdrawalData.clabe,
        holderName: withdrawalData.holderName,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // IMPORTANTE: Descontar inmediatamente el monto del saldo del usuario
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        balance: currentUser.balance - withdrawalData.amount
      });

      console.log('✅ Retiro creado con ID:', docRef.id);
      console.log('💰 Saldo descontado:', withdrawalData.amount, 'Nuevo saldo:', currentUser.balance - withdrawalData.amount);
      
      return docRef.id;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['user-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
      // Invalidar el balance del usuario para que se actualice inmediatamente
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
    onError: (error) => {
      console.error('❌ Error creando retiro:', error);
    }
  });
};

// Hook para obtener depósitos del usuario actual
export const useUserDeposits = () => {
  const { currentUser } = useAuth();
  
  return useQuery<UserDeposit[]>({
    queryKey: ['user-deposits', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) {
        console.log('🔍 useUserDeposits: No current user');
        return [];
      }
      
      console.log('🔍 useUserDeposits: Fetching deposits for user:', currentUser.id);
      
      try {
        const depositsRef = collection(db, 'deposits');
        const q = query(
          depositsRef,
          where('userId', '==', currentUser.id)
          // Temporarily remove orderBy to test if it's an index issue
          // orderBy('createdAt', 'desc')
        );
        
        console.log('🔍 useUserDeposits: Executing query...');
        const snapshot = await getDocs(q);
        
        console.log('🔍 useUserDeposits: Query result:', {
          size: snapshot.size,
          empty: snapshot.empty
        });
        
        const deposits = snapshot.docs.map(doc => {
          console.log('🔍 useUserDeposits: Document data:', { id: doc.id, ...doc.data() });
          return {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          };
        }) as UserDeposit[];
        
        // Sort manually by createdAt
        deposits.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        console.log('🔍 useUserDeposits: Final deposits:', deposits);
        return deposits;
        
      } catch (error) {
        console.error('❌ Error fetching user deposits:', error);
        // Throw the error instead of returning mock data
        throw error;
      }
    },
    enabled: !!currentUser,
    staleTime: 30 * 1000,
    retry: 1, // Only retry once to see errors faster
  });
};

// Hook para obtener retiros del usuario actual
export const useUserWithdrawals = () => {
  const { currentUser } = useAuth();
  
  return useQuery<UserWithdrawal[]>({
    queryKey: ['user-withdrawals', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      try {
        const withdrawalsRef = collection(db, 'withdrawals');
        const q = query(
          withdrawalsRef,
          where('userId', '==', currentUser.id)
          // Temporarily remove orderBy to test if it's an index issue
          // orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const withdrawals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as UserWithdrawal[];
        
        // Sort manually by createdAt
        withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        return withdrawals;
      } catch (error) {
        console.warn('Error fetching user withdrawals:', error);
        // Return mock data for development
        return [
          {
            id: 'mock-user-withdrawal-1',
            userId: currentUser.id,
            userName: currentUser.name,
            userEmail: currentUser.email,
            amount: 1000,
            commission: 10,
            netAmount: 990,
            bankAccount: 'BBVA - 1234567890',
            clabe: '012345678901234567',
            holderName: currentUser.name,
            status: 'pending' as const,
            createdAt: new Date(Date.now() - 86400000),
          }
        ];
      }
    },
    enabled: !!currentUser,
    staleTime: 30 * 1000,
  });
};

// Hook para obtener todas las transacciones del usuario
export const useUserTransactions = () => {
  const userDeposits = useUserDeposits();
  const userWithdrawals = useUserWithdrawals();
  
  const transactions = [
    ...(userDeposits.data || []).map(deposit => ({
      ...deposit,
      type: 'deposit' as const
    })),
    ...(userWithdrawals.data || []).map(withdrawal => ({
      ...withdrawal,
      type: 'withdrawal' as const
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return {
    data: transactions,
    isLoading: userDeposits.isLoading || userWithdrawals.isLoading,
    error: userDeposits.error || userWithdrawals.error
  };
};
