import { pgTable, uuid, timestamp, json } from 'drizzle-orm/pg-core';
import { UserModel } from '../../users/models/user.model';

export const DoctorPreferenceModel = pgTable('doctor_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id')
    .references(() => UserModel.id)
    .notNull()
    .unique(),
  headerOrder: json('header_order')
    .$type<string[]>()
    .default([
      'Pathology Test Name',
      'Advice',
      'Dietary Suggestions',
      'Habits',
      'Vitals',
      'Allergy',
      'Diagnosis',
      'Surgery Suggested',
      'Visiting Days',
      'Follow-Up (days)',
    ]),
  habitList: json('habit_list')
    .$type<string[]>()
    .default(['Alcohol', 'Smoking', 'Tobacco']),
  allergyList: json('allergy_list')
    .$type<string[]>()
    .default([
      'Codeine',
      'Contrast dye',
      'Dust',
      'Eggs',
      'Latex',
      'NKDA',
      'NSAIDs',
      'Peanuts/Nuts',
      'Penicillin',
      'Pollen',
      'Shellfish',
      'Sulfa drugs',
    ]),
  diagnosisList: json('diagnosis_list')
    .$type<string[]>()
    .default([
      'Acidity',
      'Allergy',
      'Body pain',
      'Cold/Cough',
      'Dengue',
      'Diarrhea',
      'Fever',
      'Flu',
      'Headache',
      'High BP',
      'Low BP',
      'Infection',
      'Malaria',
      'Migraine',
      'Stomach pain',
      'Diabetes',
      'Typhoid',
      'UTI',
      'Viral fever',
    ]),
  surgerySuggestedList: json('surgery_suggested_list')
    .$type<string[]>()
    .default([
      'Appendectomy',
      'Hernia repair',
      'Cataract surgery',
      'Tonsillectomy',
      'Cholecystectomy',
      'Knee arthroscopy',
    ]),
  dietarySuggestionsList: json('dietary_suggestions_list')
    .$type<string[]>()
    .default([
      'Drink boiled water.',
      'Eat small, frequent meals.',
      'Avoid spicy and oily foods.',
      'Include fruits and vegetables.',
      'Stay hydrated throughout the day.',
      'Limit caffeine and alcohol.',
      'Reduce salt and sugar intake.',
      'Include protein-rich foods.',
      'Avoid processed and junk foods.',
      'Maintain a balanced diet.',
    ]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
