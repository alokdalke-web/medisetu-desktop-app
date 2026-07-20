import { SqliteDashboardRepository } from '../repositories/SqliteDashboardRepository';

export class DashboardAppService {
  private repository: SqliteDashboardRepository;

  constructor() {
    this.repository = new SqliteDashboardRepository();
  }

  public getDoctorDashboard(args: any) {
    const result = this.repository.getDoctorDashboard(args);
    return {
      success: true,
      result
    };
  }

  public getRevenueOverview(args: any) {
    return this.repository.getRevenueOverview(args);
  }

  public getTodayOverview(args: any) {
    return this.repository.getTodayOverview(args);
  }
}
