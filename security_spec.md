# Security Specification - Tournament Registration

## Data Invariants
1. A user can only register for a tournament if they have sufficient balance.
2. A user can only register if slots are available (`slotsLeft > 0`).
3. User must decrement their balance by the exact entry fee.
4. User must decrement the tournament's `slotsLeft` by exactly 1.
5. User must create a transaction record corresponding to the entry fee.
6. User can only read their own registrations and transactions.
7. Only admins can modify tournament details except for `slotsLeft` during registration.

## The Dirty Dozen Payloads

### 1. Spoofing Registration Identity
**Payload:** `{ userId: 'other_user_id', ... }` (Sent by user `d43pncXwKEWLIJ7KjQaHqx9Q5IH3`)
**Target:** `/registrations/{id}`
**Expected:** PERMISSION_DENIED (User can only register themselves)

### 2. Unauthorized Slot Increase
**Payload:** `{ slotsLeft: 100 }` (Current: 50)
**Target:** `/tournaments/{id}`
**Expected:** PERMISSION_DENIED (User can only decrement slots)

### 3. Balance Padding
**Payload:** `{ balance: 999999 }`
**Target:** `/users/{my_id}`
**Expected:** PERMISSION_DENIED (User cannot arbitrarily increase balance)

### 4. Admin Impersonation (Notification)
**Payload:** `{ title: 'FREE DIAMONDS', type: 'Announcement', message: 'click here...' }`
**Target:** `/users/{target_id}/notifications/{id}`
**Expected:** PERMISSION_DENIED (User cannot create notifications for others unless specifically allowed for certain types)

### 5. Ghost Field Injection
**Payload:** `{ ..., isApproved: true }`
**Target:** `/registrations/{id}`
**Expected:** PERMISSION_DENIED (isValidRegistration should block unknown fields)

### 6. Transaction Forgery
**Payload:** `{ amount: 1000, type: 'Winning' }`
**Target:** `/transactions/{id}`
**Expected:** PERMISSION_DENIED (User cannot create winning transactions)

### 7. Global Transaction Scraping
**Operation:** `list`
**Target:** `/transactions`
**Expected:** PERMISSION_DENIED (User can only see their own Transactions)

### 8. Registration ID Poisoning
**Payload:** `{ id: 'a'.repeat(2000) }`
**Target:** `/registrations/{id}`
**Expected:** PERMISSION_DENIED (isValidId constraint)

### 9. Price Manipulation
**Payload:** `{ ..., entryFee: 0 }` (Tournament actual fee: 50)
**Target:** `/registrations/{id}`
**Expected:** PERMISSION_DENIED (Validation should check against tournament data)

### 10. Withdrawal Self-Approval
**Payload:** `{ status: 'Approved' }`
**Target:** `/withdrawals/{id}`
**Expected:** PERMISSION_DENIED (Only admins can approve)

### 11. Event Hijacking
**Payload:** `{ title: 'DELETED' }`
**Target:** `/events/{id}`
**Expected:** PERMISSION_DENIED (Only admins can edit events)

### 12. Profile verified code probe
**Operation:** `read`
**Target:** `/verified_codes/{unknown_id}`
**Expected:** PERMISSION_DENIED (unless they have the ID, and even then, list should be restricted)

## Red Team Checklist
- [ ] Identity Spoofing prevented?
- [ ] State Shortcutting prevented?
- [ ] Resource Poisoning prevented?
- [ ] Atomic-like Relational Integrity?
