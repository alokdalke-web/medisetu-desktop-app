import { eq } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import { QuickPrintTemplateModel } from '../models/quickPrintTemplate.model';
import type { SaveQuickPrintTemplateDto } from '../schemas/quickPrintTemplate.schemas';
import handlebars from 'handlebars';
import { quickPrintTemplate1 } from '../templates/compact-medicine-slip';
import { quickPrintTemplate2 } from '../templates/standard-medicine-sheet';
import { quickPrintTemplate3 } from '../templates/minimal-prescription';
import { quickPrintTemplate4 } from '../templates/pharmacy-copy';
import { quickPrintTemplate5 } from '../templates/detailed-prescription';
import { quickPrintTemplate6 } from '../templates/clinic-branded';

// Register custom Handlebars helpers
handlebars.registerHelper('firstLetter', (str: string) => {
  return str ? str.charAt(0).toUpperCase() : 'M';
});

export class QuickPrintTemplateService {
  /**
   * Get the doctor's quick print template configuration.
   */
  static async getSelectedTemplate(doctorId: string) {
    const [result] = await database
      .select()
      .from(QuickPrintTemplateModel)
      .where(eq(QuickPrintTemplateModel.doctorId, doctorId))
      .limit(1);

    return result ?? null;
  }

  /**
   * Save (upsert) the doctor's quick print template configuration.
   */
  static async saveSelectedTemplate(
    doctorId: string,
    data: SaveQuickPrintTemplateDto
  ) {
    const existing = await this.getSelectedTemplate(doctorId);

    const payload: any = {
      selectedTemplate: data.selectedTemplate,
      updatedAt: new Date(),
    };
    if (data.fontFamily) payload.fontFamily = data.fontFamily;
    if (data.accentColor) payload.accentColor = data.accentColor;
    if (data.elementConfig) payload.elementConfig = data.elementConfig;

    if (existing) {
      const [updated] = await database
        .update(QuickPrintTemplateModel)
        .set(payload)
        .where(eq(QuickPrintTemplateModel.doctorId, doctorId))
        .returning();

      return { action: 'updated' as const, template: updated };
    }

    const [inserted] = await database
      .insert(QuickPrintTemplateModel)
      .values({ doctorId, ...payload })
      .returning();

    return { action: 'created' as const, template: inserted };
  }

  /**
   * Get the raw Handlebars HTML for a given template ID.
   */
  static getTemplateHtml(templateId: string): string {
    switch (templateId) {
      case 'compact-medicine-slip':
        return quickPrintTemplate1;
      case 'standard-medicine-sheet':
        return quickPrintTemplate2;
      case 'minimal-prescription':
        return quickPrintTemplate3;
      case 'pharmacy-copy':
        return quickPrintTemplate4;
      case 'detailed-prescription':
        return quickPrintTemplate5;
      case 'clinic-branded':
        return quickPrintTemplate6;
      default:
        return quickPrintTemplate1;
    }
  }

  /**
   * Render a quick print template preview with sample data + doctor's real
   * clinic/doctor info. Uses the same Handlebars approach as the main
   * prescription templates.
   */
  static renderPreview(
    templateId: string,
    config: {
      fontFamily?: string;
      accentColor?: string;
      elementConfig?: any;
    },
    context?: { clinic?: any; doctor?: any }
  ): string {
    const templateHtml = this.getTemplateHtml(templateId);

    // Derive element visibility from config
    const defaultElements = {
      showClinicHeader: true,
      showClinicLogo: true,
      showPatientName: true,
      showPatientUhid: true,
      showPatientAge: true,
      showPatientGender: true,
      showPatientMobile: true,
      showPatientAddress: false,
      showVisitDate: true,
      showDiagnosis: true,
      showMedicineTable: true,
      showMedicineComposition: true,
      showMedicineQuantity: false,
      showMedicineInstructions: true,
      showAdvice: true,
      showFollowUp: true,
      showDoctorName: true,
      showDoctorQualification: true,
      showDoctorRegistration: false,
      showDoctorSignature: true,
      showQrCode: false,
      showFooter: true,
    };

    let elements = defaultElements;
    const rawConfig = config.elementConfig || {};

    if (rawConfig.blockLayout && Array.isArray(rawConfig.blockLayout)) {
      const blockMap: Record<string, boolean> = {};
      for (const block of rawConfig.blockLayout) {
        if (block.id && typeof block.visible === 'boolean') {
          blockMap[block.id] = block.visible;
        }
      }
      elements = {
        showClinicHeader: blockMap['clinicHeader'] ?? true,
        showClinicLogo: blockMap['clinicHeader'] ?? true,
        showPatientName: blockMap['patientInfo'] ?? true,
        showPatientUhid: blockMap['patientInfo'] ?? true,
        showPatientAge: blockMap['patientInfo'] ?? true,
        showPatientGender: blockMap['patientInfo'] ?? true,
        showPatientMobile: blockMap['patientInfo'] ?? true,
        showPatientAddress: false,
        showVisitDate: blockMap['visitDate'] ?? true,
        showDiagnosis: blockMap['diagnosis'] ?? true,
        showMedicineTable: blockMap['medicineTable'] ?? true,
        showMedicineComposition: true,
        showMedicineQuantity: false,
        showMedicineInstructions: true,
        showAdvice: blockMap['advice'] ?? false,
        showFollowUp: blockMap['followUp'] ?? true,
        showDoctorName: blockMap['doctorSignature'] ?? true,
        showDoctorQualification: blockMap['doctorSignature'] ?? true,
        showDoctorRegistration: false,
        showDoctorSignature: blockMap['doctorSignature'] ?? true,
        showQrCode: false,
        showFooter: blockMap['clinicHeader'] ?? true,
      };
    } else if (rawConfig.showPatientName !== undefined) {
      elements = { ...defaultElements, ...rawConfig };
    }

    const sampleData = {
      config: {
        fontFamily: config.fontFamily || 'Inter, sans-serif',
        primaryFont: (config.fontFamily || 'Inter').split(',')[0].trim(),
        accentColor: config.accentColor || '#333333',
        elements,
      },
      clinic: context?.clinic || {
        name: 'MediSetu Clinic',
        address: '123 Health Street, Medical Complex',
        phone: '+91 98765 43210',
        logo: '',
      },
      doctor: context?.doctor || {
        name: 'Dr. Meetesh Agrawal',
        qualification: 'MD (SKIN & VD)',
        registrationNumber: 'MP-12345',
        speciality: 'Dermatology',
      },
      patient: {
        name: 'Mrs. Triveni Panda',
        uhid: 'A7060',
        age: '75',
        gender: 'Female',
        mobile: '9691958656',
        address: '456 Patient Road, City',
      },
      visitDate: '04-Jul-2026',
      diagnosis: '?PSORIASIS, ?ECZEMA',
      prescriptions: [
        {
          medicineName: 'TAB. DEFCORT 12MG',
          composition: 'DEFLAZACORT 12 MG',
          dosage: '1 — 0 — 0',
          frequency: 'After Breakfast',
          duration: '10 Days',
          quantity: '10',
          notes: 'Take after meals',
        },
        {
          medicineName: 'CRM. MAXFEEL CREAM 200 GMS',
          composition: '',
          dosage: 'Apply locally',
          frequency: '3-4 Times/Day',
          duration: '15 Days',
          quantity: '1',
          notes: 'Apply on affected area',
        },
      ],
      advice: 'Avoid direct sunlight. Keep skin moisturized.',
      followUpDate: '19-Jul-2026',
    };

    const compiled = handlebars.compile(templateHtml);
    return compiled(sampleData);
  }
}
