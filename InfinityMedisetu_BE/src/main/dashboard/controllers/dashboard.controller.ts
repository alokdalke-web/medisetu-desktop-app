import { asyncHandler } from '../../../middlewear/errorHandler';
import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendOk } from '../../../utils/response.utils';

export const getDashboardController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    // const opts = req.validatedQuery; // previous way
    // Casting query as we updated the flow or schemas might need adjustment.
    // The user kept dashboardQuerySchema but we want to be sure.
    const opts = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const result = await DashboardService.getClinicDashboardData(
      clinicId,
      opts
    );
    res.json({ success: true, result });
  }
);

export const getDoctorDashboardController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const user = req.user;

    // Casting query to expected shape as validated by schema/middleware
    const opts = req.query as {
      startDate?: string;
      endDate?: string;
      doctorId?: string;
    };

    // Determine which doctor's data to fetch
    let targetDoctorId = user.id;

    if (opts.doctorId) {
      // Only Admin (or Super_Admin) can query another doctor's data
      const isAdmin =
        user.userType === 'Admin' || user.userType === 'Super_Admin';
      if (!isAdmin && opts.doctorId !== user.id) {
        res.status(403).json({
          success: false,
          message: "You are not authorized to view another doctor's dashboard",
        });
        return;
      }
      targetDoctorId = opts.doctorId;
    }

    const result = await DashboardService.getDoctorDashboardData(
      clinicId,
      targetDoctorId,
      { startDate: opts.startDate, endDate: opts.endDate }
    );
    res.json({ success: true, result });
  }
);

export const getSuperAdminDashboardController = asyncHandler(
  async (req: Request, res: Response) => {
    const opts = req.validatedQuery as {
      startDate: string;
      endDate: string;
    };

    const result = await DashboardService.getSuperAdminDashboardData(opts);
    res.json({ success: true, result });
  }
);

export const getRevenueOverviewController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const user = req.user;

    const opts = req.validatedQuery as
      | {
          doctorId?: string;
          period?: 'week' | 'month';
        }
      | undefined;

    // Doctors can only see their own revenue
    if (
      user.userType === 'Doctor' &&
      opts?.doctorId &&
      opts.doctorId !== user.id
    ) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to view another doctor's revenue",
      });
      return;
    }

    const result = await DashboardService.getRevenueOverview(
      clinicId,
      user,
      opts
    );
    return sendOk(res, 'Revenue overview fetched successfully', result);
  }
);

export const getTodayOverviewController = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const user = req.user;

    const opts = req.validatedQuery as { doctorId?: string } | undefined;

    // Doctors can only see their own data
    if (
      user.userType === 'Doctor' &&
      opts?.doctorId &&
      opts.doctorId !== user.id
    ) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to view another doctor's overview",
      });
      return;
    }

    const result = await DashboardService.getTodayOverview(
      clinicId,
      user,
      opts
    );
    return sendOk(res, 'Today overview fetched successfully', result);
  }
);
