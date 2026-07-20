# Test Catalog — Quick Reference

The list of laboratory tests your clinic offers. Doctors order from this catalog, lab assistants process against these configurations.

---

## Test Record Fields

| Field | Description | Impact |
|-------|-------------|--------|
| **Test Name** | Display name for ordering | What doctors search for |
| **Test Code** | Unique identifier | Used in reports and lab workflow |
| **Category** | Hematology, Biochemistry, etc. | Grouping for browsing |
| **Sample Type** | Blood, urine, stool, etc. | Lab collection preparation |
| **Price** | Patient billing amount | Appears on invoices |
| **Turn-around Time** | Expected processing duration | Patient communication |
| **Reference Ranges** | Normal value boundaries | Determines abnormal flags |
| **Special Instructions** | Fasting, timing, etc. | Shown to lab during collection |

---

## Adding a Test

1. Click **Add Test**
2. Enter test name and unique code
3. Select category and sample type
4. Set price and turn-around time
5. Configure reference ranges (age/gender specific)
6. Add special instructions if needed
7. Save

---

## Managing Tests

| Action | When | Effect |
|--------|------|--------|
| **Edit** | Pricing change, range update | Applies to new orders only |
| **Disable** | Test no longer offered | Hides from ordering, preserves history |
| **Enable** | Bring test back | Reappears in doctor's catalog |
| **Delete** | ⚠️ Permanent | Removes all historical data |

> Best practice: Disable rather than delete. Historical data matters.

---

## Reference Ranges

These determine which results are flagged abnormal. Get them right — the entire alert system depends on accurate ranges.

| Consideration | Example |
|---------------|---------|
| Age-specific | Pediatric hemoglobin differs from adult |
| Gender-specific | Female/male creatinine ranges differ |
| Unit consistency | mg/dL vs mmol/L must match lab instruments |

---

## Bulk Import (CSV)

For new clinic setup or major updates:

1. Prepare CSV with required columns
2. Use the import feature
3. Review imported tests for accuracy
4. Verify reference ranges manually

---

## Categories

| Category | Common Tests |
|----------|-------------|
| Hematology | CBC, ESR, Blood Group |
| Biochemistry | LFT, KFT, Lipid Profile |
| Endocrinology | Thyroid Profile, HbA1c |
| Microbiology | Urine Culture, Blood Culture |
| Serology | HIV, HBsAg, Dengue |
| Urine/Stool | Routine Urine, Stool Exam |

---

## Tips

- Keep test codes short and memorable
- Set reference ranges for both male and female
- Review pricing quarterly (supplier costs change)
- Organize by category for easy doctor access
- Add clear special instructions (fasting requirements, etc.)
