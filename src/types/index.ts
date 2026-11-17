import { Timestamp } from 'firebase/firestore';

export type VipTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Grandmaster';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'wallet' | 'bKash' | 'Nagad' | 'Rocket';
export type DepositMethod = 'bKash' | 'Nagad' | 'Rocket';
export type DepositStatus = 'pending' | 'approved' | 'rejected';
export type ServerRegion = 'Bangladesh' | 'Singapore' | 'Indonesia' | 'India' | 'Europe' | 'MENA';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type AdminRole = 'super_admin' | 'manager' | 'moderator';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  vipTier: VipTier;
  rankPoints: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  totalOrders: number;
  completedOrders: number;
  lastDailyClaimAt?: string;
  dailyStreak: number;
  isBlocked: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phone?: string;
  savedPlayerUid?: string;
  savedServer?: ServerRegion;
  updatedAt: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  vipTier: VipTier;
  rankPoints: number;
  referralCode: string;
  referralCount: number;
  updatedAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  updatedAt: Timestamp;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  diamonds: number;
  priceBdt: number;
  discountPercent: number;
  salePriceBdt: number;
  imageUrl: string;
  description?: string;
  badgeText?: string;
  available: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  userDisplayName?: string;
  playerUid: string;
  serverRegion: ServerRegion;
  productId: string;
  productName: string;
  diamonds: number;
  basePrice: number;
  discountAmount: number;
  couponCode: string;
  couponDiscount: number;
  finalPrice: number;
  paymentMethod: PaymentMethod;
  paymentTrxId?: string;
  status: OrderStatus;
  adminNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Wallet {
  userId: string;
  balance: number;
  rewardPoints: number;
  totalDeposited: number;
  totalSpent: number;
  updatedAt: Timestamp;
}

export interface Deposit {
  id: string;
  userId: string;
  userDisplayName?: string;
  method: DepositMethod;
  amount: number;
  senderNumber: string;
  trxId: string;
  screenshotDataUrl?: string;
  status: DepositStatus;
  adminNote?: string;
  reviewedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'purchase' | 'refund' | 'reward' | 'referral';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdAt: Timestamp;
}

export interface Coupon {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  active: boolean;
  usageCount: number;
  usageLimit: number;
  expiresAt?: string;
  createdAt: Timestamp;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerCode: string;
  referredUserId: string;
  referredDisplayName: string;
  bonusPoints: number;
  status: 'pending' | 'credited';
  createdAt: Timestamp;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'order' | 'wallet' | 'reward' | 'promo' | 'support';
  read: boolean;
  createdAt: Timestamp;
}

export interface TicketReply {
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  message: string;
  sentAt: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string;
  userId: string;
  userDisplayName?: string;
  subject: string;
  category: 'Order Issue' | 'Deposit Verification' | 'Account & VIP' | 'General Inquiry';
  orderCode?: string;
  message: string;
  status: TicketStatus;
  replies: TicketReply[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: AdminRole;
  displayName: string;
  addedBy: string;
  createdAt: Timestamp;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  targetCollection: string;
  targetId: string;
  details: string;
  createdAt: Timestamp;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface StoreSettings {
  brandName: string;
  tagline: string;
  logoUrl: string;
  heroBannerUrl: string;
  announcement: string;
  maintenanceMode: boolean;
  flashSaleActive: boolean;
  flashSaleTitle: string;
  flashSaleEndsAt: string;
  bKashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  contactEmail: string;
  contactPhone: string;
  whatsappUrl: string;
  discordUrl: string;
  telegramUrl: string;
  facebookUrl: string;
  faqs: FaqItem[];
  updatedAt?: Timestamp;
}

export type ActiveView =
  | 'home'
  | 'store'
  | 'track'
  | 'dashboard'
  | 'wallet'
  | 'support'
  | 'admin';

export type AuthModalMode = 'login' | 'register' | 'forgot' | null;
