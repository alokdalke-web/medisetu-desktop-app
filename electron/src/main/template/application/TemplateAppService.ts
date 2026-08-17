import { SqliteTemplateRepository } from '../repositories/SqliteTemplateRepository';

export class TemplateAppService {
  private templateRepo: SqliteTemplateRepository;

  constructor() {
    this.templateRepo = new SqliteTemplateRepository();
  }

  public async getDoctorTemplate(doctorId: string) {
    if (!doctorId) {
      throw new Error('Doctor ID is required to fetch template');
    }
    const template = await this.templateRepo.getDoctorTemplate(doctorId);
    if (!template) {
      return {
        success: true,
        data: {}
      };
    }
    return {
      success: true,
      data: {
        defaultColors: template
      }
    };
  }
}
