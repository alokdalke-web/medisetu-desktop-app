// import multer from 'multer';
// import multerS3 from 'multer-s3';
// import path from 'path';
// import { s3Client, BUCKET_NAME } from './client';

// // ─── Clinic Logos ───────────────────────────────────────────
// const clinicLogosStorage = multerS3({
//   s3: s3Client,
//   bucket: BUCKET_NAME,
//   key: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const baseName = path.basename(file.originalname, ext);
//     const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
//     cb(null, `clinic_logos/${baseName}-${uniqueSuffix}${ext}`);
//   },
//   contentType: multerS3.AUTO_CONTENT_TYPE,
// });

// export const uploadClinicLogo = multer({ storage: clinicLogosStorage });

// // ─── Clinic Form Upload (clinicLogo + profileImage) ─────────
// // Routes by field name: clinicLogo → clinic_logos/, profileImage → profile_pictures/
// const clinicFormStorage = multerS3({
//   s3: s3Client,
//   bucket: BUCKET_NAME,
//   key: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const baseName = path.basename(file.originalname, ext);
//     const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

//     // Route to the correct S3 folder based on the form field name
//     let folder = 'clinic_uploads';
//     if (file.fieldname === 'clinicLogo') {
//       folder = 'clinic_logos';
//     } else if (file.fieldname === 'profileImage') {
//       folder = 'profile_pictures';
//     }

//     cb(null, `${folder}/${baseName}-${uniqueSuffix}${ext}`);
//   },
//   contentType: multerS3.AUTO_CONTENT_TYPE,
// });

// /**
//  * Multi-field upload for clinic create/update forms.
//  * Routes files to different S3 folders based on field name:
//  *   - clinicLogo    → clinic_logos/
//  *   - profileImage  → profile_pictures/
//  */
// export const uploadClinicForm = multer({ storage: clinicFormStorage });

import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { s3Client, BUCKET_NAME, createS3Storage } from './client';

const clinicLogosStorage = createS3Storage('clinic_logos', [
  'jpg',
  'png',
  'jpeg',
  'svg',
  'webp',
]);

const clinicFormStorage = multerS3({
  s3: s3Client,
  bucket: BUCKET_NAME,
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Route to the correct S3 folder based on the form field name
    let folder = 'clinic_uploads';
    if (file.fieldname === 'clinicLogo') {
      folder = 'clinic_logos';
    } else if (file.fieldname === 'profileImage') {
      folder = 'profile_pictures';
    }

    cb(null, `${folder}/${baseName}-${uniqueSuffix}${ext}`);
    // cb(null, `${folder}/${baseName}${ext}`);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
});

export const uploadClinicLogo = multer({ storage: clinicLogosStorage });
export const uploadClinicForm = multer({ storage: clinicFormStorage });
