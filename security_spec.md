# FFZONEX Security Specification (Phase 0)

## 1. Data Invariants
1. **Order Price Integrity**: Every order in `/orders/{orderId}` must reference an existing, available `/products/{productId}`. `basePrice` must equal `product.priceBdt`, and `finalPrice` must match `product.salePriceBdt - couponDiscount` (`finalPrice >= 0`). Clients cannot supply arbitrary lower prices.
2. **Wallet Atomicity & Non-Negative Balance**: A user cannot increment their own `/wallets/{userId}.balance`. A user can only initialize their wallet with `balance == 0` or decrement `balance` inside an atomic batch that simultaneously creates a valid `wallet`-paid order in `/orders/{orderId}` with `newBalance == oldBalance - order.finalPrice >= 0`.
3. **Manual Deposit Verification**: Users can only submit `/deposits/{depositId}` with `status == 'pending'`. Only verified admins (`isAdmin()`) can transition a deposit to `approved` or `rejected` and credit the user's wallet.
4. **Duplicate TrxID Prevention**: Every deposit must simultaneously create `/usedTrxIds/{trxId}` (write-once, never update/delete by users), making duplicate Transaction ID reuse impossible.
5. **PII Isolation**: User emails, phone numbers, and saved player UIDs live in `/users/{userId}/private/info` and are strictly readable only by the document owner or an admin (`isOwner(userId) || isAdmin()`).
6. **Admin RBAC Protection**: Only bootstrapped super admin (`d8892866@gmail.com` with `email_verified == true`) or existing `/adminUsers/{uid}` entries have admin privileges. Self-promotion via `/users/{uid}` or `/adminUsers/{uid}` is forbidden.
7. **Terminal State Locking**: Once an order reaches `completed`, `cancelled`, or `refunded`, or a deposit reaches `approved` or `rejected`, non-admin writes are blocked and `auditLogs` / `transactions` are immutable.
8. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: Request with `email: "d8892866@gmail.com"`, `email_verified: false` attempting to update `/products/ff_100`.
2. **Price Tampering on Order Create**: Authenticated user creating `/orders/ord1` with `productId: "ff_520"`, `finalPrice: 1` (actual `salePriceBdt: 380`).
3. **Self-Credit Wallet Attack**: Authenticated user updating `/wallets/{uid}` directly to `{ balance: 999999 }`.
4. **Wallet Overdraft Purchase**: Authenticated user with `balance: 50` submitting atomic batch for a `380` BDT order resulting in `balance: -330`.
5. **Self-Approve Deposit**: Authenticated user updating `/deposits/dep1` from `status: "pending"` to `status: "approved"`.
6. **Duplicate TrxID Replay**: Authenticated user creating `/usedTrxIds/BKX99123` when `/usedTrxIds/BKX99123` already exists.
7. **Shadow Field Injection on User Profile**: Authenticated user writing `{ uid, displayName, ..., isAdmin: true }` to `/users/{uid}`.
8. **Cross-User PII Read**: User A attempting `get` on `/users/{userB}/private/info`.
9. **Blanket Order List Scraping**: User A attempting `list` on `/orders` without `where("userId", "==", userA.uid)`.
10. **ID Poisoning**: User attempting to write `/orders/{1500_char_junk_id}`.
11. **Backdated Timestamp Forgery**: User creating `/orders/ord2` with `createdAt: "2020-01-01T00:00:00Z"` instead of server `request.time`.
12. **Audit Log Deletion**: User or compromised client attempting to delete `/auditLogs/log1`.
