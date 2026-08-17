import type { TemplateColors } from "../../../../types/lab-report";

// Local copies of the backend HTML templates for instant client-side preview
// rendering — no network round-trip while a lab assistant is dragging a
// colour picker or switching layouts.
const labReportTemplate1 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report</title>
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
        background-color: #e2e8f0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .pad {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        background: var(--color8);
        display: flex;
        flex-direction: column;
        border-left: 3px solid var(--color1);
        padding: 24mm 18mm 14mm 20mm;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .head {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding-bottom: 14px; margin-bottom: 4px;
        border-bottom: 2px solid var(--color1);
    }
    .clinic-name {
        font-size: 21px; font-weight: 700; color: var(--color1);
    }
    .clinic-meta { font-size: 11px; color: var(--color4); margin-top: 5px; line-height: 1.55; }
    .report-title { font-size: 15px; font-weight: 700; color: var(--color9); }
    .report-meta { font-size: 11px; color: var(--color4); margin-top: 2px; }
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
    .result-section { flex: 1; padding-top: 16px; }
    .result-table { width: 100%; border-collapse: collapse; }
    .result-table th {
        text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: var(--color1); padding: 8px 6px; border-bottom: 1.5px solid var(--color1);
    }
    .result-table td { padding: 10px 6px; border-bottom: 1px solid var(--color5); font-size: 13px; }
    .param-name { font-weight: 600; color: var(--color9); }
    .flag-badge { font-weight: 700; }
    .flag-badge[data-flag="High"] { color: var(--color6); }
    .flag-badge[data-flag="Low"] { color: #D97706; }
    .flag-badge[data-flag="Normal"] { color: #16A34A; }
    .remarks-section { margin-top: 20px; padding: 12px; border: 1px solid var(--color5); border-radius: 4px; }
    .remarks-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--color1); margin-bottom: 4px; }
    .remarks-text { font-size: 12px; color: var(--color3); }
    .footer {
        margin-top: auto; padding-top: 14px;
        border-top: 1px solid var(--color5);
        display: flex; justify-content: space-between; align-items: flex-end;
    }
    .footer-left { font-size: 10px; color: var(--color4); }
    .sig-line { width: 150px; border-bottom: 1px solid var(--color3); margin-bottom: 4px; }
    .sig-label { font-size: 11px; font-weight: 600; color: var(--color9); }
</style>
</head>
<body>
<div class="pad">
    <header class="head">
        <div class="head-left">
            <div class="clinic-name">{{clinic.name}}</div>
            <div class="clinic-meta">{{clinic.address}}</div>
        </div>
        <div class="head-right">
            <div class="report-meta">
                <strong>Status:</strong> {{labResult.status}}<br>
                <strong>Generated:</strong> {{generatedAt}}
            </div>
        </div>
    </header>
    <div class="patient-row">
        <div class="field"><span class="k">Patient Name</span><span class="v">{{patient.name}}</span></div>
        <div class="field"><span class="k">Referral Doctor</span><span class="v">{{doctor.name}}</span></div>
        <div class="field"><span class="k">Test Name</span><span class="v">{{test.name}}</span></div>
        <div class="field"><span class="k">Sample Type</span><span class="v">{{template.sampleType}}</span></div>
    </div>
    <main class="result-section">
        <table class="result-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Flag</th>
                </tr>
            </thead>
            <tbody>
                {{#each values}}
                <tr>
                    <td class="param-name">{{parameterName}}</td>
                    <td><strong>{{value}}</strong></td>
                    <td>{{unit}}</td>
                    <td>{{referenceRange}}</td>
                    <td class="flag-badge" data-flag="{{flag}}">{{flag}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </main>
    {{#if labResult.remarks}}
    <div class="remarks-section">
        <div class="remarks-title">Remarks / Interpretations</div>
        <div class="remarks-text">{{labResult.remarks}}</div>
    </div>
    {{/if}}
    <footer class="footer">
        <div class="footer-left">
            This is a system-generated laboratory report.<br>
            Verified At: {{labResult.verifiedAt}}
        </div>
        <div class="footer-right">
            <div class="sig-line"></div>
            <div class="sig-label">Authorized Signatory</div>
        </div>
    </footer>
</div>
</body>
</html>
`;

const labReportTemplate2 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report</title>
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
        font-family: '{{templateConfig.fontFamily}}', Arial, sans-serif;
        margin: 0; padding: 0;
        color: var(--color3);
        line-height: 1.45;
        background-color: #e2e8f0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .pad {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        background: var(--color8);
        display: flex;
        flex-direction: column;
        border-top: 8px solid var(--color1);
        padding-bottom: 20mm;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .letterhead {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 24px 40px 16px; border-bottom: 2px solid var(--color1);
    }
    .lab-title { font-size: 24px; font-weight: 700; color: var(--color1); }
    .clinic-name { font-size: 18px; font-weight: 700; color: var(--color3); }
    .clinic-meta { font-size: 11px; color: var(--color4); margin-top: 4px; }
    .patient-section { padding: 20px 40px; background-color: var(--color7); }
    .patient-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 24px; }
    .info-item { border-bottom: 1px dotted var(--color4); padding-bottom: 4px; }
    .info-label { font-size: 10px; text-transform: uppercase; color: var(--color4); }
    .info-value { font-size: 13px; font-weight: 700; color: var(--color9); margin-top: 2px; }
    .result-section { flex: 1; padding: 24px 40px; }
    .result-title { font-size: 18px; color: var(--color1); margin-bottom: 12px; border-bottom: 1px solid var(--color2); padding-bottom: 6px; }
    .result-table { width: 100%; border-collapse: collapse; }
    .result-table th { text-align: left; font-size: 12px; font-weight: 700; color: var(--color1); padding: 10px; border-bottom: 2px solid var(--color1); }
    .result-table td { padding: 12px 10px; border-bottom: 1px solid var(--color5); font-size: 13px; }
    .param-name { font-weight: 700; color: var(--color9); }
    .flag-badge { font-weight: 700; }
    .flag-badge[data-flag="High"] { color: var(--color6); }
    .flag-badge[data-flag="Low"] { color: #D97706; }
    .flag-badge[data-flag="Normal"] { color: #16A34A; }
    .remarks-section { margin: 20px 40px; padding: 16px; background-color: var(--color7); border-left: 4px solid var(--color1); }
    .remarks-title { font-size: 13px; font-weight: 700; color: var(--color1); }
    .remarks-text { font-size: 12px; color: var(--color3); }
    .footer { padding: 20px 40px 0; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid var(--color5); }
    .footer-left { font-size: 10px; color: var(--color4); }
    .sig-line { width: 160px; border-bottom: 1px solid var(--color1); margin-bottom: 6px; }
    .sig-label { font-size: 11px; font-weight: 700; color: var(--color9); }
</style>
</head>
<body>
<div class="pad">
    <header class="letterhead">

        <div class="clinic-block">
            <div class="clinic-name">{{clinic.name}}</div>
            <div class="clinic-meta">{{clinic.address}}</div>
        </div>
    </header>
    <section class="patient-section">
        <div class="patient-grid">
            <div class="info-item"><div class="info-label">Patient Name</div><div class="info-value">{{patient.name}}</div></div>
            <div class="info-item"><div class="info-label">Referral Doctor</div><div class="info-value">{{doctor.name}}</div></div>
            <div class="info-item"><div class="info-label">Test Name</div><div class="info-value">{{test.name}}</div></div>
            <div class="info-item"><div class="info-label">Sample Type</div><div class="info-value">{{template.sampleType}}</div></div>
        </div>
    </section>
    <main class="result-section">
        <div class="result-title">Investigation Results</div>
        <table class="result-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Result Value</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Flag</th>
                </tr>
            </thead>
            <tbody>
                {{#each values}}
                <tr>
                    <td class="param-name">{{parameterName}}</td>
                    <td><strong>{{value}}</strong></td>
                    <td>{{unit}}</td>
                    <td>{{referenceRange}}</td>
                    <td class="flag-badge" data-flag="{{flag}}">{{flag}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </main>
    {{#if labResult.remarks}}
    <section class="remarks-section">
        <div class="remarks-title">Remarks / Interpretations</div>
        <div class="remarks-text">{{labResult.remarks}}</div>
    </section>
    {{/if}}
    <footer class="footer">
        <div class="footer-left">
            This is a system-generated laboratory report.<br>
            Verified At: {{labResult.verifiedAt}}
        </div>
        <div class="footer-right">
            <div class="sig-line"></div>
            <div class="sig-label">Authorized Signatory</div>
        </div>
    </footer>
</div>
</body>
</html>
`;

const labReportTemplate3 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report</title>
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
        font-family: '{{templateConfig.fontFamily}}', Arial, sans-serif;
        margin: 0; padding: 0;
        color: var(--color3);
        line-height: 1.45;
        background-color: #e2e8f0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .pad {
        width: 210mm;
        min-height: 297mm;
        margin: 16px auto;
        background: #fffef7;
        display: flex;
        flex-direction: column;
        border-top: 8px solid var(--color1);
        padding-bottom: 20mm;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }
    .letterhead {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 24px 40px 16px; border-bottom: 2px solid var(--color2);
    }
    .lab-title { font-size: 22px; font-weight: 800; color: var(--color1); text-transform: uppercase; }
    .clinic-name { font-size: 18px; font-weight: 800; color: var(--color3); }
    .clinic-meta { font-size: 11px; color: var(--color4); margin-top: 4px; }
    .patient-section { padding: 20px 40px; }
    .patient-card { background: #fefbf5; border: 1px solid #e9e0cf; border-radius: 8px; padding: 14px 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .info-label { font-size: 10px; text-transform: uppercase; color: var(--color4); }
    .info-value { font-size: 13px; font-weight: 700; color: var(--color9); margin-top: 2px; }
    .result-section { flex: 1; padding: 24px 40px; }
    .result-table { width: 100%; border-collapse: collapse; }
    .result-table th { text-align: left; font-size: 11px; font-weight: 800; color: var(--color1); padding: 10px; border-bottom: 2px solid var(--color1); }
    .result-table td { padding: 12px 10px; border-bottom: 1px solid var(--color5); font-size: 13px; }
    .param-name { font-weight: 700; color: var(--color9); }
    .flag-badge { font-weight: 700; }
    .flag-badge[data-flag="High"] { color: var(--color6); }
    .flag-badge[data-flag="Low"] { color: #D97706; }
    .flag-badge[data-flag="Normal"] { color: #16A34A; }
    .remarks-section { margin: 20px 40px; padding: 16px; background-color: var(--color7); border: 1px solid var(--color5); }
    .remarks-title { font-size: 13px; font-weight: 700; color: var(--color1); }
    .remarks-text { font-size: 12px; color: var(--color3); }
    .footer { padding: 20px 40px 0; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
    .sig-line { width: 160px; border-bottom: 1px solid var(--color1); margin-bottom: 6px; }
    .sig-label { font-size: 11px; font-weight: 700; color: var(--color9); }
</style>
</head>
<body>
<div class="pad">
    <header class="letterhead">
        <div>
            <div class="clinic-name">{{clinic.name}}</div>
            <div class="clinic-meta">{{clinic.address}}</div>
        </div>
    </header>
    <section class="patient-section">
        <div class="patient-card">
            <div><div class="info-label">Patient</div><div class="info-value">{{patient.name}}</div></div>
            <div><div class="info-label">Doctor</div><div class="info-value">{{doctor.name}}</div></div>
            <div><div class="info-label">Test</div><div class="info-value">{{test.name}}</div></div>
            <div><div class="info-label">Sample Type</div><div class="info-value">{{template.sampleType}}</div></div>
        </div>
    </section>
    <main class="result-section">
        <table class="result-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Result Value</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Flag</th>
                </tr>
            </thead>
            <tbody>
                {{#each values}}
                <tr>
                    <td class="param-name">{{parameterName}}</td>
                    <td><strong>{{value}}</strong></td>
                    <td>{{unit}}</td>
                    <td>{{referenceRange}}</td>
                    <td class="flag-badge" data-flag="{{flag}}">{{flag}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </main>
    {{#if labResult.remarks}}
    <section class="remarks-section">
        <div class="remarks-title">Remarks / Interpretations</div>
        <div class="remarks-text">{{labResult.remarks}}</div>
    </section>
    {{/if}}
    <footer class="footer">
        <div>
            This is a system-generated laboratory report.<br>
            Verified At: {{labResult.verifiedAt}}
        </div>
        <div>
            <div class="sig-line"></div>
            <div class="sig-label">Authorized Signatory</div>
        </div>
    </footer>
</div>
</body>
</html>
`;

const labReportTemplate4 = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report</title>
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
        font-family: '{{templateConfig.fontFamily}}', Arial, sans-serif;
        margin: 0; padding: 0;
        color: var(--color3);
        line-height: 1.45;
        background-color: #e2e8f0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .pad { width: 210mm; min-height: 297mm; margin: 16px auto; background: var(--color8); display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
    .banner { background: var(--color1); color: var(--color8); padding: 22px 36px; display: flex; justify-content: space-between; align-items: center; }
    .clinic-name { font-size: 22px; font-weight: 700; }
    .clinic-meta { font-size: 10px; opacity: 0.85; margin-top: 4px; }
    .report-title { font-size: 18px; font-weight: 700; }
    .body { flex: 1; padding: 22px 36px; display: flex; flex-direction: column; }
    .patient-card { background: var(--color7); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 12px; }
    .pf-label { font-size: 9px; font-weight: 600; color: var(--color4); text-transform: uppercase; }
    .pf-value { font-size: 13px; font-weight: 600; color: var(--color9); margin-top: 3px; }
    .result-table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
    .result-table thead { background: var(--color1); color: var(--color8); }
    .result-table th { text-align: left; font-size: 11px; font-weight: 600; padding: 10px; }
    .result-table td { padding: 11px 10px; border-bottom: 1px solid var(--color5); font-size: 13px; }
    .param-name { font-weight: 700; color: var(--color9); }
    .flag-badge { font-weight: 700; }
    .flag-badge[data-flag="High"] { color: var(--color6); }
    .flag-badge[data-flag="Low"] { color: #D97706; }
    .flag-badge[data-flag="Normal"] { color: #16A34A; }
    .remarks-section { margin-top: 20px; padding: 16px; background-color: var(--color7); border-radius: 8px; border: 1px solid var(--color5); }
    .remarks-title { font-size: 13px; font-weight: 700; color: var(--color1); }
    .remarks-text { font-size: 12px; color: var(--color3); }
    .footer { margin-top: auto; padding: 20px 0 0; display: flex; justify-content: space-between; align-items: flex-end; }
    .sig-line { width: 160px; border-bottom: 1px solid var(--color1); margin-bottom: 6px; }
</style>
</head>
<body>
<div class="pad">
    <header class="banner">
        <div class="clinic-block">
            <div class="clinic-name">{{clinic.name}}</div>
            <div class="clinic-meta">{{clinic.address}}</div>
        </div>

    </header>
    <div class="body">
        <div class="patient-card">
            <div><div class="pf-label">Patient Name</div><div class="pf-value">{{patient.name}}</div></div>
            <div><div class="pf-label">Referral Doctor</div><div class="pf-value">{{doctor.name}}</div></div>
            <div><div class="pf-label">Test Name</div><div class="pf-value">{{test.name}}</div></div>
            <div><div class="pf-label">Sample Type</div><div class="pf-value">{{template.sampleType}}</div></div>
        </div>
        <table class="result-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Flag</th>
                </tr>
            </thead>
            <tbody>
                {{#each values}}
                <tr>
                    <td class="param-name">{{parameterName}}</td>
                    <td><strong>{{value}}</strong></td>
                    <td>{{unit}}</td>
                    <td>{{referenceRange}}</td>
                    <td class="flag-badge" data-flag="{{flag}}">{{flag}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        {{#if labResult.remarks}}
        <div class="remarks-section">
            <div class="remarks-title">Remarks / Interpretations</div>
            <div class="remarks-text">{{labResult.remarks}}</div>
        </div>
        {{/if}}
        <footer class="footer">
            <div>
                This is a system-generated laboratory report.<br>
                Verified At: {{labResult.verifiedAt}}
            </div>
            <div>
                <div class="sig-line"></div>
                <div>Authorized Signatory</div>
            </div>
        </footer>
    </div>
</div>
</body>
</html>
`;

const templatesByKey: Record<string, string> = {
  template1: labReportTemplate1,
  template2: labReportTemplate2,
  template3: labReportTemplate3,
  template4: labReportTemplate4,
};

export const getLabReportTemplateHtml = (templateKey: string): string =>
  templatesByKey[templateKey] || labReportTemplate1;

type CompileData = {
  templateConfig: { fontFamily: string; colors: TemplateColors };
  clinic?: { name?: string; address?: string };
  patient?: { name?: string };
  doctor?: { name?: string };
  test?: { name?: string; category?: string };
  template?: { sampleType?: string };
  labResult?: {
    id?: string;
    status?: string;
    remarks?: string;
    verifiedAt?: string;
  };
  generatedAt?: string;
  values?: {
    parameterName?: string;
    value?: string;
    unit?: string;
    referenceRange?: string;
    flag?: string;
  }[];
};

export function compileLabReportTemplate(html: string, data: CompileData) {
  let res = html;

  res = res.replace(
    /\{\{templateConfig\.fontFamily\}\}/g,
    data.templateConfig.fontFamily.split(",")[0].trim(),
  );

  (Object.keys(data.templateConfig.colors) as (keyof TemplateColors)[]).forEach(
    (key) => {
      const regex = new RegExp(`\\{\\{templateConfig\\.colors\\.${key}\\}\\}`, "g");
      res = res.replace(regex, data.templateConfig.colors[key] || "#000000");
    },
  );

  res = res.replace(/\{\{clinic\.name\}\}/g, data.clinic?.name || "Apex Pathology Lab");
  res = res.replace(/\{\{clinic\.address\}\}/g, data.clinic?.address || "102 Health Center, Sector 5, New Delhi");
  res = res.replace(/\{\{patient\.name\}\}/g, data.patient?.name || "John Doe");
  res = res.replace(/\{\{doctor\.name\}\}/g, data.doctor?.name || "Dr. Sarah Jenkins");
  res = res.replace(/\{\{test\.name\}\}/g, data.test?.name || "Complete Blood Count (CBC)");
  res = res.replace(/\{\{test\.category\}\}/g, data.test?.category || "Haematology");
  res = res.replace(/\{\{template\.sampleType\}\}/g, data.template?.sampleType || "Blood (EDTA)");
  res = res.replace(/\{\{labResult\.id\}\}/g, data.labResult?.id || "LR-98725");
  res = res.replace(/\{\{labResult\.status\}\}/g, data.labResult?.status || "Verified");
  res = res.replace(/\{\{labResult\.remarks\}\}/g, data.labResult?.remarks || "All parameters fall within standard limits.");
  res = res.replace(/\{\{labResult\.verifiedAt\}\}/g, data.labResult?.verifiedAt || "03-Aug-2026 12:00 PM");
  res = res.replace(/\{\{generatedAt\}\}/g, data.generatedAt || "03-Aug-2026 12:00 PM");

  const eachRegex = /\{\{#each values\}\}([\s\S]*?)\{\{\/each\}\}/g;
  res = res.replace(eachRegex, (_, innerHtml) =>
    (data.values || [])
      .map((val) => {
        let row = innerHtml;
        row = row.replace(/\{\{parameterName\}\}/g, val.parameterName || "");
        row = row.replace(/\{\{value\}\}/g, val.value || "");
        row = row.replace(/\{\{unit\}\}/g, val.unit || "");
        row = row.replace(/\{\{referenceRange\}\}/g, val.referenceRange || "");
        row = row.replace(/\{\{flag\}\}/g, val.flag || "");
        return row;
      })
      .join(""),
  );

  res = res.replace(
    /\{\{#if labResult\.remarks\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, innerHtml) => (data.labResult?.remarks ? innerHtml : ""),
  );

  return res;
}

export const mockLabReportData: CompileData = {
  templateConfig: { fontFamily: "Inter, sans-serif", colors: {} as TemplateColors },
  clinic: { name: "Apex Pathology Lab", address: "102 Health Center, Sector 5, New Delhi" },
  patient: { name: "John Doe" },
  doctor: { name: "Dr. Sarah Jenkins" },
  test: { name: "Complete Blood Count (CBC)", category: "Haematology" },
  template: { sampleType: "Blood (EDTA)" },
  labResult: { id: "LR-98725", status: "Verified", remarks: "All parameters fall within standard limits.", verifiedAt: "03-Aug-2026 12:00 PM" },
  generatedAt: "03-Aug-2026 12:00 PM",
  values: [
    { parameterName: "Hemoglobin", value: "14.5", unit: "g/dL", referenceRange: "13.0 - 17.0", flag: "Normal" },
    { parameterName: "White Blood Cells (WBC)", value: "11.2", unit: "10^3/µL", referenceRange: "4.0 - 11.0", flag: "High" },
    { parameterName: "Red Blood Cells (RBC)", value: "4.2", unit: "10^6/µL", referenceRange: "4.5 - 5.9", flag: "Low" },
    { parameterName: "Platelets", value: "250", unit: "10^3/µL", referenceRange: "150 - 450", flag: "Normal" },
  ],
};
