import crypto from 'crypto';
import { TransactionManager } from '../../configurations/TransactionManager';
import { EventLogRepository } from '../../infrastructure/repositories/EventLogRepository';
import { SqliteMedicineRepository } from '../repositories/SqliteMedicineRepository';

export class MedicineAppService {
  private repository: SqliteMedicineRepository;
  private eventLogRepository: EventLogRepository;

  constructor() {
    this.repository = new SqliteMedicineRepository();
    this.eventLogRepository = new EventLogRepository();
  }

  public async getAllMedicines(): Promise<any> {
    const medicines = this.repository.getAll();
    return { success: true, result: { medicines } };
  }

  public async searchMedicines(query: string): Promise<any> {
    const medicines = this.repository.search(query);
    // Mimic the cloud search/all API response
    return { success: true, result: medicines };
  }

  public async createMedicine(data: any): Promise<any> {
    const id = crypto.randomUUID();
    const eventId = crypto.randomUUID();

    await TransactionManager.run((tx) => {
      // 1. Create Medicine Locally
      const med = {
        id,
        name: data.name,
        form: data.form,
        composition: data.composition,
        manufacturer: data.manufacturer,
        strength: data.strength,
        requires_prescription: data.requiresPrescription,
        is_favorite: data.isFavorite,
        sync_status: 'pending'
      };
      
      this.repository.create(tx, med);

      // 2. Log Event for SyncEngine
      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'MEDICINE_CREATED',
        entity_type: 'medicines',
        entity_id: id,
        payload: JSON.stringify({
          eventId,
          entityType: 'medicines',
          operation: 'CREATE',
          httpMethod: 'POST',
          endpoint: '/medicine/medicines',
          payload: {
            name: med.name,
            form: med.form,
            composition: med.composition,
            manufacturer: med.manufacturer,
            strength: med.strength,
            requiresPrescription: med.requires_prescription,
            isFavorite: med.is_favorite
          },
          headers: {}
        })
      });
    });

    return {
      success: true,
      message: "Medicine created successfully",
      result: { id, name: data.name }
    };
  }
}
