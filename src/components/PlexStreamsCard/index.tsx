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

const PlexStreamsCard = ({ session }: PlexStreamsCardProps) => {
  const intl = useIntl();
  const [dynamicCurrentTime, setDynamicCurrentTime] = useState(session.currentTime);
  const [isPlaying, setIsPlaying] = useState(session.state.toLowerCase() === 'playing');

  const timeToSeconds = (time: string) => {
    const parts = time.split(':');
    const [hours, minutes, seconds] = parts.length === 3 ? parts.map(Number) : [0, ...parts.map(Number)];
    return hours * 3600 + minutes * 60 + seconds;
  };

  const secondsToTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours > 0 ? `${hours}:` : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
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

  const capitalizeFirstLetter = (state: string) => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <div className="relative flex w-72 sm:w-96 overflow-hidden rounded-xl bg-gray-800 p-4 text-gray-400 shadow ring-1 ring-gray-700">
      <div className="absolute inset-0 z-0">
        {/* Using CachedImage to fetch background image from the proxy URL */}
        <CachedImage
          alt={`${session.title} Background`}
          src={session.backgroundUrl}  // This will be the proxied URL from the API
          layout="fill"
          objectFit="cover"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(17, 24, 39, 0.47) 0%, rgba(17, 24, 39, 1) 75%)' }}
        />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col pr-4">
        <div className="hidden text-xs font-medium text-white sm:flex">
          {session.releaseYear}
        </div>

        <div className="overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-bold text-white sm:text-lg">
          {session.title}
        </div>

        <div className="flex items-center mt-2">
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

        <div className="mt-2 flex items-center text-sm sm:mt-1">
          <span className="mr-2 font-bold">
            {intl.formatMessage({
              id: session.state.toLowerCase() === 'playing' 
                ? 'components.PlexStreamsCard.statePlaying' 
                : 'components.PlexStreamsCard.statePaused',
            })} - {dynamicCurrentTime !== 'NaN:NaN' ? dynamicCurrentTime : session.currentTime} / {session.totalTime}
          </span>
        </div>
      </div>
      <div className="w-20 flex-shrink-0 scale-100 transform-gpu cursor-pointer overflow-hidden rounded-md shadow-sm transition duration-300 hover:scale-105 hover:shadow-md sm:w-28">
        <div className="block overflow-hidden rounded-md shadow-sm transition duration-300 hover:scale-105 hover:shadow-md">
            <CachedImage
              src={session.posterUrl}  // This will be the proxied URL from the API
              alt="Poster"
              layout="responsive"
              width={600}
              height={900}
              style={{ position: 'absolute', inset: '0px', boxSizing: 'border-box', padding: '0px', border: 'none', margin: 'auto', display: 'block', width: '0px', height: '0px', minWidth: '100%', maxWidth: '100%', minHeight: '100%', maxHeight: '100%' }}
            />
        </div>
      </div>
    </div>
  );
};

export default PlexStreamsCard;
