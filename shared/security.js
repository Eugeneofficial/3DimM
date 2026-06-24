function isPrivateIP(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '[::1]') return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (h === '[::ffff:127.0.0.1]' || h === '[::ffff:10.0.0.1]') return true;
  return false;
}

export function assertNotPrivate(urlStr) {
  try {
    const u = new URL(urlStr);
    if (isPrivateIP(u.hostname)) {
      throw new Error('Requests to private/local IPs are not allowed');
    }
  } catch (e) {
    throw e;
  }
}
