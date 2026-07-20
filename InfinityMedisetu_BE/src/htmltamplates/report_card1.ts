/**
 * Template 1 — "Simple / Minimal"
 * Layout: single column, light and uncluttered. A thin colored rule runs down
 * the left margin (classic Rx-pad feel); otherwise plain typography, hairline
 * dividers and generous whitespace. No color fills or decorative fonts.
 * Distinct from Template 2 (formal letterhead), Template 3 (handwritten) and
 * Template 4 (modern banner).
 * See docs/prescription-templates.md for the full regeneration spec.
 */
export const reportCardTemplate1 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{patient.name}}'s Prescription</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={{templateConfig.primaryFont}}&display=swap" rel="stylesheet">
<style>
    @page { size: A4; margin: 0; }
    :root {
        --color1: {{templateConfig.colors.color1}};
        --color2: {{templateConfig.colors.color2}};
        --color3: {{templateConfig.colors.color3}};
        --color4: {{templateConfig.colors.color4}};
        --color5: {{templateConfig.colors.color5}};
        --color6: {{templateConfig.colors.color6}};
        --color7: {{templateConfig.colors.color7}};
        --color8: {{templateConfig.colors.color8}};
        --color9: {{templateConfig.colors.color9}};
        --color10: {{templateConfig.colors.color10}};
    }
    * { box-sizing: border-box; }
    body {
        font-family: '{{templateConfig.fontFamily}}', Arial, Helvetica, sans-serif;
        margin: 0; padding: 0;
        color: var(--color3);
        line-height: 1.5;
        background-color: var(--color8);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .pad {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: var(--color8);
        display: flex;
        flex-direction: column;
        /* classic Rx-pad ruled left margin */
        border-left: 3px solid var(--color1);
        padding: 24mm 18mm 14mm 20mm;
    }

    /* ---------- Header ---------- */
    .head {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding-bottom: 14px; margin-bottom: 4px;
        border-bottom: 2px solid var(--color1);
    }
    .head-left { max-width: 60%; }
    .clinic-name {
        font-size: 21px; font-weight: 700; color: var(--color1);
        letter-spacing: 0.2px;
    }
    .clinic-meta { font-size: 11px; color: var(--color4); margin-top: 5px; line-height: 1.55; }
    .head-right { text-align: right; max-width: 40%; }
    .doctor-name { font-size: 15px; font-weight: 700; color: var(--color9); }
    .doctor-meta { font-size: 11px; color: var(--color4); margin-top: 2px; }

    /* ---------- Patient line ---------- */
    .patient-row {
        display: flex; flex-wrap: wrap; gap: 6px 30px;
        padding: 14px 0; border-bottom: 1px solid var(--color5);
    }
    .field { font-size: 13px; }
    .field .k {
        color: var(--color4); font-size: 10px; text-transform: uppercase;
        letter-spacing: 0.5px; display: block; margin-bottom: 1px;
    }
    .field .v { color: var(--color9); font-weight: 600; }

    /* ---------- Clinical ---------- */
    .clinical { font-size: 13px; padding-top: 12px; }
    .clinical p { margin: 3px 0; }
    .clinical .k { font-weight: 600; color: var(--color1); margin-right: 6px; }
    .clinical .v { color: var(--color9); }

    /* ---------- Rx / medications ---------- */
    .rx { flex: 1; padding-top: 12px; }
    .rx-symbol { font-size: 32px; font-weight: 700; color: var(--color1); margin-bottom: 8px; }
    .med-table { width: 100%; border-collapse: collapse; }
    .med-table th {
        text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: var(--color1); padding: 6px 6px; border-bottom: 1.5px solid var(--color1);
    }
    .med-table td { padding: 10px 6px; border-bottom: 1px solid var(--color5); font-size: 13px; vertical-align: top; }
    .med-index { width: 22px; color: var(--color4); }
    .medicine-name { font-weight: 600; color: var(--color9); }
    .medicine-strength { font-size: 11px; color: var(--color4); margin-top: 2px; }
    .medicine-notes { font-size: 11px; color: var(--color4); margin-top: 2px; }

    /* ---------- Notes ---------- */
    .note { font-size: 13px; padding-top: 14px; }
    .note .lbl {
        font-weight: 600; color: var(--color1); text-transform: uppercase;
        letter-spacing: 0.4px; font-size: 11px;
    }
    .note p { margin: 3px 0; color: var(--color3); }

    /* ---------- Multi-page handling (10+ medicines) ---------- */
    .med-table thead { display: table-header-group; }
    .med-table tr { break-inside: avoid; page-break-inside: avoid; }
    .med-table td { word-break: break-word; }

    /* ---------- Signature + bottom ---------- */
    .sign { margin-top: auto; padding-top: 30px; display: flex; justify-content: flex-end; }
    .sign-box { text-align: center; min-width: 180px; border-top: 1px solid var(--color3); padding-top: 6px; }
    .sign-name { font-size: 13px; font-weight: 600; color: var(--color9); }
    .sign-sub { font-size: 11px; color: var(--color4); }

    .timings { font-size: 11px; color: var(--color4); padding-top: 14px; margin-top: 14px; border-top: 1px solid var(--color5); }
    .timings .lbl { font-weight: 600; color: var(--color1); text-transform: uppercase; letter-spacing: 0.4px; margin-right: 8px; }
    .timings .item { margin-right: 14px; white-space: nowrap; }

    .footer { font-size: 10px; color: var(--color4); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { display: flex; align-items: center; gap: 6px; }
    .footer-brand img { height: 14px; width: auto; object-fit: contain; }
</style>
</head>
<body>
<div class="pad">

    <!-- Header -->
    <div class="head">
        <div class="head-left">
            <div class="clinic-name">{{clinic.name}}</div>
            <div class="clinic-meta">
                {{clinic.address}}{{#if clinic.city}}, {{clinic.city}}{{/if}}{{#if clinic.state}}, {{clinic.state}}{{/if}}{{#if clinic.zipcode}} - {{clinic.zipcode}}{{/if}}{{#if clinic.phone}}<br/>Ph: {{clinic.phone}}{{/if}}
            </div>
        </div>
        <div class="head-right">
            <div class="doctor-name">Dr. {{doctor.name}}</div>
            {{#if doctor.qualification}}<div class="doctor-meta">{{doctor.qualification}}</div>{{/if}}
            {{#if doctor.speciality}}<div class="doctor-meta">{{doctor.speciality}}</div>{{/if}}
            {{#if doctor.registrationNumber}}<div class="doctor-meta">Reg. No: {{doctor.registrationNumber}}</div>{{/if}}
        </div>
    </div>

    <!-- Patient -->
    <div class="patient-row">
        <div class="field"><span class="k">Patient</span><span class="v">{{patient.name}}</span></div>
        <div class="field"><span class="k">Age / Sex</span><span class="v">{{patient.age}} Y / {{patient.gender}}</span></div>
        <div class="field"><span class="k">Date</span><span class="v">{{appointmentDate}}</span></div>
        {{#if patient.address}}<div class="field"><span class="k">Address</span><span class="v">{{patient.address}}</span></div>{{/if}}
    </div>

    <!-- Complaints & Diagnosis -->
    {{#if symptoms.length}}
    <div class="clinical"><p><span class="k">C/O:</span><span class="v">{{#each symptoms}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}</span></p></div>
    {{/if}}
    {{#if diagnosis}}
    <div class="clinical"><p><span class="k">Diagnosis:</span><span class="v">{{diagnosis}}</span></p></div>
    {{/if}}

    <!-- Rx -->
    <div class="rx">
        <div class="rx-symbol">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="height: 32px; width: auto; fill: var(--color1); display: block; margin-bottom: 8px;">
                <path d="M301.26 352l78.06-78.06c6.25-6.25 6.25-16.38 0-22.63l-22.63-22.63c-6.25-6.25-16.38-6.25-22.63 0L256 306.74l-83.96-83.96C219.31 216.8 256 176.89 256 128c0-53.02-42.98-96-96-96H16C7.16 32 0 39.16 0 48v256c0 8.84 7.16 16 16 16h32c8.84 0 16-7.16 16-16v-80h18.75l128 128-78.06 78.06c-6.25 6.25-6.25 16.38 0 22.63l22.63 22.63c6.25 6.25 16.38 6.25 22.63 0L256 374.74l83.96 83.96c6.25 6.25 16.38 6.25 22.63 0l22.63-22.63c6.25-6.25 6.25-16.38 0-22.63L301.26 352zM160 96c17.67 0 32 14.33 32 32s-14.33 32-32 32h-64V96h64z"/>
            </svg>
        </div>
        {{#if prescriptions.length}}
        <table class="med-table">
            <thead>
                <tr>
                    <th class="med-index">#</th>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Duration</th>
                    <th>Timing/Notes</th>
                    <th>Instruction</th>
                </tr>
            </thead>
            <tbody>
                {{#each prescriptions}}
                <tr>
                    <td class="med-index">{{addOne @index}}.</td>
                    <td><div class="medicine-name">{{this.medicineName}}</div></td>
                    <td>{{this.frequency}}</td>
                    <td>{{this.duration}}</td>
                    <td>{{#if this.notes}}{{this.notes}}{{/if}}</td>
                    <td>{{this.dosage}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        {{/if}}
    </div>

    <!-- Notes -->
    {{#if hasTests}}
    <div class="note"><span class="lbl">Investigations Advised</span><p>{{testNames}}</p></div>
    {{/if}}
    {{#if advice}}
    <div class="note"><span class="lbl">Advice</span><p>{{advice}}</p></div>
    {{/if}}
    {{#if followUpDate}}
    <div class="note"><span class="lbl">Next Visit</span><p>{{followUpDate}}</p></div>
    {{/if}}

    <!-- Signature -->
    <div class="sign">
        <div class="sign-box">
            <div class="sign-name">Dr. {{doctor.name}}</div>
            <div class="sign-sub">Signature</div>
        </div>
    </div>

    <!-- Consultation hours (bottom) -->
    {{#if doctor.groupedAvailability}}
    <div class="timings">
        <span class="lbl">Consultation Hours:</span>
        {{#each doctor.groupedAvailability}}{{#if this.isAvailable}}<span class="item">{{this.days}}: {{{this.display}}}</span>{{/if}}{{/each}}
    </div>
    {{/if}}

    <!-- Footer -->
    <div class="footer">
        <span>This is a computer-generated prescription &mdash; valid without signature.</span>
        <span class="footer-brand">
            Powered by
            <img src="https://infninity-medisatu.s3.ap-south-1.amazonaws.com/ims/Logo%20V1.png" alt="Infinity MediSetu" />
        </span>
    </div>
</div>
</body>
</html>
`;
