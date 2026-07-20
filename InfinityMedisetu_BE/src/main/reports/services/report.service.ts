/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq, inArray, or, sql, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { database } from '../../../configurations/dbConnection';
import { reportCardTemplate1 } from '../../../htmltamplates/report_card1';
import { reportCardTemplate2 } from '../../../htmltamplates/report_card2';
import { reportCardTemplate3 } from '../../../htmltamplates/report_card3';
import { reportCardTemplate4 } from '../../../htmltamplates/report_card4';
import { HttpError } from '../../../middlewear/errorHandler';
import logger from '../../../utils/logger';
import { broadcastPrescriptionPdfReadyToAppointmentRoom } from '../../../utils/notification.utils';
import {
  notifyPrescriptionPdfGenerationStarted,
  notifyPrescriptionPdfReady,
} from '../../../utils/notificationHelpers';
import { generateAndUploadPdf } from '../../../utils/pdf.utils';
import { pagination } from '../../../utils/utils';
import { AppointmentClinicalModel } from '../../appointments/models/appointment-clinical.model';
import { AppointmentModel } from '../../appointments/models/appointment.model';
import { AppointmentActivityHistoryModel } from '../../appointments/models/appointmentActivityHistory.model';
import { doctorManualPrescriptionModel } from '../../appointments/models/doctorManualPrescription.model';
import { AppointmentActivityHistoryService } from '../../appointments/services/appointment-activity-history.service';
import { ClinicSymptomModel } from '../../clinic/models/clinic-symptom.model';
import {
  ClinicAssignModel,
  ClinicAvailability,
  ClinicAvailabilityBreak,
  ClinicModel,
} from '../../clinic/models/clinic.model';
import { DoctorQualificationModel } from '../../doctor/models/doctor.model';
import { doctorManualTemplateModel } from '../../doctor/models/doctorManualTemplate.model';
import { doctorTemplateModel } from '../../doctor/models/doctorTemplate.model';
import { MedicineModel } from '../../medicine/models/medicine.model';
import { PrescriptionNotificationService } from '../../notifications/services/prescriptionNotification.service';
import { PrescriptionQueueModel } from '../../pharmacy/models/prescriptionQueue.model';
import { LabOrderModel } from '../../test/models/labOrder.model';
import { TestCatalogModel } from '../../test/models/testCatalog.model';
import { UserModel } from '../../users/models/user.model';
import { UserProfessionalModel } from '../../users/models/userProfessional.model';
import { UserProfileModel } from '../../users/models/userProfile.model';
import {
  favouritePrescriptionModel,
  PrescriptionModel,
  PrescriptionTemplateModel,
  ReportCardModel,
  ReportsModel,
} from '../models/reports.model';
import { QuickPrintTemplateModel } from '../../quick-print-templates/models/quickPrintTemplate.model';
import { QuickPrintTemplateService } from '../../quick-print-templates/services/quickPrintTemplate.service';
import {
  CreateReportAndPrescriptionsDto,
  createReportDto,
  GetPatientIdParamsDto,
  GetPatientIdQueryDto,
  GetReportCardIdQueryDto,
  GetReportIdsQueryDto,
  PrescriptionTemplateDto,
  ReportCardPostInput,
  UpdateReportAndPrescriptionsDto,
  updateReportDto,
} from '../schemas/report.schemas';
import { PharmacyAssignModel } from '../../pharmacy/models/pharmacy.model';
import { prescriptionMedicineQueue } from '../../pharmacies/services/prescriptionMedicineQueue.service';

export class ReportService {
  static async craeteReport(payload: createReportDto) {
    return await database
      .insert(ReportsModel)
      .values({ ...payload })
      .onConflictDoUpdate({
        target: [ReportsModel.reportType, ReportsModel.petientId],
        set: { ...payload, updatedAt: new Date() },
      })
      .returning();
  }
  static async updateRport(
    userId: string,
    reportId: string,
    payload: updateReportDto
  ) {
    return await database
      .update(ReportsModel)
      .set({ ...payload, updatedAt: new Date() })
      .where(
        and(eq(ReportsModel.petientId, userId), eq(ReportsModel.id, reportId))
      )
      .returning();
  }
  static async getALlReport(userId: string, clinicId: string) {
    return await database
      .select({
        id: ReportsModel.id,
        reportType: ReportsModel.reportType,
        description: ReportsModel.description,
        petientId: ReportsModel.petientId,
        reportDocs: ReportsModel.reportDocs,
        reportStatus: ReportsModel.reportStatus,
        createdAt: ReportsModel.createdAt,
        updatedAt: ReportsModel.updatedAt,
      })
      .from(ReportsModel)
      .innerJoin(
        ClinicAssignModel,
        eq(ReportsModel.petientId, ClinicAssignModel.userId)
      )
      .where(
        and(
          eq(ReportsModel.petientId, userId),
          eq(ClinicAssignModel.clinicId, clinicId)
        )
      );
  }
  static async getReport(reportId: string, clinicId: string) {
    return await database
      .select({
        id: ReportsModel.id,
        reportType: ReportsModel.reportType,
        description: ReportsModel.description,
        petientId: ReportsModel.petientId,
        reportDocs: ReportsModel.reportDocs,
        reportStatus: ReportsModel.reportStatus,
        createdAt: ReportsModel.createdAt,
        updatedAt: ReportsModel.updatedAt,
      })
      .from(ReportsModel)
      .innerJoin(
        ClinicAssignModel,
        eq(ReportsModel.petientId, ClinicAssignModel.userId)
      )
      .where(
        and(
          eq(ReportsModel.id, reportId),
          eq(ClinicAssignModel.clinicId, clinicId)
        )
      )
      .limit(1);
  }

  static async createPatientReportCard(
    payload: CreateReportAndPrescriptionsDto,
    adminId?: string
  ) {
    const report = await database.transaction(async (tx) => {
      const { reportCard, prescriptions, favouritePrescriptionName } = payload;

      // OPTIMIZATION 1: Batch all initial queries in parallel
      const [existingAppointmentVitals, existingReportCard, appointment] =
        await Promise.all([
          // Check appointment if needed
          reportCard.appointmentId
            ? tx
                .select({
                  id: AppointmentModel.id,
                  doctorId: AppointmentModel.doctorId,
                  clinicId: AppointmentModel.clinicId,
                  vitals: AppointmentClinicalModel.vitals,
                })
                .from(AppointmentModel)
                .leftJoin(
                  AppointmentClinicalModel,
                  eq(
                    AppointmentModel.id,
                    AppointmentClinicalModel.appointmentId
                  )
                )
                .where(eq(AppointmentModel.id, reportCard.appointmentId))
                .limit(1)
                .then((results) => results[0] || null)
            : Promise.resolve(null),

          // Check existing report
          reportCard.appointmentId
            ? tx
                .select({
                  id: ReportCardModel.id,
                  appointmentId: ReportCardModel.appointmentId,
                })
                .from(ReportCardModel)
                .where(
                  eq(ReportCardModel.appointmentId, reportCard.appointmentId)
                )
                .limit(1)
                .then((results) => results[0] || null)
            : Promise.resolve(null),

          // Get appointment details for queue (if needed)
          reportCard.appointmentId
            ? tx
                .select({
                  doctorId: AppointmentModel.doctorId,
                  clinicId: AppointmentModel.clinicId,
                })
                .from(AppointmentModel)
                .where(eq(AppointmentModel.id, reportCard.appointmentId))
                .limit(1)
                .then((results) => results[0] || null)
            : Promise.resolve(null),
        ]);

      // Validate appointment exists
      if (reportCard.appointmentId && !existingAppointmentVitals) {
        throw new HttpError(404, 'Appointment not found');
      }

      const isUpdate = !!existingReportCard;
      const action = isUpdate ? 'PRESCRIPTION_UPDATED' : 'PRESCRIPTION_CREATED';
      const message = isUpdate
        ? 'Prescription has been updated'
        : 'Prescription has been created';

      let reportId: string;

      // OPTIMIZATION 2: Use batch operations for report card
      if (isUpdate && existingReportCard) {
        // UPDATE: Update existing report card
        const [updatedReport] = await tx
          .update(ReportCardModel)
          .set(reportCard as ReportCardPostInput)
          .where(eq(ReportCardModel.id, existingReportCard.id))
          .returning({
            id: ReportCardModel.id,
            petientId: ReportCardModel.petientId,
            appointmentId: ReportCardModel.appointmentId,
          });

        reportId = updatedReport.id;

        // DELETE existing prescriptions - can be done in parallel with other operations
        await tx
          .delete(PrescriptionModel)
          .where(eq(PrescriptionModel.reportCardId, existingReportCard.id));
      } else {
        // CREATE: Insert new report card
        const [newReport] = await tx
          .insert(ReportCardModel)
          .values(reportCard as ReportCardPostInput)
          .returning({
            id: ReportCardModel.id,
            petientId: ReportCardModel.petientId,
            appointmentId: ReportCardModel.appointmentId,
          });

        reportId = newReport.id;
      }

      // OPTIMIZATION 3: Prepare and validate prescriptions data upfront
      if (!reportCard.petientId) {
        throw new HttpError(400, 'Patient ID (petientId) is required');
      }

      // preserve only valid medicine ids (if provided), and avoid FK fail for unknown IDs
      const inputMedicineIds = [
        ...(prescriptions || [])
          .map((p) => p.medicineId)
          .filter((id): id is string => !!id),
      ];

      const validMedicineIdsSet = new Set<string>();
      if (inputMedicineIds.length > 0) {
        const queryMedicineIds = await tx
          .select({ id: MedicineModel.id })
          .from(MedicineModel)
          .where(inArray(MedicineModel.id, inputMedicineIds));

        queryMedicineIds.forEach((row: any) => {
          if (row?.id) validMedicineIdsSet.add(row.id);
        });
      }

      const createBodyPrescriptions = prescriptions?.map((prescription) => {
        const medicineId =
          prescription.medicineId &&
          validMedicineIdsSet.has(prescription.medicineId)
            ? prescription.medicineId
            : null;

        return {
          medicineId,
          prescribedBy: adminId,
          reportCardId: reportId,
          petientId: reportCard.petientId as string,
          medicineName: prescription.medicineName,
          composition: prescription.composition,
          strength: prescription.strength || null,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          manufacturer: prescription.manufacturer,
          medicineCount: prescription.medicineCount || null,
          marketer: prescription.marketer || null,
          imageUrl: prescription.imageUrl || null,
          notes: prescription.notes || null,
          uses: prescription.uses || null,
        };
      });

      // OPTIMIZATION 4: Use Promise.all for parallel operations where possible
      const operations: Promise<any>[] = [];

      // Add vitals update operation
      if (reportCard.appointmentId && (payload.reportCard as any).vitals) {
        const updatedVitals = {
          ...(existingAppointmentVitals?.vitals || {}),
          ...(payload.reportCard as any).vitals,
        };

        operations.push(
          (async () => {
            const [existingClinical] = await tx
              .select()
              .from(AppointmentClinicalModel)
              .where(
                eq(
                  AppointmentClinicalModel.appointmentId,
                  reportCard.appointmentId!
                )
              );

            if (existingClinical) {
              await tx
                .update(AppointmentClinicalModel)
                .set({ vitals: updatedVitals, updatedAt: new Date() })
                .where(
                  eq(
                    AppointmentClinicalModel.appointmentId,
                    reportCard.appointmentId!
                  )
                );
            } else {
              await tx.insert(AppointmentClinicalModel).values({
                appointmentId: reportCard.appointmentId!,
                vitals: updatedVitals,
              });
            }
          })()
        );
      }

      // Add prescriptions creation
      if (createBodyPrescriptions?.length) {
        operations.push(
          tx.insert(PrescriptionModel).values(createBodyPrescriptions)
        );
      }

      // Add queue operations
      if (
        reportCard.appointmentId &&
        appointment?.doctorId &&
        appointment?.clinicId
      ) {
        if (isUpdate && existingReportCard) {
          operations.push(
            tx
              .update(PrescriptionQueueModel)
              .set({
                reportId: reportId,
                status: 'PENDING',
                updatedAt: sql`NOW()`,
              })
              .where(eq(PrescriptionQueueModel.reportId, existingReportCard.id))
          );
        } else {
          operations.push(
            tx.insert(PrescriptionQueueModel).values({
              reportId: reportId,
              appointmentId: reportCard.appointmentId as string,
              doctorId: appointment.doctorId,
              clinicId: appointment.clinicId,
              status: 'PENDING',
            })
          );
        }
      }

      // NEW: Add favourite prescription if name is provided
      if (favouritePrescriptionName && adminId && prescriptions?.length) {
        // Transform prescriptions to the format needed for favourite prescription
        const favouriteMedicines = prescriptions.map((prescription) => ({
          medicineId: prescription.medicineId || null,
          medicineName: prescription.medicineName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          medicineCount: prescription.medicineCount?.toString() || '',
          notes: prescription.notes || '',
        }));

        operations.push(
          tx.insert(favouritePrescriptionModel).values({
            doctorId: adminId,
            favouritePrescriptionName: favouritePrescriptionName,
            medicine: favouriteMedicines,
          })
        );
      }

      // Execute all parallel operations
      await Promise.all(operations);

      // OPTIMIZATION 5: Get appointment for activity log if needed
      let appointmentForLog = null;
      if (reportCard.appointmentId && adminId) {
        const [appt] = await tx
          .select()
          .from(AppointmentModel)
          .where(eq(AppointmentModel.id, reportCard.appointmentId))
          .limit(1);
        appointmentForLog = appt;
      }

      // Log activity (can't be parallelized as it depends on previous operations)
      if (reportCard.appointmentId && adminId && appointmentForLog) {
        const [latestHistory] = await tx
          .select({
            previousState: AppointmentActivityHistoryModel.previousState,
          })
          .from(AppointmentActivityHistoryModel)
          .where(
            eq(
              AppointmentActivityHistoryModel.appointmentId,
              reportCard.appointmentId
            )
          )
          .orderBy(desc(AppointmentActivityHistoryModel.createdAt))
          .limit(1);

        const previousState = latestHistory?.previousState
          ? latestHistory.previousState
          : appointmentForLog;

        await AppointmentActivityHistoryService.logActivity({
          appointmentId: reportCard.appointmentId,
          action: action,
          performedBy: adminId,
          previousState: previousState,
          newState: appointmentForLog,
          remarks: message,
          tx: tx,
        });
      }

      return {
        id: reportId,
        appointmentId: reportCard.appointmentId,
        updatedVitals: (payload.reportCard as any).vitals
          ? {
              ...(existingAppointmentVitals?.vitals || {}),
              ...(payload.reportCard as any).vitals,
            }
          : null,
      };
    });

    // OPTIMIZATION 6: Handle PDF generation and notifications after transaction
    // Move this outside transaction to reduce transaction time
    if (report.appointmentId && payload.reportCard?.appointmentId) {
      // Fire and forget - don't await to not block response
      await this.generatePdfAndSendNotifications(report, payload).catch(
        (error) => {
          logger.error(
            'Failed to generate prescription PDF/notification:',
            error
          );
        }
      );
    }

    // Sync prescribed medicines to pharmacy asynchronously via BullMQ
    if (report.appointmentId && payload.prescriptions?.length) {
      prescriptionMedicineQueue
        .addPrescriptionMedicinesJob({
          appointmentId: report.appointmentId,
          prescriptions: payload.prescriptions.map((p) => ({
            medicineId: p.medicineId || null,
            medicineName: p.medicineName,
          })),
        })
        .catch((error) => {
          logger.error(
            'Failed to queue prescription medicines sync job:',
            error
          );
        });
    }

    return report;
  }

  static async getFavouritePrescription(doctorId: string, clinicId: string) {
    if (!doctorId) {
      throw new HttpError(400, 'Doctor ID is required');
    }

    // Verify doctor belongs to the clinic
    const isAssigned = await database
      .select({ id: ClinicAssignModel.id })
      .from(ClinicAssignModel)
      .where(
        and(
          eq(ClinicAssignModel.userId, doctorId),
          eq(ClinicAssignModel.clinicId, clinicId)
        )
      )
      .limit(1);

    if (!isAssigned.length) {
      throw new HttpError(
        403,
        'Access denied. Doctor is not assigned to this clinic.'
      );
    }

    const favourites = await database
      .select()
      .from(favouritePrescriptionModel)
      .where(eq(favouritePrescriptionModel.doctorId, doctorId))
      .orderBy(desc(favouritePrescriptionModel.createdAt));

    return {
      doctorId: doctorId,
      count: favourites.length,
      favourites: favourites,
    };
  }

  static async deleteFavouritePrescription(id: string, doctorId: string) {
    const [existingFavourite] = await database
      .select()
      .from(favouritePrescriptionModel)
      .where(
        and(
          eq(favouritePrescriptionModel.id, id),
          eq(favouritePrescriptionModel.doctorId, doctorId)
        )
      )
      .limit(1);

    if (!existingFavourite) {
      throw new HttpError(
        404,
        'Favourite prescription not found or unauthorized'
      );
    }

    const [deletedFavourite] = await database
      .delete(favouritePrescriptionModel)
      .where(
        and(
          eq(favouritePrescriptionModel.id, id),
          eq(favouritePrescriptionModel.doctorId, doctorId)
        )
      )
      .returning();

    return deletedFavourite;
  }

  private static async generatePdfAndSendNotifications(
    report: any,
    payload: CreateReportAndPrescriptionsDto
  ) {
    try {
      const [appointment] = await database
        .select({
          patientId: AppointmentModel.patientId,
          clinicId: AppointmentModel.clinicId,
          doctorId: AppointmentModel.doctorId,
          clinicSymptomIds: AppointmentClinicalModel.clinicSymptomIds,
          vitals: AppointmentClinicalModel.vitals,
          appointmentDate: AppointmentModel.appointmentDate,
          appointmentTime: AppointmentModel.appointmentTime,
          token: AppointmentModel.tokenNo,
        })
        .from(AppointmentModel)
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .where(eq(AppointmentModel.id, report.appointmentId as string))
        .limit(1);

      if (!appointment) return;

      type HtmlTemplate = {
        templateHtml: string | null;
        updatedAt: Date | null;
        source: 'manual' | 'db';
        type: 'html';
      };

      type NamedTemplate = {
        templateName: string;
        fontFamily: string | null;
        color1: string | null;
        color2: string | null;
        color3: string | null;
        color4: string | null;
        color5: string | null;
        color6: string | null;
        color7: string | null;
        color8: string | null;
        color9: string | null;
        color10: string | null;
        updatedAt: Date | null;
        source: 'named';
        type: 'named';
      };

      type QuickPrintTemplateType = {
        templateHtml: string;
        elementConfig: any;
        updatedAt: Date | null;
        source: 'quick-print';
        type: 'quick-print';
      };

      type Template = HtmlTemplate | NamedTemplate | QuickPrintTemplateType;

      // Helper function to fetch latest template
      const fetchLatestTemplate = async (
        doctorId: string
      ): Promise<Template | null> => {
        try {
          // Fetch from all four tables in parallel
          const [manualTemplates, dbTemplates, namedTemplates] =
            await Promise.all([
              // Manual upload templates
              database
                .select({
                  templateHtml: doctorManualTemplateModel.templateHtml,
                  updatedAt: doctorManualTemplateModel.updatedAt,
                })
                .from(doctorManualTemplateModel)
                .where(eq(doctorManualTemplateModel.doctorId, doctorId))
                .orderBy(desc(doctorManualTemplateModel.updatedAt))
                .limit(1)
                .then((results) =>
                  results.map((r): HtmlTemplate => ({
                    ...r,
                    source: 'manual',
                    type: 'html',
                  }))
                ),

              // Custom HTML templates from DB
              database
                .select({
                  templateHtml: doctorTemplateModel.templateHtml,
                  updatedAt: doctorTemplateModel.updatedAt,
                })
                .from(doctorTemplateModel)
                .where(eq(doctorTemplateModel.doctorId, doctorId))
                .orderBy(desc(doctorTemplateModel.updatedAt))
                .limit(1)
                .then((results) =>
                  results.map((r): HtmlTemplate => ({
                    ...r,
                    source: 'db',
                    type: 'html',
                  }))
                ),

              // Named templates
              database
                .select({
                  templateName: PrescriptionTemplateModel.templateName,
                  fontFamily: PrescriptionTemplateModel.fontFamily,
                  color1: PrescriptionTemplateModel.color1,
                  color2: PrescriptionTemplateModel.color2,
                  color3: PrescriptionTemplateModel.color3,
                  color4: PrescriptionTemplateModel.color4,
                  color5: PrescriptionTemplateModel.color5,
                  color6: PrescriptionTemplateModel.color6,
                  color7: PrescriptionTemplateModel.color7,
                  color8: PrescriptionTemplateModel.color8,
                  color9: PrescriptionTemplateModel.color9,
                  color10: PrescriptionTemplateModel.color10,
                  updatedAt: PrescriptionTemplateModel.updatedAt,
                })
                .from(PrescriptionTemplateModel)
                .where(eq(PrescriptionTemplateModel.doctorId, doctorId))
                .orderBy(desc(PrescriptionTemplateModel.updatedAt))
                .limit(1)
                .then((results) =>
                  results.map((r): NamedTemplate => ({
                    ...r,
                    source: 'named',
                    type: 'named',
                  }))
                ),
            ]);

          // Also fetch quick-print template
          const quickPrintResult = await database
            .select({
              selectedTemplate: QuickPrintTemplateModel.selectedTemplate,
              elementConfig: QuickPrintTemplateModel.elementConfig,
              updatedAt: QuickPrintTemplateModel.updatedAt,
            })
            .from(QuickPrintTemplateModel)
            .where(eq(QuickPrintTemplateModel.doctorId, doctorId))
            .limit(1);

          const quickPrintTemplates: QuickPrintTemplateType[] = quickPrintResult
            .filter((r) => r.selectedTemplate)
            .map((r) => ({
              templateHtml: QuickPrintTemplateService.getTemplateHtml(
                r.selectedTemplate
              ),
              elementConfig: r.elementConfig,
              updatedAt: r.updatedAt,
              source: 'quick-print' as const,
              type: 'quick-print' as const,
            }));

          // Combine and filter out empty results
          const allTemplates = [
            ...manualTemplates,
            ...dbTemplates,
            ...namedTemplates,
            ...quickPrintTemplates,
          ].filter((template) => {
            if (template.type === 'html') {
              return template.templateHtml;
            } else if (template.type === 'quick-print') {
              return template.templateHtml;
            } else {
              return template.templateName;
            }
          });

          if (allTemplates.length === 0) return null;

          // Sort by updatedAt and return the latest
          return allTemplates.sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
          })[0];
        } catch (error) {
          logger.error('Error fetching templates:', error);
          return null;
        }
      };

      // OPTIMIZATION 8: Batch all data fetching in parallel
      const [
        clinic,
        patient,
        symptoms,
        doctor,
        qualifications,
        prescriptions,
        latestTemplate,
        appointmentTests,
      ] = await Promise.all([
        database
          .select()
          .from(ClinicModel)
          .where(eq(ClinicModel.id, appointment.clinicId))
          .limit(1)
          .then((results) => results[0]),

        database
          .select({
            id: UserModel.id,
            name: UserModel.name,
            email: UserModel.email,
            mobile: UserModel.mobile,
            age: UserProfileModel.age,
            gender: UserProfileModel.gender,
            address: UserProfileModel.address,
          })
          .from(UserModel)
          .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
          .where(eq(UserModel.id, appointment.patientId))
          .limit(1)
          .then((results) => results[0]),

        appointment.clinicSymptomIds?.length
          ? database
              .select({
                id: ClinicSymptomModel.id,
                name: ClinicSymptomModel.name,
                description: ClinicSymptomModel.description,
              })
              .from(ClinicSymptomModel)
              .where(
                inArray(ClinicSymptomModel.id, appointment.clinicSymptomIds)
              )
          : Promise.resolve([]),

        appointment.doctorId
          ? database
              .select({
                id: UserModel.id,
                name: UserModel.name,
                email: UserModel.email,
                mobile: UserModel.mobile,
                qualification: UserProfessionalModel.qualification,
                speciality: UserProfessionalModel.speciality,
                registrationNumber: UserProfessionalModel.registrationNumber,
              })
              .from(UserModel)
              .leftJoin(
                UserProfessionalModel,
                eq(UserProfessionalModel.userId, UserModel.id)
              )
              .where(eq(UserModel.id, appointment.doctorId))
              .limit(1)
              .then((results) => results[0])
          : Promise.resolve(null),

        appointment.doctorId
          ? database
              .select()
              .from(DoctorQualificationModel)
              .where(eq(DoctorQualificationModel.userId, appointment.doctorId))
          : Promise.resolve([]),

        database
          .select()
          .from(PrescriptionModel)
          .where(eq(PrescriptionModel.reportCardId, report.id)),

        appointment.doctorId
          ? fetchLatestTemplate(appointment.doctorId)
          : Promise.resolve(null),

        database
          .select({
            testName: TestCatalogModel.name,
          })
          .from(LabOrderModel)
          .leftJoin(
            TestCatalogModel,
            eq(LabOrderModel.testId, TestCatalogModel.id)
          )
          .where(eq(LabOrderModel.appointmentId, report.appointmentId))
          .then((results) => results.map((r) => r.testName).filter(Boolean)),
      ]);

      // Send SMS notification (don't await)
      if (patient?.mobile && clinic?.clinicName) {
        PrescriptionNotificationService.sendPrescriptionNotification(
          report.appointmentId,
          appointment.clinicId,
          patient.mobile,
          clinic.clinicName,
          (payload.reportCard as any)?.followUpInDays
        ).catch((error) => {
          logger.error('Failed to send SMS notification:', error);
        });
      }

      // notify patient that generation is about to start
      if (patient?.id) {
        notifyPrescriptionPdfGenerationStarted(
          patient.id,
          report.id,
          report.appointmentId
        ).catch((err) => {
          logger.warn('Notify start pdf generation failed', err);
        });
      }

      // Generate PDF
      if (doctor) {
        const qualificationText = qualifications
          .map((q: any) => q.qualificationTitle)
          .join(', ');

        const vitals = (payload.reportCard.vitals ||
          appointment.vitals ||
          {}) as {
          bpSys?: number;
          bpDia?: number;
          pulse?: number;
          spo2?: number;
          temperatureC?: number;
          heightCm?: number;
          weightKg?: number;
          bmi?: number;
          [key: string]: any;
        };

        const vitalsCount = [
          vitals.bpSys && vitals.bpDia,
          vitals.pulse,
          vitals.spo2,
          vitals.temperatureC,
          vitals.heightCm,
          vitals.weightKg,
          vitals.bmi,
        ].filter(Boolean).length;

        // Format date function
        const formatDate = (date: string | Date) => {
          if (!date) return '';
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';

          const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          const day = d.getDate();
          const month = months[d.getMonth()];
          const year = d.getFullYear();

          return `${day}-${month}-${year}`;
        };

        // Format time function
        const formatTime = (time: string) => {
          if (!time) return '';

          const timeParts = time.split(':');
          if (timeParts.length >= 2) {
            let hours = parseInt(timeParts[0]);
            const minutes = timeParts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${hours}:${minutes} ${ampm}`;
          }

          return time;
        };

        const availability = appointment.doctorId
          ? await ReportService.getFormattedClinicAvailability(
              appointment.doctorId,
              appointment.clinicId
            )
          : [];

        // TEMPLATE SELECTION LOGIC based on latest template
        let templateToUse;
        let templateConfig = {
          fontFamily: 'Inter, sans-serif',
          primaryFont: 'Inter',
          colors: {
            color1: '#0A6C74',
            color2: '#EBFCF4',
            color3: '#333333',
            color4: '#666666',
            color5: '#e0e0e0',
            color6: '#b22222',
            color7: '#f9f9f9',
            color8: '#ffffff',
            color9: '#000000',
            color10: '#856404',
          },
        };

        // Process the latest template if found
        if (latestTemplate) {
          logger.info(
            `Using template from source '${latestTemplate.source}' for doctor ${appointment.doctorId}, updated at ${latestTemplate.updatedAt}`
          );

          // Handle HTML template (manual or db)
          if (latestTemplate.type === 'html') {
            if (latestTemplate.templateHtml) {
              templateToUse = latestTemplate.templateHtml;
              logger.info(
                `Using HTML template from source '${latestTemplate.source}'`
              );
            }
          }
          // Handle named template
          else if (latestTemplate.type === 'named') {
            if (latestTemplate.templateName) {
              logger.info(
                `Using named template '${latestTemplate.templateName}' from source '${latestTemplate.source}'`
              );

              const fontFamily =
                latestTemplate.fontFamily || 'Inter, sans-serif';
              const primaryFont = fontFamily.split(',')[0].trim();
              const colors = {
                color1: latestTemplate.color1 || '#0A6C74',
                color2: latestTemplate.color2 || '#EBFCF4',
                color3: latestTemplate.color3 || '#333333',
                color4: latestTemplate.color4 || '#666666',
                color5: latestTemplate.color5 || '#e0e0e0',
                color6: latestTemplate.color6 || '#b22222',
                color7: latestTemplate.color7 || '#f9f9f9',
                color8: latestTemplate.color8 || '#ffffff',
                color9: latestTemplate.color9 || '#000000',
                color10: latestTemplate.color10 || '#856404',
              };

              switch (latestTemplate.templateName) {
                case 'template2':
                  templateToUse = reportCardTemplate2;
                  templateConfig = {
                    fontFamily: fontFamily,
                    primaryFont: primaryFont,
                    colors: colors,
                  };
                  break;
                case 'template3':
                  templateToUse = reportCardTemplate3;
                  templateConfig = {
                    fontFamily: fontFamily,
                    primaryFont: primaryFont,
                    colors: colors,
                  };
                  break;
                case 'template1':
                  templateToUse = reportCardTemplate1;
                  templateConfig = {
                    fontFamily: fontFamily,
                    primaryFont: primaryFont,
                    colors: colors,
                  };
                  break;
                default:
                  templateToUse = reportCardTemplate4;
                  templateConfig = {
                    fontFamily: fontFamily,
                    primaryFont: primaryFont,
                    colors: colors,
                  };
                  break;
              }
            }
          }
          // Handle quick-print template
          else if (latestTemplate.type === 'quick-print') {
            if (latestTemplate.templateHtml) {
              templateToUse = latestTemplate.templateHtml;
              logger.info(
                `Using quick-print template from source '${latestTemplate.source}'`
              );
            }
          }
        }

        // If no template found from any source, use default
        if (!templateToUse) {
          logger.info(
            `No template found from any source for doctor ${appointment.doctorId}, using default template`
          );
          templateToUse = reportCardTemplate4;
        }

        const testNamesString =
          appointmentTests.length > 0 ? appointmentTests.join(', ') : '';

        const pdfData = {
          templateConfig,
          // Quick-print template config (for {{config.elements.showXxx}} in templates)
          config: (() => {
            // Default elements - all visible
            const defaultElements = {
              showClinicHeader: true,
              showClinicLogo: true,
              showPatientName: true,
              showPatientUhid: true,
              showPatientAge: true,
              showPatientGender: true,
              showPatientMobile: true,
              showPatientAddress: false,
              showVisitDate: true,
              showDiagnosis: true,
              showMedicineTable: true,
              showMedicineComposition: true,
              showMedicineQuantity: false,
              showMedicineInstructions: true,
              showAdvice: true,
              showFollowUp: true,
              showDoctorName: true,
              showDoctorQualification: true,
              showDoctorRegistration: false,
              showDoctorSignature: true,
              showQrCode: false,
              showFooter: true,
            };

            if (latestTemplate?.type !== 'quick-print') {
              return {
                fontFamily: templateConfig.fontFamily,
                primaryFont: templateConfig.primaryFont,
                accentColor: '#333333',
                elements: defaultElements,
              };
            }

            const rawConfig = (latestTemplate as any).elementConfig || {};
            let elements = defaultElements;

            // If elementConfig has blockLayout (drag-and-drop format),
            // derive visibility from the block visible flags
            if (rawConfig.blockLayout && Array.isArray(rawConfig.blockLayout)) {
              const blockMap: Record<string, boolean> = {};
              for (const block of rawConfig.blockLayout) {
                if (block.id && typeof block.visible === 'boolean') {
                  blockMap[block.id] = block.visible;
                }
              }
              elements = {
                showClinicHeader: blockMap['clinicHeader'] ?? true,
                showClinicLogo: blockMap['clinicHeader'] ?? true,
                showPatientName: blockMap['patientInfo'] ?? true,
                showPatientUhid: blockMap['patientInfo'] ?? true,
                showPatientAge: blockMap['patientInfo'] ?? true,
                showPatientGender: blockMap['patientInfo'] ?? true,
                showPatientMobile: blockMap['patientInfo'] ?? true,
                showPatientAddress: false,
                showVisitDate: blockMap['visitDate'] ?? true,
                showDiagnosis: blockMap['diagnosis'] ?? true,
                showMedicineTable: blockMap['medicineTable'] ?? true,
                showMedicineComposition: true,
                showMedicineQuantity: false,
                showMedicineInstructions: true,
                showAdvice: blockMap['advice'] ?? false,
                showFollowUp: blockMap['followUp'] ?? true,
                showDoctorName: blockMap['doctorSignature'] ?? true,
                showDoctorQualification: blockMap['doctorSignature'] ?? true,
                showDoctorRegistration: false,
                showDoctorSignature: blockMap['doctorSignature'] ?? true,
                showQrCode: false,
                showFooter: blockMap['clinicHeader'] ?? true,
              };
            }
            // If elementConfig already has showXxx booleans directly
            else if (rawConfig.showPatientName !== undefined) {
              elements = { ...defaultElements, ...rawConfig };
            }

            return {
              fontFamily: 'Inter, sans-serif',
              primaryFont: 'Inter',
              accentColor: '#333333',
              elements,
            };
          })(),
          clinic: {
            name: clinic?.clinicName || '',
            address: clinic?.clinicAddress || '',
            city: clinic?.City || '',
            state: clinic?.State || '',
            zipcode: clinic?.ZipCode || '',
            phone: clinic?.clinicPhone || '',
            logo: clinic?.clinicLogo || '',
            tagline: clinic?.Tagline || '',
          },
          watermarkLogo: clinic?.clinicLogo || '',
          doctor: {
            name: doctor?.name || '',
            email: doctor?.email || '',
            qualification: qualificationText || doctor?.qualification || '',
            speciality: doctor?.speciality || '',
            registrationNumber: doctor?.registrationNumber || '',
            availability: availability,
            groupedAvailability: ReportService.groupAvailability(availability),
          },
          patient: {
            name: patient?.name || '',
            age: patient?.age || '',
            gender: patient?.gender || '',
            address: patient?.address || '',
            uhid: '',
            mobile: patient?.mobile || '',
          },
          reportId: report.id,
          reportDate: new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          vitals: vitals,
          vitalsCount: vitalsCount,
          vitalsMoreThanOne: vitalsCount > 0,
          symptoms: symptoms,
          diagnosis: (payload.reportCard as any)?.provisionalDiagnosis,
          hasTests: appointmentTests.length > 0,
          testNames: testNamesString,
          prescriptions: prescriptions.map((p) => ({
            medicineName: p.medicineName,
            composition: p.composition,
            strength: p.strength || '',
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            notes: p.notes || '',
          })),
          appointmentDate: appointment.appointmentDate
            ? formatDate(appointment.appointmentDate)
            : '',
          appointmentTime: appointment.appointmentTime
            ? formatTime(appointment.appointmentTime)
            : '',
          token: appointment.token || '',
          provisionalDiagnosis:
            (payload.reportCard as any)?.provisionalDiagnosis || '',
          dietarySuggestion: (payload.reportCard as any)?.clinicalNotes || '',
          habits: (payload.reportCard as any)?.habits || '',
          allergies: (payload.reportCard as any)?.allergies || '',
          surgerySuggested: (payload.reportCard as any)?.surgerySuggested || '',
          visitingDays: (payload.reportCard as any)?.visitingDays || '',
          visitingNotes: (payload.reportCard as any)?.visitingNotes || '',
          advice: (payload.reportCard as any)?.advice || '',
          followUpDate: (payload.reportCard as any)?.followUpDate
            ? formatDate((payload.reportCard as any).followUpDate)
            : '',
          // Alias for quick-print templates that use {{visitDate}}
          visitDate: appointment.appointmentDate
            ? formatDate(appointment.appointmentDate)
            : '',
        };

        const [existingReport] = await database
          .select({ prescriptionPdf: ReportCardModel.prescriptionPdf })
          .from(ReportCardModel)
          .where(eq(ReportCardModel.id, report.id));

        const pdfUrl = await generateAndUploadPdf(
          templateToUse,
          pdfData,
          'prescriptions',
          existingReport?.prescriptionPdf
        );

        await database
          .update(ReportCardModel)
          .set({ prescriptionPdf: pdfUrl })
          .where(eq(ReportCardModel.id, report.id));

        broadcastPrescriptionPdfReadyToAppointmentRoom({
          appointmentId: report.appointmentId as string,
          reportId: report.id,
          pdfUrl,
        }).catch((err) => {
          logger.warn('Socket broadcast prescription pdf ready failed', err);
        });

        // let patient know it's ready with link
        if (patient?.id) {
          notifyPrescriptionPdfReady(
            patient.id,
            report.id,
            pdfUrl,
            report.appointmentId as string
          ).catch((err) => {
            logger.warn('Notify pdf ready failed', err);
          });
        }
      }
    } catch (error) {
      logger.error('Error in background PDF generation:', error);
    }
  }

  static async getCurrentTemplateInfo(doctorId: string) {
    try {
      const [manualTemplate, dbTemplate, namedTemplate, quickPrintTemplate] =
        await Promise.all([
          database
            .select({
              templateHtml: doctorManualTemplateModel.templateHtml,
              updatedAt: doctorManualTemplateModel.updatedAt,
            })
            .from(doctorManualTemplateModel)
            .where(eq(doctorManualTemplateModel.doctorId, doctorId))
            .orderBy(desc(doctorManualTemplateModel.updatedAt))
            .limit(1)
            .then((results) =>
              results[0]
                ? {
                    type: 'manual',
                    name: 'Manual Template',
                    updatedAt: results[0].updatedAt,
                    hasContent: !!results[0].templateHtml,
                  }
                : null
            ),

          database
            .select({
              templateHtml: doctorTemplateModel.templateHtml,
              updatedAt: doctorTemplateModel.updatedAt,
            })
            .from(doctorTemplateModel)
            .where(eq(doctorTemplateModel.doctorId, doctorId))
            .orderBy(desc(doctorTemplateModel.updatedAt))
            .limit(1)
            .then((results) =>
              results[0]
                ? {
                    type: 'doctor_html',
                    name: 'Doctor HTML Template',
                    updatedAt: results[0].updatedAt,
                    hasContent: !!results[0].templateHtml,
                  }
                : null
            ),

          database
            .select({
              templateName: PrescriptionTemplateModel.templateName,
              updatedAt: PrescriptionTemplateModel.updatedAt,
            })
            .from(PrescriptionTemplateModel)
            .where(eq(PrescriptionTemplateModel.doctorId, doctorId))
            .orderBy(desc(PrescriptionTemplateModel.updatedAt))
            .limit(1)
            .then((results) =>
              results[0]
                ? {
                    type: 'prescription',
                    name: `Prescription Template (${results[0].templateName})`,
                    templateName: results[0].templateName,
                    updatedAt: results[0].updatedAt,
                    hasContent: true,
                  }
                : null
            ),

          database
            .select({
              selectedTemplate: QuickPrintTemplateModel.selectedTemplate,
              updatedAt: QuickPrintTemplateModel.updatedAt,
            })
            .from(QuickPrintTemplateModel)
            .where(eq(QuickPrintTemplateModel.doctorId, doctorId))
            .limit(1)
            .then((results) =>
              results[0]
                ? {
                    type: 'quick-print',
                    name: `Quick Print (${results[0].selectedTemplate})`,
                    templateName: results[0].selectedTemplate,
                    updatedAt: results[0].updatedAt,
                    hasContent: true,
                  }
                : null
            ),
        ]);

      const availableTemplates = [
        manualTemplate,
        dbTemplate,
        namedTemplate,
        quickPrintTemplate,
      ].filter((t): t is NonNullable<typeof t> => t !== null && t.hasContent);

      if (availableTemplates.length === 0) {
        return {
          usingTemplate: 'Default Template',
          templateType: 'default',
          templateName: 'Template 4',
          message: 'No custom template found, using default template4',
        };
      }

      const latestTemplate = availableTemplates.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })[0];

      if (latestTemplate.type === 'manual') {
        return {
          usingTemplate: 'Manual Scanner',
          templateType: 'manual',
          updatedAt: latestTemplate.updatedAt,
          message: 'Using manually uploaded template',
        };
      } else if (latestTemplate.type === 'doctor_html') {
        return {
          usingTemplate: 'Prescription Scanner',
          templateType: 'doctor_html',
          updatedAt: latestTemplate.updatedAt,
          message: 'Using custom HTML template from doctor template',
        };
      } else if (latestTemplate.type === 'prescription') {
        return {
          usingTemplate: 'Prescription Templates',
          templateType: 'prescription',
          templateName: (latestTemplate as any).templateName,
          updatedAt: latestTemplate.updatedAt,
          message: `Using prescription template: ${(latestTemplate as any).templateName}`,
        };
      } else if (latestTemplate.type === 'quick-print') {
        return {
          usingTemplate: 'Quick Print Templates',
          templateType: 'quick-print',
          templateName: (latestTemplate as any).templateName,
          updatedAt: latestTemplate.updatedAt,
          message: `Using quick print template: ${(latestTemplate as any).templateName}`,
        };
      }

      return {
        usingTemplate: 'Default Template',
        templateType: 'default',
        templateName: 'Template 4',
        message: 'Using default template4',
      };
    } catch {
      throw new HttpError(500, 'Failed to fetch current template information');
    }
  }

  /** Returns the doctorId that owns a given appointment (for accurate preview). */
  static async getAppointmentDoctorId(
    appointmentId: string
  ): Promise<string | null> {
    try {
      const [row] = await database
        .select({ doctorId: AppointmentModel.doctorId })
        .from(AppointmentModel)
        .where(eq(AppointmentModel.id, appointmentId))
        .limit(1);
      return row?.doctorId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolves the doctor's ACTIVE template (same "latest updatedAt wins" logic as
   * the real PDF generation) and returns the ready-to-render HTML + config.
   * Used by the live preview so the preview matches the final prescription exactly.
   */
  static async getResolvedTemplateForPreview(doctorId: string): Promise<{
    templateHtml: string;
    templateConfig: {
      fontFamily: string;
      primaryFont: string;
      colors: Record<string, string>;
    };
    isQuickPrint: boolean;
    elementConfig: any;
  }> {
    const defaultConfig = {
      fontFamily: 'Inter, sans-serif',
      primaryFont: 'Inter',
      colors: {
        color1: '#0A6C74',
        color2: '#EBFCF4',
        color3: '#333333',
        color4: '#666666',
        color5: '#e0e0e0',
        color6: '#b22222',
        color7: '#f9f9f9',
        color8: '#ffffff',
        color9: '#000000',
        color10: '#856404',
      },
    };

    try {
      const [manual, dbHtml, named, quick] = await Promise.all([
        database
          .select({
            templateHtml: doctorManualTemplateModel.templateHtml,
            updatedAt: doctorManualTemplateModel.updatedAt,
          })
          .from(doctorManualTemplateModel)
          .where(eq(doctorManualTemplateModel.doctorId, doctorId))
          .orderBy(desc(doctorManualTemplateModel.updatedAt))
          .limit(1)
          .then((r) =>
            r[0]?.templateHtml ? { ...r[0], kind: 'html' as const } : null
          ),

        database
          .select({
            templateHtml: doctorTemplateModel.templateHtml,
            updatedAt: doctorTemplateModel.updatedAt,
          })
          .from(doctorTemplateModel)
          .where(eq(doctorTemplateModel.doctorId, doctorId))
          .orderBy(desc(doctorTemplateModel.updatedAt))
          .limit(1)
          .then((r) =>
            r[0]?.templateHtml ? { ...r[0], kind: 'html' as const } : null
          ),

        database
          .select()
          .from(PrescriptionTemplateModel)
          .where(eq(PrescriptionTemplateModel.doctorId, doctorId))
          .orderBy(desc(PrescriptionTemplateModel.updatedAt))
          .limit(1)
          .then((r) => (r[0] ? { ...r[0], kind: 'named' as const } : null)),

        database
          .select({
            selectedTemplate: QuickPrintTemplateModel.selectedTemplate,
            elementConfig: QuickPrintTemplateModel.elementConfig,
            updatedAt: QuickPrintTemplateModel.updatedAt,
          })
          .from(QuickPrintTemplateModel)
          .where(eq(QuickPrintTemplateModel.doctorId, doctorId))
          .limit(1)
          .then((r) =>
            r[0]?.selectedTemplate ? { ...r[0], kind: 'quick' as const } : null
          ),
      ]);

      const candidates = [manual, dbHtml, named, quick].filter(
        (t): t is NonNullable<typeof t> => t !== null
      );

      if (candidates.length === 0) {
        return {
          templateHtml: reportCardTemplate4,
          templateConfig: defaultConfig,
          isQuickPrint: false,
          elementConfig: null,
        };
      }

      const winner = candidates.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      })[0] as any;

      if (winner.kind === 'html') {
        return {
          templateHtml: winner.templateHtml,
          templateConfig: defaultConfig,
          isQuickPrint: false,
          elementConfig: null,
        };
      }

      if (winner.kind === 'quick') {
        return {
          templateHtml: QuickPrintTemplateService.getTemplateHtml(
            winner.selectedTemplate
          ),
          templateConfig: defaultConfig,
          isQuickPrint: true,
          elementConfig: winner.elementConfig,
        };
      }

      // named
      const fontFamily = winner.fontFamily || 'Inter, sans-serif';
      const colors = {
        color1: winner.color1 || '#0A6C74',
        color2: winner.color2 || '#EBFCF4',
        color3: winner.color3 || '#333333',
        color4: winner.color4 || '#666666',
        color5: winner.color5 || '#e0e0e0',
        color6: winner.color6 || '#b22222',
        color7: winner.color7 || '#f9f9f9',
        color8: winner.color8 || '#ffffff',
        color9: winner.color9 || '#000000',
        color10: winner.color10 || '#856404',
      };
      const namedMap: Record<string, string> = {
        template1: reportCardTemplate1,
        template2: reportCardTemplate2,
        template3: reportCardTemplate3,
        template4: reportCardTemplate4,
      };
      return {
        templateHtml: namedMap[winner.templateName] || reportCardTemplate4,
        templateConfig: {
          fontFamily,
          primaryFont: fontFamily.split(',')[0].trim(),
          colors,
        },
        isQuickPrint: false,
        elementConfig: null,
      };
    } catch (error) {
      logger.error('getResolvedTemplateForPreview error:', error);
      return {
        templateHtml: reportCardTemplate4,
        templateConfig: defaultConfig,
        isQuickPrint: false,
        elementConfig: null,
      };
    }
  }

  static async upsertTemplate(doctorId: string, data: PrescriptionTemplateDto) {
    try {
      const existingTemplate = await database
        .select()
        .from(PrescriptionTemplateModel)
        .where(eq(PrescriptionTemplateModel.doctorId, doctorId))
        .limit(1);

      let result;

      if (existingTemplate && existingTemplate.length > 0) {
        const updated = await database
          .update(PrescriptionTemplateModel)
          .set({
            templateName: data.templateName,
            fontFamily: data.fontFamily,
            color1: data.color1,
            color2: data.color2,
            color3: data.color3,
            color4: data.color4,
            color5: data.color5,
            color6: data.color6,
            color7: data.color7,
            color8: data.color8,
            color9: data.color9,
            color10: data.color10,
            updatedAt: new Date(),
          })
          .where(eq(PrescriptionTemplateModel.doctorId, doctorId))
          .returning();

        result = {
          action: 'updated' as const,
          template: updated[0],
        };
      } else {
        const inserted = await database
          .insert(PrescriptionTemplateModel)
          .values({
            doctorId,
            templateName: data.templateName,
            fontFamily: data.fontFamily,
            color1: data.color1,
            color2: data.color2,
            color3: data.color3,
            color4: data.color4,
            color5: data.color5,
            color6: data.color6,
            color7: data.color7,
            color8: data.color8,
            color9: data.color9,
            color10: data.color10,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        result = {
          action: 'created' as const,
          template: inserted[0],
        };
      }

      // When doctor explicitly selects a named template, backdate other
      // template sources so the named template wins the "most recent" check
      // during PDF generation. This ensures user intent is respected.
      const pastDate = new Date('2000-01-01T00:00:00.000Z');

      await Promise.allSettled([
        database
          .update(doctorTemplateModel)
          .set({ updatedAt: pastDate })
          .where(eq(doctorTemplateModel.doctorId, doctorId)),
        database
          .update(doctorManualTemplateModel)
          .set({ updatedAt: pastDate })
          .where(eq(doctorManualTemplateModel.doctorId, doctorId)),
      ]);

      return result;
    } catch {
      throw new HttpError(500, 'Failed to save prescription template');
    }
  }

  static async getTemplate(doctorId: string) {
    try {
      const [template] = await database
        .select()
        .from(PrescriptionTemplateModel)
        .where(eq(PrescriptionTemplateModel.doctorId, doctorId))
        .limit(1);

      return template || null;
    } catch {
      throw new HttpError(500, 'Failed to fetch prescription template');
    }
  }

  /**
   * Builds a real-time preview context for the given doctor:
   * the doctor's current clinic and profile (fetched live from the DB).
   * Patient data and prescription records are supplied as dummy values by
   * the preview controller. Returns null fields when nothing is found so the
   * controller can fall back to placeholder data.
   */
  static async getDoctorPreviewContext(doctorId: string) {
    // Doctor profile (live)
    const doctor = await database
      .select({
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        mobile: UserModel.mobile,
        qualification: UserProfessionalModel.qualification,
        speciality: UserProfessionalModel.speciality,
        registrationNumber: UserProfessionalModel.registrationNumber,
      })
      .from(UserModel)
      .leftJoin(
        UserProfessionalModel,
        eq(UserProfessionalModel.userId, UserModel.id)
      )
      .where(eq(UserModel.id, doctorId))
      .limit(1)
      .then((r) => r[0]);

    // Qualification titles (live)
    const qualifications = await database
      .select()
      .from(DoctorQualificationModel)
      .where(eq(DoctorQualificationModel.userId, doctorId));
    const qualificationText = qualifications
      .map((q: any) => q.qualificationTitle)
      .filter(Boolean)
      .join(', ');

    // Clinic the doctor is assigned to, else the clinic they own (live)
    let clinic = await database
      .select({
        id: ClinicModel.id,
        clinicName: ClinicModel.clinicName,
        clinicAddress: ClinicModel.clinicAddress,
        clinicPhone: ClinicModel.clinicPhone,
        State: ClinicModel.State,
        City: ClinicModel.City,
        ZipCode: ClinicModel.ZipCode,
        clinicLogo: ClinicModel.clinicLogo,
        Tagline: ClinicModel.Tagline,
      })
      .from(ClinicModel)
      .innerJoin(
        ClinicAssignModel,
        eq(ClinicAssignModel.clinicId, ClinicModel.id)
      )
      .where(eq(ClinicAssignModel.userId, doctorId))
      .limit(1)
      .then((r) => r[0]);

    if (!clinic) {
      clinic = await database
        .select({
          id: ClinicModel.id,
          clinicName: ClinicModel.clinicName,
          clinicAddress: ClinicModel.clinicAddress,
          clinicPhone: ClinicModel.clinicPhone,
          State: ClinicModel.State,
          City: ClinicModel.City,
          ZipCode: ClinicModel.ZipCode,
          clinicLogo: ClinicModel.clinicLogo,
          Tagline: ClinicModel.Tagline,
        })
        .from(ClinicModel)
        .where(eq(ClinicModel.userId, doctorId))
        .limit(1)
        .then((r) => r[0]);
    }

    // Consultation timings (live), grouped for compact display
    let availability: any[] = [];
    let groupedAvailability: any[] = [];
    if (clinic?.id) {
      availability = await ReportService.getFormattedClinicAvailability(
        doctorId,
        clinic.id
      );
      groupedAvailability = ReportService.groupAvailability(availability);
    }

    return {
      clinic: clinic
        ? {
            name: clinic.clinicName || '',
            address: clinic.clinicAddress || '',
            city: clinic.City || '',
            state: clinic.State || '',
            zipcode: clinic.ZipCode ? String(clinic.ZipCode) : '',
            phone: clinic.clinicPhone || '',
            logo: clinic.clinicLogo || '',
            tagline: clinic.Tagline || '',
          }
        : null,
      doctor: doctor
        ? {
            name: doctor.name || '',
            email: doctor.email || '',
            qualification: qualificationText || doctor.qualification || '',
            speciality: doctor.speciality || '',
            registrationNumber: doctor.registrationNumber || '',
            availability,
            groupedAvailability,
          }
        : null,
    };
  }

  static async getFormattedClinicAvailability(
    doctorId: string,
    clinicId: string
  ): Promise<any[]> {
    try {
      const availability = await database
        .select()
        .from(ClinicAvailability)
        .where(
          and(
            eq(ClinicAvailability.doctorId, doctorId),
            eq(ClinicAvailability.clinicId, clinicId)
          )
        );

      const daysOrder = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      const shortDays = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

      const availabilityMap = new Map();
      availability.forEach((item) => {
        availabilityMap.set(item.dayOfWeek, item);
      });

      const availabilityIds = availability
        .map((item) => item?.id)
        .filter((id) => id) as string[];

      const availabilityBreaks = availabilityIds.length
        ? await database
            .select()
            .from(ClinicAvailabilityBreak)
            .where(
              and(
                inArray(
                  ClinicAvailabilityBreak.clinicAvailabilityId,
                  availabilityIds
                ),
                eq(ClinicAvailabilityBreak.status, true)
              )
            )
        : [];

      const breaksByAvailability = new Map<string, any[]>();
      availabilityBreaks.forEach((b) => {
        const key = b.clinicAvailabilityId;
        if (!breaksByAvailability.has(key)) {
          breaksByAvailability.set(key, []);
        }
        breaksByAvailability.get(key)?.push(b);
      });

      const parseTimeToMinutes = (
        time: string | null | undefined
      ): number | null => {
        if (!time) return null;
        const s = String(time).trim();

        const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
        if (ampmMatch) {
          let h = Number(ampmMatch[1]);
          const m = Number(ampmMatch[2]);
          const meridiem = ampmMatch[3].toUpperCase();
          if (Number.isNaN(h) || Number.isNaN(m)) return null;
          if (meridiem === 'AM') {
            if (h === 12) h = 0;
          } else if (h !== 12) {
            h += 12;
          }
          return h * 60 + m;
        }

        const plainMatch = s.match(/^(\d{1,2}):(\d{2})$/);
        if (plainMatch) {
          const h = Number(plainMatch[1]);
          const m = Number(plainMatch[2]);
          if (Number.isNaN(h) || Number.isNaN(m)) return null;
          return h * 60 + m;
        }

        return null;
      };

      const formatTimeForDisplay = (
        time: string | null | undefined
      ): string => {
        if (!time) return '';
        const s = String(time).trim();
        const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
        if (ampmMatch) {
          const h = Number(ampmMatch[1]);
          const m = ampmMatch[2];
          const meridiem = ampmMatch[3].toUpperCase();
          return `${h}:${m} ${meridiem}`;
        }

        const plainMatch = s.match(/^(\d{1,2}):(\d{2})$/);
        if (plainMatch) {
          let h = Number(plainMatch[1]);
          const m = plainMatch[2];
          if (Number.isNaN(h)) return s;
          const period = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          const hPadded = h.toString().padStart(2, '0');
          return `${hPadded}:${m} ${period}`;
        }

        return s;
      };

      const calculateShifts = (
        availStart: string | null | undefined,
        availEnd: string | null | undefined,
        rawBreaks: { startTime?: string | null; endTime?: string | null }[]
      ): string[] => {
        if (!availStart || !availEnd) return [];

        const availStartMin = parseTimeToMinutes(availStart);
        const availEndMin = parseTimeToMinutes(availEnd);

        if (
          availStartMin === null ||
          availEndMin === null ||
          availStartMin >= availEndMin
        ) {
          return [];
        }

        const validBreaks = rawBreaks
          .map((b) => {
            if (!b.startTime || !b.endTime) return null;
            const start = parseTimeToMinutes(b.startTime);
            const end = parseTimeToMinutes(b.endTime);
            if (start === null || end === null || start >= end) return null;
            return {
              start: Math.max(start, availStartMin),
              end: Math.min(end, availEndMin),
            };
          })
          .filter((b): b is { start: number; end: number } => Boolean(b))
          .filter((b) => b.end > availStartMin && b.start < availEndMin)
          .sort((a, b) => a.start - b.start);

        // merge overlapping breaks
        const merged = [] as { start: number; end: number }[];
        for (const b of validBreaks) {
          if (merged.length === 0) {
            merged.push({ ...b });
            continue;
          }
          const last = merged[merged.length - 1];
          if (b.start <= last.end) {
            last.end = Math.max(last.end, b.end);
          } else {
            merged.push({ ...b });
          }
        }

        const shifts: string[] = [];
        let currentStart = availStartMin;

        for (const br of merged) {
          if (currentStart < br.start) {
            shifts.push(
              `${formatTimeForDisplay(
                `${Math.floor(currentStart / 60)
                  .toString()
                  .padStart(2, '0')}:${(currentStart % 60)
                  .toString()
                  .padStart(2, '0')}`
              )} - ${formatTimeForDisplay(
                `${Math.floor(br.start / 60)
                  .toString()
                  .padStart(2, '0')}:${(br.start % 60)
                  .toString()
                  .padStart(2, '0')}`
              )}`
            );
          }
          currentStart = Math.max(currentStart, br.end);
        }

        if (currentStart < availEndMin) {
          shifts.push(
            `${formatTimeForDisplay(
              `${Math.floor(currentStart / 60)
                .toString()
                .padStart(2, '0')}:${(currentStart % 60)
                .toString()
                .padStart(2, '0')}`
            )} - ${formatTimeForDisplay(
              `${Math.floor(availEndMin / 60)
                .toString()
                .padStart(2, '0')}:${(availEndMin % 60)
                .toString()
                .padStart(2, '0')}`
            )}`
          );
        }

        return shifts;
      };

      const formattedDays = daysOrder.map((fullDay, index) => {
        const avail = availabilityMap.get(fullDay);
        const shortDay = shortDays[index];

        if (!avail || !avail.isAvailable) {
          return {
            day: shortDay,
            startTime: null,
            endTime: null,
            isAvailable: false,
            display: `${shortDay} - Off`,
          };
        }

        if (avail.startTime && avail.endTime) {
          const breakRows = breaksByAvailability.get(avail.id) || [];
          const rowBreaks = [...breakRows];
          if (avail.breaksStart && avail.breaksEnd) {
            rowBreaks.push({
              startTime: avail.breaksStart,
              endTime: avail.breaksEnd,
            });
          }

          const shifts = calculateShifts(
            avail.startTime,
            avail.endTime,
            rowBreaks
          );
          const startTimeFormatted = formatTimeForDisplay(avail.startTime);
          const endTimeFormatted = formatTimeForDisplay(avail.endTime);

          return {
            day: shortDay,
            startTime: startTimeFormatted,
            endTime: endTimeFormatted,
            isAvailable: true,
            display:
              shifts.length > 0
                ? shifts.join('<br/>')
                : `${startTimeFormatted} - ${endTimeFormatted}`,
          };
        }

        return {
          day: shortDay,
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: `${shortDay} - Off`,
        };
      });

      return formattedDays;
    } catch {
      return [
        {
          day: 'Mon',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Mon - Off',
        },
        {
          day: 'Tues',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Tues - Off',
        },
        {
          day: 'Wed',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Wed - Off',
        },
        {
          day: 'Thur',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Thur - Off',
        },
        {
          day: 'Fri',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Fri - Off',
        },
        {
          day: 'Sat',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Sat - Off',
        },
        {
          day: 'Sun',
          startTime: null,
          endTime: null,
          isAvailable: false,
          display: 'Sun - Off',
        },
      ];
    }
  }

  /**
   * Groups consecutive days with the same schedule into ranges.
   * e.g., "Mon - Fri: 09:00 AM - 01:00 PM<br/>02:00 PM - 06:00 PM" instead of listing each day separately.
   */
  static groupAvailability(
    availability: {
      day: string;
      isAvailable: boolean;
      display: string;
    }[]
  ): { days: string; isAvailable: boolean; display: string }[] {
    if (!availability || availability.length === 0) return [];

    // Normalize display for comparison: strip the day prefix from "Off" displays
    const getScheduleKey = (entry: {
      isAvailable: boolean;
      display: string;
    }) => {
      if (!entry.isAvailable) return 'OFF';
      return entry.display;
    };

    const groups: {
      days: string[];
      isAvailable: boolean;
      display: string;
      key: string;
    }[] = [];

    for (const entry of availability) {
      const key = getScheduleKey(entry);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === key) {
        lastGroup.days.push(entry.day);
      } else {
        groups.push({
          days: [entry.day],
          isAvailable: entry.isAvailable,
          display: entry.isAvailable ? entry.display : 'Off',
          key,
        });
      }
    }

    return groups.map((group) => ({
      days:
        group.days.length > 1
          ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
          : group.days[0],
      isAvailable: group.isAvailable,
      display: group.display,
    }));
  }

  static async updatePatientReportCard(
    query: GetReportCardIdQueryDto,
    payload: UpdateReportAndPrescriptionsDto
  ) {
    const result = await database.transaction(async (tx) => {
      if (
        payload.reportCard &&
        Object.keys(payload.reportCard).length > 0 &&
        query?.reportCardId
      ) {
        const setObj: Record<string, any> = {};
        const allowedDocFields = [
          'comorbidities',
          'habits',
          'vitals',
          'generalExamination',
          'systemExamination',
          'provisionalDiagnosis',
          'differentialDiagnosis',
          'finalDiagnosis',
          'investigations',
          'advice',
          'clinicalNotes',
          'allergies',
          'followUpInDays',
          'followUpDate',
        ] as const;
        for (const k of allowedDocFields) {
          const val = (payload.reportCard as any)[k];
          if (typeof val !== 'undefined') {
            if (k === 'followUpDate') {
              setObj[k] = val ? new Date(val) : null;
            } else {
              setObj[k] = val;
            }
          }
        }
        if (Object.keys(setObj).length > 0) {
          setObj.updatedAt = sql`NOW()`;
          const [updatedReport] = await tx
            .update(ReportCardModel)
            .set(setObj)
            .where(eq(ReportCardModel.id, query?.reportCardId))
            .returning({
              id: ReportCardModel.id,
              petientId: ReportCardModel.petientId,
              appointmentId: ReportCardModel.appointmentId,
            });

          if (updatedReport) {
            return updatedReport;
          }
        }
      }

      if (
        payload.prescriptions &&
        Object.keys(payload.prescriptions).length > 0
      ) {
        const setObj: Record<string, any> = {};
        const allowedDocFields = [
          'medicineName',
          'composition',
          'strength',
          'dosage',
          'frequency',
          'duration',
          'manufacturer',
          'medicineCount',
          'marketer',
          'imageUrl',
          'uses',
        ] as const;
        for (const k of allowedDocFields) {
          const val = (payload.prescriptions as any)[k];
          if (typeof val !== 'undefined') {
            setObj[k] = val;
          }
        }
        if (Object.keys(setObj).length > 0 && query.prescriptionId) {
          setObj.updatedAt = sql`NOW()`;
          const [updatedPrescription] = await tx
            .update(PrescriptionModel)
            .set(setObj)
            .where(eq(PrescriptionModel.id, query.prescriptionId))
            .returning({
              id: PrescriptionModel.id,
              reportCardId: PrescriptionModel.reportCardId,
            });

          if (updatedPrescription?.reportCardId) {
            return updatedPrescription;
          }
        }
      }
      return null;
    });

    // Regenerate PDF OUTSIDE transaction
    if (result && (result as any).id) {
      const reportCardId = (result as any).reportCardId || (result as any).id;
      if (reportCardId) {
        await this.regeneratePdf(reportCardId);
      }
    }

    return result;
  }

  /**
   * Helper method to regenerate prescription PDF
   */
  private static async regeneratePdf(reportCardId: string) {
    try {
      const [reportCard] = await database
        .select()
        .from(ReportCardModel)
        .where(eq(ReportCardModel.id, reportCardId))
        .limit(1);

      if (!reportCard) return;

      const [appointment] = await database
        .select({
          id: AppointmentModel.id,
          appointmentType: AppointmentModel.appointmentType,
          appointmentDate: AppointmentModel.appointmentDate,
          appointmentTime: AppointmentModel.appointmentTime,
          appointmentStatus: AppointmentModel.appointmentStatus,
          tokenNo: AppointmentModel.tokenNo,
          clinicId: AppointmentModel.clinicId,
          patientId: AppointmentModel.patientId,
          doctorId: AppointmentModel.doctorId,
          clinicServiceId: AppointmentModel.clinicServiceId,
          clinicSymptomIds: AppointmentClinicalModel.clinicSymptomIds,
          vitals: AppointmentClinicalModel.vitals,
        })
        .from(AppointmentModel)
        .leftJoin(
          AppointmentClinicalModel,
          eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
        )
        .where(eq(AppointmentModel.id, reportCard.appointmentId))
        .limit(1);

      if (!appointment) return;

      if (appointment.doctorId === null) return;

      const [clinic] = await database
        .select()
        .from(ClinicModel)
        .where(eq(ClinicModel.id, appointment.clinicId))
        .limit(1);

      const [doctor] = await database
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          qualification: UserProfessionalModel.qualification,
          speciality: UserProfessionalModel.speciality,
          registrationNumber: UserProfessionalModel.registrationNumber,
        })
        .from(UserModel)
        .leftJoin(
          UserProfessionalModel,
          eq(UserProfessionalModel.userId, UserModel.id)
        )
        .where(eq(UserModel.id, appointment.doctorId))
        .limit(1);

      const [patient] = await database
        .select({
          id: UserModel.id,
          name: UserModel.name,
          email: UserModel.email,
          mobile: UserModel.mobile,
          age: UserProfileModel.age,
          gender: UserProfileModel.gender,
          address: UserProfileModel.address,
        })
        .from(UserModel)
        .leftJoin(UserProfileModel, eq(UserProfileModel.userId, UserModel.id))
        .where(eq(UserModel.id, reportCard.petientId))
        .limit(1);

      const qualifications = await database
        .select()
        .from(DoctorQualificationModel)
        .where(eq(DoctorQualificationModel.userId, appointment.doctorId));

      const qualificationText = qualifications
        .map((q: any) => q.qualificationTitle)
        .join(', ');

      const prescriptions = await database
        .select()
        .from(PrescriptionModel)
        .where(eq(PrescriptionModel.reportCardId, reportCardId));

      let symptoms: any[] = [];
      if (
        appointment.clinicSymptomIds &&
        appointment.clinicSymptomIds.length > 0
      ) {
        symptoms = await database
          .select({
            id: ClinicSymptomModel.id,
            name: ClinicSymptomModel.name,
            description: ClinicSymptomModel.description,
          })
          .from(ClinicSymptomModel)
          .where(inArray(ClinicSymptomModel.id, appointment.clinicSymptomIds));
      }

      const vitals = (appointment.vitals || {}) as {
        bpSys?: number;
        bpDia?: number;
        pulse?: number;
        spo2?: number;
        temperatureC?: number;
        heightCm?: number;
        weightKg?: number;
        bmi?: number;
      };
      let vitalsCount = 0;

      if (vitals.bpSys && vitals.bpDia) vitalsCount++;
      if (vitals.pulse) vitalsCount++;
      if (vitals.spo2) vitalsCount++;
      if (vitals.temperatureC) vitalsCount++;
      if (vitals.heightCm) vitalsCount++;
      if (vitals.weightKg) vitalsCount++;
      if (vitals.bmi) vitalsCount++;

      const pdfData = {
        clinic: {
          name: clinic?.clinicName || '',
          address: clinic?.clinicAddress || '',
          city: clinic?.City || '',
          state: clinic?.State || '',
          zipcode: clinic?.ZipCode || '',
          phone: clinic?.clinicPhone || '',
          logo: clinic?.clinicLogo || '',
          tagline: clinic?.Tagline || '',
        },
        watermarkLogo: clinic?.clinicLogo || '', // Using clinic logo as watermark by default
        doctor: {
          name: doctor?.name || '',
          email: doctor?.email || '',
          qualification: qualificationText || doctor?.qualification || '',
          speciality: doctor?.speciality || '',
          registrationNumber: doctor?.registrationNumber || '',
        },
        patient: {
          name: patient?.name || '',
          age: patient?.age || '',
          gender: patient?.gender || '',
          address: patient?.address || '',
          uhid: '',
          mobile: patient?.mobile || '',
        },
        reportId: reportCardId,
        reportDate: new Date(reportCard.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        vitals: vitals,
        vitalsCount: vitalsCount,
        vitalsMoreThanOne: vitalsCount > 0,
        symptoms: symptoms,
        diagnosis:
          reportCard.finalDiagnosis || reportCard.provisionalDiagnosis || '',
        prescriptions: prescriptions.map((p: any) => ({
          medicineName: p.medicineName,
          strength: p.strength || '',
          composition: p.composition,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          notes: p.notes || '',
        })),
        advice: reportCard.advice || '',
        followUpDate: reportCard.followUpDate
          ? new Date(reportCard.followUpDate).toLocaleDateString()
          : '',
      };

      // notify start of regeneration
      if (patient?.id) {
        notifyPrescriptionPdfGenerationStarted(
          patient.id,
          reportCardId,
          appointment.id
        ).catch((err) => {
          logger.warn('notify start regeneration failed', err);
        });
      }

      const [existingReport] = await database
        .select({ prescriptionPdf: ReportCardModel.prescriptionPdf })
        .from(ReportCardModel)
        .where(eq(ReportCardModel.id, reportCardId));

      const pdfUrl = await generateAndUploadPdf(
        reportCardTemplate4,
        pdfData,
        'prescriptions',
        existingReport?.prescriptionPdf
      );

      await database
        .update(ReportCardModel)
        .set({ prescriptionPdf: pdfUrl })
        .where(eq(ReportCardModel.id, reportCardId));

      broadcastPrescriptionPdfReadyToAppointmentRoom({
        appointmentId: appointment.id,
        reportId: reportCardId,
        pdfUrl,
      }).catch((err) => {
        logger.warn('Socket broadcast prescription pdf ready failed', err);
      });

      if (patient?.id) {
        notifyPrescriptionPdfReady(
          patient.id,
          reportCardId,
          pdfUrl,
          appointment.id
        ).catch((err) => {
          logger.warn('notify regenerated pdf ready failed', err);
        });
      }
    } catch (error) {
      logger.error('Failed to regenerate prescription PDF:', error);
    }
  }
  static escapeLike(s: string) {
    return s.replace(/[%_\\]/g, (m) => `\\${m}`);
  }

  static async getAppoinmentsPrescriptionsReport(
    validatedParams: GetPatientIdParamsDto,
    validatedQuery: GetPatientIdQueryDto,
    clinicId: string
  ) {
    return await database.transaction(async (tx) => {
      const pageSize = Math.max(Number(validatedQuery.pageSize) || 10, 1);
      const pageNumber = Math.max(Number(validatedQuery.pageNumber) || 1, 1);
      const { limit, offset } = pagination(pageNumber, pageSize);

      if (validatedQuery?.typeOfPaginations === 'Appointments') {
        const conditions = [
          eq(AppointmentModel.patientId, validatedParams.patientId),
          eq(AppointmentModel.clinicId, clinicId),
        ];
        if (validatedQuery?.searchBy) {
          const raw = String(validatedQuery.searchBy).trim();
          if (raw.length > 0) {
            const terms = raw.split(/\s+/).slice(0, 5);
            const termConditions: SQL<unknown>[] = terms
              .map((term): SQL<unknown> | undefined => {
                const escaped = this.escapeLike(term);
                const pattern = `%${escaped}%`.toLowerCase();
                return or(
                  sql`lower(${AppointmentModel.appointmentType}) LIKE ${pattern}`,
                  sql`lower(${AppointmentModel.appointmentTime}) LIKE ${pattern}`
                );
              })
              .filter((cond): cond is SQL<unknown> => cond !== undefined);
            if (termConditions.length) {
              conditions.push(...termConditions);
            }
          }
        }
        const totalRecords = await tx
          .select({ count: sql`COUNT(DISTINCT ${AppointmentModel.id})` })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.patientId, validatedParams.patientId),
              eq(AppointmentModel.clinicId, clinicId)
            )
          );
        const doctorUser = alias(UserModel, 'doctorUser');
        const totalCount = Number(totalRecords[0]?.count) || 0;
        const totalPages = Math.ceil(totalCount / pageSize);
        const appointments = await tx
          .select({
            id: AppointmentModel.id,
            appointmentType: AppointmentModel.appointmentType,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            tokenNo: AppointmentModel.tokenNo,
            appointmentStatus: AppointmentModel.appointmentStatus,
            appointmentNotes: AppointmentClinicalModel.appointmentNotes,
            reReasonForCancellation: AppointmentModel.reReasonForCancellation,
            reasionForReSchedule: AppointmentModel.reasionForReSchedule,
            createdAt: AppointmentModel.createdAt,
            updatedAt: AppointmentModel.updatedAt,
            doctor: {
              id: doctorUser.id,
              name: doctorUser.name,
              speciality: sql<string>`(SELECT speciality FROM user_professionals WHERE user_id = ${doctorUser.id} LIMIT 1)`,
              imageUrl: sql<string>`(SELECT profile_image FROM user_profiles WHERE user_id = ${doctorUser.id} LIMIT 1)`,
            },
          })
          .from(AppointmentModel)
          .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
          .leftJoin(
            AppointmentClinicalModel,
            eq(AppointmentModel.id, AppointmentClinicalModel.appointmentId)
          )
          .where(and(...conditions))
          .limit(limit)
          .offset(offset)
          .orderBy(desc(AppointmentModel.updatedAt));

        return {
          appointments,
          pagination: {
            totalRecords: totalCount,
            totalPages,
            currentPage: pageNumber,
            pageSize,
          },
        };
      }

      if (validatedQuery?.typeOfPaginations === 'Prescriptions') {
        const doctorUser = alias(UserModel, 'doctorUser');

        // Base conditions — filter by patientId and clinicId
        const baseConditions: SQL<unknown>[] = [
          eq(AppointmentModel.patientId, validatedParams.patientId),
          eq(AppointmentModel.clinicId, clinicId),
        ];

        // Get all appointments with their prescriptions (both from ReportCardModel and doctorManualPrescriptionModel)
        const appointmentsWithPrescriptions = await tx
          .select({
            appointmentId: AppointmentModel.id,
            appointmentDate: AppointmentModel.appointmentDate,
            appointmentTime: AppointmentModel.appointmentTime,
            doctorId: AppointmentModel.doctorId,
            doctorName: doctorUser.name,
            doctorSpeciality: sql<string>`(SELECT speciality FROM user_professionals WHERE user_id = ${doctorUser.id} LIMIT 1)`,
            reportCardPrescription: ReportCardModel.prescriptionPdf,
            manualPrescription:
              doctorManualPrescriptionModel.doctorManualPrescription,
            reportCardCreatedAt: ReportCardModel.createdAt,
            manualCreatedAt: doctorManualPrescriptionModel.createdAt,
          })
          .from(AppointmentModel)
          .leftJoin(doctorUser, eq(doctorUser.id, AppointmentModel.doctorId))
          .leftJoin(
            ReportCardModel,
            and(
              eq(ReportCardModel.appointmentId, AppointmentModel.id),
              eq(ReportCardModel.petientId, validatedParams.patientId)
            )
          )
          .leftJoin(
            doctorManualPrescriptionModel,
            eq(doctorManualPrescriptionModel.appointmentId, AppointmentModel.id)
          )
          .where(and(...baseConditions))
          .orderBy(desc(AppointmentModel.appointmentDate));

        // Combine prescriptions (prioritize report card PDF, fallback to manual prescription)
        const allPrescriptions = appointmentsWithPrescriptions
          .map((item) => {
            // Determine which prescription to use
            let prescriptionPdf = null;
            let createdAt = null;

            if (item.reportCardPrescription) {
              prescriptionPdf = item.reportCardPrescription;
              createdAt = item.reportCardCreatedAt;
            } else if (item.manualPrescription) {
              prescriptionPdf = item.manualPrescription;
              createdAt = item.manualCreatedAt;
            }

            // Only return if prescription exists
            if (prescriptionPdf) {
              return {
                id: item.appointmentId,
                appointmentId: item.appointmentId,
                prescriptionPdf: prescriptionPdf,
                appointmentDate: item.appointmentDate,
                appointmentTime: item.appointmentTime,
                doctorName: item.doctorName,
                doctorSpeciality: item.doctorSpeciality,
                createdAt: createdAt,
              };
            }
            return null;
          })
          .filter((item) => item !== null);

        // Apply search filter if provided
        let filteredPrescriptions = allPrescriptions;
        if (validatedQuery?.searchBy) {
          const searchTerm = String(validatedQuery.searchBy)
            .trim()
            .toLowerCase();
          if (searchTerm.length > 0) {
            filteredPrescriptions = allPrescriptions.filter((prescription) => {
              // Convert Date to string for comparison
              const appointmentDateStr = prescription?.appointmentDate
                ? new Date(prescription.appointmentDate).toLocaleDateString()
                : '';

              return (
                prescription?.doctorName?.toLowerCase().includes(searchTerm) ||
                prescription?.doctorSpeciality
                  ?.toLowerCase()
                  .includes(searchTerm) ||
                appointmentDateStr.toLowerCase().includes(searchTerm) ||
                prescription?.appointmentTime
                  ?.toLowerCase()
                  .includes(searchTerm)
              );
            });
          }
        }

        // Apply pagination
        const totalCount = filteredPrescriptions.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        const paginatedPrescriptions = filteredPrescriptions.slice(
          offset,
          offset + limit
        );

        return {
          prescriptions: paginatedPrescriptions,
          pagination: {
            totalRecords: totalCount,
            totalPages,
            currentPage: pageNumber,
            pageSize,
          },
        };
      }

      if (validatedQuery?.typeOfPaginations === 'Medcial history') {
        const conditions = [
          eq(ReportCardModel.petientId, validatedParams.patientId),
        ];
        if (validatedQuery?.searchBy) {
          const raw = String(validatedQuery.searchBy).trim();
          if (raw.length > 0) {
            const terms = raw.split(/\s+/).slice(0, 5);
            const termConditions: SQL<unknown>[] = terms
              .map((term): SQL<unknown> | undefined => {
                const escaped = this.escapeLike(term);
                const pattern = `%${escaped}%`.toLowerCase();
                return or(
                  sql`lower(coalesce(array_to_string(${ReportCardModel.comorbidities}, ' '), '')) LIKE ${pattern}`,
                  sql`lower(coalesce(array_to_string(${ReportCardModel.habits}, ' '), '')) LIKE ${pattern}`
                );
              })
              .filter((cond): cond is SQL<unknown> => cond !== undefined);
            if (termConditions.length) {
              conditions.push(...termConditions);
            }
          }
        }

        const totalRecords = await tx
          .select({ count: sql`COUNT(DISTINCT ${ReportCardModel.id})` })
          .from(ReportCardModel)
          .where(and(...conditions));

        const totalCount = Number(totalRecords[0]?.count) || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        const medicalHistories = await tx
          .select()
          .from(ReportCardModel)
          .where(and(...conditions))
          .limit(limit)
          .offset(offset)
          .orderBy(desc(ReportCardModel.updatedAt));

        return {
          medicalHistories,
          pagination: {
            totalRecords: totalCount,
            totalPages,
            currentPage: pageNumber,
            pageSize,
          },
        };
      }
    });
  }

  static async getReportCard(query: GetReportIdsQueryDto, clinicId: string) {
    return await database.transaction(async (tx) => {
      const conditions = [];

      if (query?.appointmentId) {
        conditions.push(eq(ReportCardModel.appointmentId, query.appointmentId));
      }
      if (query?.reportCardId) {
        conditions.push(eq(ReportCardModel.id, query.reportCardId));
      }

      const reportCardResult = await tx
        .select({
          id: ReportCardModel.id,
          petientId: ReportCardModel.petientId,
          appointmentId: ReportCardModel.appointmentId,
          reportId: ReportCardModel.reportId,
          comorbidities: ReportCardModel.comorbidities,
          habits: ReportCardModel.habits,
          generalExamination: ReportCardModel.generalExamination,
          systemExamination: ReportCardModel.systemExamination,
          provisionalDiagnosis: ReportCardModel.provisionalDiagnosis,
          differentialDiagnosis: ReportCardModel.differentialDiagnosis,
          finalDiagnosis: ReportCardModel.finalDiagnosis,
          investigations: ReportCardModel.investigations,
          advice: ReportCardModel.advice,
          clinicalNotes: ReportCardModel.clinicalNotes,
          allergies: ReportCardModel.allergies,
          surgerySuggested: ReportCardModel.surgerySuggested,
          visitingDays: ReportCardModel.visitingDays,
          visitingNotes: ReportCardModel.visitingNotes,
          prescriptionPdf: ReportCardModel.prescriptionPdf,
          followUpInDays: ReportCardModel.followUpInDays,
          followUpDate: ReportCardModel.followUpDate,
          createdAt: ReportCardModel.createdAt,
          updatedAt: ReportCardModel.updatedAt,
        })
        .from(ReportCardModel)
        .innerJoin(
          AppointmentModel,
          eq(ReportCardModel.appointmentId, AppointmentModel.id)
        )
        .where(and(...conditions, eq(AppointmentModel.clinicId, clinicId)))
        .orderBy(desc(ReportCardModel.updatedAt))
        .limit(1);

      let reportCardData: any = reportCardResult[0] || {};
      let prescriptions: any[] = [];

      // If no report card found for the specific appointment, fetch last report card data for the patient
      if (!reportCardResult.length && query?.appointmentId) {
        // First get the patientId from the appointment
        const appointment = await tx
          .select({
            patientId: AppointmentModel.patientId,
          })
          .from(AppointmentModel)
          .where(
            and(
              eq(AppointmentModel.id, query.appointmentId),
              eq(AppointmentModel.clinicId, clinicId)
            )
          )
          .limit(1);

        if (appointment.length) {
          const patientId = appointment[0].patientId;

          // Get the most recent report card for this patient
          const lastReportCard = await tx
            .select({
              id: ReportCardModel.id,
              habits: ReportCardModel.habits,
              provisionalDiagnosis: ReportCardModel.provisionalDiagnosis,
              allergies: ReportCardModel.allergies,
              surgerySuggested: ReportCardModel.surgerySuggested,
              updatedAt: ReportCardModel.updatedAt,
            })
            .from(ReportCardModel)
            .innerJoin(
              AppointmentModel,
              eq(ReportCardModel.appointmentId, AppointmentModel.id)
            )
            .where(
              and(
                eq(ReportCardModel.petientId, patientId),
                eq(AppointmentModel.clinicId, clinicId)
              )
            )
            .orderBy(desc(ReportCardModel.updatedAt))
            .limit(1);

          if (lastReportCard.length) {
            // Return only habits, provisionalDiagnosis, and allergies from last report card
            reportCardData = {
              habits: lastReportCard[0].habits,
              provisionalDiagnosis: lastReportCard[0].provisionalDiagnosis,
              allergies: lastReportCard[0].allergies,
              surgerySuggested: lastReportCard[0].surgerySuggested,
            };
          } else {
            // No report card exists for this patient at all
            reportCardData = {};
          }
        } else {
          reportCardData = {};
        }
      }

      // Fetch prescriptions only if we have a valid report card ID and it's from the current appointment
      if (reportCardResult.length && reportCardResult[0]?.id) {
        prescriptions = await tx
          .select({
            id: PrescriptionModel.id,
            reportCardId: PrescriptionModel.reportCardId,
            petientId: PrescriptionModel.petientId,
            medicineId: PrescriptionModel.medicineId,
            prescribedBy: PrescriptionModel.prescribedBy,
            medicineName: PrescriptionModel.medicineName,
            composition: PrescriptionModel.composition,
            strength: PrescriptionModel.strength,
            dosage: PrescriptionModel.dosage,
            frequency: PrescriptionModel.frequency,
            duration: PrescriptionModel.duration,
            manufacturer: PrescriptionModel.manufacturer,
            medicineCount: PrescriptionModel.medicineCount,
            marketer: PrescriptionModel.marketer,
            imageUrl: PrescriptionModel.imageUrl,
            notes: PrescriptionModel.notes,
            uses: PrescriptionModel.uses,
            createdAt: PrescriptionModel.createdAt,
            updatedAt: PrescriptionModel.updatedAt,
            medicine: {
              id: MedicineModel.id,
              name: MedicineModel.name,
              strength: MedicineModel.strength,
              form: MedicineModel.form,
            },
          })
          .from(PrescriptionModel)
          .leftJoin(
            MedicineModel,
            eq(PrescriptionModel.medicineId, MedicineModel.id)
          )
          .where(eq(PrescriptionModel.reportCardId, reportCardResult[0].id))
          .orderBy(desc(PrescriptionModel.updatedAt));
      }

      const pharmacyAssigned = await tx
        .select({
          pharmacyId: PharmacyAssignModel.pharmacyId,
        })
        .from(PharmacyAssignModel)
        .where(eq(PharmacyAssignModel.clinicId, clinicId))
        .limit(1);

      const clinicResult = await tx
        .select()
        .from(ClinicModel)
        .where(eq(ClinicModel.id, clinicId))
        .limit(1);

      return {
        clinic: clinicResult.length
          ? {
              ...clinicResult[0],
              isPharmacyAvailable: !!pharmacyAssigned.length,
            }
          : {},
        reportCard: reportCardData,
        prescriptions,
      };
    });
  }
}
