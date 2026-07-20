// src/main/global/routes/v1/upload.route.ts
import {
  multipleFileUploaderController,
  // presignedUrlGenerateController,
  singleFileController,
} from '../../controllers/fileUploader.controller';
import { apiKeyAuth } from '../../../../middlewear/apiKey';
import {
  generatePresignedURL,
  generatePresignedURLBulk,
} from '../../services/uploads.service';
import { docsRegistry } from '../../../../utils/docsRegistry';
import express from 'express';

const uploadeRouter = express.Router();

/**
 * @route POST /api/v1/global/upload/single
 * @desc Generate presigned URL and upload a single file
 * @access Public
 */
uploadeRouter.post(
  '/single',
  generatePresignedURL([
    // Documents & Spreadsheets
    'xlsx',
    'xls',
    'csv',
    'pdf',
    'docx',
    'doc',

    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'tiff',
    'svg',
    'webp',
    'heic',
    'ico',
    'psd',
    'raw',
    'cr2',
    'nef',

    // Video
    'mp4',
    'mkv',
    'avi',
    'mov',
    'wmv',
    'flv',
    'webm',
    'mpg',
    'mpeg',
    '3gp',
    'ogv',

    // Audio
    'mp3',
    'wav',
    'aac',
    'flac',
  ]),
  singleFileController
);

/**
 * @route POST /api/v1/global/upload/single/external
 * @desc Generate presigned URL and upload a single file for external services
 * @access Private (API Key)
 */
uploadeRouter.post(
  '/single/external',
  apiKeyAuth,
  generatePresignedURL([
    // Documents & Spreadsheets
    'xlsx',
    'xls',
    'csv',
    'pdf',
    'docx',
    'doc',

    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'tiff',
    'svg',
    'webp',
    'heic',
    'ico',
    'psd',
    'raw',
    'cr2',
    'nef',

    // Video
    'mp4',
    'mkv',
    'avi',
    'mov',
    'wmv',
    'flv',
    'webm',
    'mpg',
    'mpeg',
    '3gp',
    'ogv',

    // Audio
    'mp3',
    'wav',
    'aac',
    'flac',
  ]),
  singleFileController
);

/**
 * @route POST /api/v1/global/upload/multiple
 * @desc Generate presigned URLs and upload multiple files
 * @access Public
 */
uploadeRouter.post(
  '/multiple',
  generatePresignedURLBulk([
    // Documents & Spreadsheets
    'xlsx',
    'xls',
    'csv',
    'pdf',
    'docx',
    'doc',

    // Images
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'tiff',
    'svg',
    'webp',
    'heic',
    'ico',
    'psd',
    'raw',
    'cr2',
    'nef',

    // Video
    'mp4',
    'mkv',
    'avi',
    'mov',
    'wmv',
    'flv',
    'webm',
    'mpg',
    'mpeg',
    '3gp',
    'ogv',

    // Audio
    'mp3',
    'wav',
    'aac',
    'flac',
  ]),
  multipleFileUploaderController
);

// uploadeRouter.post('/presigned-url', presignedUrlGenerateController);
export default uploadeRouter;

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/global/upload/single', // full path as it would appear in the app
  description: 'upload a single file',
  tags: ['global', 'upload'],
});

// docsRegistry.addEndpoint({
//   method: 'post',
//   path: '/api/v1/global/upload/single/external', // full path as it would appear in the app
//   description: 'upload a single file external',
//   tags: ['global', 'upload'],
// });

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/global/upload/multiple', // full path as it would appear in the app
  description: 'upload multiple files',
  tags: ['global', 'upload'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/global/upload/presigned-url', // full path as it would appear in the app
  description: 'upload multiple files',
  tags: ['global', 'upload'],
});
