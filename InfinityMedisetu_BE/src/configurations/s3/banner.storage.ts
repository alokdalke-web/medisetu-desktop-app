// src/configurations/s3/banner.storage.ts
/**
 * Banner Image Upload Configuration
 * Handles uploads for:
 * - Full-size banner images
 * - Thumbnail banner images
 *
 * Uses AWS S3 storage via multer-s3
 * Reuses the centralized storage factory pattern
 */

import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { s3Client, BUCKET_NAME, createS3Storage } from './client';

// ─── Banner Images Upload (Full-size + Thumbnails) ─────────────────────────
// Supports both single image uploads and multi-field uploads for forms

const allowedBannerImageFormats = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];

/**
 * Single banner image upload
 * Used for uploading a single banner image file
 * Stores in: s3://bucket/banner_images/
 */
export const uploadBannerImage = multer({
  storage: createS3Storage('banner_images', allowedBannerImageFormats),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!allowedBannerImageFormats.includes(ext)) {
      return cb(
        new Error(
          `Invalid file type: ${ext}. Allowed types: ${allowedBannerImageFormats.join(', ')}`
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Multi-field banner form upload
 * Used for creating/updating banners with both imageUrl and thumbnailUrl
 * Routes files to different folders based on field name
 */
export const uploadBannerForm = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Route to the correct S3 folder based on the form field name
      let folder = 'banner_images';
      if (file.fieldname === 'imageUrl') {
        folder = 'banner_images';
      } else if (file.fieldname === 'thumbnailUrl') {
        folder = 'banner_thumbnails';
      }

      cb(null, `${folder}/${baseName}-${uniqueSuffix}${ext}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
      });
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!allowedBannerImageFormats.includes(ext)) {
      return cb(
        new Error(
          `Invalid file type: ${ext}. Allowed types: ${allowedBannerImageFormats.join(', ')}`
        )
      );
    }
    cb(null, true);
  },
});
