import { BaseRepository } from './BaseRepository.js';

export class PatientRepository extends BaseRepository {
  getAll() {
    return this.db.prepare('SELECT * FROM patients').all();
  }

  getById(id: string) {
    return this.db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
  }

  create(patient: any) {
    const stmt = this.db.prepare(`
      INSERT INTO patients (id, name, phone)
      VALUES (@id, @name, @phone)
    `);
    return stmt.run(patient);
  }
}
