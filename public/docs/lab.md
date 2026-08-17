# Lab Assistant Guide

You manage the laboratory workflow — receiving test orders from doctors, collecting samples, processing tests, entering results, flagging critical values, and uploading reports. Your accuracy and timeliness directly impact patient care.

---

## Dashboard

Your landing page summarizes the lab's current state.

| Panel | What It Shows |
|-------|---------------|
| **Pending Tests** | Tests ordered by doctors awaiting sample collection — your action items |
| **In Progress** | Tests where samples collected, processing started |
| **Completed Today** | Tests finished and results submitted |
| **Samples to Collect** | Patients currently in clinic needing sample collection |
| **Priority Indicators** | STAT and urgent tests flagged separately |
| **Recent Completions** | Quick reference to recently finished tests |

---

## Test Queue (My Tests)

Your primary workspace. Manages the entire test lifecycle.

### Test Status Flow

```
Ordered → Sample Collected → In Progress → Completed → Delivered
```

### Filtering

- **By status** — View tests at specific stage
- **By date** — Tests ordered on particular date/range
- **By priority** — Isolate STAT and urgent from routine
- **Search** — By patient name, test name, or order ID

### Test Detail View

Click any test to see: patient info, test details, ordering doctor, special instructions, status history with timestamps, and result entry fields.

---

## Sample Collection

### Before Collecting

1. **Verify patient identity** — Two identifiers required (name + DOB, or name + patient ID)
2. **Review order** — Which tests, sample types, special instructions (fasting, timing)
3. **Prepare materials** — Correct tubes, containers, labels, PPE

### Collection Tubes

| Tube Type | Color | Used For |
|-----------|-------|----------|
| **EDTA** | Purple | CBC, HbA1c |
| **Fluoride** | Grey | Blood glucose (preserves glucose) |
| **Serum** | Red/Gold | Biochemistry (LFT, KFT, Lipids) |
| **Citrate** | Blue | Coagulation studies |

### Sample Types

| Type | Technique |
|------|-----------|
| Blood | Venipuncture into appropriate tube |
| Urine | Midstream into sterile container |
| Stool | Designated container |
| Sputum | Deep cough technique (not saliva) |

### Labeling (Non-Negotiable)

Label **at the point of collection** with patient present. Every label must include:

- Patient full name and ID
- Test name and code
- Collection date and time
- Collector name/initials
- Sample type
- Special handling notes

> Warning: Never transport unlabeled samples. Never batch-label later. An unlabeled sample must be rejected and recollected.

### After Collection

1. Update test status to **Sample Collected**
2. Transport to processing area following handling protocols
3. Maintain cold chain for temperature-sensitive samples

### Rejection Criteria

Reject samples with: missing/illegible labels, hemolysis/inappropriate clotting, insufficient volume, damaged containers, or compromised transport temperature. Document reason and notify ordering doctor.

---

## Processing & Results

### Starting Processing

1. Open test from queue → update status to **In Progress**
2. Process per lab SOPs
3. Run quality control before patient samples

### Entering Results

Click **Enter Results** on the test record. Fill in:

| Field | Details |
|-------|---------|
| Numerical values | Appropriate precision |
| Units | mg/dL, mmol/L, cells/μL, etc. |
| Qualitative findings | Positive/Negative, Reactive/Non-reactive |
| Reference ranges | Verify correct for patient's age and gender |
| Abnormal flags | For out-of-range values |
| Remarks | Methodology notes if needed |

### Before Submitting

- [ ] Values within instrument measurement range
- [ ] Correct reference ranges applied
- [ ] Units consistent with test catalog
- [ ] Abnormal values flagged
- [ ] Critical values identified
- [ ] No transcription errors (double-check against instrument readout)

### Submitting

Click **Submit Results** → doctor receives notification immediately.

### Uploading Reports (PDF)

For tests producing formatted reports:

1. Select completed test → **Upload Report**
2. Choose PDF file
3. Verify patient details match system record
4. Mark as **Completed**

---

## Priority & Critical Values

### STAT / Urgent Tests

- Process ahead of all routine tests regardless of order received
- Collect sample within 15 minutes if patient is present
- Fast-track through every stage — no batching with routine
- Notify doctor immediately on completion

### Critical Value Protocol

When a result falls in the critical/panic range:

1. **Verify** — Repeat the test if possible
2. **Alert doctor** — In-app notification within 5 minutes
3. **Follow up** — If no acknowledgment, direct contact within 15 minutes
4. **Document** — Time of notification and doctor's acknowledgment
5. **Confirm** — Doctor received and will act on it

### Common Critical Ranges

| Parameter | Critical Low | Critical High |
|-----------|-------------|---------------|
| Hemoglobin | < 7 g/dL | > 20 g/dL |
| Platelets | < 50,000/μL | > 1,000,000/μL |
| Blood Glucose | < 50 mg/dL | > 450 mg/dL |
| Potassium | < 2.5 mEq/L | > 6.5 mEq/L |
| Sodium | < 120 mEq/L | > 160 mEq/L |
| INR | — | > 5.0 |

> Important: Always follow your clinic's specific critical value protocols — these may differ from general benchmarks.

---

## Common Tests Quick Reference

| Test | Sample | Tube | TAT | Key Parameters |
|------|--------|------|-----|----------------|
| CBC | Venous blood | EDTA | 2–4 hrs | Hb, WBC, RBC, Platelets, PCV |
| Blood Sugar | Venous blood | Fluoride | 1–2 hrs | Glucose |
| HbA1c | Venous blood | EDTA | 4–6 hrs | Glycated hemoglobin |
| Lipid Profile | Venous blood | Serum | 4–6 hrs | Cholesterol, TG, HDL, LDL, VLDL |
| LFT | Venous blood | Serum | 4–6 hrs | Bilirubin, SGOT, SGPT, ALP |
| KFT | Venous blood | Serum | 4–6 hrs | Urea, Creatinine, Uric acid, BUN |
| Thyroid | Venous blood | Serum | 24 hrs | T3, T4, TSH |
| Urine Routine | Midstream | Sterile cup | 1–2 hrs | Color, pH, Protein, Sugar |
| Urine Culture | Midstream | Sterile cup | 48–72 hrs | Organisms, sensitivity |
| Stool Exam | Stool | Container | 2–4 hrs | Ova, cysts, occult blood |

---

## Equipment & Quality Control

### Daily

- Run instrument startup checks every morning
- Perform QC samples before processing patient tests
- Log instrument status and QC results
- Monitor refrigerator/freezer temperatures (log twice daily)
- Check reagent stock levels

### If QC Fails

Do not process patient samples until issue is resolved.

### If Instrument Malfunctions

1. Stop all testing on affected instrument immediately
2. Document what happened and which tests are affected
3. Report to supervisor and admin
4. Switch to backup equipment if available
5. Validate instrument after repair before resuming

---

## Safety Protocols

### PPE Requirements

| Activity | Required PPE |
|----------|-------------|
| All sample handling | Gloves + lab coat |
| Processing/chemicals | Add eye protection |
| Volatile chemicals | Fume hood |
| Biohazard waste | Heavy-duty gloves + face shield |

### Universal Precautions

- Treat all patient samples as potentially infectious
- Wash hands before and after every sample handling
- Never eat, drink, or apply cosmetics in the lab
- Never pipette by mouth
- Decontaminate work surfaces at start and end of each shift

### Sharps Disposal

- All needles/lancets → yellow sharps containers only
- Never recap needles
- Never overfill containers beyond marked line

### Spill Response

1. Alert nearby personnel
2. Contain with absorbent material
3. Don PPE before approaching
4. Apply disinfectant (edges inward)
5. Dispose in biohazard waste
6. Document incident

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Insufficient sample** | If patient still in clinic, recollect. Inform ordering doctor. |
| **Instrument malfunction** | Stop testing, run QC on recent results, report to supervisor, switch to backup |
| **Result outside expected range** | Repeat test on same sample. Check sample quality. Verify calibration. |
| **Test not appearing in queue** | Refresh page. Verify with doctor that order was saved. Check if assigned to different lab. |

---

## Getting Help

- **Lab Supervisor** — Operational issues, protocol questions, result interpretation
- **Clinic Admin** — System access, configuration, equipment procurement
- **Equipment Vendor** — Hardware malfunctions, calibration, maintenance
- **support@infinitymedisetu.com** — Software issues
- **?** icon — Context-sensitive guidance on any screen
