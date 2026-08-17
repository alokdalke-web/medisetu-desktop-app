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

  public async getAllMedicines(args?: any): Promise<any> {
    const medicines = this.repository.getAll(args);
    return { success: true, result: { medicines }, medicines };
  }

  public async searchMedicines(query: string, args?: any): Promise<any> {
    const medicines = this.repository.search(query, args);
    // Mimic the cloud search/all API response
    return { success: true, result: medicines };
  }

  public async toggleFavoriteMedicine(medicineId: string): Promise<any> {
    const eventId = crypto.randomUUID();
    let updatedMed: any;

    await TransactionManager.run((tx) => {
      updatedMed = this.repository.toggleFavorite(tx, medicineId);

      this.eventLogRepository.insert(tx, {
        id: eventId,
        action_type: 'MEDICINE_FAVORITE_TOGGLED',
        entity_type: 'medicines',
        entity_id: medicineId,
        payload: JSON.stringify({
          eventId,
          entityType: 'medicines',
          operation: 'UPDATE',
          httpMethod: 'PATCH',
          endpoint: `/doctor/favorite-medicine/${medicineId}`,
          payload: {} // PATCH is enough to trigger toggle on BE
        }),
        status: 'PENDING',
      });
    });

    return { 
      success: true, 
      result: {
        id: updatedMed.id,
        medicineName: updatedMed.name,
        isFavorite: updatedMed.is_favorite
      } 
    };
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
