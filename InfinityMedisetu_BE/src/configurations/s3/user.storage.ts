import multer from 'multer';
import { createS3Storage } from './client';

const profilePicturesStorage = createS3Storage('profile_pictures', [
  'jpg',
  'png',
  'jpeg',
  'svg',
  'webp',
]);

export const uploadProfilePicture = multer({ storage: profilePicturesStorage });
