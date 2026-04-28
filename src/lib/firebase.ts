import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, doc, getDocFromServer, setDoc, updateDoc, Timestamp, collection, 
  getDocs, query, orderBy, deleteDoc, where, limit, onSnapshot, serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  UserProfile, Tournament, TopupPackage, VerifiedCode, WithdrawalRequest, 
  Notification, Transaction, GameEvent, TournamentRegistration, HeroBanner,
  ShopCategory, ShopPackage, ShopOrder
} from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export { onSnapshot, collection, query, orderBy };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error Detailed: ', errorJson);
  throw new Error(errorJson);
}

// Initialize Firestore connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    // We don't throw here to avoid blocking app start
  }
}
testConnection();

export async function syncUserProfile(user: any): Promise<UserProfile | null> {
  if (!user) return null;
  console.log("Syncing profile for:", user.email, "Admin target:", 'alifahmed7173638@gmail.com');

  const path = `users/${user.uid}`;
  const userDocRef = doc(db, path);
  
  let userDoc;
  try {
    userDoc = await getDocFromServer(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null; // unreachable due to throw
  }

  if (!userDoc.exists()) {
    const newUser: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'New Warrior',
      balance: 0, 
      diamonds: 0,
      avatar: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      totalEarnings: 0,
      matchesPlayed: 0,
      isAdmin: user.email === 'alifahmed7173638@gmail.com',
      level: 0,
      xp: 0,
      totalTopupAmount: 0,
      lowMatchCount: 0,
      highMatchCount: 0
    };

    try {
      await setDoc(userDocRef, {
        ...newUser,
        email: user.email,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }

    return newUser;
  }

  const existingProfile = userDoc.data() as UserProfile;
  
  // Ensure existing admin email gets admin rights if they don't have it yet
  if (user.email === 'alifahmed7173638@gmail.com' && !existingProfile.isAdmin) {
    try {
      await updateDoc(userDocRef, { isAdmin: true });
      existingProfile.isAdmin = true;
    } catch (error) {
      console.error("Failed to upgrade to admin:", error);
    }
  }

  return existingProfile;
}

export const socialSignIn = async (provider: GoogleAuthProvider) => {
  try {
    const result = await signInWithPopup(auth, provider);
    const profile = await syncUserProfile(result.user);
    return { user: result.user, profile };
  } catch (error) {
    // If it's already a JSON error from syncUserProfile, just rethrow
    if (error instanceof Error && error.message.startsWith('{')) {
      throw error;
    }
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    // Force a small delay to allow Firebase to update its internal state
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error("Firebase SignOut Error:", error);
    throw error;
  }
};

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const path = `users/${uid}`;
  const userDocRef = doc(db, path);
  try {
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Helper for getDocs with timeout
async function getDocsWithTimeout(q: any, timeoutMs: number = 30000) {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)
  );
  try {
    const result: any = await Promise.race([
      getDocs(q),
      timeoutPromise
    ]);
    return result;
  } catch (err) {
    console.error("Firebase getDocs timeout or error:", err);
    throw err;
  }
}

// Tournament Methods
export async function getTournaments(): Promise<Tournament[]> {
  const path = 'tournaments';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocsWithTimeout(q);
    const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Tournament));
    // Local sort as fallback
    return data.sort((a, b) => {
      const dateA = (a as any).updatedAt?.toMillis?.() || 0;
      const dateB = (b as any).updatedAt?.toMillis?.() || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Tournament fetch error:", error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveTournament(tournament: Partial<Tournament>) {
  const path = 'tournaments';
  const id = tournament.id || doc(collection(db, path)).id;
  const docRef = doc(db, path, id);
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Save operation timed out (60s)')), 60000)
    );

    await Promise.race([
      setDoc(docRef, { 
        ...tournament, 
        id,
        updatedAt: Timestamp.now() 
      }, { merge: true }),
      timeoutPromise
    ]);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

export async function deleteTournament(id: string) {
  const path = 'tournaments';
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

export async function uploadTournamentImage(id: string, file: File): Promise<string> {
  const storageRef = ref(storage, `tournaments/${id}/${file.name}`);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Tournament upload timed out (5m)')), 300000)
  );

  const uploadResult: any = await Promise.race([
    uploadBytes(storageRef, file),
    timeoutPromise
  ]);
  
  return getDownloadURL(uploadResult.ref);
}

// Package Methods
export async function getTopupPackages(): Promise<TopupPackage[]> {
  const path = 'packages';
  try {
    const q = query(collection(db, path), orderBy('price', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopupPackage));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}
// Reference: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${(firebaseConfig as any).firestoreDatabaseId || '(default)'}/data

export async function saveTopupPackage(pkg: Partial<TopupPackage>) {
  const path = 'packages';
  const id = pkg.id || doc(collection(db, path)).id;
  const docRef = doc(db, path, id);
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Save operation timed out (60s)')), 60000)
    );

    await Promise.race([
      setDoc(docRef, { ...pkg, id }, { merge: true }),
      timeoutPromise
    ]);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

export async function deleteTopupPackage(id: string) {
  const path = 'packages';
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

// Verified Codes Methods
export async function getVerifiedCodes(): Promise<VerifiedCode[]> {
  const path = 'verified_codes';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerifiedCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addVerifiedCode(code: string, amount: number) {
  const path = 'verified_codes';
  const cleanCode = code.trim().toUpperCase().replace(/\s/g, '');
  const id = doc(collection(db, path)).id;
  const docRef = doc(db, path, id);
  try {
    await setDoc(docRef, {
      id,
      code: cleanCode,
      amount,
      status: 'Active',
      createdAt: Timestamp.now()
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

export async function deleteVerifiedCode(id: string) {
  const path = 'verified_codes';
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

export async function deleteWithdrawalRequest(id: string) {
  const path = 'withdrawals';
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

export async function redeemVerifiedCode(code: string, amount: number, userId: string): Promise<{ success: boolean; message: string; amount?: number; errorType?: 'invalid' | 'mismatch' }> {
  const path = 'verified_codes';
  try {
    // Query for the specific code (exact match case sensitive by default in firestore)
    const q = query(
      collection(db, path), 
      where('code', '==', code.trim()), 
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, message: 'Invalid Transaction ID. Auto-Rejected.', errorType: 'invalid' };
    }

    const docSnap = snapshot.docs[0];
    const match = { id: docSnap.id, ...docSnap.data() } as VerifiedCode;
    
    if (match.status !== 'Active') {
      return { success: false, message: 'Transaction ID already used. Auto-Rejected.', errorType: 'invalid' };
    }

    // Check if amount matches exactly
    if (Number(match.amount) !== Number(amount)) {
      return { 
        success: false, 
        message: `Amount Mismatch! You entered ৳${amount} but this TRX ID is for ৳${match.amount}. Auto-Rejected.`, 
        errorType: 'mismatch' 
      };
    }

    // Update code status
    const codeRef = doc(db, path, match.id);
    await updateDoc(codeRef, { 
      status: 'Used', 
      usedBy: userId,
    });

    // Update user balance
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDocFromServer(userRef);
    if (userDoc.exists()) {
      const currentBalance = userDoc.data().balance || 0;
      await updateDoc(userRef, { balance: currentBalance + match.amount });
      
      // Update Level Progression for Top-up
      await updateUserProgression(userId, 'deposit', match.amount);
    }

    return { success: true, message: `Payment Auto-Verified! ৳${match.amount} added to balance.`, amount: match.amount };
  } catch (error) {
    console.error('Redeem error:', error);
    return { success: false, message: 'System error during verification' };
  }
}

// Withdrawal Methods
export async function createWithdrawalRequest(request: Omit<WithdrawalRequest, 'id' | 'status' | 'createdAt'>) {
  const path = 'withdrawals';
  const id = doc(collection(db, path)).id;
  const docRef = doc(db, path, id);
  try {
    // Deduct balance first
    const userRef = doc(db, 'users', request.userId);
    const userDoc = await getDocFromServer(userRef);
    if (!userDoc.exists()) throw new Error('User not found');
    
    const currentBalance = userDoc.data().balance || 0;
    if (currentBalance < request.amount) throw new Error('Insufficient balance');

    await updateDoc(userRef, { balance: currentBalance - request.amount });

    await setDoc(docRef, {
      ...request,
      id,
      status: 'Pending',
      createdAt: Timestamp.now()
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

// Event Methods
export async function getEvents(): Promise<GameEvent[]> {
  const path = 'events';
  try {
    console.log('Fetching events...');
    // Try with server-side order first
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocsWithTimeout(q);
      console.log(`Fetched ${snapshot.docs.length} events (ordered)`);
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as GameEvent));
    } catch (orderErr) {
      console.warn('Events fetch with order failed (index building?), falling back to local sort:', orderErr);
      const q = query(collection(db, path));
      const snapshot = await getDocsWithTimeout(q);
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as GameEvent));
      return data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    // Return empty instead of throwing to avoid blocking app start
    return [];
  }
}

export async function saveEvent(event: Omit<GameEvent, 'id' | 'createdAt'>, id?: string) {
  const path = 'events';
  const isCreate = !id;
  const targetId = id || doc(collection(db, path)).id;
  const docRef = doc(db, path, targetId);
  
  try {
    console.log(`Saving event: ${targetId}`, event);
    const data: any = {
      ...event,
      id: targetId
    };
    if (isCreate) {
      data.createdAt = Timestamp.now();
    }

    // Add a simple timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Save operation timed out (60s)')), 60000)
    );

    await Promise.race([
      setDoc(docRef, data, { merge: true }),
      timeoutPromise
    ]);

    console.log(`Event ${targetId} saved successfully`);
    return targetId;
  } catch (error) {
    console.error(`Error saving event ${targetId}:`, error);
    handleFirestoreError(error, OperationType.WRITE, `${path}/${targetId}`);
  }
}

export async function deleteEvent(id: string) {
  const path = 'events';
  try {
    console.log(`Deleting event: ${id}`);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Delete operation timed out (60s)')), 60000)
    );

    await Promise.race([
      deleteDoc(doc(db, path, id)),
      timeoutPromise
    ]);
    
    console.log(`Event ${id} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting event ${id}:`, error);
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

export async function uploadEventImage(file: File): Promise<string> {
  try {
    console.log('Starting event image upload...', file.name);
    const storageRef = ref(storage, `events/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
    
    // Create timeout (5 minutes)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timed out (5m). File might be too large or connection unstable.')), 300000)
    );

    const uploadResult: any = await Promise.race([
      uploadBytes(storageRef, file),
      timeoutPromise
    ]);

    console.log('Upload completed, getting download URL...');
    const url = await getDownloadURL(uploadResult.ref);
    console.log('Image URL received:', url);
    return url;
  } catch (error) {
    console.error('Event image upload failed:', error);
    throw error;
  }
}

export async function getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const path = 'withdrawals';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const path = `users/${userId}/notifications`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt?.toDate()?.toLocaleDateString() || 'Recently'
    } as Notification));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addNotification(userId: string, notification: Omit<Notification, 'id' | 'date' | 'read'>) {
  const path = `users/${userId}/notifications`;
  const id = doc(collection(db, path)).id;
  try {
    await setDoc(doc(db, path, id), {
      ...notification,
      id,
      read: false,
      createdAt: Timestamp.now()
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const path = `users/${userId}/notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, path), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateWithdrawalStatus(withdrawalId: string, status: 'Approved' | 'Rejected', userId?: string, amount?: number) {
  const path = `withdrawals/${withdrawalId}`;
  console.log('INITIATING WITHDRAWAL UPDATE:', { withdrawalId, status, userId, amount });
  
  try {
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    console.log('CHECKING WITHDRAWAL DOC EXISTENCE...');
    const withdrawSnap = await getDocFromServer(withdrawalRef);
    if (!withdrawSnap.exists()) {
      throw new Error(`Withdrawal request with ID ${withdrawalId} not found in database.`);
    }
    
    console.log('UPDATING WITHDRAWAL STATUS IN FIRESTORE...');
    await updateDoc(withdrawalRef, { status });
    console.log('WITHDRAWAL STATUS UPDATED SUCCESSFULLY');

    if (status === 'Approved' && userId && amount) {
      const wData = withdrawSnap.data();
      const methodInfo = `${wData.method || 'Payout'} (${wData.number || 'N/A'})`;
      
      // Create Withdrawal Transaction Record
      const txId = `WX-${Date.now()}`;
      await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        userId,
        amount: -amount, // Negative for withdrawal
        type: 'Withdrawal',
        status: 'Completed',
        method: methodInfo,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        createdAt: Timestamp.now()
      });
    }

    if (userId) {
      // Send Notification
      const title = status === 'Approved' ? 'Withdrawal Approved' : 'Withdrawal Rejected';
      const message = status === 'Approved' 
        ? `Your withdrawal request of ৳${amount} has been approved and processed.`
        : `Your withdrawal request of ৳${amount} has been rejected. The amount has been refunded to your wallet.`;
      
      await addNotification(userId, {
        title,
        message,
        type: 'Wallet'
      });
    }
    
    // If rejected, refund balance
    if (status === 'Rejected') {
      if (userId && amount) {
        console.log(`ATTEMPTING REFUND: ৳${amount} to user ${userId}`);
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDocFromServer(userRef);
        if (userDoc.exists()) {
          const currentBalance = userDoc.data().balance || 0;
          const newBalance = currentBalance + amount;
          await updateDoc(userRef, { balance: newBalance });
          console.log(`REFUND SUCCESSFUL. New balance: ${newBalance}`);
        } else {
          console.warn(`USER NOT FOUND FOR REFUND: ${userId}`);
        }
      } else {
        console.warn('MISSING USERID OR AMOUNT FOR REFUND', { userId, amount });
      }
    }
    return { success: true };
  } catch (error) {
    console.error(`CRITICAL ERROR in updateWithdrawalStatus:`, error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const results: Transaction[] = [];

    // Helper for safe doc mapping
    const mapDoc = (doc: any, type: 'Deposit' | 'Withdrawal'): Transaction => {
      const data = doc.data();
      const createdAt = data.createdAt;
      let date = 'Recently';
      
      try {
        if (createdAt && typeof createdAt.toDate === 'function') {
          date = createdAt.toDate().toISOString().replace('T', ' ').substring(0, 16);
        } else if (data.date) {
            date = data.date;
        }
      } catch (e) { /* ignore */ }

      return {
        id: doc.id,
        userId,
        type: type,
        amount: type === 'Withdrawal' ? -(Math.abs(data.amount || 0)) : (data.amount || 0),
        status: data.status === 'Approved' ? 'Completed' : (data.status || 'Pending'),
        method: data.method || 'System',
        date: date,
        createdAt: createdAt || Timestamp.now()
      } as Transaction;
    };

    // Parallel fetch with individual error handling
    const [snapUnified, snapPayments, snapWithdrawals] = await Promise.all([
      getDocs(query(collection(db, 'transactions'), where('userId', '==', userId), limit(30))).catch(err => {
        console.error("Unified Transactions fetch failed:", err);
        return { docs: [] };
      }),
      getDocs(query(collection(db, 'payments'), where('userId', '==', userId), limit(30))).catch(err => {
        console.error("Payments fetch failed:", err);
        return { docs: [] };
      }),
      getDocs(query(collection(db, 'withdrawals'), where('userId', '==', userId), limit(30))).catch(err => {
        console.error("Withdrawals fetch failed:", err);
        return { docs: [] };
      })
    ]);

    // 1. Unified
    results.push(...(snapUnified as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction)));
    
    // 2. Payments
    results.push(...(snapPayments as any).docs.map((doc: any) => mapDoc(doc, 'Deposit')));
    
    // 3. Withdrawals
    results.push(...(snapWithdrawals as any).docs.map((doc: any) => mapDoc(doc, 'Withdrawal')));

    // Deduplicate and Sort
    const uniqueMap = new Map<string, Transaction>();
    results.forEach(tx => {
      if (tx && tx.id) uniqueMap.set(tx.id, tx);
    });
    
    const unique = Array.from(uniqueMap.values());
    
    const getTimestampValue = (v: any) => {
      if (!v) return 0;
      if (v instanceof Timestamp) return v.toMillis();
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (v.seconds) return v.seconds * 1000;
      if (typeof v === 'number') return v;
      if (v instanceof Date) return v.getTime();
      return 0;
    };

    return unique.sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)).slice(0, 50);

  } catch (error) {
    console.error("Critical error in getUserTransactions:", error);
    handleFirestoreError(error, OperationType.LIST, 'multiple-paths');
    return [];
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const results: Transaction[] = [];

    // Unified
    try {
      const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    } catch (e) {
      const q = query(collection(db, 'transactions'), limit(100));
      const snapshot = await getDocs(q);
      results.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }

    // Withdrawals (fallback - only include approved/successful ones)
    try {
      const qWith = query(
        collection(db, 'withdrawals'), 
        where('status', '==', 'Approved'),
        orderBy('createdAt', 'desc'), 
        limit(100)
      );
      const snapWith = await getDocs(qWith);
      results.push(...snapWith.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          type: 'Withdrawal',
          amount: -Math.abs(data.amount),
          status: 'Completed',
          method: data.method,
          date: data.createdAt?.toDate()?.toISOString().replace('T', ' ').substring(0, 16) || 'Recently',
          createdAt: data.createdAt
        } as Transaction;
      }));
    } catch (e) { 
      // Secondary fallback if index isn't ready
      try {
        const qWith = query(collection(db, 'withdrawals'), limit(100));
        const snapWith = await getDocs(qWith);
        const filtered = snapWith.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(d => d.status === 'Approved');
          
        results.push(...filtered.map(data => ({
          id: data.id,
          userId: data.userId,
          type: 'Withdrawal',
          amount: -Math.abs(data.amount),
          status: 'Completed',
          method: data.method,
          date: data.createdAt?.toDate()?.toISOString().replace('T', ' ').substring(0, 16) || 'Recently',
          createdAt: data.createdAt
        } as Transaction)));
      } catch (err) { console.warn("Admin withdrawals total fail", err); }
    }

    const uniqueMap = new Map<string, Transaction>();
    results.forEach(tx => {
      if (tx && tx.id) uniqueMap.set(tx.id, tx);
    });

    const unique = Array.from(uniqueMap.values());

    return unique.sort((a, b) => {
      const getVal = (v: any) => {
        if (!v) return 0;
        if (v instanceof Timestamp) return v.toMillis();
        if (v.toMillis) return v.toMillis();
        if (v.seconds) return v.seconds * 1000;
        if (typeof v === 'number') return v;
        if (v instanceof Date) return v.getTime();
        return 0;
      };
      return getVal(b.createdAt) - getVal(a.createdAt);
    }).slice(0, 100);
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
}

// Registration Methods
export async function getUserRegistrations(userId: string): Promise<(TournamentRegistration & { tournament?: Tournament })[]> {
  try {
    const q = query(collection(db, 'registrations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentRegistration));
    
    // Sort by createdAt descending
    regs.sort((a, b) => {
      const getVal = (v: any) => v?.seconds || 0;
      return getVal(b.createdAt) - getVal(a.createdAt);
    });

    // Populate tournament info
    const enriched = await Promise.all(regs.map(async (reg) => {
      const tDoc = await getDocFromServer(doc(db, 'tournaments', reg.tournamentId));
      return {
        ...reg,
        tournament: tDoc.exists() ? { id: tDoc.id, ...tDoc.data() } as Tournament : undefined
      };
    }));

    return enriched;
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    return [];
  }
}

export async function registerForTournament(registration: Omit<TournamentRegistration, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; message: string }> {
  const regPath = 'registrations';
  const id = doc(collection(db, regPath)).id;
  const regRef = doc(db, regPath, id);
  const tournamentRef = doc(db, 'tournaments', registration.tournamentId);
  const userRef = doc(db, 'users', registration.userId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Fetch current status
      const userDoc = await transaction.get(userRef);
      const tourSnap = await transaction.get(tournamentRef);

      if (!userDoc.exists()) throw new Error("User profile not found.");
      if (!tourSnap.exists()) throw new Error("Tournament no longer exists.");

      const userData = userDoc.data() as UserProfile;
      const tourData = tourSnap.data() as Tournament;

      // 2. Validations
      if (tourData.slotsLeft <= 0) {
        throw new Error("Tournament is full!");
      }

      const currentBalance = Number(userData.balance || 0);
      if (currentBalance < registration.entryFee) {
        throw new Error("Insufficient balance. Please top up.");
      }

      // 3. Perform Updates
      
      // Deduct Balance
      transaction.update(userRef, { 
        balance: currentBalance - registration.entryFee,
        matchesPlayed: (userData.matchesPlayed || 0) + 1,
        updatedAt: serverTimestamp()
      });

      // Create Registration
      transaction.set(regRef, {
        ...registration,
        id,
        status: 'Registered',
        createdAt: serverTimestamp()
      });

      // Update Slots
      transaction.update(tournamentRef, {
        slotsLeft: tourData.slotsLeft - 1,
        updatedAt: serverTimestamp()
      });

      // Create Transaction Record
      const txId = `REG-${Date.now()}`;
      const txRef = doc(db, 'transactions', txId);
      transaction.set(txRef, {
        id: txId,
        userId: registration.userId,
        amount: -registration.entryFee,
        type: 'Tournament Entry',
        status: 'Completed',
        method: 'Wallet',
        tournamentId: registration.tournamentId,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        createdAt: serverTimestamp()
      });

      return { success: true, message: "Registration successful!" };
    });

      // Add Notification (outside transaction since it's non-critical if it fails, and avoids complex subcollection logic in transaction if not needed)
      try {
        await addNotification(registration.userId, {
          title: 'Registration Successful',
          message: `You have successfully joined the tournament. ৳${registration.entryFee} deducted.`,
          type: 'Match'
        });

        // Update Level Progression
        if (registration.entryFee >= 25) {
          const matchType = registration.entryFee >= 50 ? 'match_high' : 'match_low';
          await updateUserProgression(registration.userId, matchType);
        }
      } catch (e) {
        console.warn("Failed to send notification or update progression:", e);
      }

    return result;
  } catch (error: any) {
    console.error("Registration failed:", error);
    // If it's a permission error, it will contain "Missing or insufficient permissions"
    if (error.message?.includes('permissions')) {
      handleFirestoreError(error, OperationType.WRITE, regPath);
    }
    return { success: false, message: error.message || "A system error occurred." };
  }
}

export async function getTournamentRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
  const path = 'registrations';
  try {
    const q = query(collection(db, path), where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentRegistration));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function refundTournamentRegistrations(tournamentId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await cancelTournamentAndRefund(tournamentId, "Admin Canceled");
    return { success: res.success, message: res.success ? "Tournament refunded successfully" : "Refund failed" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function sendNotificationToParticipants(tournamentId: string, message: string): Promise<void> {
  const q = query(collection(db, 'registrations'), where('tournamentId', '==', tournamentId));
  const snapshot = await getDocs(q);
  const userIds = [...new Set(snapshot.docs.map(doc => doc.data().userId))];

  await Promise.all(userIds.map(userId => 
    addNotification(userId as string, {
      title: 'Tournament Update',
      message: message,
      type: 'Announcement'
    })
  ));
}

export async function cancelTournamentAndRefund(tournamentId: string, reason: string): Promise<{ success: boolean }> {
  try {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const tourSnap = await getDocFromServer(tournamentRef);
    if (!tourSnap.exists()) throw new Error("Tournament not found");
    
    const tourData = tourSnap.data() as Tournament;
    
    // Update Tournament Status to Completed/Canceled
    await updateDoc(tournamentRef, { status: 'Completed', updatedAt: serverTimestamp() }); 

    // Fetch all registrations for this tournament that are still "Registered"
    const q = query(collection(db, 'registrations'), where('tournamentId', '==', tournamentId), where('status', '==', 'Registered'));
    const snapshot = await getDocs(q);
    const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentRegistration));

    console.log(`Refunding ${registrations.length} registrations for ${tourData.title}`);

    // Process each refund
    for (const reg of registrations) {
      try {
        const userRef = doc(db, 'users', reg.userId);
        const uSnap = await getDocFromServer(userRef);
        
        if (uSnap.exists()) {
          const currentBalance = Number(uSnap.data().balance || 0);
          // 1. Update user balance
          await updateDoc(userRef, { 
            balance: currentBalance + reg.entryFee,
            updatedAt: serverTimestamp()
          });
          
          // 2. Update Registration Status
          await updateDoc(doc(db, 'registrations', reg.id), { 
            status: 'Refunded',
            updatedAt: serverTimestamp() 
          });

          // 3. Add Transaction Record
          const txId = `REF-${Date.now()}-${reg.id}`;
          await setDoc(doc(db, 'transactions', txId), {
            id: txId,
            userId: reg.userId,
            amount: reg.entryFee,
            type: 'Winning', // Using winning as a "Credit" type if "Refund" isn't explicitly mapped
            status: 'Completed',
            method: 'Wallet',
            tournamentId: reg.tournamentId,
            date: new Date().toISOString().substring(0, 16).replace('T', ' '),
            createdAt: serverTimestamp()
          });

          // 4. Add Notification
          await addNotification(reg.userId, {
            title: 'Tournament Canceled',
            message: `The tournament "${tourData.title}" has been canceled. Reason: ${reason || 'Admin Canceled'}. ৳${reg.entryFee} has been refunded to your wallet.`,
            type: 'Wallet'
          });
        }
      } catch (err) {
        console.error(`Failed to refund registration ${reg.id}:`, err);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Critical error in cancelTournamentAndRefund:", error);
    return { success: false };
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Progression and Leveling logic
export async function updateUserProgression(userId: string, type: 'match_low' | 'match_high' | 'deposit', amount?: number) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDocFromServer(userRef);
  if (!userDoc.exists()) return;
  
  const userData = userDoc.data() as UserProfile;
  const currentLevel = userData.level || 0;
  const currentXP = userData.xp || 0;
  const currentLowMatches = userData.lowMatchCount || 0;
  const currentHighMatches = userData.highMatchCount || 0;
  const currentTotalTopup = userData.totalTopupAmount || 0;
  
  let newXP = currentXP;
  let newLowMatches = currentLowMatches;
  let newHighMatches = currentHighMatches;
  let newTotalTopup = currentTotalTopup;
  
  const XP_PER_LEVEL = 200; // Updated to 200 XP per level
  
  if (type === 'match_low') {
    newLowMatches++;
    newXP += 5; // 25-49 Entry = 5 XP
  } else if (type === 'match_high') {
    newHighMatches++;
    newXP += 10; // 50+ Entry = 10 XP
  } else if (type === 'deposit' && amount) {
    newTotalTopup += amount;
    // Top-up XP Logic
    if (amount < 100) newXP += 5;
    else if (amount <= 500) newXP += 10;
    else newXP += 20;
  }
  
  const newLevel = Math.floor(newXP / XP_PER_LEVEL);
  
  const updates: any = {
    xp: newXP,
    level: newLevel,
    lowMatchCount: newLowMatches,
    highMatchCount: newHighMatches,
    totalTopupAmount: newTotalTopup,
    updatedAt: serverTimestamp()
  };
  
  if (newLevel > currentLevel) {
    // Level Up Notification
    await addNotification(userId, {
      title: 'Level Up!',
      message: `Congratulations! You've reached LEVEL ${newLevel}. Keep playing to earn rewards!`,
      type: 'Announcement'
    });
    
    // Check if it's a 10th level milestone (10, 20, 30...)
    if (newLevel > 0 && newLevel % 10 === 0) {
      await addNotification(userId, {
        title: 'Weekly Reward Unlocked! 🎁',
        message: `You've reached Level ${newLevel}! You have unlocked a Weekly Reward. Please contact Admin immediately to claim your prize!`,
        type: 'Wallet'
      });
    }
  }
  
  await updateDoc(userRef, updates);
}

// Hero Banner Methods
export function subscribeHeroBanners(callback: (banners: HeroBanner[]) => void) {
  const path = 'heroBanners';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HeroBanner)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function saveHeroBanner(banner: Partial<HeroBanner>) {
  const path = 'heroBanners';
  const id = banner.id || doc(collection(db, path)).id;
  const docRef = doc(db, path, id);
  try {
    await setDoc(docRef, {
      ...banner,
      id,
      createdAt: banner.createdAt || Timestamp.now()
    }, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
}

export async function deleteHeroBanner(id: string) {
  const path = 'heroBanners';
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
}

// Shop Methods
export function subscribeShopCategories(callback: (categories: ShopCategory[]) => void) {
  const path = 'shop_categories';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopCategory)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export function subscribeShopPackages(categoryId: string, callback: (packages: ShopPackage[]) => void) {
  const path = 'shop_packages';
  const q = query(
    collection(db, path), 
    where('categoryId', '==', categoryId),
    orderBy('price', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopPackage)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export function subscribeUserShopOrders(userId: string, callback: (orders: ShopOrder[]) => void) {
  const path = 'shop_orders';
  const q = query(
    collection(db, path), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopOrder)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export function subscribeAllShopOrders(callback: (orders: ShopOrder[]) => void) {
  const path = 'shop_orders';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopOrder)));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function createShopOrder(order: Omit<ShopOrder, 'id' | 'status' | 'createdAt'>): Promise<{ success: boolean; message: string }> {
  const path = 'shop_orders';
  const id = doc(collection(db, path)).id;
  
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', order.userId);
      const userSnap = await transaction.get(userRef);
      
      if (!userSnap.exists()) throw new Error("User not found");
      const currentBalance = userSnap.data().balance || 0;
      
      if (currentBalance < order.price) {
        throw new Error("Insufficient balance");
      }
      
      // 1. Deduct balance
      transaction.update(userRef, { 
        balance: currentBalance - order.price,
        updatedAt: serverTimestamp()
      });
      
      // 2. Create Order
      const orderRef = doc(db, path, id);
      transaction.set(orderRef, {
        ...order,
        id,
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      
      // 3. Create Transaction Record
      const txId = `SHOP-${Date.now()}-${order.userId}`;
      const txRef = doc(db, 'transactions', txId);
      transaction.set(txRef, {
        id: txId,
        userId: order.userId,
        amount: order.price,
        type: 'Tournament Entry', // We'll use this as a general "Expense" type or map it
        status: 'Completed',
        method: 'Wallet',
        date: new Date().toISOString().substring(0, 16).replace('T', ' '),
        createdAt: serverTimestamp()
      });
    });
    
    return { success: true, message: "Order placed successfully" };
  } catch (error: any) {
    console.error("Shop order failed:", error);
    return { success: false, message: error.message || "Failed to place order" };
  }
}

export async function updateShopOrder(orderId: string, updates: Partial<ShopOrder>): Promise<{ success: boolean }> {
  const path = `shop_orders/${orderId}`;
  try {
    const orderRef = doc(db, 'shop_orders', orderId);
    const orderSnap = await getDocFromServer(orderRef);
    if (!orderSnap.exists()) return { success: false };
    
    const orderData = orderSnap.data() as ShopOrder;
    
    if (updates.status === 'Rejected' && orderData.status === 'Pending') {
      // Refund balance
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', orderData.userId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          const currentBalance = userSnap.data().balance || 0;
          transaction.update(userRef, { balance: currentBalance + orderData.price });
          
          // Add notification
          const notifId = doc(collection(db, `users/${orderData.userId}/notifications`)).id;
          transaction.set(doc(db, `users/${orderData.userId}/notifications`, notifId), {
            id: notifId,
            title: 'Shop Order Rejected',
            message: `Your order for ${orderData.packageLabel} was rejected. ৳${orderData.price} has been refunded. Reason: ${updates.adminNote || 'N/A'}`,
            type: 'Wallet',
            read: false,
            createdAt: serverTimestamp()
          });
        }
        transaction.update(orderRef, { ...updates, updatedAt: serverTimestamp() });
      });
    } else if (updates.status === 'Completed' && orderData.status === 'Pending') {
      await updateDoc(orderRef, { ...updates, updatedAt: serverTimestamp() });
      await addNotification(orderData.userId, {
        title: 'Shop Order Completed',
        message: `Your order for ${orderData.packageLabel} has been completed. Check your game account!`,
        type: 'Wallet'
      });
    } else {
      await updateDoc(orderRef, { ...updates, updatedAt: serverTimestamp() });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Update shop order failed:", error);
    return { success: false };
  }
}

export async function addShopCategory(cat: Omit<ShopCategory, 'id' | 'createdAt'>) {
  const id = doc(collection(db, 'shop_categories')).id;
  await setDoc(doc(db, 'shop_categories', id), { ...cat, id, createdAt: serverTimestamp() });
}

export async function addShopPackage(pkg: Omit<ShopPackage, 'id' | 'createdAt'>) {
  const id = doc(collection(db, 'shop_packages')).id;
  await setDoc(doc(db, 'shop_packages', id), { ...pkg, id, createdAt: serverTimestamp() });
}

export async function deleteShopCategory(id: string) {
  await deleteDoc(doc(db, 'shop_categories', id));
}

export async function deleteShopPackage(id: string) {
  await deleteDoc(doc(db, 'shop_packages', id));
}

export async function updateShopCategory(id: string, updates: Partial<ShopCategory>) {
  await updateDoc(doc(db, 'shop_categories', id), updates);
}

export async function updateShopPackage(id: string, updates: Partial<ShopPackage>) {
  await updateDoc(doc(db, 'shop_packages', id), updates);
}
