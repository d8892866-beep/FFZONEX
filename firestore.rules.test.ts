/**
 * Phase 0: Security Rules Verification Spec ("Dirty Dozen" Adversarial Suite)
 * Defines the expected PERMISSION_DENIED assertions for FFZONEX Firestore rules.
 */

export interface SecurityTestCase {
  id: string;
  title: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED' | 'ALLOW';
  rationale: string;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 'DD-01',
    title: 'Unverified Admin Email Spoof',
    collectionPath: 'products/ff_100',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'isAdmin() mandates email_verified == true when matching admin email.',
  },
  {
    id: 'DD-02',
    title: 'Price Tampering on Order Creation',
    collectionPath: 'orders/ord_tampered',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Order create verifies basePrice == product.priceBdt and finalPrice >= product.salePriceBdt - couponDiscount.',
  },
  {
    id: 'DD-03',
    title: 'Direct Wallet Balance Inflation',
    collectionPath: 'wallets/user_attacker',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Users cannot increase their own wallet balance; only admin deposit approval or atomic wallet deduction is permitted.',
  },
  {
    id: 'DD-04',
    title: 'Negative Wallet Balance Overdraft',
    collectionPath: 'wallets/user_attacker',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Wallet balance invariant requires incoming().balance >= 0.',
  },
  {
    id: 'DD-05',
    title: 'User Self-Approving Deposit',
    collectionPath: 'deposits/dep_001',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Only isAdmin() can update deposit status after creation.',
  },
  {
    id: 'DD-06',
    title: 'Duplicate Transaction ID Replay',
    collectionPath: 'usedTrxIds/BKX998877',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'usedTrxIds enforces !exists() on create and forbids update/delete.',
  },
  {
    id: 'DD-07',
    title: 'Shadow Field Injection on Profile',
    collectionPath: 'users/user_attacker',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidUserProfile enforces keys().hasOnly([...]) blocking shadow RBAC fields.',
  },
  {
    id: 'DD-08',
    title: 'Cross-User PII Access',
    collectionPath: 'users/user_victim/private/info',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    rationale: 'Private subcollection restricts read strictly to isOwner(userId) || isAdmin().',
  },
  {
    id: 'DD-09',
    title: 'Blanket Orders List Scraping',
    collectionPath: 'orders',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'allow list requires resource.data.userId == request.auth.uid || isAdmin().',
  },
  {
    id: 'DD-10',
    title: 'Path Variable ID Poisoning',
    collectionPath: 'orders/' + 'A'.repeat(256),
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidId(orderId) rejects IDs longer than 128 chars or containing invalid symbols.',
  },
  {
    id: 'DD-11',
    title: 'Client Timestamp Backdating',
    collectionPath: 'orders/ord_backdated',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Temporal integrity requires incoming().createdAt == request.time.',
  },
  {
    id: 'DD-12',
    title: 'Audit Log Tampering / Deletion',
    collectionPath: 'auditLogs/log_001',
    operation: 'delete',
    expected: 'PERMISSION_DENIED',
    rationale: 'auditLogs collection forbids update and delete for all actors including admins.',
  },
];
