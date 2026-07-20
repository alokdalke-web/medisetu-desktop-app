# Prescription Templates — Design & Regeneration Guide

This project ships **three distinct, non-overlapping** prescription templates plus a
default fallback. They are rendered with [Handlebars](https://handlebarsjs.com/)
in two places:

- **PDF generation** — `generateAndUploadPdf()` in `src/utils/pdf.utils.ts`
- **Live preview** — `getPreviewPrescriptionTemplateController` in
  `src/main/reports/controllers/report.controller.ts`
  (`POST /api/v1/reports/preview-prescription-template`)

| Slot        | File                                | Design                           | Selectable |
| ----------- | ----------------------------------- | -------------------------------- | ---------- |
| `template1` | `src/htmltamplates/report_card1.ts` | **Simple / Minimal**             | yes        |
| `template2` | `src/htmltamplates/report_card2.ts` | **Letterhead Pad**               | yes        |
| `template3` | `src/htmltamplates/report_card3.ts` | **Handwritten Pad**              | yes        |
| `template4` | `src/htmltamplates/report_card4.ts` | **Modern Banner** (also default) | yes        |

> The selector → file mapping lives in `report.service.ts` (`switch (latestTemplate.templateName)`).
> `template4` is also the fallback used when a doctor has no template configured. All four are genuinely distinct designs.

---

## 1. Shared data contract (consistency)

Every template **must** use only these Handlebars variables and **must not**
introduce new ones without updating the data builders in `report.service.ts`
(`pdfData`) and `report.controller.ts` (`sampleData`). Keeping this contract
identical across templates is what makes them consistent and interchangeable.

### `templateConfig`
```
templateConfig.fontFamily            // e.g. "Inter, sans-serif"
templateConfig.primaryFont           // first font, used in the Google Fonts URL
templateConfig.colors.color1..color10
```
Color roles (keep usage consistent across templates):

| Var       | Role                             |
| --------- | -------------------------------- |
| `color1`  | Primary brand / headings / rules |
| `color2`  | Light accent / soft borders      |
| `color3`  | Body text                        |
| `color4`  | Muted/secondary text             |
| `color5`  | Hairlines / dashed borders       |
| `color6`  | Alert/surgery (reserved)         |
| `color7`  | Subtle background fill           |
| `color8`  | Paper/white                      |
| `color9`  | Strong black                     |
| `color10` | Advice/highlight accent          |

### Content
```
clinic.{ name, tagline, logo, address, city, state, zipcode, phone }
doctor.{ name, qualification, speciality, registrationNumber }
doctor.groupedAvailability[] -> { days, isAvailable, display }   // display is HTML, use {{{ }}}
patient.{ name, age, gender, address }
appointmentDate
symptoms[] -> { name }
diagnosis
hasTests        // boolean-ish; when truthy show testNames
testNames
prescriptions[] -> { medicineName, strength, dosage, frequency, duration, notes }
advice
followUpDate
```

### Standard-prescription field set (scope)
All three templates render only the fields found on a real prescription pad:
letterhead (doctor + clinic), patient line, complaints (`C/O`), diagnosis, ℞ +
medications, investigations, advice, next-visit, signature, consultation hours.

**Intentionally excluded** (kept out to stay a clean prescription pad): token,
vitals, habits, allergies, surgery-suggested, dietary suggestion, visiting-days.
These still exist in the data builders, so they can be re-added per template if needed.

### Hard rules
1. `doctor.groupedAvailability[].display` is pre-formatted HTML → render with
   triple-stache `{{{this.display}}}`. Everything else uses double-stache.
2. Page is A4: `@page { size: A4; margin: 0; }` and the root wrapper is
   `width: 210mm; min-height: 297mm;`.
3. Consultation hours sit in a **bottom** strip (or the sidebar for Template 1).
4. Footer carries the "Powered by Infinity MediSetu" logo
   (`https://infninity-medisatu.s3.ap-south-1.amazonaws.com/ims/Logo%20V1.png`).
5. Signature block (`Dr. {{doctor.name}}` + "Signature") is bottom-right, pushed
   down with `margin-top: auto`.
6. No new top-level variables. No external JS. Inline/`<style>` CSS only.

---

## 2. Template 1 — "Simple / Minimal"

**Concept:** the most lightweight, no-frills pad. Single column, no colored
fills or decorative fonts — just the configured font, thin hairline rules and
generous whitespace. Header is clinic (left) + doctor (right) over a single
rule; then patient line, complaints, diagnosis, ℞, a minimal medication table,
plain advice/investigations/next-visit notes, a signature, and a small
consultation-hours line at the bottom.

**Identity:** plain typography, no color blocks (color1 used only for thin rules
and the ℞ glyph), lots of whitespace, page padding ~26mm/18mm.

**Regeneration instructions**
```
Regenerate src/htmltamplates/report_card1.ts as `reportCardTemplate1`
(a single exported template literal string).

Layout: single-column .pad (210mm x min 297mm) with internal padding
~26mm 18mm 14mm and NO colored backgrounds.
Order:
  - .head      : flex row. Left = clinic name (~20px bold) + small address/phone
                 meta. Right (text-align right) = Dr. name + qualification +
                 speciality + Reg. No. Bottom border 1px var(--color1).
  - .patient-row: simple inline fields (label muted, value bold): Patient,
                 Age/Sex, Date, Address. Hairline bottom border.
  - .clinical  : "C/O:" and "Diagnosis:" plain lines.
  - .rx        : ℞ (&#8478;) ~30px then a minimal medication table — only header
                 underline + row hairlines, columns: #, Medication
                 [name+strength+notes], Dosage, Frequency, Duration.
  - .note      : plain "Investigations Advised", "Advice", "Next Visit".
  - .sign      : bottom-right signature (border-top line), margin-top:auto.
  - .timings   : small bottom line "Consultation Hours: {{this.days}}: {{{this.display}}}".
  - .footer    : disclaimer | IMS logo.
Use ONLY the shared data contract. Single font ('{{templateConfig.fontFamily}}');
do NOT load Playfair or Caveat. Keep it visually minimal — this is the plain option.
```

---

## 3. Template 2 — "Letterhead Pad"

**Concept:** formal, traditional single column. Top letterhead splits doctor
(left) and clinic (right) under a `color1` accent bar and rule. Body flows
straight down: patient line with dotted fill-in underlines, complaints,
diagnosis, ℞, medication table, investigations, advice, next-visit, signature.
Consultation hours sit in a bottom strip above the footer.

**Identity:** white paper, 8px `color1` top border, Playfair Display headings,
dotted "fill-in-the-blank" patient underlines.

**Regeneration instructions**
```
Regenerate src/htmltamplates/report_card2.ts as `reportCardTemplate2`
(a single exported template literal string).

Layout: flex column .pad (210mm x min 297mm), border-top 8px var(--color1).
Order:
  - .letterhead : flex row. Left .doctor-block = Dr. name (Playfair, color1) +
                  qualification + speciality + Reg. No. Right .clinic-block
                  (text-align right) = logo + clinic name + tagline + address
                  line + phone. Bottom border 2px color1.
  - .patient-row: flex-wrap row of fields; each value has a dotted bottom border
                  (fill-in-the-blank look): Patient, Age/Sex, Date, Address.
  - .clinical   : "C/O:" line and "Diagnosis:" line.
  - .rx-body    : big ℞ (&#8478;, Playfair) then medication table (#, Medication
                  [name+strength+notes], Dosage, Frequency, Duration).
  - .advice-section blocks: Investigations Advised, Advice, Next Visit.
  - .sign-area  : bottom-right signature, margin-top:auto.
  - .timings    : BOTTOM strip (border-top), label "Consultation Hours" + each
                  available {{this.days}}: {{{this.display}}}.
  - .footer     : clinic name | disclaimer | IMS logo.
Use ONLY the shared data contract. Fonts: '{{templateConfig.fontFamily}}' + Playfair Display.
```

---

## 4. Template 3 — "Handwritten Pad"

**Concept:** single column on **cream** paper (`#fffef7`). Static labels use a
clean sans (Inter); every dynamic value (patient details, complaints, medicines,
advice) uses the **Caveat** handwriting font to feel hand-written. Patient details
sit in a rounded cream card; advice blocks use a warm highlight.

**Identity:** cream paper, Inter labels + Caveat values, warm `#faf6ed`/`#fef6e7`
fills, dotted medicine separators.

**Regeneration instructions**
```
Regenerate src/htmltamplates/report_card3.ts as `reportCardTemplate3`
(a single exported template literal string).

Load Google Fonts: Inter (labels) + Caveat (handwriting values).
Layout: flex column .pad (210mm x min 297mm), background #fffef7,
border-top 8px var(--color1).
Order:
  - .letterhead : same split as Template 2 (doctor left, clinic right) but
                  Inter 800 headings, bottom border 2px var(--color2).
  - .patient-row: rounded cream card (#fefbf5 / #e9e0cf). Labels uppercase Inter;
                  values in Caveat ~18px. Patient, Age/Sex, Date, Address.
  - .clinical   : info-rows "C/O" and "Diagnosis"; label Inter, value Caveat.
  - .rx-body    : ℞ in Caveat ~46px, then medication table. Table CELL text is
                  Caveat ~18px; medicine strength/notes drop back to small Inter.
  - advice blocks: warm #fef6e7 boxes, label Inter uppercase, text Caveat.
                  Investigations, Advice, then Next Visit info-row.
  - .sign-area  : bottom-right signature, margin-top:auto.
  - .timings    : BOTTOM strip on #faf6ed, "Consultation Hours".
  - .footer     : dashed top border, clinic name | disclaimer | IMS logo.
Use ONLY the shared data contract. Do NOT use Playfair here (Caveat is the signature font).
```

---

## 4b. Template 4 — "Modern Banner" (also the default)

**Concept:** single column with a bold full-width colored header band. The band
(`color1`, white text) carries the clinic on the left (logo + name + tagline +
address/phone) and the doctor on the right. The body is clean white: a patient
info card, ℞, a medication table whose header row is `color1` with zebra-striped
body rows, advice, signature, and a bottom consultation-hours strip. This is also
the fallback used when a doctor has no template configured.

**Identity:** full-width color band header + colored table header row; Playfair
Display headings; otherwise clean white body. No sidebar.

**Regeneration instructions**
```
Regenerate src/htmltamplates/report_card4.ts as `reportCardTemplate4`
(a single exported template literal string).

Layout: flex column .pad (210mm x min 297mm).
Order:
  - .banner   : full-width band, background var(--color1), color var(--color8),
                padding ~22px 36px, flex row. Left = logo (white rounded chip) +
                clinic name (Playfair) + tagline + address/phone meta. Right
                (text-align right) = Dr. name (Playfair) + speciality +
                qualification + Reg. No.
  - .body     : padding ~22px 36px, flex column. Order: right-aligned Date ->
                patient card (color7, grid: Patient / Age-Sex / Address) ->
                C/O -> Diagnosis -> big ℞ (&#8478;, Playfair) -> medication table
                with COLORED header row (thead background color1, white text,
                even rows color7), columns #, Medication[name+strength+notes],
                Dosage, Frequency, Duration -> Investigations -> Advice (color10
                left border) -> Next Visit -> signature pushed down (margin-top:auto).
  - .timings  : BOTTOM strip (color7, border-top), "Consultation Hours".
  - .footer   : color1 band, clinic name | disclaimer | IMS logo.
Use ONLY the shared data contract. Fonts: '{{templateConfig.fontFamily}}' + Playfair Display.
Do NOT use a colored sidebar — the band header is what makes this distinct.
```

---

## 5. Verifying a regenerated template

After editing any template:

1. **Type/lint check**
   ```
   npx tsc --noEmit -p tsconfig.json
   npx eslint src/htmltamplates/report_cardN.ts
   ```
2. **Handlebars render check** — compile the exported string with the shared
   sample data and assert there are **no leftover `{{ }}` tags** and no compile
   error. (A throwaway Node script that reads the exported string and runs
   `handlebars.compile(str)(sampleData)` is sufficient.)
3. **Visual check** — call
   `POST /api/v1/reports/preview-prescription-template`
   with `{ "templateName": "templateN", "colors": {...color1..10}, "fontFamily": "Inter, sans-serif" }`
   and open the returned `html`. The preview uses the same Handlebars engine as
   real PDF output, so it is pixel-faithful.

## 6. Adding a brand-new template

1. Create `src/htmltamplates/report_cardN.ts` exporting `reportCardTemplateN`.
2. Follow the **shared data contract** above (no new variables).
3. Import it in `report.service.ts` and `report.controller.ts`, and add a
   `case 'templateN':` to the service `switch`.
4. Document its concept + regeneration instructions in this file.
5. Run the verification steps in section 5.
