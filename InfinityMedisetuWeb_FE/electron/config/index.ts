import { app } from 'electron';
import path from 'path';

const isDev = !app.isPackaged;

export default {
  isDev,
  dbPath: path.join(app.getPath('userData'), 'database', 'medisetu.sqlite'),
};
