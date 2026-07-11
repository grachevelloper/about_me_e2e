import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'files');

export const uploadFileNames = {
  jpeg: 'sample.jpg',
  png: 'sample.png',
  webp: 'sample.webp',
  text: 'sample.txt',
  pdf: 'sample.pdf',
  gif: 'sample.gif',
};

export const uploadFiles = {
  jpeg: {
    name: uploadFileNames.jpeg,
    mimeType: 'image/jpeg',
    path: path.join(filesDir, uploadFileNames.jpeg),
  },
  png: {
    name: uploadFileNames.png,
    mimeType: 'image/png',
    path: path.join(filesDir, uploadFileNames.png),
  },
  webp: {
    name: uploadFileNames.webp,
    mimeType: 'image/webp',
    path: path.join(filesDir, uploadFileNames.webp),
  },
  text: {
    name: uploadFileNames.text,
    mimeType: 'text/plain',
    path: path.join(filesDir, uploadFileNames.text),
  },
  pdf: {
    name: uploadFileNames.pdf,
    mimeType: 'application/pdf',
    path: path.join(filesDir, uploadFileNames.pdf),
  },
  gif: {
    name: uploadFileNames.gif,
    mimeType: 'image/gif',
    path: path.join(filesDir, uploadFileNames.gif),
  },
} as const;

export type UploadFile = (typeof uploadFiles)[keyof typeof uploadFiles];
