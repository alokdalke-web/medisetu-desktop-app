import fs from 'fs-extra';
import path from 'path';
import handlebars from 'handlebars';
import { deleteFromS3, uploadBufferToS3 } from '../configurations/s3';
import logger from './logger';
import { htmlToPdfBuffer } from './browserPdf';

type PdfTemplateData = Record<string, unknown> & {
  invoice?: { id?: string };
  labResult?: { id?: string };
  reportId?: string;
};

// Register Handlebars helper for index + 1
handlebars.registerHelper('addOne', (value: number) => {
  return value + 1;
});

// Register Handlebars helper for default values
handlebars.registerHelper('default', (value: unknown, defaultValue: string) => {
  return value || defaultValue;
});

handlebars.registerHelper('split', (str: unknown, separator: string) => {
  // Handle null, undefined, or non-string values
  if (!str) return [];

  // Convert to string if it's not already
  const strValue = String(str);

  return strValue
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s);
});

/**
 * Interface for Invoice Data
 */
export interface InvoicePdfData {
  pharmacy: {
    name: string;
    address: string;
    contactNumber: string;
  };
  clinic: {
    clinicName: string;
    clinicAddress: string;
    clinicPhone: string;
    clinicLogo?: string;
    City: string;
    State: string;
    ZipCode: string;
  };
  doctor?: {
    name: string;
    email: string;
    speciality: string;
    qualification: string;
    licenseNumber: string;
  } | null;
  invoice: {
    id: string;
    customerName: string;
    address: string;
    mobile: string;
    createdAt: string;
  };
  billing: {
    paymentMethod: string;
    price: string | number;
    discount: string | number;
    tax: string | number;
    totalPrice: string | number;
  };
  medicines: Array<{
    medicineName: string;
    strength: string;
    quantity: string | number;
    expiryDate: string;
    rowTotal: string | number;
  }>;
}

/**
 * Generate PDF from HTML template string and upload to AWS S3
 * Uses Gotenberg (lightweight HTML-to-PDF microservice) instead of Puppeteer.
 * @param templateHtml - The HTML content as a string
 * @param data - Data to inject into the template
 * @param folder - S3 folder to upload the PDF to
 * @returns - URL of the uploaded PDF
 */
export async function generateAndUploadPdf(
  templateHtml: string,
  data: PdfTemplateData,
  folder: string = 'invoices',
  oldFileUrl?: string | null
): Promise<string> {
  try {
    // Inject assets path for CSS background images
    const assetsDir = path.join(__dirname, '..', 'htmltamplates', 'assets');

    // Convert background image to base64 to ensure it works in all environments
    let backgroundBase64 = '';
    try {
      const bgPath = path.join(assetsDir, 'background.png');
      if (await fs.pathExists(bgPath)) {
        const bgBuffer = await fs.readFile(bgPath);
        backgroundBase64 = `data:image/png;base64,${bgBuffer.toString('base64')}`;
        logger.info(
          `Background image loaded, base64 length: ${backgroundBase64.length}`
        );
      } else {
        logger.warn(`Background image not found at ${bgPath}`);
      }
    } catch (err) {
      logger.error(
        'Failed to read background image for base64 conversion:',
        err
      );
    }

    const assetsPath = `file:///${assetsDir.replace(/\\/g, '/')}/`;
    const enrichedData = { ...data, assetsPath, backgroundBase64 };

    const template = handlebars.compile(templateHtml);
    const html = template(enrichedData);

    // Generate PDF using Gotenberg (lightweight microservice)
    const pdfBuffer = await htmlToPdfBuffer(html);

    // Upload to AWS S3
    const fileName = data.invoice?.id
      ? `invoice_${data.invoice.id}_${Date.now()}`
      : data.labResult?.id
        ? `lab_report_${data.labResult.id}_${Date.now()}`
        : data.reportId
          ? `prescription_${data.reportId}_${Date.now()}`
          : `document_${Date.now()}`;

    const s3Key = `${folder}/${fileName}.pdf`;
    const uploadedUrl = await uploadBufferToS3(
      Buffer.from(pdfBuffer),
      s3Key,
      'application/pdf'
    );

    if (oldFileUrl) {
      try {
        await deleteFromS3(oldFileUrl);
        logger.info(`Old PDF deleted after successful upload: ${oldFileUrl}`);
      } catch (error) {
        logger.error('Failed to delete old PDF:', error);
      }
    }

    return uploadedUrl;
  } catch (error) {
    logger.error('PDF Generation/Upload Error:', error);
    throw error;
  }
}
