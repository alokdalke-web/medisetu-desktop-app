import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { ClinicService } from '../services/clinic.service';
import { Request, Response } from 'express';
import { sendOk } from '../../../utils/response.utils';
import redisClient from '../../../configurations/redisConfig';

export const createCliniController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const userId = req.user.id;

    const result = await ClinicService.createClinic(userId, payload);
    res.json({ success: true, ...result });
  }
);

export const updateCliniController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.validatedBody;
    const userId = req.user.id;

    const result = await ClinicService.updateClinic(userId, payload);
    res.json({ success: true, ...result });
  }
);

export const updateClinicByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.params.clinicId as string;
    const payload = req.validatedBody;
    const profileImage = req.file ? (req.file as any).location : undefined;

    const result = await ClinicService.updateClinicById(
      clinicId,
      payload,
      profileImage
    );
    res.json({ success: true, ...result });
  }
);

//! TODO: Hot fix need to reiew and fix.
export const getClinicCliniController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result =
      req.user.userType === 'SuperAdmin'
        ? await ClinicService.getClinicDetailsByUserId(userId, req.clinicId)
        : await ClinicService.getClinicByUserId(userId, req.clinicId);
    res.json({
      success: true,
      message: 'Clinic retrieved successfully',
      ...result,
    });
  }
);

export const getCliniController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.validatedParams.clinicId;
    const result = await ClinicService.getClinicById(clinicId);
    res.json({ success: true, ...result });
  }
);

export const assignClincToUserCrontroller = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.validatedParams.clinicId;
    const userId = req.user.id;
    const result = await ClinicService.assignClinicToUser(clinicId, userId);
    res.json({ success: true, ...result });
  }
);

export const getAvailableClinicsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, search, status } = req.validatedQuery;
    const result = await ClinicService.getAvailableClinics({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
    });
    return sendOk(res, 'Available clinics retrieved successfully', result);
  }
);

export const getClinicDetailController = asyncHandler(
  async (req: Request, res: Response) => {
    const { clinicId } = req.validatedParams;
    const result = await ClinicService.getClinicDetailById(clinicId);
    return sendOk(res, 'Clinic details retrieved successfully', result);
  }
);

export const upsertClinicSettingsController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const payload = req.validatedBody;

    const result = await ClinicService.clinicSettingUpsert(clinicId, payload);

    // Invalidate cached threshold so the engine picks up the new value immediately
    await redisClient
      .del(`appointment_engine:threshold:${clinicId}`)
      .catch(() => {});

    res.json({
      success: true,
      result,
    });
  }
);

export const getClinicSettingsController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
      return res
        .status(400)
        .json({ success: false, message: 'Clinic ID not found' });
    }
    const result = await ClinicService.getSetting(clinicId);
    res.json({
      success: true,
      result,
    });
  }
);

export const deleteClinicReminderController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const reminderId = req.params.reminderId as string;

    if (!clinicId) throw new Error('Clinic ID not found');
    if (!reminderId) throw new Error('Reminder ID not provided');

    const result = await ClinicService.deleteReminder(clinicId, reminderId);

    res.json({
      success: true,
      result,
    });
  }
);

export const getClinicsWithDoctorsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.validatedQuery;

    const result = await ClinicService.getClinicsWithDoctors({
      startDate,
      endDate,
    });

    // Compute request status statistics
    const totalRequests = result.length;
    const pending = result.filter(
      (item) => item.userStatus === 'Pending'
    ).length;
    const approved = result.filter(
      (item) => item.userStatus === 'Active'
    ).length;
    const rejected = result.filter(
      (item) => item.userStatus === 'Rejected'
    ).length;
    const stats = {
      totalRequests,
      pending,
      approved,
      rejected,
    };

    res.json({
      success: true,
      data: result,
      stats,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      total: result.length,
    });
  }
);

export const onboardClinicRouteController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }
    const result = await ClinicService.onboardRouteAccount(clinicId);
    return sendOk(res, 'Clinic Razorpay Route onboarding initiated', result);
  }
);
