import CachedImage from '@app/components/Common/CachedImage';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useState, useEffect } from 'react';

interface TautulliCurrentStreamsCardProps {
  stream: {
    session_id: string;
    user: string;
    user_thumb: string;
    title: string;
    grandparent_title: string;
    full_title: string;
    year: number | string;
    grandparent_year: number | string;
    overseerrUrl: string | null;
    userProfileLink: string | null;
    thumb: string | null;
    art: string | null;
    view_offset: number;
    duration: number;
    last_update: number;
    playback_rate: number;
    state: string;
  };
}

const TautulliCurrentStreamsCardPlaceholder = () => (
  <div className="relative w-72 animate-pulse rounded-xl bg-gray-700 p-4 sm:w-96">
    <div className="w-20 sm:w-28">
      <div className="w-full" style={{ paddingBottom: '150%' }} />
    </div>
  </div>
);

const TautulliCurrentStreamsCard = ({ stream }: TautulliCurrentStreamsCardProps) => {
  const intl = useIntl();
  const [currentProgress, setCurrentProgress] = useState(stream.view_offset);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateProgress = () => {
      const now = Date.now();
      const elapsedTime = (now - stream.last_update) * stream.playback_rate;
      const newProgress = stream.view_offset + elapsedTime;
      setCurrentProgress(Math.min(newProgress, stream.duration));
    };

    if (stream.state === 'playing') {
      updateProgress();
      intervalId = setInterval(updateProgress, 1000);
    } else {
      setCurrentProgress(stream.view_offset);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [stream]);

  const formattedProgress = `${formatDuration(currentProgress / 1000)} / ${formatDuration(
    stream.duration / 1000
  )}`;

  const stateLabel = intl.formatMessage(
    {
      id: `components.TautulliCurrentStreamsCard.state.${stream.state}`,
      defaultMessage: stream.state === 'playing' ? 'Playing' : 'Paused',
    }
  );

  if (!stream) {
    return <TautulliCurrentStreamsCardPlaceholder />;
  }

  return (
    <div className="relative flex w-72 overflow-hidden rounded-xl bg-gray-800 p-4 text-gray-400 shadow ring-1 ring-gray-700 sm:w-96">
      <div className="absolute inset-0 z-0">
        {stream.art && (
          <CachedImage
            alt="Background Image"
            src={stream.art}
            layout="fill"
            objectFit="cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(17, 24, 39, 0.47) 0%, rgba(17, 24, 39, 1) 75%)',
          }}
        />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col pr-4">
        <div className="hidden text-xs font-medium text-white sm:flex">
          {intl.formatMessage(
            {
              id: 'components.TautulliCurrentStreamsCard.year',
              defaultMessage: '{year}',
            },
            { year: stream.year }
          )}
        </div>

        <div className="overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-bold text-white sm:text-lg hover:underline">
          {stream.overseerrUrl ? (
            <Link href={stream.overseerrUrl}>
              <a>{stream.full_title}</a>
            </Link>
          ) : (
            stream.full_title
          )}
        </div>
        <div className="card-field">
          {stream.userProfileLink ? (
            <Link href={stream.userProfileLink}>
              <a className="group flex items-center">
                {stream.user_thumb && (
                  <img
                    src={stream.user_thumb}
                    alt={`${stream.user}'s avatar`}
                    className="avatar-sm object-cover"
                  />
                )}
                <span className="truncate font-semibold group-hover:text-white group-hover:underline">
                  {stream.user}
                </span>
              </a>
            </Link>
          ) : (
            <div className="group flex items-center">
              {stream.user_thumb && (
                <img
                  src={stream.user_thumb}
                  alt={`${stream.user}'s avatar`}
                  className="avatar-sm object-cover"
                />
              )}
              <span className="truncate font-semibold group-hover:text-white group-hover:underline">
                {stream.user}
              </span>
            </div>
          )}
        </div>

        <div className="text-xs font-medium text-white mt-2">
          {intl.formatMessage(
            {
              id: 'components.TautulliCurrentStreamsCard.progress',
              defaultMessage: '{progress}',
            },
            { progress: formattedProgress }
          )}
        </div>

        <div className="text-xs font-medium text-white mt-1">
          {intl.formatMessage(
            {
              id: 'components.TautulliCurrentStreamsCard.state',
              defaultMessage: '{state}',
            },
            { state: stateLabel }
          )}
        </div>
      </div>

      <div className="transform-gpu scale-100 w-20 flex-shrink-0 overflow-hidden rounded-md shadow-sm transition duration-300 hover:scale-105 hover:shadow-md sm:w-28">
        {stream.overseerrUrl ? (
          <Link href={stream.overseerrUrl}>
            <a>
              {stream.thumb && (
                <CachedImage
                  src={stream.thumb}
                  alt="Poster"
                  layout="responsive"
                  width={600}
                  height={900}
                />
              )}
            </a>
          </Link>
        ) : (
          stream.thumb && (
            <CachedImage
              src={stream.thumb}
              alt="Poster"
              layout="responsive"
              width={600}
              height={900}
            />
          )
        )}
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else {
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}

TautulliCurrentStreamsCard.Placeholder = TautulliCurrentStreamsCardPlaceholder;
export default TautulliCurrentStreamsCard;
