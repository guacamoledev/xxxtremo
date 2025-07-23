import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Palenque, Event, Fight } from '../types';

// Palenque Services
export const palenqueService = {
  // Get all palenques
  async getAll(): Promise<Palenque[]> {
    try {
      const q = query(collection(db, 'palenques'), orderBy('creationDate', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Palenque));
    } catch (error) {
      console.error('Error getting palenques:', error);
      throw error;
    }
  },

  // Get active palenques only
  async getActive(): Promise<Palenque[]> {
    try {
      const q = query(
        collection(db, 'palenques'), 
        where('active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const palenques = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Palenque));
      
      // Sort manually by creation date (descending)
      return palenques.sort((a, b) => 
        b.creationDate.toMillis() - a.creationDate.toMillis()
      );
    } catch (error) {
      console.error('Error getting active palenques:', error);
      throw error;
    }
  },

  // Get palenque by ID
  async getById(id: string): Promise<Palenque | null> {
    try {
      const docRef = doc(db, 'palenques', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Palenque;
      }
      return null;
    } catch (error) {
      console.error('Error getting palenque:', error);
      throw error;
    }
  },

  // Create new palenque
  async create(palenque: Omit<Palenque, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'palenques'), {
        ...palenque,
        creationDate: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating palenque:', error);
      throw error;
    }
  },

  // Update palenque
  async update(id: string, updates: Partial<Palenque>): Promise<void> {
    try {
      const docRef = doc(db, 'palenques', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating palenque:', error);
      throw error;
    }
  },

  // Delete palenque
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'palenques', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting palenque:', error);
      throw error;
    }
  }
};

// Event Services
export const eventService = {
  // Get all events
  async getAll(): Promise<Event[]> {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  },

  // Get events by palenque
  async getByPalenque(palenqueId: string): Promise<Event[]> {
    try {
      const q = query(
        collection(db, 'events'),
        where('palenqueId', '==', palenqueId)
      );
      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));
      
      // Sort manually by date (descending)
      return events.sort((a, b) => 
        b.date.toMillis() - a.date.toMillis()
      );
    } catch (error) {
      console.error('Error getting events by palenque:', error);
      throw error;
    }
  },

  // Get upcoming events
  async getUpcoming(): Promise<Event[]> {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'events'),
        where('date', '>=', now),
        where('status', '==', 'scheduled')
      );
      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));
      
      // Sort manually by date (ascending)
      return events.sort((a, b) => 
        a.date.toMillis() - b.date.toMillis()
      );
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  },

  // Get event by ID
  async getById(id: string): Promise<Event | null> {
    try {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  },

  // Create new event
  async create(event: Omit<Event, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'events'), event);
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update event
  async update(id: string, updates: Partial<Event>): Promise<void> {
    try {
      const docRef = doc(db, 'events', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  // Delete event
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'events', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};

// Fight Services
export const fightService = {
  // Get all fights
  async getAll(): Promise<Fight[]> {
    try {
      const q = query(collection(db, 'fights'), orderBy('scheduledTime', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Fight));
    } catch (error) {
      console.error('Error getting all fights:', error);
      throw error;
    }
  },

  // Get fights by event
  async getByEvent(eventId: string): Promise<Fight[]> {
    try {
      const q = query(
        collection(db, 'fights'),
        where('eventId', '==', eventId)
      );
      const querySnapshot = await getDocs(q);
      const fights = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Fight));
      
      // Sort manually by fight number (ascending)
      return fights.sort((a, b) => a.fightNumber - b.fightNumber);
    } catch (error) {
      console.error('Error getting fights by event:', error);
      throw error;
    }
  },

  // Get fight by ID
  async getById(id: string): Promise<Fight | null> {
    try {
      const docRef = doc(db, 'fights', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Fight;
      }
      return null;
    } catch (error) {
      console.error('Error getting fight:', error);
      throw error;
    }
  },

  // Create new fight
  async create(fight: Omit<Fight, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'fights'), fight);
      return docRef.id;
    } catch (error) {
      console.error('Error creating fight:', error);
      throw error;
    }
  },

  // Update fight
  async update(id: string, updates: Partial<Fight>): Promise<void> {
    try {
      const docRef = doc(db, 'fights', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating fight:', error);
      throw error;
    }
  },

  // Delete fight
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'fights', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting fight:', error);
      throw error;
    }
  },

  // Update fight status
  async updateStatus(id: string, status: Fight['status']): Promise<void> {
    try {
      const docRef = doc(db, 'fights', id);
      const updates: Partial<Fight> = { status };
      
      if (status === 'in_progress') {
        updates.startDate = Timestamp.now();
      } else if (status === 'finished') {
        updates.endDate = Timestamp.now();
      }
      
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating fight status:', error);
      throw error;
    }
  },

  // Set fight winner
  async setWinner(id: string, winner: 'red' | 'green' | null): Promise<void> {
    try {
      const docRef = doc(db, 'fights', id);
      await updateDoc(docRef, {
        winner,
        status: 'finished',
        endDate: Timestamp.now()
      });
    } catch (error) {
      console.error('Error setting fight winner:', error);
      throw error;
    }
  }
};
