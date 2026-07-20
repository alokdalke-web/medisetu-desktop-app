import log from 'electron-log';
import path from 'path';
import { app } from 'electron';

log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');
log.transports.console.level = 'debug';

export default log;
