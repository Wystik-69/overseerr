import CachedImage from '@app/components/Common/CachedImage';
import { useIntl } from 'react-intl';
import { useState, useEffect } from 'react';

interface PlexStreamsCardProps {
  session: {
    username: string;
    title: string;
    posterUrl: string;
    backgroundUrl: string;
    currentTime: string;
    totalTime: string;
    state: string;
    sessionId?: string;
    mediaType: string;
    releaseYear: string;
    avatarUrl: string;
  };
}

const PlexStreamsCardPlaceholder = () => {
  return (
    <div className="relative w-72 animate-pulse rounded-xl bg-gray-700 p-4 sm:w-96">
      <div className="w-20 sm:w-28">
        <div className="w-full" style={{ paddingBottom: '150%' }} />
      </div>
    </div>
  );
};

const PlexStreamsCard = ({ session }: PlexStreamsCardProps) => {
  const intl = useIntl();
  const [dynamicCurrentTime, setDynamicCurrentTime] = useState(
    session.currentTime
  );
  const [isPlaying, setIsPlaying] = useState(
    session.state.toLowerCase() === 'playing'
  );

  const timeToSeconds = (time: string) => {
    const parts = time.split(':');
    const [hours, minutes, seconds] =
      parts.length === 3 ? parts.map(Number) : [0, ...parts.map(Number)];
    return hours * 3600 + minutes * 60 + seconds;
  };

  const secondsToTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${
      hours > 0 ? `${hours}:` : ''
    }${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    let currentSeconds = timeToSeconds(dynamicCurrentTime);
    const interval = setInterval(() => {
      if (isPlaying) {
        currentSeconds += 1;
        setDynamicCurrentTime(secondsToTime(currentSeconds));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dynamicCurrentTime, isPlaying]);

  useEffect(() => {
    setIsPlaying(session.state.toLowerCase() === 'playing');
  }, [session.state]);

  const playingClass =
    'mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-green-500 bg-opacity-80 border border-green-500 !text-green-100 hover:bg-green-500 hover:bg-opacity-100 overflow-hidden';

  const pausedClass =
    'mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap transition !no-underline bg-indigo-500 bg-opacity-80 border border-indigo-500 !text-indigo-100 hover:bg-indigo-500 hover:bg-opacity-100 overflow-hidden';

  if (!session) {
    return <PlexStreamsCardPlaceholder />;
  }

  return (
    <div className="relative flex w-72 overflow-hidden rounded-xl bg-gray-800 p-4 text-gray-400 shadow ring-1 ring-gray-700 sm:w-96">
      <div className="absolute inset-0 z-0">
        <CachedImage
          alt={`${session.title} Background`}
          src={session.backgroundUrl} 
          layout="fill"
          objectFit="cover"
        />
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
          {session.releaseYear}
        </div>

        <div className="overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-bold text-white sm:text-lg">
          {session.title}
        </div>

        <div className="mt-2 flex items-center">
          {session.avatarUrl && (
            <img
              src={session.avatarUrl}
              alt={`${session.username}'s avatar`}
              className="avatar-sm mr-2"
            />
          )}
          <div className="text-sm font-medium text-gray-300">
            {session.username}
          </div>
        </div>
        <div className="mt-2 text-sm sm:mt-1">
          <div className="flex items-center">
            <span
              className={
                session.state.toLowerCase() === 'playing'
                  ? playingClass
                  : pausedClass
              }
            >
              {intl.formatMessage({
                id:
                  session.state.toLowerCase() === 'playing'
                    ? 'components.PlexStreamsCard.statePlaying'
                    : 'components.PlexStreamsCard.statePaused',
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center">
            <span className="mr-2 font-bold">
              {dynamicCurrentTime !== 'NaN:NaN'
                ? dynamicCurrentTime
                : session.currentTime}{' '}
              / {session.totalTime}
            </span>
          </div>
        </div>
      </div>
      <div className="transform-gpu scale-100 w-20 flex-shrink-0 overflow-hidden rounded-md shadow-sm transition duration-300 hover:scale-105 hover:shadow-md sm:w-28">
        <CachedImage
          src={session.posterUrl}
          alt="Poster"
          layout="responsive"
          width={600}
          height={900}
        />
      </div>
    </div>
  );
};
PlexStreamsCard.Placeholder = PlexStreamsCardPlaceholder;
export default PlexStreamsCard;
