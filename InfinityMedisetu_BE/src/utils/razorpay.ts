import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';
import { envConfig } from './envConfig';
import { HttpError } from '../middlewear/errorHandler';

export const razorpayInstance = new Razorpay({
  key_id: envConfig.RAZORPAY_KEY_ID,
  key_secret: envConfig.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (
  amount: number,
  clinicId: string,
  planId: string,
  providerSubscriptionId: string,
  extraNotes?: Record<string, string>
) => {
  const options = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1,
    notes: {
      clinicId: clinicId,
      planId: planId,
      providerSubscriptionId: providerSubscriptionId,
      ...(extraNotes || {}),
    },
  };
  return await razorpayInstance.orders.create(options);
};

// ✅ Fixed: Use KEY_SECRET instead of WEBHOOK_SECRET
export const verifyRazorpayPayment = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', envConfig.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');
  return expectedSignature === signature;
};

export const verifyWebhookSignature = (
  body: string,
  signature: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', envConfig.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

/**
 * Creates a Razorpay Route linked account for a clinic.
 * Uses Basic Auth headers since the standard SDK might not cover route account creation fully.
 */
export const createRazorpayRouteAccount = async (data: {
  email: string;
  phone: string;
  name: string;
  referenceId: string;
  contactName: string;
}) => {
  const authHeader = Buffer.from(
    `${envConfig.RAZORPAY_KEY_ID}:${envConfig.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.post(
      'https://api.razorpay.com/v2/accounts',
      {
        email: data.email,
        phone: data.phone,
        type: 'route',
        reference_id: data.referenceId,
        legal_business_name: data.name,
        business_type: 'individual',
        contact_name: data.contactName,
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status || 400;
      const description =
        error.response.data?.error?.description || error.message;
      throw new HttpError(
        status,
        `Razorpay route account creation failed: ${description}`,
        error.response.data
      );
    }
    throw error;
  }
};

/**
 * Creates a split/route order on Razorpay.
 * Sets up transfer of clinicShareAmount to the linked route account, while
 * the remainder automatically stays in the platform's central account as platform fee.
 */
export const createRazorpaySplitOrder = async (
  totalAmount: number,
  routeAccountId: string,
  clinicShareAmount: number,
  appointmentId: string,
  clinicId: string,
  patientId: string
) => {
  const options = {
    amount: Math.round(totalAmount * 100), // convert to paise
    currency: 'INR',
    receipt: `apt_${appointmentId}`,
    payment_capture: 1,
    notes: {
      type: 'appointment_booking',
      appointmentId,
      clinicId,
      patientId,
    },
    transfers: [
      {
        account: routeAccountId,
        amount: Math.round(clinicShareAmount * 100), // convert to paise
        currency: 'INR',
        notes: {
          appointmentId,
        },
        on_hold: false,
      },
    ],
  };
  return await razorpayInstance.orders.create(options);
};

/**
 * Creates a regular Razorpay order for clinic appointment bookings.
 */
export const createRazorpayAppointmentOrder = async (
  amount: number,
  appointmentId: string,
  clinicId: string,
  patientId: string
) => {
  const options = {
    amount: Math.round(amount * 100), // convert to paise
    currency: 'INR',
    receipt: `apt_${appointmentId}`,
    payment_capture: 1,
    notes: {
      type: 'appointment_booking',
      appointmentId,
      clinicId,
      patientId,
    },
  };
  return await razorpayInstance.orders.create(options);
};
