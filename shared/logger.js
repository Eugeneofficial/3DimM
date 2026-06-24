import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

const LOG_DIR = process.env.DIMM_LOG_DIR || join(process.cwd(), 'logs');

let logFile = null;

async function ensureLogDir() {
  if (logFile) return logFile;
  await mkdir(LOG_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  logFile = join(LOG_DIR, `${date}.log`);
  return logFile;
}

export async function log(level, ...args) {
  const ts = new Date().toISOString();
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const line = `[${ts}] [${level}] ${msg}\n`;
  try {
    const file = await ensureLogDir();
    await appendFile(file, line);
  } catch {}
  if (level === 'error') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}
