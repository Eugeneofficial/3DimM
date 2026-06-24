import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DPlayer from 'dplayer';
import Hls from 'hls.js';
import { colors, radius } from '../theme';

const styles = {
  wrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    border: `1px solid ${colors.borderSoft}`,
    marginTop: '4px',
    position: 'relative',
    backgroundColor: '#000',
  },
  state: {
    padding: '48px',
    textAlign: 'center',
    fontSize: '14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  error: {
    color: colors.danger,
  },
  loading: {
    color: colors.textMuted,
  },
  spinner: {
    width: '22px',
    height: '22px',
    border: `2px solid ${colors.border}`,
    borderTopColor: colors.accent,
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'dimm-spin 0.7s linear infinite',
  },
};

export default function VideoPlayer({ url }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url || !containerRef.current) return;
    setError(null);
    setLoading(true);

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

    try {
      const dp = new DPlayer({
        container: containerRef.current,
        video: {
          url,
          type: 'customHls',
          customType: {
            customHls: function (video) {
              const hls = new Hls({
                enableWorker: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                xhrSetup: (xhr) => {
                  try {
                    xhr.setRequestHeader('Referer', url);
                  } catch {}
                },
              });

              hls.loadSource(proxyUrl);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                video.play().catch(() => {});
              });

              hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      hls.recoverMediaError();
                      break;
                    default:
                      setError('Ошибка воспроизведения: ' + (data.details || 'неизвестная ошибка'));
                      hls.destroy();
                      break;
                  }
                }
              });

              hls.attachMedia(video);
            },
          },
        },
      });

      playerRef.current = dp;
    } catch (err) {
      setError('Ошибка инициализации плеера: ' + err.message);
      setLoading(false);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [url]);

  return (
    <div style={styles.wrapper}>
      {error && (
        <div style={{ ...styles.state, ...styles.error }}>
          <span>⚠</span>
          {error}
        </div>
      )}
      {loading && !error && (
        <div style={{ ...styles.state, ...styles.loading }}>
          <span style={styles.spinner} />
          Загрузка потока…
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

VideoPlayer.propTypes = {
  url: PropTypes.string.isRequired,
};
