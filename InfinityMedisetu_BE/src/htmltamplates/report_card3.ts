/**
 * Template 3 — "Handwritten Pad"
 * Layout: single column on cream paper. Static labels use a clean sans (Inter)
 * while all dynamic values (patient, complaints, medicines, advice) use a
 * handwriting font (Caveat) to evoke a doctor's handwritten prescription.
 * Distinct from Template 1 (sidebar) and Template 2 (formal letterhead).
 * See docs/prescription-templates.md for the full regeneration spec.
 */
export const reportCardTemplate3 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{patient.name}}'s Prescription</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet">
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
        font-family: 'Inter', sans-serif;
        margin: 0; padding: 0;
        color: var(--color3);
        line-height: 1.45;
        background-color: var(--color5);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .pad {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #fffef7;
        position: relative;
        display: flex;
        flex-direction: column;
        border-top: 8px solid var(--color1);
    }

    /* ---------- Letterhead ---------- */
    .letterhead {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 24px 40px 16px; border-bottom: 2px solid var(--color2);
    }
    .doctor-block { max-width: 60%; }
    .doctor-name { font-size: 22px; font-weight: 800; color: var(--color1); line-height: 1.1; }
    .doctor-qual { font-size: 12px; color: var(--color4); margin-top: 4px; }
    .doctor-speciality { font-size: 12px; font-weight: 600; color: var(--color3); margin-top: 2px; }
    .doctor-reg { font-size: 11px; color: var(--color4); margin-top: 4px; }
    .clinic-block { text-align: right; max-width: 40%; }
    .clinic-logo { height: 44px; width: auto; object-fit: contain; margin-bottom: 6px; }
    .clinic-name { font-size: 17px; font-weight: 800; color: var(--color3); }
    .clinic-tagline { font-size: 11px; font-style: italic; color: var(--color4); margin-top: 2px; }
    .clinic-meta { font-size: 11px; color: var(--color4); margin-top: 6px; line-height: 1.5; }

    /* ---------- Timings strip ---------- */
    .timings {
        display: flex; flex-wrap: wrap; gap: 4px 18px;
        padding: 8px 40px; font-size: 10px; color: var(--color4);
        background: #faf6ed; border-top: 1px solid var(--color5);
    }
    .timings .lbl { font-weight: 700; color: var(--color1); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 6px; }
    .timing-item span:first-child { font-weight: 700; color: var(--color1); }

    /* ---------- Patient line ---------- */
    .patient-row {
        display: flex; flex-wrap: wrap; gap: 10px 30px;
        padding: 14px 40px; margin: 12px 40px 0;
        background: #fefbf5; border: 1px solid #e9e0cf; border-radius: 12px;
    }
    .field { font-size: 13px; display: flex; align-items: baseline; gap: 6px; }
    .field .k { font-weight: 700; color: var(--color1); white-space: nowrap; text-transform: uppercase; font-size: 11px; }
    .field .v { font-family: 'Caveat', cursive; font-size: 18px; color: #2c2418; }
    .field.grow { flex: 1; min-width: 160px; }

    /* ---------- Clinical line ---------- */
    .clinical { padding: 10px 40px 0; }
    .clinical .info-row { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; }
    .clinical .k {
        font-weight: 700; font-size: 12px; letter-spacing: 0.4px;
        color: var(--color1); text-transform: uppercase; min-width: 130px; flex-shrink: 0;
    }
    .clinical .v { font-family: 'Caveat', cursive; font-size: 18px; color: #2c2418; flex: 1; }

    /* ---------- Body / Rx ---------- */
    .rx-body { flex: 1; padding: 4px 40px 20px; }
    .rx-symbol { font-family: 'Caveat', cursive; font-size: 46px; font-weight: 700; color: var(--color1); line-height: 1; margin-bottom: 6px; }
    .med-table { width: 100%; border-collapse: collapse; }
    .med-table th {
        text-align: left; font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.4px; color: var(--color1);
        padding: 6px 8px; border-bottom: 2px solid var(--color1);
    }
    .med-table td {
        padding: 10px 8px; border-bottom: 0.5px dotted var(--color5);
        font-family: 'Caveat', cursive; font-size: 18px; color: #1f1a10; vertical-align: top;
    }
    .med-index { width: 26px; font-weight: 700; color: var(--color4); font-family: 'Inter', sans-serif; font-size: 13px; }
    .medicine-name { font-weight: 700; color: #1f1a10; }
    .medicine-strength { font-family: 'Inter', sans-serif; font-size: 11px; color: var(--color4); margin-top: 2px; }
    .medicine-notes { font-family: 'Inter', sans-serif; font-size: 11px; color: var(--color4); font-style: italic; margin-top: 2px; }

    /* ---------- Multi-page handling (10+ medicines) ---------- */
    .med-table thead { display: table-header-group; }
    .med-table tr { break-inside: avoid; page-break-inside: avoid; }

    /* ---------- Advice ---------- */
    .advice-section { padding: 12px 40px 0; }
    .advice-block {
        background: #fef6e7; border-radius: 12px; padding: 8px 14px;
        margin-bottom: 8px; border-left: 4px solid var(--color10);
        display: flex; align-items: baseline; gap: 10px;
    }
    .advice-title { font-weight: 700; color: var(--color10); text-transform: uppercase; letter-spacing: 0.3px; font-size: 11px; min-width: 90px; flex-shrink: 0; }
    .advice-text { font-family: 'Caveat', cursive; font-size: 17px; color: #2c2418; line-height: 1.4; }
    .follow-up { padding: 8px 40px 0; }
    .follow-up .info-row { display: flex; align-items: baseline; gap: 12px; }
    .follow-up .k { font-weight: 700; font-size: 12px; color: var(--color1); text-transform: uppercase; min-width: 130px; }
    .follow-up .v { font-family: 'Caveat', cursive; font-size: 18px; color: #2c2418; }

    /* ---------- Signature & footer ---------- */
    .sign-area { margin-top: auto; padding: 26px 40px 12px; display: flex; justify-content: flex-end; }
    .sign-box { text-align: center; min-width: 200px; }
    .sign-line { border-top: 1px solid var(--color3); padding-top: 6px; font-size: 13px; font-weight: 700; color: var(--color3); }
    .sign-sub { font-size: 11px; color: var(--color4); margin-top: 2px; }
    .footer {
        border-top: 1px dashed var(--color5); padding: 10px 40px;
        font-size: 10px; color: var(--color4);
        display: flex; justify-content: space-between; align-items: center;
    }
    .footer-brand { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
    .footer-brand img { height: 16px; width: auto; object-fit: contain; }
</style>
</head>
<body>
<div class="pad">

    <!-- Letterhead -->
    <div class="letterhead">
        <div class="doctor-block">
            <div class="doctor-name">Dr. {{doctor.name}}</div>
            {{#if doctor.qualification}}<div class="doctor-qual">{{doctor.qualification}}</div>{{/if}}
            {{#if doctor.speciality}}<div class="doctor-speciality">{{doctor.speciality}}</div>{{/if}}
            {{#if doctor.registrationNumber}}<div class="doctor-reg">Reg. No: {{doctor.registrationNumber}}</div>{{/if}}
        </div>
        <div class="clinic-block">
            {{#if clinic.logo}}<img src="{{clinic.logo}}" class="clinic-logo" alt="clinic logo" />{{/if}}
            <div class="clinic-name">{{clinic.name}}</div>
            {{#if clinic.tagline}}<div class="clinic-tagline">{{clinic.tagline}}</div>{{/if}}
            <div class="clinic-meta">
                {{clinic.address}}{{#if clinic.city}}, {{clinic.city}}{{/if}}{{#if clinic.state}}, {{clinic.state}}{{/if}}{{#if clinic.zipcode}} - {{clinic.zipcode}}{{/if}}
                {{#if clinic.phone}}<br/>Ph: {{clinic.phone}}{{/if}}
            </div>
        </div>
    </div>

    <!-- Patient details -->
    <div class="patient-row">
        <div class="field"><span class="k">Patient:</span><span class="v">{{patient.name}}</span></div>
        <div class="field"><span class="k">Age/Sex:</span><span class="v">{{patient.age}} Y / {{patient.gender}}</span></div>
        <div class="field"><span class="k">Date:</span><span class="v">{{appointmentDate}}</span></div>
        {{#if patient.address}}
        <div class="field grow"><span class="k">Address:</span><span class="v">{{patient.address}}</span></div>
        {{/if}}
    </div>

    <!-- Complaints & Diagnosis -->
    <div class="clinical">
        {{#if symptoms.length}}
        <div class="info-row"><span class="k">C/O</span><span class="v">{{#each symptoms}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}</span></div>
        {{/if}}
        {{#if diagnosis}}
        <div class="info-row"><span class="k">Diagnosis</span><span class="v">{{diagnosis}}</span></div>
        {{/if}}
    </div>

    <!-- Rx / Medications -->
    <div class="rx-body">
        <div class="rx-symbol">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="height: 46px; width: auto; fill: var(--color1); display: block; margin-bottom: 6px;">
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

    <!-- Advice / Investigations / Follow-up -->
    {{#if hasTests}}
    <div class="advice-section"><div class="advice-block"><span class="advice-title">Investigations</span><span class="advice-text">{{testNames}}</span></div></div>
    {{/if}}
    {{#if advice}}
    <div class="advice-section"><div class="advice-block"><span class="advice-title">Advice</span><span class="advice-text">{{advice}}</span></div></div>
    {{/if}}
    {{#if followUpDate}}
    <div class="follow-up"><div class="info-row"><span class="k">Next Visit</span><span class="v">{{followUpDate}}</span></div></div>
    {{/if}}

    <!-- Signature -->
    <div class="sign-area">
        <div class="sign-box">
            <div class="sign-line">Dr. {{doctor.name}}</div>
            <div class="sign-sub">Signature</div>
        </div>
    </div>

    <!-- Consultation timings (bottom) -->
    {{#if doctor.groupedAvailability}}
    <div class="timings">
        <span class="lbl">Consultation Hours</span>
        {{#each doctor.groupedAvailability}}
            {{#if this.isAvailable}}
            <span class="timing-item"><span>{{this.days}}:</span> {{{this.display}}}</span>
            {{/if}}
        {{/each}}
    </div>
    {{/if}}

    <!-- Footer -->
    <div class="footer">
        <span>{{clinic.name}}</span>
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
