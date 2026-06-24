// Thin-обёртка: вся логика живёт в shared/videoRouter.js.
// Этот файл оставлен для обратной совместимости с возможными импортами.
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createVideoRouter } from '../../shared/videoRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const downloadsDir = join(__dirname, '..', 'downloads');
export const videoRouter = createVideoRouter({ downloadsDir });
