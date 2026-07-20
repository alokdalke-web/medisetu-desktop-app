import { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentActivityHistoryService } from '../services/appointment-activity-history.service';
import { NoShowService } from '../services/noShow.service';
import { AppointmentMultipleServiceService } from '../services/appointment-multiple-service.service';
import { sendOk } from '../../../utils/response.utils';
import { CreatePatientGalleryDto } from '../schemas/appointment.schemas';

export const createAppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const userId = req.user.id;
    const clinicId = req.clinicId;
    const result = await AppointmentService.createAppointment(
      userId,
      clinicId,
      payload,
      userId // Pass performer user ID
    );
    res.status(201).json({ success: true, result });
  }
);

/**
 * @desc Mark an appointment as No Show
 */
export const markAsNoShowController = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      params: { appointmentId: rawAppointmentId },
      validatedBody: payload,
    } = req;
    const appointmentId = rawAppointmentId as string;

    const performerId = req.user.id;
    const performerRole = req.user.userType.toLowerCase() as
      'doctor' | 'receptionist' | 'system' | 'admin';

    const result = await NoShowService.markAsNoShow(
      appointmentId,
      performerId,
      performerRole,
      payload
    );

    return sendOk(res, 'Appointment marked as No Show successfully', result);
  }
);

/**
 * @desc Set No Show Policy for a clinic
 */
export const setNoShowPolicyController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const payload = req.validatedBody;

    const result = await NoShowService.setPolicy(clinicId, payload);
    return sendOk(res, 'No Show policy updated successfully', result);
  }
);

/**
 * @desc Get No Show Policy for a clinic
 */
export const getNoShowPolicyController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const result = await NoShowService.getPolicyView(clinicId);
    return sendOk(res, 'No Show policy retrieved successfully', result);
  }
);

/**
 * @desc Get Patient No Show History
 */
export const getPatientNoShowHistoryController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const patientId = req.validatedParams.patientId;

    const result = await NoShowService.getPatientNoShowHistory(
      patientId,
      clinicId
    );
    return sendOk(
      res,
      'Patient No Show history retrieved successfully',
      result
    );
  }
);

/**
 * @desc Get Clinic No Show Analytics
 */
export const getClinicNoShowAnalyticsController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { startDate, endDate, search } = req.query as {
      startDate?: string;
      endDate?: string;
      search?: string;
    };

    const result = await NoShowService.getClinicNoShowList(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      search?.trim() || undefined
    );
    return sendOk(
      res,
      'Clinic No Show analytics retrieved successfully',
      result
    );
  }
);

export const getAppointmentPaymentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { validatedQuery, clinicId } = req;
    const user = req.user; // Attached by requireAuth middleware
    const result = await AppointmentService.getAppointmentPaymentTransactions(
      validatedQuery,
      user,
      clinicId
    );
    return res.status(200).json({
      success: true,
      data: result.data,
      summary: result.summary,
      metadata: result.metadata,
    });
  }
);

export const getAppointmentHistoryController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.validatedParams.appointmentId;
    const result =
      await AppointmentActivityHistoryService.getHistoryByAppointmentId(
        appointmentId
      );
    return sendOk(res, 'Appointment history retrieved successfully', result);
  }
);

export const updateAppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      params: { appointmentId: rawAppointmentId },
      validatedBody: payload,
    } = req;
    const appointmentId = rawAppointmentId as string;

    const result = await AppointmentService.updateAppointment(
      appointmentId,
      payload,
      req.user.id,
      req.user.userType
    );
    res.status(201).json({ success: true, result });
  }
);

export const upsertDoctorManualPrescriptionController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    const appointmentId = req.params.appointmentId as string;
    const doctorManualPrescription = (req.file as any)?.location || null;

    const template = await AppointmentService.upsertDoctorManualPrescription(
      doctorId,
      appointmentId,
      doctorManualPrescription
    );

    return res.status(200).json({
      success: true,
      message: 'Prescription saved successfully',
      data: template,
    });
  }
);

export const sendManualPrescriptionLinkController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    const appointmentId = req.params.appointmentId as string;
    const otp = req.validatedBody.otp as string;

    await AppointmentService.sendManualPrescriptionNotification(
      doctorId,
      appointmentId,
      otp
    );

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully to your mobile device',
    });
  }
);

export const updateConsentFileController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.appointmentId as string;
    const consentFile = (req.file as any)?.location;

    if (!consentFile) {
      throw new HttpError(400, 'Consent file is required');
    }

    const result = await AppointmentService.updateConsentFile(
      appointmentId,
      consentFile
    );

    return res.status(200).json({
      success: true,
      result,
    });
  }
);

export const getAllClinicAppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const user = req.user;
    const query = req.validatedQuery;
    const result = await AppointmentService.getAllClinicAppointments(
      clinicId,
      query,
      user
    );
    res.status(201).json({ success: true, result });
  }
);

export const getClinicAppointmentDetailsController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const user = req.user;
    const query = req.validatedQuery;
    const result = await AppointmentService.getClinicAppointmentDetails(
      clinicId,
      query,
      user
    );
    res.status(200).json({ success: true, result });
  }
);

export const getAllUserAppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const query = req.validatedQuery;
    const result = await AppointmentService.getALlUserAppountment(
      userId,
      query
    );
    res.status(201).json({ success: true, result });
  }
);
export const getAppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.validatedParams.appointmentId;
    const requestingUser = {
      id: req.user.id,
      userType: req.user.userType,
      clinicId: req.clinicId,
    };
    const result = await AppointmentService.getAppointment(
      appointmentId,
      requestingUser
    );
    res.status(200).json({ success: true, result });
  }
);

export const getPatientApppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const patientId = req.validatedParams.patientId;
    const result = await AppointmentService.getAppointmentByPatient(patientId);
    res.status(201).json({ success: true, result });
  }
);

export const getLastPatientReportCardController = asyncHandler(
  async (req: Request, res: Response) => {
    const patientId = req.validatedParams.patientId;
    const clinicId = req.clinicId;
    const result = await AppointmentService.getLastPatientReportCard(
      patientId,
      clinicId
    );
    res.status(200).json({ success: true, result });
  }
);

export const getDcotorApppointmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.validatedParams.doctorId;
    const result = await AppointmentService.getAppointmentByDoctor(doctorId);
    res.status(201).json({ success: true, result });
  }
);

export const getAvailableSlotsForDateController = asyncHandler(
  async (req: Request, res: Response) => {
    const { clinicId, validatedQuery, validatedParams } = req;
    const result = await AppointmentService.getAvailableSlotsForDate(
      clinicId,
      validatedQuery,
      validatedParams
    );

    // Check if result has the structure with slots and shifts
    if (result && typeof result === 'object' && 'slots' in result) {
      const { slots, shifts } = result;

      // Add shifts array to every slot in the array
      const modifiedSlots = slots.map((slot) => ({
        ...slot,
        ...(shifts && shifts.length > 0 && { shifts }),
      }));

      // Return the modified slots array as result
      res.status(200).json({
        // Changed from 201 to 200 as this is a GET request
        success: true,
        result: modifiedSlots,
      });
    } else {
      // If result is already an array or something else, return as is
      res.status(200).json({ success: true, result }); // Changed from 201 to 200
    }
  }
);

export const createPatientGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = req.validatedBody as CreatePatientGalleryDto;
    const doctorId = req.user.id;

    if (!req.file) {
      throw new HttpError(400, 'Image file is required');
    }

    // (req.file as any).location contains the S3 URL
    const imageUrl = (req.file as any).location;

    const result = await AppointmentService.createGalleryImage(
      doctorId,
      imageUrl,
      validatedData
    );

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: result,
    });
  }
);

export const getPatientGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const { patientId, appointmentId, page, limit } = req.query;

    // Use validated data or parse with defaults
    const validatedData = {
      patientId: patientId as string,
      appointmentId: appointmentId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 30,
    };

    if (!validatedData.patientId && !validatedData.appointmentId) {
      throw new HttpError(400, 'Either patientId or appointmentId is required');
    }

    const result = await AppointmentService.getPatientGallery(
      validatedData.patientId,
      validatedData.appointmentId,
      validatedData.page,
      validatedData.limit
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
);

export const deletePatientGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const doctorId = req.user.id;

    const deleted = await AppointmentService.deleteGalleryImage(id, doctorId);

    if (!deleted) {
      throw new HttpError(404, 'Image not found');
    }

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: deleted,
    });
  }
);

export const deleteAppointmentGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.appointmentId as string;
    const doctorId = req.user.id;

    const deleted = await AppointmentService.deleteGalleryImagesByAppointment(
      appointmentId,
      doctorId
    );

    res.json({
      success: true,
      message: `${deleted.length} image(s) deleted successfully`,
      count: deleted.length,
      data: deleted,
    });
  }
);

export const createDoctorGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;

    if (!req.file) {
      throw new HttpError(400, 'Image file is required');
    }

    const imageUrl = (req.file as any).location;

    const result = await AppointmentService.createDoctorGalleryImage(
      doctorId,
      imageUrl
    );

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: result,
    });
  }
);

export const getDoctorGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    const { page, limit } = req.query;

    const validatedData = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 30,
    };

    const result = await AppointmentService.getDoctorGallery(
      doctorId,
      validatedData.page,
      validatedData.limit
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
);

export const getDoctorGalleryBySpecialtyController = asyncHandler(
  async (req: Request, res: Response) => {
    const doctorId = req.user.id;
    const { page, limit } = req.query;

    const validatedData = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 30,
    };

    const result = await AppointmentService.getDoctorGalleryFromLocal(
      doctorId,
      validatedData.page,
      validatedData.limit
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
);

export const deleteDoctorGalleryController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const doctorId = req.user.id;

    const deleted = await AppointmentService.deleteDoctorGalleryImage(
      id,
      doctorId
    );

    if (!deleted) {
      throw new HttpError(404, 'Image not found');
    }

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: deleted,
    });
  }
);

export const getMedicalCertificateController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.appointmentId as string;

    const result =
      await AppointmentService.getMedicalCertificate(appointmentId);

    res.json({
      success: true,
      message: 'Medical certificate fetched successfully',
      data: result,
    });
  }
);

export const upsertMedicalCertificateController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.appointmentId as string;
    const { medicalCondition, restDays, notes } = req.body;

    const result = await AppointmentService.upsertMedicalCertificate(
      appointmentId,
      medicalCondition,
      restDays,
      notes
    );

    return res.status(200).json({
      success: true,
      message: 'Medical certificate saved successfully',
      data: result,
    });
  }
);

export const addMultipleServicesController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.appointmentId as string;
    const payload = req.validatedBody;

    const result = await AppointmentMultipleServiceService.addMultipleServices(
      appointmentId,
      payload
    );

    res.status(201).json({
      success: true,
      message: 'Services added successfully',
      data: result,
    });
  }
);

export const getMultipleServicesController = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.appointmentId as string;

    const result =
      await AppointmentMultipleServiceService.getMultipleServicesByAppointmentId(
        appointmentId
      );

    res.json({
      success: true,
      message: 'Services fetched successfully',
      data: result,
    });
  }
);

export const getRemainingServicesController = asyncHandler(
  async (req: Request, res: Response) => {
    const { appointmentId } = req.params;
    if (!appointmentId || Array.isArray(appointmentId)) {
      throw new HttpError(400, 'Invalid appointmentId');
    }

    if (!appointmentId || Array.isArray(appointmentId)) {
      throw new HttpError(400, 'Invalid appointmentId');
    }

    const result =
      await AppointmentMultipleServiceService.getRemainingServices(
        appointmentId
      );

    res.json({
      success: true,
      message: 'Services fetched successfully',
      data: result,
    });
  }
);
