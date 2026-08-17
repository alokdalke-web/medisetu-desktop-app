import sqlite3
import os
import json

db_path = r'C:\Users\alokd\AppData\Roaming\medi-setu\database\medisetu.sqlite'

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print('--- Patients named Mohit ---')
    cursor.execute("SELECT id, name, cloud_id, sync_status FROM patients WHERE name LIKE '%Mohit%'")
    patients = [dict(row) for row in cursor.fetchall()]
    print(json.dumps(patients, indent=2))

    patient_ids = [p['id'] for p in patients]
    if patient_ids:
        print('\n--- Appointments for Mohit ---')
        placeholders = ','.join(['?'] * len(patient_ids))
        cursor.execute(f"SELECT id, patient_id, date, time_slot, status, payment_status, cloud_id FROM appointments WHERE patient_id IN ({placeholders})", patient_ids)
        appts = [dict(row) for row in cursor.fetchall()]
        print(json.dumps(appts, indent=2))

        appt_ids = [a['id'] for a in appts]
        if appt_ids:
            print('\n--- Report Cards for these appointments ---')
            appt_placeholders = ','.join(['?'] * len(appt_ids))
            cursor.execute(f"SELECT id, appointment_id FROM report_cards WHERE appointment_id IN ({appt_placeholders})", appt_ids)
            report_cards = [dict(row) for row in cursor.fetchall()]
            print(json.dumps(report_cards, indent=2))

            rc_ids = [rc['id'] for rc in report_cards]
            if rc_ids:
                print('\n--- Prescriptions for these report cards ---')
                rc_placeholders = ','.join(['?'] * len(rc_ids))
                cursor.execute(f"SELECT id, report_card_id, medicine_name FROM report_prescriptions WHERE report_card_id IN ({rc_placeholders})", rc_ids)
                rx = [dict(row) for row in cursor.fetchall()]
                print(json.dumps(rx, indent=2))
            else:
                print('No prescriptions found.')
        else:
            print('No report cards found.')
            
except Exception as e:
    print("Error:", str(e))
