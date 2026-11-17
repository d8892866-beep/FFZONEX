import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  checkIsAdmin,
  ensureUserDocuments,
  seedInitialStoreData,
} from '../services/firestoreService';
import { UserPrivateInfo, UserProfile, Wallet } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  privateInfo: UserPrivateInfo | null;
  wallet: Wallet | null;
  isAdmin: boolean;
  authReady: boolean;
  connectionOk: boolean;
  signInWithGoogle: (referralCode?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
  }) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  changeUserPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [connectionOk, setConnectionOk] = useState(true);

  useEffect(() => {
    testFirestoreConnection().then((ok) => setConnectionOk(ok));
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubPrivate: (() => void) | undefined;
    let unsubWallet: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubProfile?.();
      unsubPrivate?.();
      unsubWallet?.();

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setPrivateInfo(null);
        setWallet(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const pendingRef = localStorage.getItem('ffzonex_pending_ref') || undefined;
        await ensureUserDocuments(user, pendingRef);
        if (pendingRef) localStorage.removeItem('ffzonex_pending_ref');

        const adminStatus = await checkIsAdmin(user);
        setIsAdmin(adminStatus);
        if (adminStatus) {
          await seedInitialStoreData(user);
        }

        unsubProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
        );

        unsubPrivate = onSnapshot(
          doc(db, 'users', user.uid, 'private', 'info'),
          (snap) => {
            if (snap.exists()) {
              setPrivateInfo(snap.data() as UserPrivateInfo);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/private/info`)
        );

        unsubWallet = onSnapshot(
          doc(db, 'wallets', user.uid),
          (snap) => {
            if (snap.exists()) {
              setWallet(snap.data() as Wallet);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `wallets/${user.uid}`)
        );
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubPrivate?.();
      unsubWallet?.();
    };
  }, []);

  const signInWithGoogle = async (referralCode?: string) => {
    if (referralCode?.trim()) {
      localStorage.setItem('ffzonex_pending_ref', referralCode.trim().toUpperCase());
    }
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDocuments(result.user, referralCode);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmail = async ({
    name,
    email,
    password,
    referralCode,
  }: {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
  }) => {
    if (referralCode?.trim()) {
      localStorage.setItem('ffzonex_pending_ref', referralCode.trim().toUpperCase());
    }
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await sendEmailVerification(cred.user);
    await ensureUserDocuments(cred.user, referralCode);
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const changeUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('Not signed in.');
    await updatePassword(auth.currentUser, newPassword);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        privateInfo,
        wallet,
        isAdmin,
        authReady,
        connectionOk,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendResetEmail,
        changeUserPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
