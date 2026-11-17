import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_COUPONS,
  DEFAULT_PRODUCTS,
  DEFAULT_STORE_SETTINGS,
  SUPER_ADMIN_EMAIL,
} from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AdminRole,
  Category,
  Coupon,
  Deposit,
  DepositMethod,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ServerRegion,
  StoreSettings,
  SupportTicket,
  TicketReply,
  TicketStatus,
  UserProfile,
  Wallet,
} from '../types';
import {
  computeVipTier,
  generateId,
  generateOrderCode,
  generateReferralCode,
  generateTicketCode,
} from '../utils/helpers';

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'adminUsers', user.uid));
    return adminSnap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `adminUsers/${user.uid}`);
  }
}

export async function seedInitialStoreData(adminUser: User): Promise<void> {
  const settingsRef = doc(db, 'settings', 'storefront');
  try {
    const existingSettings = await getDoc(settingsRef);
    const productsSnap = await getDocs(query(collection(db, 'products'), limit(1)));

    if (existingSettings.exists() && !productsSnap.empty) {
      return;
    }

    const batch = writeBatch(db);

    if (!existingSettings.exists()) {
      batch.set(settingsRef, {
        ...DEFAULT_STORE_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    }

    if (productsSnap.empty) {
      for (const cat of DEFAULT_CATEGORIES) {
        batch.set(doc(db, 'categories', cat.id), {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          sortOrder: cat.sortOrder,
          active: cat.active,
          updatedAt: serverTimestamp(),
        });
      }

      for (const prod of DEFAULT_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), {
          name: prod.name,
          category: prod.category,
          diamonds: prod.diamonds,
          priceBdt: prod.priceBdt,
          discountPercent: prod.discountPercent,
          salePriceBdt: prod.salePriceBdt,
          imageUrl: prod.imageUrl,
          description: prod.description,
          badgeText: prod.badgeText,
          available: prod.available,
          featured: prod.featured,
          sortOrder: prod.sortOrder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const coupon of DEFAULT_COUPONS) {
        batch.set(doc(db, 'coupons', coupon.code), {
          ...coupon,
          createdAt: serverTimestamp(),
        });
      }
    }

    const adminDocRef = doc(db, 'adminUsers', adminUser.uid);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists() && adminUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
      batch.set(adminDocRef, {
        uid: adminUser.uid,
        email: adminUser.email,
        role: 'super_admin',
        displayName: adminUser.displayName || 'Super Admin',
        addedBy: 'system_bootstrap',
        createdAt: serverTimestamp(),
      });
    }

    const logId = generateId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'SEED_STOREFRONT_DEFAULTS',
      targetCollection: 'settings',
      targetId: 'storefront',
      details: 'Initialized default FFZONEX categories, products, coupons, and settings.',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/storefront');
  }
}

export async function ensureUserDocuments(
  firebaseUser: User,
  referralCodeInput?: string
): Promise<void> {
  const uid = firebaseUser.uid;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');
  const walletRef = doc(db, 'wallets', uid);
  const leaderboardRef = doc(db, 'leaderboard', uid);

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const privateSnap = await getDoc(privateRef);
      if (!privateSnap.exists()) {
        await setDoc(privateRef, {
          uid,
          email: firebaseUser.email || '',
          updatedAt: serverTimestamp(),
        });
      }
      return;
    }

    const displayName =
      (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player').slice(0, 80);
    const myRefCode = generateReferralCode(uid);
    const cleanRefInput = referralCodeInput?.trim().toUpperCase() || '';

    type ReferrerSnapshot = {
      uid: string;
      referralCount: number;
      rankPoints: number;
      displayName: string;
      vipTier: string;
      referralCode: string;
    };
    let referrerUid = '';
    let referrerEntry: ReferrerSnapshot | null = null;

    if (cleanRefInput.length >= 4) {
      const lbQuery = query(
        collection(db, 'leaderboard'),
        where('referralCode', '==', cleanRefInput),
        limit(1)
      );
      const lbSnap = await getDocs(lbQuery);
      if (!lbSnap.empty) {
        const refDoc = lbSnap.docs[0];
        if (refDoc.id !== uid) {
          referrerUid = refDoc.id;
          referrerEntry = refDoc.data() as ReferrerSnapshot;
        }
      }
    }

    const batch = writeBatch(db);

    const profilePayload: Record<string, unknown> = {
      uid,
      displayName,
      vipTier: 'Bronze',
      rankPoints: 0,
      referralCode: myRefCode,
      referralCount: 0,
      totalOrders: 0,
      completedOrders: 0,
      dailyStreak: 0,
      isBlocked: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (firebaseUser.photoURL) {
      profilePayload.photoURL = firebaseUser.photoURL;
    }
    if (referrerUid) {
      profilePayload.referredBy = referrerUid;
    }

    batch.set(userRef, profilePayload);

    batch.set(privateRef, {
      uid,
      email: firebaseUser.email || '',
      updatedAt: serverTimestamp(),
    });

    batch.set(walletRef, {
      userId: uid,
      balance: 0,
      rewardPoints: 0,
      totalDeposited: 0,
      totalSpent: 0,
      updatedAt: serverTimestamp(),
    });

    batch.set(leaderboardRef, {
      uid,
      displayName,
      vipTier: 'Bronze',
      rankPoints: 0,
      referralCode: myRefCode,
      referralCount: 0,
      updatedAt: serverTimestamp(),
    });

    const welcomeNotifId = generateId('notif');
    batch.set(doc(db, 'notifications', welcomeNotifId), {
      userId: uid,
      title: 'Welcome to FFZONEX',
      message: `Your account is ready. Share referral code ${myRefCode} to earn bonus rank points.`,
      category: 'reward',
      read: false,
      createdAt: serverTimestamp(),
    });

    if (referrerUid && referrerEntry) {
      const refId = generateId('ref');
      batch.set(doc(db, 'referrals', refId), {
        referrerId: referrerUid,
        referrerCode: cleanRefInput,
        referredUserId: uid,
        referredDisplayName: displayName,
        bonusPoints: 50,
        status: 'credited',
        createdAt: serverTimestamp(),
      });

      batch.update(doc(db, 'leaderboard', referrerUid), {
        referralCount: referrerEntry.referralCount + 1,
        rankPoints: referrerEntry.rankPoints + 50,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    photoURL?: string;
    phone?: string;
    savedPlayerUid?: string;
    savedServer?: ServerRegion;
  }
): Promise<void> {
  try {
    const batch = writeBatch(db);
    if (updates.displayName !== undefined || updates.photoURL !== undefined) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const current = userSnap.data() as UserProfile;
        const newName = (updates.displayName ?? current.displayName).trim().slice(0, 80);
        const userPatch: Record<string, unknown> = {
          displayName: newName,
          updatedAt: serverTimestamp(),
        };
        if (updates.photoURL !== undefined && updates.photoURL.trim()) {
          userPatch.photoURL = updates.photoURL.trim().slice(0, 1000);
        }
        batch.update(doc(db, 'users', uid), userPatch);
        batch.update(doc(db, 'leaderboard', uid), {
          displayName: newName,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (
      updates.phone !== undefined ||
      updates.savedPlayerUid !== undefined ||
      updates.savedServer !== undefined
    ) {
      const privPatch: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (updates.phone !== undefined) privPatch.phone = updates.phone.trim().slice(0, 32);
      if (updates.savedPlayerUid !== undefined)
        privPatch.savedPlayerUid = updates.savedPlayerUid.trim().slice(0, 24);
      if (updates.savedServer !== undefined) privPatch.savedServer = updates.savedServer;

      batch.update(doc(db, 'users', uid, 'private', 'info'), privPatch);
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function validateCouponCode(
  code: string,
  orderAmount: number
): Promise<{ coupon: Coupon; discountAmount: number }> {
  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, '');
  if (!cleanCode || cleanCode.length < 3) {
    throw new Error('Enter a valid promo code.');
  }
  try {
    const couponSnap = await getDoc(doc(db, 'coupons', cleanCode));
    if (!couponSnap.exists()) {
      throw new Error('Promo code not found.');
    }
    const coupon = couponSnap.data() as Coupon;
    if (!coupon.active) {
      throw new Error('This promo code is currently inactive.');
    }
    if (coupon.usageCount >= coupon.usageLimit) {
      throw new Error('This promo code has reached its usage limit.');
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      throw new Error('This promo code has expired.');
    }
    if (orderAmount < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount for ${cleanCode} is ৳${coupon.minOrderAmount}.`);
    }

    let discount =
      coupon.discountType === 'percent'
        ? Math.round((orderAmount * coupon.discountValue) / 100)
        : coupon.discountValue;

    discount = Math.min(discount, coupon.maxDiscount, orderAmount);
    return { coupon, discountAmount: Math.max(0, discount) };
  } catch (err) {
    if (err instanceof Error && !err.message.includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, `coupons/${cleanCode}`);
  }
}

export async function placeOrderAtomic(params: {
  user: User;
  profile: UserProfile;
  wallet: Wallet;
  product: Product;
  playerUid: string;
  serverRegion: ServerRegion;
  paymentMethod: PaymentMethod;
  paymentTrxId?: string;
  couponCode?: string;
}): Promise<{ orderId: string; orderCode: string }> {
  const {
    user,
    profile,
    wallet,
    product,
    playerUid,
    serverRegion,
    paymentMethod,
    paymentTrxId,
    couponCode,
  } = params;

  const cleanPlayerUid = playerUid.trim().replace(/\D/g, '');
  if (cleanPlayerUid.length < 5 || cleanPlayerUid.length > 20) {
    throw new Error('Free Fire Player UID must be 5 to 20 digits.');
  }
  if (profile.isBlocked) {
    throw new Error('Your account is currently suspended. Contact customer support.');
  }

  // Re-fetch authoritative product price from Firestore
  let liveProduct: Product;
  try {
    const prodSnap = await getDoc(doc(db, 'products', product.id));
    if (!prodSnap.exists()) {
      throw new Error('Selected product is no longer available.');
    }
    liveProduct = { id: prodSnap.id, ...(prodSnap.data() as Omit<Product, 'id'>) };
  } catch (err) {
    if (err instanceof Error && err.message.includes('no longer available')) throw err;
    handleFirestoreError(err, OperationType.GET, `products/${product.id}`);
  }

  if (!liveProduct.available) {
    throw new Error('This package is currently out of stock.');
  }

  let appliedCouponCode = '';
  let couponDiscount = 0;

  if (couponCode && couponCode.trim()) {
    const validated = await validateCouponCode(couponCode, liveProduct.salePriceBdt);
    appliedCouponCode = validated.coupon.code;
    couponDiscount = validated.discountAmount;
  }

  const finalPrice = Math.max(0, liveProduct.salePriceBdt - couponDiscount);
  const discountAmount = Math.max(0, liveProduct.priceBdt - liveProduct.salePriceBdt);

  if (paymentMethod === 'wallet' && wallet.balance < finalPrice) {
    throw new Error(
      `Insufficient wallet balance (৳${wallet.balance}). Deposit funds or pay via bKash/Nagad/Rocket.`
    );
  }

  if (paymentMethod !== 'wallet' && (!paymentTrxId || paymentTrxId.trim().length < 5)) {
    throw new Error('Please enter a valid payment Transaction ID (TrxID).');
  }

  const orderId = generateId('ord');
  const orderCode = generateOrderCode();
  const batch = writeBatch(db);

  const orderData: Record<string, unknown> = {
    orderCode,
    userId: user.uid,
    userDisplayName: profile.displayName,
    playerUid: cleanPlayerUid,
    serverRegion,
    productId: liveProduct.id,
    productName: liveProduct.name,
    diamonds: liveProduct.diamonds,
    basePrice: liveProduct.priceBdt,
    discountAmount,
    couponCode: appliedCouponCode,
    couponDiscount,
    finalPrice,
    paymentMethod,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (paymentMethod !== 'wallet' && paymentTrxId) {
    orderData.paymentTrxId = paymentTrxId.trim().toUpperCase().slice(0, 64);
  }

  batch.set(doc(db, 'orders', orderId), orderData);

  const earnedPoints = 10;
  const newRankPoints = profile.rankPoints + earnedPoints;
  const newVipTier = computeVipTier(newRankPoints);

  batch.update(doc(db, 'users', user.uid), {
    totalOrders: profile.totalOrders + 1,
    rankPoints: newRankPoints,
    vipTier: newVipTier,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'leaderboard', user.uid), {
    vipTier: newVipTier,
    rankPoints: newRankPoints,
    updatedAt: serverTimestamp(),
  });

  if (paymentMethod === 'wallet') {
    const newBalance = wallet.balance - finalPrice;
    batch.update(doc(db, 'wallets', user.uid), {
      balance: newBalance,
      totalSpent: wallet.totalSpent + finalPrice,
      rewardPoints: wallet.rewardPoints + earnedPoints,
      updatedAt: serverTimestamp(),
    });

    const txId = generateId('tx');
    batch.set(doc(db, 'transactions', txId), {
      userId: user.uid,
      type: 'purchase',
      amount: -finalPrice,
      balanceAfter: newBalance,
      referenceId: orderCode,
      description: `Order ${orderCode} · ${liveProduct.name} (UID ${cleanPlayerUid})`,
      createdAt: serverTimestamp(),
    });
  }

  if (appliedCouponCode) {
    const couponSnap = await getDoc(doc(db, 'coupons', appliedCouponCode));
    if (couponSnap.exists()) {
      const cData = couponSnap.data() as Coupon;
      batch.update(doc(db, 'coupons', appliedCouponCode), {
        usageCount: cData.usageCount + 1,
      });
    }
  }

  const notifId = generateId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    userId: user.uid,
    title: `Order Placed · ${orderCode}`,
    message: `${liveProduct.name} for Player UID ${cleanPlayerUid} (${serverRegion}) is queued for delivery.`,
    category: 'order',
    read: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { orderId, orderCode };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function submitDepositAtomic(params: {
  user: User;
  profile: UserProfile;
  method: DepositMethod;
  amount: number;
  senderNumber: string;
  trxId: string;
  screenshotDataUrl?: string;
}): Promise<string> {
  const { user, profile, method, amount, senderNumber, trxId, screenshotDataUrl } = params;
  const cleanTrxId = trxId.trim().toUpperCase().replace(/[^A-Za-z0-9_\-]/g, '');
  if (cleanTrxId.length < 5 || cleanTrxId.length > 48) {
    throw new Error('Transaction ID must be 5 to 48 alphanumeric characters.');
  }
  if (amount < 10 || amount > 100000) {
    throw new Error('Deposit amount must be between ৳10 and ৳100,000.');
  }
  if (senderNumber.trim().length < 8) {
    throw new Error('Enter a valid sender mobile number.');
  }

  try {
    const usedSnap = await getDoc(doc(db, 'usedTrxIds', cleanTrxId));
    if (usedSnap.exists()) {
      throw new Error('This Transaction ID has already been submitted. Duplicate deposits are blocked.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('already been submitted')) throw err;
    handleFirestoreError(err, OperationType.GET, `usedTrxIds/${cleanTrxId}`);
  }

  const depositId = generateId('dep');
  const batch = writeBatch(db);

  const depPayload: Record<string, unknown> = {
    userId: user.uid,
    userDisplayName: profile.displayName,
    method,
    amount: Math.round(amount),
    senderNumber: senderNumber.trim().slice(0, 20),
    trxId: cleanTrxId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (screenshotDataUrl) {
    depPayload.screenshotDataUrl = screenshotDataUrl;
  }

  batch.set(doc(db, 'deposits', depositId), depPayload);
  batch.set(doc(db, 'usedTrxIds', cleanTrxId), {
    trxId: cleanTrxId,
    depositId,
    userId: user.uid,
    createdAt: serverTimestamp(),
  });

  const notifId = generateId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    userId: user.uid,
    title: `Deposit Submitted · ৳${Math.round(amount)}`,
    message: `Your ${method} deposit (TrxID: ${cleanTrxId}) is awaiting admin verification.`,
    category: 'wallet',
    read: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return depositId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deposits/${depositId}`);
  }
}

export async function claimDailyRewardAtomic(
  uid: string,
  profile: UserProfile,
  wallet: Wallet
): Promise<number> {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  if (profile.lastDailyClaimAt && profile.lastDailyClaimAt.slice(0, 10) === todayKey) {
    throw new Error('Daily check-in reward already claimed today. Come back tomorrow.');
  }

  const bonusPoints = 25;
  const newRankPoints = profile.rankPoints + bonusPoints;
  const newVipTier = computeVipTier(newRankPoints);
  const newStreak = profile.dailyStreak + 1;

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), {
    lastDailyClaimAt: now.toISOString(),
    dailyStreak: newStreak,
    rankPoints: newRankPoints,
    vipTier: newVipTier,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'leaderboard', uid), {
    rankPoints: newRankPoints,
    vipTier: newVipTier,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'wallets', uid), {
    rewardPoints: wallet.rewardPoints + bonusPoints,
    updatedAt: serverTimestamp(),
  });

  const txId = generateId('tx');
  batch.set(doc(db, 'transactions', txId), {
    userId: uid,
    type: 'reward',
    amount: bonusPoints,
    balanceAfter: wallet.balance,
    referenceId: `DAILY-${todayKey}`,
    description: `Daily Check-in Streak #${newStreak} (+${bonusPoints} pts)`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return bonusPoints;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function createSupportTicket(params: {
  user: User;
  profile: UserProfile;
  subject: string;
  category: SupportTicket['category'];
  orderCode?: string;
  message: string;
}): Promise<string> {
  const ticketId = generateId('tkt');
  const ticketCode = generateTicketCode();
  try {
    await setDoc(doc(db, 'supportTickets', ticketId), {
      ticketCode,
      userId: params.user.uid,
      userDisplayName: params.profile.displayName,
      subject: params.subject.trim().slice(0, 120),
      category: params.category,
      orderCode: params.orderCode?.trim().slice(0, 32) || '',
      message: params.message.trim().slice(0, 1500),
      status: 'open',
      replies: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ticketCode;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `supportTickets/${ticketId}`);
  }
}

export async function replySupportTicket(params: {
  ticket: SupportTicket;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  message: string;
  newStatus?: TicketStatus;
}): Promise<void> {
  const newReply: TicketReply = {
    senderId: params.senderId,
    senderName: params.senderName,
    isAdmin: params.isAdmin,
    message: params.message.trim().slice(0, 800),
    sentAt: new Date().toISOString(),
  };

  const nextReplies = [...(params.ticket.replies || []), newReply].slice(-50);
  const patch: Record<string, unknown> = {
    replies: nextReplies,
    updatedAt: serverTimestamp(),
  };
  if (params.isAdmin && params.newStatus) {
    patch.status = params.newStatus;
  }

  try {
    await updateDoc(doc(db, 'supportTickets', params.ticket.id), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `supportTickets/${params.ticket.id}`);
  }
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

export async function adminReviewDepositAtomic(params: {
  adminUser: User;
  deposit: Deposit;
  decision: 'approved' | 'rejected';
  adminNote: string;
}): Promise<void> {
  const { adminUser, deposit, decision, adminNote } = params;
  if (deposit.status !== 'pending') {
    throw new Error('This deposit has already been reviewed.');
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'deposits', deposit.id), {
    status: decision,
    adminNote: adminNote.trim().slice(0, 300),
    reviewedBy: adminUser.email || adminUser.uid,
    updatedAt: serverTimestamp(),
  });

  if (decision === 'approved') {
    const walletRef = doc(db, 'wallets', deposit.userId);
    const walletSnap = await getDoc(walletRef);
    const currentWallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { userId: deposit.userId, balance: 0, rewardPoints: 0, totalDeposited: 0, totalSpent: 0 };

    const newBalance = currentWallet.balance + deposit.amount;
    if (walletSnap.exists()) {
      batch.update(walletRef, {
        balance: newBalance,
        totalDeposited: currentWallet.totalDeposited + deposit.amount,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(walletRef, {
        userId: deposit.userId,
        balance: newBalance,
        rewardPoints: 0,
        totalDeposited: deposit.amount,
        totalSpent: 0,
        updatedAt: serverTimestamp(),
      });
    }

    const txId = generateId('tx');
    batch.set(doc(db, 'transactions', txId), {
      userId: deposit.userId,
      type: 'deposit',
      amount: deposit.amount,
      balanceAfter: newBalance,
      referenceId: deposit.trxId,
      description: `Verified ${deposit.method} deposit (TrxID: ${deposit.trxId})`,
      createdAt: serverTimestamp(),
    });
  }

  const notifId = generateId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    userId: deposit.userId,
    title:
      decision === 'approved'
        ? `Deposit Approved · +৳${deposit.amount}`
        : `Deposit Rejected · ৳${deposit.amount}`,
    message:
      decision === 'approved'
        ? `Your ${deposit.method} deposit (TrxID: ${deposit.trxId}) was verified and credited to your wallet.`
        : `Your ${deposit.method} deposit (TrxID: ${deposit.trxId}) was rejected. ${adminNote || 'Contact support for assistance.'}`,
    category: 'wallet',
    read: false,
    createdAt: serverTimestamp(),
  });

  const logId = generateId('log');
  batch.set(doc(db, 'auditLogs', logId), {
    actorId: adminUser.uid,
    actorEmail: adminUser.email || '',
    action: decision === 'approved' ? 'APPROVE_DEPOSIT' : 'REJECT_DEPOSIT',
    targetCollection: 'deposits',
    targetId: deposit.id,
    details: `${decision.toUpperCase()} ৳${deposit.amount} (${deposit.method} ${deposit.trxId}) for ${deposit.userId}. Note: ${adminNote || 'None'}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deposits/${deposit.id}`);
  }
}

export async function adminUpdateOrderStatusAtomic(params: {
  adminUser: User;
  order: Order;
  newStatus: OrderStatus;
  adminNote: string;
}): Promise<void> {
  const { adminUser, order, newStatus, adminNote } = params;
  const batch = writeBatch(db);

  batch.update(doc(db, 'orders', order.id), {
    status: newStatus,
    adminNote: adminNote.trim().slice(0, 300),
    updatedAt: serverTimestamp(),
  });

  if (newStatus === 'completed' && order.status !== 'completed') {
    const userSnap = await getDoc(doc(db, 'users', order.userId));
    if (userSnap.exists()) {
      const uData = userSnap.data() as UserProfile;
      const newPoints = uData.rankPoints + 25;
      const newTier = computeVipTier(newPoints);
      batch.update(doc(db, 'users', order.userId), {
        completedOrders: uData.completedOrders + 1,
        rankPoints: newPoints,
        vipTier: newTier,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'leaderboard', order.userId), {
        rankPoints: newPoints,
        vipTier: newTier,
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (newStatus === 'refunded' && order.status !== 'refunded' && order.finalPrice > 0) {
    const walletSnap = await getDoc(doc(db, 'wallets', order.userId));
    if (walletSnap.exists()) {
      const wData = walletSnap.data() as Wallet;
      const newBalance = wData.balance + order.finalPrice;
      batch.update(doc(db, 'wallets', order.userId), {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });
      const txId = generateId('tx');
      batch.set(doc(db, 'transactions', txId), {
        userId: order.userId,
        type: 'refund',
        amount: order.finalPrice,
        balanceAfter: newBalance,
        referenceId: order.orderCode,
        description: `Refund for Order ${order.orderCode} (${order.productName})`,
        createdAt: serverTimestamp(),
      });
    }
  }

  const notifId = generateId('notif');
  batch.set(doc(db, 'notifications', notifId), {
    userId: order.userId,
    title: `Order ${order.orderCode} · ${newStatus.toUpperCase()}`,
    message: `Your ${order.productName} order for UID ${order.playerUid} is now ${newStatus}.${adminNote ? ` Note: ${adminNote}` : ''}`,
    category: 'order',
    read: false,
    createdAt: serverTimestamp(),
  });

  const logId = generateId('log');
  batch.set(doc(db, 'auditLogs', logId), {
    actorId: adminUser.uid,
    actorEmail: adminUser.email || '',
    action: `ORDER_STATUS_${newStatus.toUpperCase()}`,
    targetCollection: 'orders',
    targetId: order.id,
    details: `Order ${order.orderCode} changed ${order.status} -> ${newStatus}. Note: ${adminNote || 'None'}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
  }
}

export async function adminSaveProduct(
  adminUser: User,
  productInput: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'salePriceBdt'> & { id?: string }
): Promise<void> {
  const id = productInput.id || generateId('prod');
  const salePriceBdt = Math.max(
    1,
    Math.round(productInput.priceBdt * (1 - productInput.discountPercent / 100))
  );

  const batch = writeBatch(db);
  const payload: Record<string, unknown> = {
    name: productInput.name.trim().slice(0, 100),
    category: productInput.category.trim().slice(0, 60),
    diamonds: Number(productInput.diamonds),
    priceBdt: Number(productInput.priceBdt),
    discountPercent: Number(productInput.discountPercent),
    salePriceBdt,
    imageUrl: productInput.imageUrl.trim().slice(0, 1000),
    description: (productInput.description || '').trim().slice(0, 400),
    badgeText: (productInput.badgeText || '').trim().slice(0, 40),
    available: Boolean(productInput.available),
    featured: Boolean(productInput.featured),
    sortOrder: Number(productInput.sortOrder) || 1,
    updatedAt: serverTimestamp(),
  };

  if (productInput.id) {
    batch.update(doc(db, 'products', id), payload);
  } else {
    payload.createdAt = serverTimestamp();
    batch.set(doc(db, 'products', id), payload);
  }

  batch.set(doc(db, 'auditLogs', generateId('log')), {
    actorId: adminUser.uid,
    actorEmail: adminUser.email || '',
    action: productInput.id ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
    targetCollection: 'products',
    targetId: id,
    details: `${productInput.name} · ৳${salePriceBdt}`,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
  }
}

export async function adminDeleteProduct(adminUser: User, productId: string, name: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', productId));
    await setDoc(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'DELETE_PRODUCT',
      targetCollection: 'products',
      targetId: productId,
      details: `Deleted product ${name}`,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

export async function adminSaveCategory(
  adminUser: User,
  cat: Omit<Category, 'id' | 'updatedAt'> & { id?: string }
): Promise<void> {
  const id = cat.id || generateId('cat');
  try {
    await setDoc(
      doc(db, 'categories', id),
      {
        name: cat.name.trim().slice(0, 60),
        slug: cat.slug.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '-').slice(0, 60),
        description: (cat.description || '').trim().slice(0, 240),
        sortOrder: Number(cat.sortOrder) || 1,
        active: Boolean(cat.active),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'SAVE_CATEGORY',
      targetCollection: 'categories',
      targetId: id,
      details: `Saved category ${cat.name}`,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
  }
}

export async function adminSaveCoupon(
  adminUser: User,
  coupon: Omit<Coupon, 'createdAt' | 'usageCount'> & { usageCount?: number }
): Promise<void> {
  const code = coupon.code.trim().toUpperCase().replace(/[^A-Z0-9_\-]/g, '');
  if (code.length < 3) throw new Error('Coupon code must be at least 3 characters.');
  try {
    const existing = await getDoc(doc(db, 'coupons', code));
    const batch = writeBatch(db);
    if (existing.exists()) {
      batch.update(doc(db, 'coupons', code), {
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderAmount: Number(coupon.minOrderAmount),
        maxDiscount: Number(coupon.maxDiscount),
        active: Boolean(coupon.active),
        usageLimit: Number(coupon.usageLimit),
        expiresAt: coupon.expiresAt || '',
      });
    } else {
      batch.set(doc(db, 'coupons', code), {
        code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderAmount: Number(coupon.minOrderAmount),
        maxDiscount: Number(coupon.maxDiscount),
        active: Boolean(coupon.active),
        usageCount: 0,
        usageLimit: Number(coupon.usageLimit),
        expiresAt: coupon.expiresAt || '',
        createdAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'SAVE_COUPON',
      targetCollection: 'coupons',
      targetId: code,
      details: `Saved coupon ${code} (${coupon.discountType} ${coupon.discountValue})`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `coupons/${code}`);
  }
}

export async function adminToggleUserBlock(
  adminUser: User,
  targetUser: UserProfile,
  block: boolean
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUser.uid), {
      isBlocked: block,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: block ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetCollection: 'users',
      targetId: targetUser.uid,
      details: `${block ? 'Blocked' : 'Unblocked'} user ${targetUser.displayName}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function adminUpdateUserDetails(
  adminUser: User,
  targetUid: string,
  updates: { displayName: string; vipTier: UserProfile['vipTier']; rankPoints: number }
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUid), {
      displayName: updates.displayName.trim().slice(0, 80),
      vipTier: updates.vipTier,
      rankPoints: Number(updates.rankPoints),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'leaderboard', targetUid), {
      displayName: updates.displayName.trim().slice(0, 80),
      vipTier: updates.vipTier,
      rankPoints: Number(updates.rankPoints),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'UPDATE_USER_PROFILE',
      targetCollection: 'users',
      targetId: targetUid,
      details: `Updated VIP=${updates.vipTier}, Points=${updates.rankPoints}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function adminSaveStoreSettings(
  adminUser: User,
  settings: StoreSettings
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'storefront'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'UPDATE_STORE_SETTINGS',
      targetCollection: 'settings',
      targetId: 'storefront',
      details: `Updated storefront settings (maintenance=${settings.maintenanceMode}, flashSale=${settings.flashSaleActive})`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/storefront');
  }
}

export async function adminAddRoleUser(
  adminUser: User,
  payload: { uid: string; email: string; displayName: string; role: AdminRole }
): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'adminUsers', payload.uid.trim()), {
      uid: payload.uid.trim(),
      email: payload.email.trim(),
      displayName: payload.displayName.trim(),
      role: payload.role,
      addedBy: adminUser.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'auditLogs', generateId('log')), {
      actorId: adminUser.uid,
      actorEmail: adminUser.email || '',
      action: 'ASSIGN_ADMIN_ROLE',
      targetCollection: 'adminUsers',
      targetId: payload.uid.trim(),
      details: `Assigned role ${payload.role} to ${payload.email}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `adminUsers/${payload.uid}`);
  }
}
