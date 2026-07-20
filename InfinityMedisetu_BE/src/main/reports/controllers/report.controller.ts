import { Request, Response } from 'express';
import handlebars from 'handlebars';
import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { ReportService } from '../services/report.service';
import { prescriptionTemplateSchema } from '../schemas/report.schemas';
import { reportCardTemplate1 } from '../../../htmltamplates/report_card1';
import { reportCardTemplate4 } from '../../../htmltamplates/report_card4';
import { reportCardTemplate3 } from '../../../htmltamplates/report_card3';
import { reportCardTemplate2 } from '../../../htmltamplates/report_card2';

export const createReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;

    const result = await ReportService.craeteReport(payload);
    res.status(201).json({ success: true, result });
  }
);

export const updateReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      params: { reportId: rawReportId },
      user: { id: userId },
      validatedBody: payload,
    } = req;
    const reportId = rawReportId as string;
    const result = await ReportService.updateRport(userId, reportId, payload);
    res.status(201).json({ success: true, result });
  }
);

export const getAllClinicReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.validatedParams.petientId;
    const clinicId = req.clinicId;
    const result = await ReportService.getALlReport(userId, clinicId);
    res.status(201).json({ success: true, result });
  }
);
export const getReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const reportId = req.validatedParams.reportId;
    const clinicId = req.clinicId;
    const result = await ReportService.getReport(reportId, clinicId);
    res.status(201).json({ success: true, result });
  }
);
export const createPatientReportCardController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedBody } = req;
    const adminId = req.user?.id;
    const result = await ReportService.createPatientReportCard(
      validatedBody,
      adminId
    );
    if (!result) {
      return res
        .status(400)
        .json({ success: false, message: 'Failed to create report card' });
    }
    res
      .status(201)
      .json({ success: true, message: 'Report card created', result });
  }
);

export const getCurrentTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    const templateInfo = await ReportService.getCurrentTemplateInfo(doctorId);

    res.status(200).json({
      success: true,
      data: templateInfo,
    });
  }
);

export const getFavouritePrescriptionController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.params.doctorId as string;
    const clinicId = req.clinicId;
    const result = await ReportService.getFavouritePrescription(
      doctorId,
      clinicId
    );

    res.status(200).json({
      success: true,
      message: 'Favourite prescriptions retrieved successfully',
      data: result,
    });
  }
);

export const deleteFavouritePrescriptionController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const doctorId = req.user?.id;

    if (!doctorId) {
      throw new HttpError(401, 'Unauthorized - Doctor ID not found');
    }

    const result = await ReportService.deleteFavouritePrescription(
      id,
      doctorId
    );

    res.status(200).json({
      success: true,
      message: 'Favourite prescription deleted successfully',
      data: result,
    });
  }
);

export const updatePatientReportCardController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedBody, validatedQuery } = req;
    const result = await ReportService.updatePatientReportCard(
      validatedQuery,
      validatedBody
    );
    if (!result) {
      return res
        .status(400)
        .json({ success: false, message: 'Failed to update report card' });
    }
    res
      .status(201)
      .json({ success: true, message: 'Report card updated', result });
  }
);

export const upsertPrescriptionTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user?.id;
    const validatedBody = prescriptionTemplateSchema.parse(req.body);

    const result = await ReportService.upsertTemplate(doctorId!, validatedBody);

    res.status(200).json({
      success: true,
      message: 'Prescription template saved successfully',
      data: result,
    });
  }
);

export const getPrescriptionTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user?.id;

    const template = await ReportService.getTemplate(doctorId!);

    res.status(200).json({
      success: true,
      data: template || {
        message: 'No custom template found, using default template1',
        defaultTemplate: 'template1',
        defaultColors: {
          color1: '#0A6C74',
          color2: '#EBFCF4',
          color3: '#333333',
          color4: '#666666',
          color5: '#e0e0e0',
          color6: '#b22222',
          color7: '#f9f9f9',
          color8: '#ffffff',
          color9: '#000000',
          color10: '#856404',
        },
        defaultFontFamily: 'Inter, sans-serif',
      },
    });
  }
);

export const getPreviewPrescriptionTemplateController = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      templateName,
      colors,
      fontFamily,
      appointmentId,
      prescriptions: userPrescriptions,
      patient: userPatient,
      diagnosis: userDiagnosis,
      advice: userAdvice,
      followUpDate: userFollowUp,
      vitals: userVitals,
    } = req.body;

    // Resolve the template against the appointment's own doctor when available,
    // so the preview matches the final PDF even for admin-managed appointments.
    // Falls back to the logged-in user otherwise.
    const appointmentDoctorId = appointmentId
      ? await ReportService.getAppointmentDoctorId(String(appointmentId))
      : null;
    const doctorId = appointmentDoctorId || req.user?.id;

    // Live clinic + doctor data for the resolved doctor (patient/records stay dummy)
    const previewContext = doctorId
      ? await ReportService.getDoctorPreviewContext(doctorId)
      : null;

    let templateHtml = '';
    // templateConfig used by named/prescription templates
    let resolvedTemplateConfig: {
      fontFamily: string;
      primaryFont: string;
      colors: any;
    } = {
      fontFamily: fontFamily || 'Inter, sans-serif',
      primaryFont: (fontFamily || 'Inter, sans-serif').split(',')[0].trim(),
      colors,
    };
    let isQuickPrint = false;
    let elementConfig: any = null;

    if (templateName) {
      // Settings page: preview a SPECIFIC template being designed.
      switch (templateName) {
        case 'template1':
          templateHtml = reportCardTemplate1;
          break;
        case 'template2':
          templateHtml = reportCardTemplate2;
          break;
        case 'template3':
          templateHtml = reportCardTemplate3;
          break;
        case 'template4':
          templateHtml = reportCardTemplate4;
          break;
        default:
          templateHtml = reportCardTemplate1;
      }
    } else if (doctorId) {
      // Live workspace preview: use the doctor's ACTUAL selected template
      // (prescription / quick-print / html) — same logic as final PDF.
      const resolved =
        await ReportService.getResolvedTemplateForPreview(doctorId);
      templateHtml = resolved.templateHtml;
      resolvedTemplateConfig = resolved.templateConfig;
      isQuickPrint = resolved.isQuickPrint;
      elementConfig = resolved.elementConfig;
    } else {
      templateHtml = reportCardTemplate1;
    }

    // Sample data for preview
    const sampleData = {
      clinic: {
        name: 'My Clinic',
        address: '12-B, Medical Street, Vijay Nagar',
        city: 'Indore',
        state: 'Madhya Pradesh',
        zipcode: '452010',
        phone: '9876543210',
        logo: 'https://res.cloudinary.com/ddzkedas8/image/upload/v1773045466/image_rx09np.png',
        tagline: 'Your Health, Our Priority',
      },
      doctor: {
        name: 'Udit Chouhan',
        email: 'udit.chouhan@ims.com',
        qualification: 'MBBS, MD',
        speciality: 'General Physician',
        registrationNumber: 'DVGCS456123612',
        availability: [
          {
            day: 'Mon',
            isAvailable: true,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
          },
          {
            day: 'Tue',
            isAvailable: true,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
          },
          {
            day: 'Wed',
            isAvailable: true,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
          },
          {
            day: 'Thu',
            isAvailable: true,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
          },
          {
            day: 'Fri',
            isAvailable: true,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
          },
          { day: 'Sat', isAvailable: false, startTime: '', endTime: '' },
          { day: 'Sun', isAvailable: false, startTime: '', endTime: '' },
        ],
        groupedAvailability: [
          {
            days: 'Mon - Fri',
            isAvailable: true,
            display: '09:00 AM - 05:00 PM',
          },
          { days: 'Sat - Sun', isAvailable: false, display: 'Off' },
        ],
      },
      patient: {
        name: 'Amrendra Kumar',
        age: '35',
        gender: 'Male',
        address: '789 Health City, Palasia, Indore',
      },
      appointmentDate: '15-Mar-2024',
      appointmentTime: '10:30 AM',
      token: '20',
      symptoms: [{ name: 'Headache' }, { name: 'Fever' }, { name: 'Cough' }],
      hasTests: 2,
      testNames: 'CBC, Vitamin B12',
      diagnosis: 'Viral Fever, Respiratory Tract Infection',
      habits: ['Smoking', 'Tobacco'],
      allergies: ['Dust', 'Syrup'],
      visitingDays: ['10-Mar-2026', '16-Mar-2026'],
      visitingNotes: 'To checkup of health condition',
      surgerySuggested: ['Mole Removal', 'Suturing Wounds'],
      vitalsMoreThanOne: true,
      vitals: {
        bpSys: 120,
        bpDia: 80,
        pulse: 72,
        spo2: 98,
        temperatureC: 98.6,
        weightKg: 70,
        heightCm: 170,
        bmi: 24.2,
      },
      prescriptions: [
        {
          medicineName: 'Paracip 500',
          strength: '500 mg',
          dosage: '2 tablet',
          frequency: '1-0-1',
          duration: '5 days',
          notes: 'After Food',
        },
        {
          medicineName: 'Asthakind',
          strength: 'Syrup',
          dosage: '1 spoon',
          frequency: '1-0-1',
          duration: '3 days',
          notes: 'Shake well before use',
        },
      ],
      advice:
        'Take adequate rest. Drink plenty of warm water. Avoid cold food items. Follow up in 3 days if symptoms persist.',
      dietarySuggestion: 'Please drink orange juice twice a day.',
      followUpDate: '18-Mar-2024',
    };

    // Replace dummy clinic/doctor with the doctor's real, current data when found.
    // Patient data and prescription records intentionally remain dummy.
    if (previewContext?.clinic) {
      sampleData.clinic = {
        ...sampleData.clinic,
        ...previewContext.clinic,
        // keep a placeholder logo if the clinic has none, so preview isn't blank
        logo: previewContext.clinic.logo || sampleData.clinic.logo,
      };
    }
    if (previewContext?.doctor) {
      sampleData.doctor = {
        ...sampleData.doctor,
        ...previewContext.doctor,
        availability: previewContext.doctor.availability?.length
          ? previewContext.doctor.availability
          : sampleData.doctor.availability,
        groupedAvailability: previewContext.doctor.groupedAvailability?.length
          ? previewContext.doctor.groupedAvailability
          : sampleData.doctor.groupedAvailability,
      };
    }

    // Render with Handlebars (identical to real PDF generation) so the
    // preview matches the generated prescription exactly. Handlebars handles
    // all #if / #each / #unless blocks, so no manual tag stripping is needed.

    // LIVE MODE: a real prescription is being written (appointment context or
    // live data passed). Prescriptions are sensitive — NEVER show dummy patient,
    // diagnosis, medicines, vitals, advice, symptoms, etc. Only show what the
    // doctor has actually entered; everything else stays blank.
    const isLivePreview = !templateName;

    if (isLivePreview) {
      const todayStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const cleanVitals =
        userVitals && typeof userVitals === 'object' ? userVitals : {};
      const cleanVitalsCount = [
        (cleanVitals as any).bpSys && (cleanVitals as any).bpDia,
        (cleanVitals as any).pulse,
        (cleanVitals as any).spo2,
        (cleanVitals as any).temperatureC,
        (cleanVitals as any).heightCm,
        (cleanVitals as any).weightKg,
        (cleanVitals as any).bmi,
      ].filter(Boolean).length;

      sampleData.patient = {
        name: userPatient?.name || '',
        age: userPatient?.age || '',
        gender: userPatient?.gender || '',
        address: userPatient?.address || '',
        ...(userPatient?.mobile ? { mobile: userPatient.mobile } : {}),
      } as any;

      (sampleData as any).prescriptions =
        Array.isArray(userPrescriptions) && userPrescriptions.length > 0
          ? userPrescriptions
          : [];
      (sampleData as any).diagnosis = userDiagnosis || '';
      (sampleData as any).provisionalDiagnosis = userDiagnosis || '';
      (sampleData as any).advice = userAdvice || '';
      (sampleData as any).dietarySuggestion = '';
      (sampleData as any).followUpDate = userFollowUp || '';
      (sampleData as any).vitals = cleanVitals;
      (sampleData as any).vitalsMoreThanOne = cleanVitalsCount > 0;
      (sampleData as any).symptoms = [];
      (sampleData as any).habits = [];
      (sampleData as any).allergies = [];
      (sampleData as any).surgerySuggested = [];
      (sampleData as any).visitingDays = [];
      (sampleData as any).visitingNotes = '';
      (sampleData as any).hasTests = false;
      (sampleData as any).testNames = '';
      (sampleData as any).appointmentDate = todayStr;
      (sampleData as any).appointmentTime = '';
      (sampleData as any).token = '';
    }

    // Build quick-print element visibility config (for {{config.elements.showXxx}})
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
    if (isQuickPrint && elementConfig) {
      if (Array.isArray(elementConfig.blockLayout)) {
        const blockMap: Record<string, boolean> = {};
        for (const block of elementConfig.blockLayout) {
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
      } else if (elementConfig.showPatientName !== undefined) {
        elements = { ...defaultElements, ...elementConfig };
      }
    }

    const previewData = {
      templateConfig: resolvedTemplateConfig,
      config: {
        fontFamily: resolvedTemplateConfig.fontFamily,
        primaryFont: resolvedTemplateConfig.primaryFont,
        accentColor: '#333333',
        elements,
      },
      watermarkLogo: sampleData.clinic.logo,
      ...sampleData,
      // Aliases / extra fields quick-print templates rely on
      visitDate: (sampleData as any).appointmentDate,
      patient: isLivePreview
        ? {
            // Live prescription: only real, entered patient data — no dummies
            ...sampleData.patient,
            uhid: (sampleData as any).patient?.uhid || '',
            mobile: (sampleData as any).patient?.mobile || '',
          }
        : {
            // Design/settings preview: dummy sample is fine
            ...sampleData.patient,
            uhid: (sampleData as any).patient?.uhid || 'A7060',
            mobile: (sampleData as any).patient?.mobile || '9876543210',
          },
    };

    const finalHtml = handlebars.compile(templateHtml)(previewData);

    res.json({ success: true, html: finalHtml });
  }
);

export const getAppoinmentsPrescriptionsReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedParams, validatedQuery, clinicId } = req;
    const result = await ReportService.getAppoinmentsPrescriptionsReport(
      validatedParams,
      validatedQuery,
      clinicId
    );
    if (!result) {
      return res
        .status(400)
        .json({ success: false, message: 'Failed to get report card' });
    }
    res
      .status(201)
      .json({ success: true, message: 'Report card retrieved', result });
  }
);
export const getReportCardController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, clinicId } = req;
    const result = await ReportService.getReportCard(validatedQuery, clinicId);
    // if (!result) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: 'Failed to get report card' });
    // }
    res
      .status(201)
      .json({ success: true, message: 'Report card retrieved', result });
  }
);
