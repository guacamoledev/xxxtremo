import { useQueryClient } from '@tanstack/react-query';

// Utilidades para debugging de React Query
export const debugReactQuery = () => {
  const queryClient = useQueryClient();
  
  console.log('📊 React Query Debug Info');
  console.log('=========================');
  
  // Ver todas las queries en cache
  const cache = queryClient.getQueryCache();
  console.log('🗂️ Queries en cache:', cache.getAll().length);
  
  cache.getAll().forEach((query) => {
    console.log(`📋 ${JSON.stringify(query.queryKey)}:`, {
      state: query.state.status,
      dataUpdatedAt: new Date(query.state.dataUpdatedAt),
      data: query.state.data ? `${JSON.stringify(query.state.data).substring(0, 100)}...` : 'No data'
    });
  });
  
  // Ver mutaciones
  const mutationCache = queryClient.getMutationCache();
  console.log('🔄 Mutaciones en cache:', mutationCache.getAll().length);
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries();
      console.log('🔄 Todas las queries invalidadas');
    },
    clearCache: () => {
      queryClient.clear();
      console.log('🗑️ Cache limpiada');
    },
    refetchAll: () => {
      queryClient.refetchQueries();
      console.log('🔄 Todas las queries refetched');
    }
  };
};

// Hook para usar en componentes
export const useDebugReactQuery = () => {
  const queryClient = useQueryClient();
  
  return {
    debugCache: () => debugReactQuery(),
    invalidateAllQueries: () => queryClient.invalidateQueries(),
    clearCache: () => queryClient.clear(),
    refetchAllQueries: () => queryClient.refetchQueries(),
  };
};

// Agregar al window para uso en consola
if (typeof window !== 'undefined') {
  (window as any).debugReactQuery = debugReactQuery;
  (window as any).rqDebug = debugReactQuery;
}
