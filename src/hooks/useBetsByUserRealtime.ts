import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Bet } from '../types';

export function useBetsByUserRealtime(userId: string) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setBets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'bets'),
      where('userId', '==', userId),
      orderBy('creationDate', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet)));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);
  return { data: bets, loading };
}
