
import { useMutation } from '@tanstack/react-query';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

interface UploadReceiptParams {
  file: File;
  depositId: string;
  userId: string;
}

interface UploadResult {
  downloadURL: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
}

// Hook para subir comprobantes de depósito a Firebase Storage
export const useUploadReceipt = () => {
  return useMutation<UploadResult, Error, UploadReceiptParams>({
    mutationFn: async ({ file, depositId, userId }: UploadReceiptParams) => {
      console.log('🔍 useUploadReceipt: Starting upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        depositId,
        userId
      });

      // Crear referencia del archivo en Storage
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `receipts/deposits/${userId}/${depositId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      try {
        // Subir el archivo
        console.log('📤 Uploading file to:', storagePath);
        const snapshot = await uploadBytes(storageRef, file);
        
        // Obtener URL de descarga
        console.log('🔗 Getting download URL...');
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log('✅ Upload successful:', {
          downloadURL,
          storagePath,
          fileName
        });

        return {
          downloadURL,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          storagePath
        };
      } catch (error) {
        console.error('❌ Upload failed:', error);
        throw new Error(`Error al subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    },
    onSuccess: (result) => {
      console.log('🎉 File upload completed successfully:', result);
    },
    onError: (error) => {
      console.error('💥 File upload failed:', error);
    }
  });
};

// Hook para subir archivos genéricos
export const useUploadFile = () => {
  return useMutation<UploadResult, Error, { file: File; path: string }>({
    mutationFn: async ({ file, path }) => {
      const fileName = `${Date.now()}_${file.name}`;
      const fullPath = `${path}/${fileName}`;
      const storageRef = ref(storage, fullPath);

      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
          downloadURL,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          storagePath: fullPath
        };
      } catch (error) {
        throw new Error(`Error al subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
  });
};
