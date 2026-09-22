# Balance Logic - Visual Diagrams & Flowcharts

## 1. Sign Convention Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BALANCE SIGN CONVENTION                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NEGATIVE BALANCE (-)          POSITIVE BALANCE (+)        │
│  ═════════════════════         ═════════════════════       │
│                                                             │
│  Department RECEIVES           Department PAYS             │
│  from party                    to party                    │
│                                                             │
│  Receivable Amount             Payable Amount              │
│  (Good for business)           (Bad for business)          │
│                                                             │
│  Display: GREEN ✓              Display: RED ✗              │
│  Color: #22c55e                Color: #ef4444              │
│                                                             │
│  Example: -5000                Example: +3000              │
│  Meaning: Receive 5000         Meaning: Pay 3000           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Ledger Entry Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    LEDGER ENTRY PROCESSING                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DEBIT ENTRY                   CREDIT ENTRY                 │
│  ════════════                  ══════════════                │
│                                                              │
│  Amount: 1000                  Amount: 500                  │
│  Account: accounts_receivable  Account: accounts_payable    │
│                                                              │
│  ↓                             ↓                            │
│                                                              │
│  Balance -= 1000               Balance += 500               │
│  (More negative)               (More positive)              │
│                                                              │
│  ↓                             ↓                            │
│                                                              │
│  Balance: -1000                Balance: +500                │
│  (Department receives)         (Department pays)            │
│                                                              │
│  ↓                             ↓                            │
│                                                              │
│  Display: -1000 (GREEN)        Display: +500 (RED)          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Balance Calculation Example

```
┌────────────────────────────────────────────────────────────────┐
│              BALANCE CALCULATION WALKTHROUGH                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Starting Balance: 0                                           │
│                                                                │
│  Entry 1: Debit 5000 (Sale to party)                          │
│  ├─ Formula: balance -= 5000                                  │
│  ├─ Result: 0 - 5000 = -5000                                  │
│  └─ Meaning: Department receives 5000 from party             │
│                                                                │
│  Entry 2: Credit 2000 (Payment received)                      │
│  ├─ Formula: balance += 2000                                  │
│  ├─ Result: -5000 + 2000 = -3000                              │
│  └─ Meaning: Department still receives 3000 from party       │
│                                                                │
│  Entry 3: Debit 1000 (Additional sale)                        │
│  ├─ Formula: balance -= 1000                                  │
│  ├─ Result: -3000 - 1000 = -4000                              │
│  └─ Meaning: Department receives 4000 from party             │
│                                                                │
│  Entry 4: Credit 4000 (Full payment)                          │
│  ├─ Formula: balance += 4000                                  │
│  ├─ Result: -4000 + 4000 = 0                                  │
│  └─ Meaning: Settled (no outstanding balance)                │
│                                                                │
│  Final Balance: 0 (SETTLED)                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Payment Recording Decision Tree

```
                    ┌─────────────────────┐
                    │  Check Balance      │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
            NEGATIVE        ZERO           POSITIVE
            (-5000)         (0)            (+3000)
                │              │              │
                │              │              │
        ┌───────┴────────┐     │     ┌────────┴────────┐
        │                │     │     │                 │
        ▼                ▼     ▼     ▼                 ▼
    RECEIVABLE      SETTLED   PAYABLE
    (Dept receives) (Settled) (Dept pays)
        │                │         │
        │                │         │
    ┌───┴────┐       ┌───┴───┐ ┌──┴────┐
    │         │       │       │ │       │
    ▼         ▼       ▼       ▼ ▼       ▼
  ALLOW    REJECT  NO      NO  ALLOW  REJECT
  RECEIVED  PAID   PAYMENT PAYMENT PAID RECEIVED
    │         │       │       │   │       │
    ✓         ✗       ✓       ✓   ✓       ✗
```

---

## 5. Department Balance Totals Calculation

```
┌──────────────────────────────────────────────────────────────┐
│           DEPARTMENT BALANCE TOTALS CALCULATION               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Party List:                                                 │
│  ├─ Party A: -5000 (Receivable)                             │
│  ├─ Party B: -2000 (Receivable)                             │
│  ├─ Party C: +3000 (Payable)                                │
│  └─ Party D: +1500 (Payable)                                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TOTAL RECEIVABLE CALCULATION                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Sum of all NEGATIVE balances (absolute values)      │   │
│  │                                                     │   │
│  │ = |−5000| + |−2000|                                 │   │
│  │ = 5000 + 2000                                       │   │
│  │ = 7000                                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TOTAL PAYABLE CALCULATION                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Sum of all POSITIVE balances                        │   │
│  │                                                     │   │
│  │ = 3000 + 1500                                       │   │
│  │ = 4500                                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  SUMMARY:                                                    │
│  ├─ Total Receivable: 7000 (Department receives)            │
│  ├─ Total Payable: 4500 (Department pays)                   │
│  └─ Net Position: 2500 (Department ahead)                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Frontend Display Logic

```
┌────────────────────────────────────────────────────────────────┐
│              FRONTEND DISPLAY DECISION LOGIC                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  INPUT: Balance Value                                          │
│  ↓                                                             │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ IF balance < 0 (NEGATIVE)                            │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │ ├─ Color: GREEN (#22c55e)                           │     │
│  │ ├─ Sign: "-" prefix                                 │     │
│  │ ├─ Meaning: "Department receives"                   │     │
│  │ ├─ Badge: Success variant                           │     │
│  │ └─ Example: "-5000" (green)                         │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ ELSE IF balance > 0 (POSITIVE)                       │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │ ├─ Color: RED (#ef4444)                             │     │
│  │ ├─ Sign: "+" prefix                                 │     │
│  │ ├─ Meaning: "Department pays"                       │     │
│  │ ├─ Badge: Destructive variant                       │     │
│  │ └─ Example: "+3000" (red)                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ ELSE (balance = 0)                                   │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │ ├─ Color: GRAY                                       │     │
│  │ ├─ Text: "Zero / Nil"                               │     │
│  │ ├─ Meaning: "Settled"                               │     │
│  │ ├─ Badge: Outline variant                           │     │
│  │ └─ Example: "Zero / Nil" (gray)                     │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Stat Card Calculation

```
┌──────────────────────────────────────────────────────────────┐
│              STAT CARD CALCULATION LOGIC                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT: Closing Balance                                      │
│  ↓                                                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │ RECEIVABLE STAT CARD                               │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ Formula: max(-closingBalance, 0)                   │     │
│  │                                                    │     │
│  │ If balance = -5000:                                │     │
│  │   Receivable = max(-(-5000), 0) = max(5000, 0)    │     │
│  │   Display: 5000 (green, trending up)              │     │
│  │                                                    │     │
│  │ If balance = +3000:                                │     │
│  │   Receivable = max(-(+3000), 0) = max(-3000, 0)   │     │
│  │   Display: 0 (no receivable)                       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ PAYABLE STAT CARD                                  │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ Formula: max(closingBalance, 0)                    │     │
│  │                                                    │     │
│  │ If balance = -5000:                                │     │
│  │   Payable = max(-5000, 0) = 0                      │     │
│  │   Display: 0 (no payable)                          │     │
│  │                                                    │     │
│  │ If balance = +3000:                                │     │
│  │   Payable = max(+3000, 0) = 3000                   │     │
│  │   Display: 3000 (red, trending down)              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATABASE                                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Ledger Entries (UNCHANGED)                       │      │
│  │ ├─ Entry ID                                      │      │
│  │ ├─ Entry Type (debit/credit)                     │      │
│  │ ├─ Amount                                        │      │
│  │ ├─ Account Code                                  │      │
│  │ └─ Party ID                                      │      │
│  └──────────────────────────────────────────────────┘      │
│                    ↓                                        │
│  BACKEND CALCULATION LAYER (REVERSED)                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Balance Calculation                              │      │
│  │ balance += (debit ? -amount : amount)            │      │
│  │                                                  │      │
│  │ Receivable/Payable Categorization                │      │
│  │ if (balance < 0) receivable += abs(balance)      │      │
│  │ if (balance > 0) payable += balance              │      │
│  └──────────────────────────────────────────────────┘      │
│                    ↓                                        │
│  API RESPONSE                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │ {                                                │      │
│  │   balance: -5000,                                │      │
│  │   receivable: 5000,                              │      │
│  │   payable: 0                                     │      │
│  │ }                                                │      │
│  └──────────────────────────────────────────────────┘      │
│                    ↓                                        │
│  FRONTEND DISPLAY LAYER (REVERSED)                         │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Color Logic                                      │      │
│  │ balance < 0 ? green : red                        │      │
│  │                                                  │      │
│  │ Badge Logic                                      │      │
│  │ "Department receives 5000" (green)               │      │
│  │                                                  │      │
│  │ Stat Cards                                       │      │
│  │ Receivable: 5000 | Payable: 0                    │      │
│  └──────────────────────────────────────────────────┘      │
│                    ↓                                        │
│  USER INTERFACE                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Parties List:                                    │      │
│  │ ├─ Balance: -5000 (GREEN)                        │      │
│  │                                                  │      │
│  │ Party Statement:                                 │      │
│  │ ├─ Badge: "Department receives 5000"            │      │
│  │ ├─ Receivable: 5000                              │      │
│  │ ├─ Payable: 0                                    │      │
│  │ └─ Running Balance: -5000 (GREEN)                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Comparison Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    COMPARISON MATRIX                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Aspect              │ OLD LOGIC      │ NEW LOGIC              │
│ ────────────────────┼────────────────┼──────────────────────  │
│ Positive Balance    │ Receivable     │ Payable                │
│ Negative Balance    │ Payable        │ Receivable             │
│ Debit Entry         │ +balance       │ -balance               │
│ Credit Entry        │ -balance       │ +balance               │
│ Green Color         │ Positive       │ Negative               │
│ Red Color           │ Negative       │ Positive               │
│ Receivable Total    │ sum(>0)        │ sum(<0, abs)           │
│ Payable Total       │ sum(<0, abs)   │ sum(>0)                │
│ Payment Direction   │ >0 = RECEIVED  │ <0 = RECEIVED          │
│ Database            │ UNCHANGED      │ UNCHANGED              │
│ Data Loss           │ NONE           │ NONE                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Timeline

```
┌─────────────────────────────────────────────────────────────┐
│              IMPLEMENTATION TIMELINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: Backend Changes (COMPLETE ✓)                     │
│  ├─ Update ledger.service.ts                               │
│  ├─ Update parties.service.ts                              │
│  ├─ Compile backend                                        │
│  └─ Verify no errors                                       │
│                                                             │
│  Phase 2: Frontend Changes (COMPLETE ✓)                    │
│  ├─ Update PartiesListPage.tsx                             │
│  ├─ Update PartyStatementPage.tsx                          │
│  ├─ Compile frontend                                       │
│  └─ Verify no errors                                       │
│                                                             │
│  Phase 3: Documentation (COMPLETE ✓)                       │
│  ├─ Implementation summary                                 │
│  ├─ Testing guide                                          │
│  ├─ Before/after comparison                                │
│  ├─ Quick reference guide                                  │
│  └─ Visual diagrams                                        │
│                                                             │
│  Phase 4: Testing (PENDING)                                │
│  ├─ QA functional testing                                  │
│  ├─ Regression testing                                     │
│  ├─ Performance testing                                    │
│  └─ User acceptance testing                                │
│                                                             │
│  Phase 5: Deployment (PENDING)                             │
│  ├─ Staging deployment                                     │
│  ├─ Production deployment                                  │
│  ├─ Monitoring                                             │
│  └─ User communication                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Risk Assessment

```
┌──────────────────────────────────────────────────────────────┐
│                  RISK ASSESSMENT MATRIX                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Risk                    │ Probability │ Impact │ Mitigation │
│ ────────────────────────┼─────────────┼────────┼──────────  │
│ Data Loss               │ LOW         │ HIGH   │ Backup DB  │
│ Calculation Error       │ LOW         │ HIGH   │ Testing    │
│ Display Bug             │ LOW         │ MED    │ QA Testing │
│ Performance Issue       │ VERY LOW    │ MED    │ Monitoring │
│ User Confusion          │ MED         │ MED    │ Training   │
│ Rollback Failure        │ VERY LOW    │ HIGH   │ Dry Run    │
│                                                              │
│ Overall Risk Level: LOW ✓                                    │
│ Mitigation: Comprehensive testing + Rollback plan           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. Success Metrics

```
┌──────────────────────────────────────────────────────────────┐
│                  SUCCESS METRICS                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Metric                          │ Target    │ Status        │
│ ────────────────────────────────┼───────────┼──────────     │
│ Backend Build Success           │ 100%      │ ✓ PASS        │
│ Frontend Build Success          │ 100%      │ ✓ PASS        │
│ TypeScript Errors               │ 0         │ ✓ 0           │
│ Console Warnings                │ 0         │ ✓ 0           │
│ Test Cases Passed               │ 100%      │ ⏳ PENDING    │
│ Regression Tests Passed         │ 100%      │ ⏳ PENDING    │
│ Performance Degradation         │ < 5%      │ ⏳ PENDING    │
│ Data Integrity Verified         │ 100%      │ ⏳ PENDING    │
│ User Acceptance                 │ > 95%     │ ⏳ PENDING    │
│                                                              │
│ Overall Status: READY FOR TESTING ✓                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

**END OF VISUAL DIAGRAMS**
