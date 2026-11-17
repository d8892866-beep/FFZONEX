import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_STORE_SETTINGS,
} from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AppNotification,
  Category,
  Deposit,
  LeaderboardEntry,
  Order,
  Product,
  Referral,
  StoreSettings,
  SupportTicket,
  WalletTransaction,
} from '../types';
import { useAuth } from './AuthContext';

interface StoreContextValue {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  deposits: Deposit[];
  transactions: WalletTransaction[];
  notifications: AppNotification[];
  tickets: SupportTicket[];
  referrals: Referral[];
  leaderboard: LeaderboardEntry[];
  catalogFromFirestore: boolean;
  unreadNotifications: number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function byCreatedDesc<T extends { createdAt?: Timestamp }>(a: T, b: T): number {
  const ta = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
  const tb = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
  return tb - ta;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, authReady } = useAuth();

  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [categories, setCategories] = useState<Category[]>(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, updatedAt: Timestamp.now() }))
  );
  const [products, setProducts] = useState<Product[]>(
    DEFAULT_PRODUCTS.map((p) => ({
      ...p,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }))
  );
  const [catalogFromFirestore, setCatalogFromFirestore] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'storefront'),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as StoreSettings);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/storefront')
    );

    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
            .sort((a, b) => a.sortOrder - b.sortOrder);
          setCategories(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const unsubProds = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
            .sort((a, b) => a.sortOrder - b.sortOrder);
          setProducts(list);
          setCatalogFromFirestore(true);
        } else {
          setCatalogFromFirestore(false);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubLeaderboard = onSnapshot(
      query(collection(db, 'leaderboard'), orderBy('rankPoints', 'desc'), limit(15)),
      (snap) => {
        setLeaderboard(snap.docs.map((d) => d.data() as LeaderboardEntry));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'leaderboard')
    );

    return () => {
      unsubSettings();
      unsubCats();
      unsubProds();
      unsubLeaderboard();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setOrders([]);
      setDeposits([]);
      setTransactions([]);
      setNotifications([]);
      setTickets([]);
      setReferrals([]);
      return;
    }

    const uid = firebaseUser.uid;

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
          .sort(byCreatedDesc);
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubDeposits = onSnapshot(
      query(collection(db, 'deposits'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Deposit, 'id'>) }))
          .sort(byCreatedDesc);
        setDeposits(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'deposits')
    );

    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, 'id'>) }))
          .sort(byCreatedDesc);
        setTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
          .sort(byCreatedDesc);
        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const unsubTickets = onSnapshot(
      query(collection(db, 'supportTickets'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicket, 'id'>) }))
          .sort(byCreatedDesc);
        setTickets(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'supportTickets')
    );

    const unsubReferrals = onSnapshot(
      query(collection(db, 'referrals'), where('referrerId', '==', uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Referral, 'id'>) }))
          .sort(byCreatedDesc);
        setReferrals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'referrals')
    );

    return () => {
      unsubOrders();
      unsubDeposits();
      unsubTx();
      unsubNotifs();
      unsubTickets();
      unsubReferrals();
    };
  }, [authReady, firebaseUser]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        products,
        orders,
        deposits,
        transactions,
        notifications,
        tickets,
        referrals,
        leaderboard,
        catalogFromFirestore,
        unreadNotifications,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
