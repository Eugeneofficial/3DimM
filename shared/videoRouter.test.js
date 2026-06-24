import { describe, it, expect } from 'vitest';
import {
  extractM3u8FromText,
  isM3u8Content,
  parseMasterPlaylist,
  sanitizeFilename,
  isLikelyM3u8Url,
} from './videoRouter.js';

describe('extractM3u8FromText', () => {
  it('extracts m3u8 URLs from text', () => {
    const text = 'var url = "https://example.com/stream/master.m3u8?token=abc"';
    const result = extractM3u8FromText(text, 'https://example.com');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('master.m3u8');
  });

  it('returns empty array for text without m3u8', () => {
    const result = extractM3u8FromText('Hello world', 'https://example.com');
    expect(result).toEqual([]);
  });

  it('handles relative URLs', () => {
    const text = '"/streams/live.m3u8"';
    const result = extractM3u8FromText(text, 'https://example.com/page');
    expect(result.length).toBe(1);
    expect(result[0]).toBe('https://example.com/streams/live.m3u8');
  });

  it('handles protocol-relative URLs', () => {
    const text = '"//cdn.example.com/video.m3u8"';
    const result = extractM3u8FromText(text, 'https://example.com');
    expect(result.length).toBe(1);
    expect(result[0]).toBe('https://cdn.example.com/video.m3u8');
  });
});

describe('isM3u8Content', () => {
  it('detects EXTM3U header', () => {
    expect(isM3u8Content('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000')).toBe(true);
  });

  it('detects EXT-X- prefix', () => {
    expect(isM3u8Content('#EXT-X-TARGETDURATION:10')).toBe(true);
  });

  it('rejects non-m3u8 content', () => {
    expect(isM3u8Content('Hello world')).toBe(false);
  });

  it('detects XML playlist', () => {
    expect(isM3u8Content('<playlist><media-uri>video.m3u8</media-uri></playlist>')).toBe(true);
  });
});

describe('parseMasterPlaylist', () => {
  it('parses video variants', () => {
    const content = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
360p.m3u8`;
    const variants = parseMasterPlaylist(content);
    expect(variants.length).toBe(2);
    expect(variants[0].resolution).toBe('1280x720');
    expect(variants[0].bandwidth).toBe(1000000);
  });

  it('parses media tracks', () => {
    const content = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,NAME="English",URI="audio_en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000000
720p.m3u8`;
    const variants = parseMasterPlaylist(content);
    expect(variants.length).toBe(2);
    const audio = variants.find((v) => v.url === 'audio_en.m3u8');
    expect(audio).toBeTruthy();
    expect(audio.name).toContain('English');
  });

  it('returns empty for non-playlist content', () => {
    expect(parseMasterPlaylist('Hello world')).toEqual([]);
  });
});

describe('sanitizeFilename', () => {
  it('sanitizes dangerous characters', () => {
    const result = sanitizeFilename('../../etc/passwd', 'fallback.mp4');
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
  });

  it('ensures .mp4 extension', () => {
    const result = sanitizeFilename('video', 'fallback.mp4');
    expect(result).toMatch(/\.mp4$/);
  });

  it('truncates long names', () => {
    const long = 'a'.repeat(200);
    const result = sanitizeFilename(long, 'fallback.mp4');
    expect(result.length).toBeLessThanOrEqual(104);
  });

  it('returns fallback for invalid input', () => {
    expect(sanitizeFilename('', 'fallback.mp4')).toBe('fallback.mp4');
    expect(sanitizeFilename(null, 'fallback.mp4')).toBe('fallback.mp4');
  });
});

describe('isLikelyM3u8Url', () => {
  it('detects m3u8 URLs', () => {
    expect(isLikelyM3u8Url('https://example.com/stream.m3u8')).toBe(true);
    expect(isLikelyM3u8Url('https://example.com/master.m3u8?token=abc')).toBe(true);
  });

  it('rejects non-m3u8 URLs', () => {
    expect(isLikelyM3u8Url('https://example.com/video.mp4')).toBe(false);
    expect(isLikelyM3u8Url('https://example.com/page')).toBe(false);
  });

  it('detects playlist/master URLs', () => {
    expect(isLikelyM3u8Url('https://example.com/playlist')).toBe(true);
    expect(isLikelyM3u8Url('https://example.com/master')).toBe(true);
  });
});
