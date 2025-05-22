import { useEffect } from 'react';
import { useFriendsStore } from '@/stores/friendsStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Custom hook for managing real-time friend subscriptions
 * Handles subscription lifecycle and cleanup
 */
export const useRealtimeFriends = () => {
  const user = useAuthStore((state) => state.user);
  const { 
    realtimeStatus, 
    startRealtimeSubscriptions, 
    stopRealtimeSubscriptions 
  } = useFriendsStore();

  useEffect(() => {
    // Start subscriptions when user is authenticated
    if (user && realtimeStatus === 'disconnected') {
      console.log('🔄 [HOOK] Starting real-time subscriptions');
      startRealtimeSubscriptions();
    }

    // Cleanup function to stop subscriptions when component unmounts
    return () => {
      if (realtimeStatus !== 'disconnected') {
        console.log('🔄 [HOOK] Cleaning up real-time subscriptions');
        stopRealtimeSubscriptions();
      }
    };
  }, [user, realtimeStatus, startRealtimeSubscriptions, stopRealtimeSubscriptions]);

  return {
    realtimeStatus,
    isConnected: realtimeStatus === 'connected',
    isConnecting: realtimeStatus === 'connecting',
    hasError: realtimeStatus === 'error'
  };
}; 