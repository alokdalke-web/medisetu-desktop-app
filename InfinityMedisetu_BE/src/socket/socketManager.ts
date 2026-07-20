/* eslint-disable @typescript-eslint/no-explicit-any */
// src/socket/socketManager.ts
import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { eq, and } from 'drizzle-orm';
import Redis from 'ioredis';
import { KafkaManager } from '../kafka/kafkaManager';
import { requireSocketAuth } from '../middlewear/socketAuth';
import {
  listUnreadNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '../main/notifications/services/notifications.service';
import { database } from '../configurations/dbConnection';
import { ClinicAssignModel } from '../main/clinic/models/clinic.model';
import { AppointmentModel } from '../main/appointments/models/appointment.model';
import { PatientFamilyLinksModel } from '../main/patient/models/patientFamilyLinks.model';
import { TimeToNextService } from '../main/appointment-engine/services/timeToNext.service';
import { computeLiveQueuePayload } from '../main/appointment-engine/services/liveQueueHelper';
import logger from '../utils/logger';
import redis from '../configurations/redisConfig';
import { envConfig } from '../utils/envConfig';
import { NODE_ID } from '../utils/notification.utils';

export type SocketEventPayload = {
  event: string;
  payload: any;
  room?: string;
  socketId?: string;
  correlationId?: string;
};

const TERMINAL_STATUSES = ['Completed', 'Cancelled', 'NoShow'];

export class SocketManager {
  public io: IOServer;
  private kafkaManager: KafkaManager;
  private kafkaTopicPrefix: string;

  constructor(
    httpServer: HttpServer,
    kafkaManager: KafkaManager,
    options?: { cors?: any; kafkaTopicPrefix?: string }
  ) {
    this.io = new IOServer(httpServer, {
      cors: options?.cors ?? { origin: '*' },
      maxHttpBufferSize: 1e6, // 1MB max message size
      connectTimeout: 10000, // 10s handshake timeout
      pingInterval: 30000, // 30s ping interval (mobile-friendly)
      pingTimeout: 30000, // 30s ping timeout (mobile-friendly)
    });

    // Redis adapter for multi-instance Socket.IO (rooms work across nodes)
    try {
      const redisOpts = {
        host: envConfig.REDIS_HOST,
        port: envConfig.REDIS_PORT,
        password: envConfig.REDIS_PASSWORD,
      };
      const pubClient = new Redis(redisOpts);
      const subClient = new Redis(redisOpts);
      this.io.adapter(createAdapter(pubClient, subClient));
      logger.info(
        '[SocketManager] Redis adapter attached for multi-instance support'
      );
    } catch (err) {
      logger.warn(
        '[SocketManager] Failed to attach Redis adapter. Falling back to in-memory (single instance only).',
        err
      );
    }

    this.io.use(requireSocketAuth);
    this.kafkaManager = kafkaManager;
    this.kafkaTopicPrefix =
      options?.kafkaTopicPrefix ??
      process.env.SOCKET_EVENT_TO_KAFKA_PREFIX ??
      'socket.events';
    this.setupConnectionHandler();
  }

  private genCorrelationId() {
    const anyCrypto: any =
      (globalThis as any).crypto || (globalThis as any).require?.('crypto');
    if (anyCrypto && typeof anyCrypto.randomUUID === 'function')
      return anyCrypto.randomUUID();
    return `cid_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  }

  private setupConnectionHandler() {
    this.io.on('connection', async (socket: Socket) => {
      const user = (socket as any).data?.user ?? (socket as any).user ?? null;
      logger.info(
        `[SocketManager] client connected: ${socket.id}`,
        user ? `user=${user.id}` : ''
      );

      // Join user's private room + clinic rooms
      try {
        if (user?.id) {
          socket.join(`user:${user.id}`);
          logger.info(
            '[SocketManager] user joined private room',
            `user:${user.id}`
          );

          const cacheKey = `user:clinics:${user.id}`;
          let clinicIds = await redis.lrange(cacheKey, 0, -1);

          if (!clinicIds.length) {
            const assignments = await database
              .select({ clinicId: ClinicAssignModel.clinicId })
              .from(ClinicAssignModel)
              .where(eq(ClinicAssignModel.userId, user.id));

            clinicIds = assignments.map((a) => a.clinicId);

            if (clinicIds.length) {
              await redis.rpush(cacheKey, ...clinicIds);
              await redis.expire(cacheKey, 60 * 10);
            }
          }

          for (const clinicId of clinicIds) {
            socket.join(`clinic:${clinicId}`);
          }
        }
      } catch (e) {
        logger.warn('[SocketManager] join user room error', e);
      }

      // Send unread notifications on login
      try {
        if (user?.id) {
          const unread = await listUnreadNotificationsForUser(user.id, {
            limit: 100,
          });

          socket.emit('notification.initial_unread', {
            count: unread.length,
            notifications: unread.map((n) => ({
              notificationId: n.id,
              userId: n.userId,
              type: n.type,
              title: n.title,
              body: n.body,
              data: n.data ?? null,
              metadata: n.metadata ?? null,
              read: n.read,
              createdAt: n.createdAt,
            })),
          });
        }
      } catch (e) {
        logger.warn('[SocketManager] failed to emit unread notifications', e);
      }

      // Send cached queue state on connection (for clinic dashboard)
      try {
        if (user?.id) {
          const cacheKey = `user:clinics:${user.id}`;
          const clinicIds = await redis.lrange(cacheKey, 0, -1);

          if (clinicIds.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const timeToNextService = new TimeToNextService();

            const emitQueueStateForKey = async (
              clinicId: string,
              key: string
            ) => {
              const raw = await redis.get(key);
              if (!raw) return;

              try {
                const queueData = JSON.parse(raw);
                const timeToNextMinutes = await timeToNextService.compute(
                  queueData.clinicId,
                  queueData.doctorId,
                  today
                );

                socket.emit('queue.updated', {
                  clinicId: queueData.clinicId,
                  doctorId: queueData.doctorId,
                  date: queueData.date,
                  cumulativeDelay: queueData.cumulativeDelayMinutes,
                  lastCalculatedAt: queueData.lastCalculatedAt,
                  appointments: queueData.appointments.map((entry: any) => ({
                    appointmentId: entry.appointmentId,
                    status: entry.status,
                    appointmentTime: entry.scheduledTime,
                    estimatedWaitMinutes: entry.estimatedWaitMinutes,
                    cumulativeDelay: queueData.cumulativeDelayMinutes,
                  })),
                });

                socket.emit('timeToNext.updated', {
                  clinicId,
                  timeToNextMinutes,
                  ts: new Date().toISOString(),
                });
              } catch {
                // Skip malformed cache entries
              }
            };

            const emitQueueStateForClinic = async (clinicId: string) => {
              // Use SCAN instead of KEYS to avoid blocking Redis
              const pattern = `appointment_engine:delay:${clinicId}:*:${today}`;
              const keys: string[] = [];
              let cursor = '0';
              do {
                const [nextCursor, batch] = await redis.scan(
                  cursor,
                  'MATCH',
                  pattern,
                  'COUNT',
                  20
                );
                cursor = nextCursor;
                keys.push(...batch);
              } while (cursor !== '0');

              await Promise.all(
                keys.map((key) => emitQueueStateForKey(clinicId, key))
              );
            };

            await Promise.all(clinicIds.map(emitQueueStateForClinic));
          }
        }
      } catch (e) {
        logger.warn(
          '[SocketManager] failed to emit cached queue state on connection',
          e
        );
      }

      // ─── Notification handlers ─────────────────────────────────────────────

      socket.on(
        'notification.mark_read',
        async (
          data: { notificationId: string },
          ack?: (...args: any[]) => void
        ) => {
          try {
            if (!data?.notificationId) {
              if (ack)
                ack({ status: 'error', message: 'notificationId required' });
              return;
            }

            const updated = await markNotificationRead(data.notificationId);

            socket.emit('notification.marked_read', {
              notificationId: data.notificationId,
              read: true,
            });

            if (ack)
              ack({
                status: 'success',
                notificationId: data.notificationId,
                updated,
              });
          } catch (err) {
            logger.error('[SocketManager] notification.mark_read error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on(
        'notification.mark_all_read',
        async (ack?: (...args: any[]) => void) => {
          try {
            if (!user?.id) {
              if (ack)
                ack({ status: 'error', message: 'authentication required' });
              return;
            }

            const result = await markAllNotificationsRead(user.id);

            socket.emit('notification.all_marked_read', {
              userId: user.id,
              count: result.count,
            });

            if (ack) ack({ status: 'success', count: result.count });
          } catch (err) {
            logger.error(
              '[SocketManager] notification.mark_all_read error',
              err
            );
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      // ─── Generic event forwarding ─────────────────────────────────────────

      socket.on(
        'event_to_server',
        async (msg: SocketEventPayload, ack?: (response: any) => void) => {
          try {
            if (!msg || !msg.event) {
              if (typeof ack === 'function')
                ack({ status: 'error', message: 'invalid payload' });
              return;
            }

            const correlationId = msg.correlationId ?? this.genCorrelationId();
            const payload = {
              ...msg.payload,
              from: user?.id ?? null,
              correlationId,
            };
            const topic = `${this.kafkaTopicPrefix}.${msg.event.replace(/\s+/g, '_')}`;

            await this.kafkaManager.publish(
              topic,
              {
                event: msg.event,
                payload,
                socketId: socket.id,
                room: msg.room,
                correlationId,
                ts: new Date().toISOString(),
              },
              user?.id ?? msg.room ?? undefined
            );

            if (typeof ack === 'function')
              ack({ status: 'accepted', correlationId });
          } catch (err) {
            logger.error('[SocketManager] publish error', err);
            if (typeof ack === 'function')
              ack({ status: 'error', message: String(err) });
          }
        }
      );

      // ─── Room management ───────────────────────────────────────────────────

      socket.on('join', async (room: string) => {
        try {
          // Validate room access — only allow rooms the user is authorized for
          if (room.startsWith('user:')) {
            // Users can only join their own room
            if (room !== `user:${user?.id}`) {
              logger.warn(
                `[SocketManager] Unauthorized room join attempt: ${room} by user=${user?.id}`
              );
              return;
            }
          } else if (room.startsWith('clinic:')) {
            // Users can only join clinics they're assigned to
            const clinicId = room.replace('clinic:', '');
            const cacheKey = `user:clinics:${user?.id}`;
            const clinicIds = await redis.lrange(cacheKey, 0, -1);
            if (!clinicIds.includes(clinicId)) {
              logger.warn(
                `[SocketManager] Unauthorized clinic room join: ${room} by user=${user?.id}`
              );
              return;
            }
          }
          // Allow other custom rooms (e.g., chat rooms managed by app logic)
          socket.join(room);
        } catch (e) {
          logger.warn('[SocketManager] join room error', e);
        }
      });

      socket.on('leave', (room: string) => {
        try {
          socket.leave(room);
        } catch (e) {
          logger.warn('[SocketManager] leave room error', e);
        }
      });

      // ─── Live Queue (Patient) ──────────────────────────────────────────────

      socket.on(
        'join.live-queue',
        async (
          data: { appointmentId: string },
          ack?: (response: any) => void
        ) => {
          try {
            if (!data?.appointmentId) {
              if (ack)
                ack({ status: 'error', message: 'appointmentId required' });
              return;
            }
            if (!user?.id) {
              if (ack)
                ack({ status: 'error', message: 'authentication required' });
              return;
            }

            // Fetch appointment
            const [appointment] = await database
              .select({
                id: AppointmentModel.id,
                clinicId: AppointmentModel.clinicId,
                doctorId: AppointmentModel.doctorId,
                patientId: AppointmentModel.patientId,
                appointmentDate: AppointmentModel.appointmentDate,
                appointmentStatus: AppointmentModel.appointmentStatus,
              })
              .from(AppointmentModel)
              .where(eq(AppointmentModel.id, data.appointmentId))
              .limit(1);

            if (!appointment) {
              if (ack)
                ack({ status: 'error', message: 'Appointment not found' });
              return;
            }
            if (!appointment.doctorId) {
              if (ack) ack({ status: 'error', message: 'No doctor assigned' });
              return;
            }

            // Only today's appointments
            const today = new Date();
            const apptDate = new Date(appointment.appointmentDate);
            if (
              apptDate.getFullYear() !== today.getFullYear() ||
              apptDate.getMonth() !== today.getMonth() ||
              apptDate.getDate() !== today.getDate()
            ) {
              if (ack)
                ack({
                  status: 'error',
                  message: "Live queue only available for today's appointments",
                });
              return;
            }

            // Only active appointments
            if (TERMINAL_STATUSES.includes(appointment.appointmentStatus)) {
              if (ack)
                ack({
                  status: 'error',
                  message: 'Appointment is no longer in queue',
                });
              return;
            }

            // Verify ownership (self or family member)
            if (appointment.patientId !== user.id) {
              const [link] = await database
                .select({ id: PatientFamilyLinksModel.id })
                .from(PatientFamilyLinksModel)
                .where(
                  and(
                    eq(PatientFamilyLinksModel.primaryPatientId, user.id),
                    eq(
                      PatientFamilyLinksModel.linkedPatientId,
                      appointment.patientId
                    )
                  )
                )
                .limit(1);

              if (!link) {
                if (ack) ack({ status: 'error', message: 'Access denied' });
                return;
              }
            }

            // Join room and store metadata
            const lqRoom = `live-queue:${appointment.clinicId}:${appointment.doctorId}`;
            socket.join(lqRoom);
            (socket as any).liveQueueData = {
              appointmentId: data.appointmentId,
              clinicId: appointment.clinicId,
              doctorId: appointment.doctorId,
            };

            // Emit current queue state
            const payload = await computeLiveQueuePayload(
              data.appointmentId,
              appointment.clinicId,
              appointment.doctorId
            );
            socket.emit('queue.update', payload);

            if (ack) ack({ status: 'success', message: 'Joined live queue' });
            logger.info(
              `[SocketManager] Patient ${user.id} joined live-queue for appointment=${data.appointmentId}`
            );
          } catch (err) {
            logger.error('[SocketManager] join.live-queue error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on('leave.live-queue', () => {
        const lqData = (socket as any).liveQueueData;
        if (lqData) {
          socket.leave(`live-queue:${lqData.clinicId}:${lqData.doctorId}`);
          (socket as any).liveQueueData = null;
        }
      });

      // ─── Call Reception Feature ────────────────────────────────────────────

      socket.on(
        'call.reception',
        async (
          data: {
            clinicId: string;
            doctorId: string;
            doctorName: string;
            profileImage?: string;
            receptionId?: string;
            callType: 'RECEPTION' | 'NEXT_PATIENT';
          },
          ack?: (response: any) => void
        ) => {
          try {
            if (!data.clinicId) {
              if (ack) ack({ status: 'error', message: 'clinicId required' });
              return;
            }

            const payload = {
              clinicId: data.clinicId,
              doctorId: data.doctorId || user?.id,
              doctorName: data.doctorName || user?.name,
              profileImage: data.profileImage,
              callType: data.callType || 'RECEPTION',
              ts: new Date().toISOString(),
            };

            if (data.receptionId) {
              this.io
                .to(`user:${data.receptionId}`)
                .emit('call.incoming', payload);
            } else {
              this.io
                .to(`clinic:${data.clinicId}`)
                .emit('call.incoming', payload);
            }

            this.publishEventToKafka(
              'call.incoming',
              payload,
              data.receptionId
                ? `user:${data.receptionId}`
                : `clinic:${data.clinicId}`
            ).catch((err) =>
              logger.error(
                '[SocketManager] Kafka publish failed for call.incoming',
                err
              )
            );

            if (ack) ack({ status: 'success' });
          } catch (err) {
            logger.error('[SocketManager] call.reception error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on(
        'call.acknowledge',
        async (
          data: {
            doctorId: string;
            receptionId: string;
            receptionName: string;
            clinicId: string;
          },
          ack?: (response: any) => void
        ) => {
          try {
            if (!data.doctorId) {
              if (ack) ack({ status: 'error', message: 'doctorId required' });
              return;
            }

            const payload = {
              doctorId: data.doctorId,
              receptionId: data.receptionId || user?.id,
              receptionName: data.receptionName || user?.name,
              clinicId: data.clinicId,
              ts: new Date().toISOString(),
            };

            this.io
              .to(`user:${data.doctorId}`)
              .emit('call.acknowledged', payload);
            if (data.clinicId) {
              this.io
                .to(`clinic:${data.clinicId}`)
                .emit('call.acknowledged', payload);
            }

            this.publishEventToKafka(
              'call.acknowledged',
              payload,
              `user:${data.doctorId}`
            ).catch(() => {});
            if (data.clinicId) {
              this.publishEventToKafka(
                'call.acknowledged',
                payload,
                `clinic:${data.clinicId}`
              ).catch(() => {});
            }

            if (ack) ack({ status: 'success' });
          } catch (err) {
            logger.error('[SocketManager] call.acknowledge error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on(
        'call.decline',
        async (
          data: {
            doctorId: string;
            receptionId: string;
            receptionName: string;
            clinicId: string;
          },
          ack?: (response: any) => void
        ) => {
          try {
            if (!data.doctorId) {
              if (ack) ack({ status: 'error', message: 'doctorId required' });
              return;
            }

            const payload = {
              doctorId: data.doctorId,
              receptionId: data.receptionId || user?.id,
              receptionName: data.receptionName || user?.name,
              clinicId: data.clinicId,
              ts: new Date().toISOString(),
            };

            this.io.to(`user:${data.doctorId}`).emit('call.declined', payload);
            if (data.clinicId) {
              this.io
                .to(`clinic:${data.clinicId}`)
                .emit('call.declined', payload);
            }

            this.publishEventToKafka(
              'call.declined',
              payload,
              `user:${data.doctorId}`
            ).catch(() => {});
            if (data.clinicId) {
              this.publishEventToKafka(
                'call.declined',
                payload,
                `clinic:${data.clinicId}`
              ).catch(() => {});
            }

            if (ack) ack({ status: 'success' });
          } catch (err) {
            logger.error('[SocketManager] call.decline error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on(
        'call.cancel',
        async (
          data: { doctorId: string; clinicId: string },
          ack?: (response: any) => void
        ) => {
          try {
            if (!data.clinicId) {
              if (ack) ack({ status: 'error', message: 'clinicId required' });
              return;
            }

            const payload = {
              doctorId: data.doctorId || user?.id,
              clinicId: data.clinicId,
              ts: new Date().toISOString(),
            };

            this.io
              .to(`clinic:${data.clinicId}`)
              .emit('call.cancelled', payload);
            this.publishEventToKafka(
              'call.cancelled',
              payload,
              `clinic:${data.clinicId}`
            ).catch((err) =>
              logger.error(
                '[SocketManager] Kafka publish failed for call.cancelled',
                err
              )
            );

            if (ack) ack({ status: 'success' });
          } catch (err) {
            logger.error('[SocketManager] call.cancel error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on(
        'call.wait',
        async (
          data: {
            doctorId: string;
            clinicId: string;
            receptionId: string;
            receptionName: string;
          },
          ack?: (response: any) => void
        ) => {
          try {
            if (!data.doctorId) {
              if (ack) ack({ status: 'error', message: 'doctorId required' });
              return;
            }

            const payload = {
              doctorId: data.doctorId,
              clinicId: data.clinicId,
              receptionId: data.receptionId || user?.id,
              receptionName: data.receptionName || user?.name,
              ts: new Date().toISOString(),
            };

            this.io.to(`user:${data.doctorId}`).emit('call.waited', payload);
            this.publishEventToKafka(
              'call.waited',
              payload,
              `user:${data.doctorId}`
            ).catch(() => {});

            if (ack) ack({ status: 'success' });
          } catch (err) {
            logger.error('[SocketManager] call.wait error', err);
            if (ack) ack({ status: 'error', message: String(err) });
          }
        }
      );

      socket.on('disconnect', (reason) => {
        logger.info(
          `[SocketManager] client disconnected: ${socket.id} reason=${reason}`
        );
      });
    });
  }

  // ─── Kafka ↔ Socket bridging ─────────────────────────────────────────────

  emitByKafkaMessage(message: SocketEventPayload) {
    if (!message || !message.event) return;

    if (message.room) {
      try {
        const senderSocket = message.socketId
          ? (this.io.sockets.sockets as any).get(message.socketId)
          : undefined;

        if (senderSocket) {
          senderSocket.to(message.room).emit(message.event, message.payload);
        } else {
          this.io.to(message.room).emit(message.event, message.payload);
        }
      } catch (e) {
        logger.warn('[SocketManager] emit to room failed', e);
      }
      return;
    }

    if (message.socketId) {
      const s = (this.io.sockets.sockets as any).get(message.socketId);
      if (s) {
        try {
          s.emit(message.event, message.payload);
        } catch (e) {
          logger.warn('[SocketManager] emit to socket failed', e);
        }
      }
      return;
    }

    try {
      this.io.emit(message.event, message.payload);
    } catch (e) {
      logger.warn('[SocketManager] broadcast emit failed', e);
    }
  }

  async bindKafkaTopicToSockets(topic: string) {
    await this.kafkaManager.subscribe(topic, async (kmsg) => {
      try {
        const val = (kmsg as any).value;
        if (!val) return;

        let payloadObj: any = val;
        if (typeof val === 'string') {
          try {
            payloadObj = JSON.parse(val);
          } catch {
            return;
          }
        }

        if (!payloadObj.event) return;
        if (payloadObj.originNodeId === NODE_ID) return;

        this.emitByKafkaMessage(payloadObj as SocketEventPayload);
      } catch (err) {
        logger.error('[SocketManager] error handling kafka message', err);
      }
    });
  }

  async bindKafkaTopics(topics: string[]) {
    for (const t of topics) {
      try {
        await this.bindKafkaTopicToSockets(t);
      } catch (e) {
        logger.error(`[SocketManager] failed to bind kafka topic ${t}`, e);
      }
    }
  }

  async publishEventToKafka(
    event: string,
    payload: any,
    room?: string,
    socketId?: string,
    correlationId?: string
  ) {
    const topic = `${this.kafkaTopicPrefix}.${event.replace(/\s+/g, '_')}`;
    await this.kafkaManager.publish(topic, {
      event,
      payload,
      room,
      socketId,
      correlationId,
      originNodeId: NODE_ID,
      ts: new Date().toISOString(),
    });
  }

  async close() {
    try {
      await this.io.close();
    } catch (e) {
      logger.warn('SocketManager close error', e);
    }
  }
}
