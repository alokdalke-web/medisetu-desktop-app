/**
 * Template 4 — "Modern Banner" (also the default fallback)
 * Layout: single column. A full-width colored header band carries the clinic
 * (left) and doctor (right). The body is clean white with a patient info card,
 * Rx, a medication table with a colored header row, advice, signature, and a
 * bottom consultation-hours strip.
 * Distinct from Template 1 (minimal), Template 2 (letterhead) and Template 3 (handwritten).
 * See docs/prescription-templates.md for the full regeneration spec.
 */
export const reportCardTemplate4 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{patient.name}}'s Prescription</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={{templateConfig.primaryFont}}&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
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
        line-height: 1.45;
        background-color: var(--color5);
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
    }

    /* ---------- Banner header ---------- */
    .banner {
        background: var(--color1);
        color: var(--color8);
        padding: 22px 36px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }
    .banner-left { display: flex; align-items: center; gap: 14px; }
    .banner-logo {
        height: 50px; width: auto; object-fit: contain;
        background: var(--color8); border-radius: 8px; padding: 5px;
    }
    .clinic-name { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; }
    .clinic-tagline { font-size: 11px; font-style: italic; opacity: 0.9; margin-top: 2px; }
    .clinic-meta { font-size: 10px; opacity: 0.85; margin-top: 4px; line-height: 1.5; }
    .banner-right { text-align: right; }
    .doctor-name { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 700; }
    .doctor-meta { font-size: 11px; opacity: 0.9; margin-top: 2px; }

    /* ---------- Body ---------- */
    .body { flex: 1; padding: 22px 36px; display: flex; flex-direction: column; }

    .top-row { display: flex; justify-content: flex-end; font-size: 12px; color: var(--color4); margin-bottom: 12px; }
    .top-row .k { font-weight: 600; color: var(--color1); margin-right: 6px; }

    .patient-card {
        background: var(--color7); border-radius: 10px; padding: 14px 18px;
        margin-bottom: 16px; display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 12px;
    }
    .pf-label { font-size: 9px; font-weight: 600; color: var(--color4); text-transform: uppercase; letter-spacing: 0.5px; }
    .pf-value { font-size: 13px; font-weight: 600; color: var(--color9); margin-top: 3px; }

    .clinical { font-size: 13px; margin-bottom: 6px; }
    .clinical p { margin: 4px 0; }
    .clinical .k { font-weight: 600; color: var(--color1); margin-right: 6px; }

    .rx-symbol { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700; color: var(--color1); line-height: 1; margin: 4px 0 8px; }

    .med-table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
    .med-table thead { background: var(--color1); color: var(--color8); }
    .med-table th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; padding: 10px 10px; }
    .med-table td { padding: 11px 10px; border-bottom: 1px solid var(--color5); font-size: 13px; vertical-align: top; }
    .med-table tbody tr:nth-child(even) { background: var(--color7); }
    .med-index { width: 26px; font-weight: 700; color: var(--color4); }
    .medicine-name { font-weight: 700; font-size: 14px; color: var(--color9); }
    .medicine-strength { font-size: 11px; color: var(--color4); margin-top: 2px; }
    .medicine-notes { font-size: 11px; color: var(--color4); font-style: italic; margin-top: 3px; }

    /* ---------- Multi-page handling (10+ medicines) ---------- */
    .med-table thead { display: table-header-group; }
    .med-table tr { break-inside: avoid; page-break-inside: avoid; }

    .advice-block {
        margin-top: 14px; padding: 12px 16px;
        background: var(--color7); border-left: 4px solid var(--color10); border-radius: 0 8px 8px 0;
    }
    .advice-title { font-weight: 700; color: var(--color10); text-transform: uppercase; letter-spacing: 0.4px; font-size: 12px; margin-bottom: 4px; }
    .advice-text { font-size: 12px; color: var(--color3); line-height: 1.6; }
    .follow-up { font-size: 13px; margin-top: 12px; }
    .follow-up .k { font-weight: 600; color: var(--color1); margin-right: 6px; }

    .sign-area { margin-top: auto; padding-top: 28px; display: flex; justify-content: flex-end; }
    .sign-box { text-align: center; min-width: 190px; }
    .sign-line { border-top: 1px solid var(--color3); padding-top: 6px; font-size: 13px; font-weight: 700; color: var(--color3); }
    .sign-sub { font-size: 11px; color: var(--color4); margin-top: 2px; }

    .timings {
        display: flex; flex-wrap: wrap; gap: 4px 18px;
        padding: 8px 36px; font-size: 10px; color: var(--color4);
        background: var(--color7); border-top: 1px solid var(--color5);
    }
    .timings .lbl { font-weight: 600; color: var(--color1); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 6px; }
    .timing-item span:first-child { font-weight: 600; color: var(--color3); }

    .footer {
        background: var(--color1); color: var(--color8); padding: 10px 36px;
        font-size: 10px; display: flex; justify-content: space-between; align-items: center;
    }
    .footer-brand { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
    .footer-brand img { height: 14px; width: auto; object-fit: contain; opacity: 0.9; }
</style>
</head>
<body>
<div class="pad">

    <!-- Banner header -->
    <div class="banner">
        <div class="banner-left">
            {{#if clinic.logo}}<img src="{{clinic.logo}}" class="banner-logo" alt="clinic logo" />{{/if}}
            <div>
                <div class="clinic-name">{{clinic.name}}</div>
                {{#if clinic.tagline}}<div class="clinic-tagline">{{clinic.tagline}}</div>{{/if}}
                <div class="clinic-meta">
                    {{clinic.address}}{{#if clinic.city}}, {{clinic.city}}{{/if}}{{#if clinic.state}}, {{clinic.state}}{{/if}}{{#if clinic.zipcode}} - {{clinic.zipcode}}{{/if}}{{#if clinic.phone}} | Ph: {{clinic.phone}}{{/if}}
                </div>
            </div>
        </div>
        <div class="banner-right">
            <div class="doctor-name">Dr. {{doctor.name}}</div>
            {{#if doctor.speciality}}<div class="doctor-meta">{{doctor.speciality}}</div>{{/if}}
            {{#if doctor.qualification}}<div class="doctor-meta">{{doctor.qualification}}</div>{{/if}}
            {{#if doctor.registrationNumber}}<div class="doctor-meta">Reg. No: {{doctor.registrationNumber}}</div>{{/if}}
        </div>
    </div>

    <!-- Body -->
    <div class="body">
        <div class="top-row"><span class="k">Date:</span>{{appointmentDate}}</div>

        <div class="patient-card">
            <div><div class="pf-label">Patient Name</div><div class="pf-value">{{patient.name}}</div></div>
            <div><div class="pf-label">Age / Sex</div><div class="pf-value">{{patient.age}} Y / {{patient.gender}}</div></div>
            {{#if patient.address}}<div><div class="pf-label">Address</div><div class="pf-value">{{patient.address}}</div></div>{{/if}}
        </div>

        {{#if symptoms.length}}
        <div class="clinical"><p><span class="k">C/O:</span>{{#each symptoms}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}</p></div>
        {{/if}}
        {{#if diagnosis}}
        <div class="clinical"><p><span class="k">Diagnosis:</span>{{diagnosis}}</p></div>
        {{/if}}

        <div class="rx-symbol">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="height: 42px; width: auto; fill: var(--color1); display: block; margin: 4px 0 8px;">
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

        {{#if hasTests}}
        <div class="advice-block"><div class="advice-title">Investigations Advised</div><div class="advice-text">{{testNames}}</div></div>
        {{/if}}
        {{#if advice}}
        <div class="advice-block"><div class="advice-title">Advice</div><div class="advice-text">{{advice}}</div></div>
        {{/if}}
        {{#if followUpDate}}
        <div class="follow-up"><span class="k">Next Visit:</span>{{followUpDate}}</div>
        {{/if}}

        <div class="sign-area">
            <div class="sign-box">
                <div class="sign-line">Dr. {{doctor.name}}</div>
                <div class="sign-sub">Signature</div>
            </div>
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
