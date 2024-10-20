import CachedImage from '@app/components/Common/CachedImage';
import Link from 'next/link';
import { useIntl } from 'react-intl';
import { useState, useEffect } from 'react';

interface TautulliTopUsersCardProps {
  session: {
    user: string;
    user_thumb: string;
    total_plays: number;
    total_duration_seconds: number;
    last_play: string;
    thumb: string | null;
    art: string | null;
    last_media: {
      title: string;
      grandparent_title: string;
      grandchild_title: string;
      year: number | string;
      grandparent_year: number | string;
      overseerrUrl: string | null;
    };
    userProfileLink: string | null;
  };
}

const TautulliTopUsersCardPlaceholder = () => (
  <div className="relative w-72 animate-pulse rounded-xl bg-gray-700 p-4 sm:w-96">
    <div className="w-20 sm:w-28">
      <div className="w-full" style={{ paddingBottom: '150%' }} />
    </div>
  </div>
);

const formatDuration = (totalSeconds: number, intl: any) => {
  if (!totalSeconds || isNaN(totalSeconds)) return '0 min';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return intl.formatMessage(
      { id: 'components.TautulliTopUsersCard.days', defaultMessage: '{days} days' },
      { days }
    );
  } else if (hours > 0) {
    return intl.formatMessage(
      { id: 'components.TautulliTopUsersCard.hours', defaultMessage: '{hours} hr' },
      { hours }
    );
  } else {
    return intl.formatMessage(
      { id: 'components.TautulliTopUsersCard.minutes', defaultMessage: '{minutes} min' },
      { minutes }
    );
  }
};

const formatDateAndTime = (dateString: string, locale: string) => {
  const date = new Date(dateString);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return { lastPlayDate: formattedDate, lastPlayTime: formattedTime };
};

const TautulliTopUsersCard = ({ session }: TautulliTopUsersCardProps) => {
  const intl = useIntl();
  const [playDuration, setPlayDuration] = useState(
    formatDuration(session.total_duration_seconds, intl)
  );

  useEffect(() => {
    setPlayDuration(formatDuration(session.total_duration_seconds, intl));
  }, [session.total_duration_seconds, intl]);

  if (!session) {
    return <TautulliTopUsersCardPlaceholder />;
  }

  const { lastPlayDate, lastPlayTime } = formatDateAndTime(
    session.last_play,
    intl.locale
  );

  return (
    <div className="relative flex w-72 overflow-hidden rounded-xl bg-gray-800 p-4 text-gray-400 shadow ring-1 ring-gray-700 sm:w-96">
      <div className="absolute inset-0 z-0">
        {session.art && (
          <CachedImage
            alt="Background Image"
            src={session.art}
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
        <div className="card-field">
          {session.userProfileLink ? (
            <Link href={session.userProfileLink}>
              <a className="group flex items-center">
                {session.user_thumb && (
                  <img
                    src={session.user_thumb}
                    alt={`${session.user}'s avatar`}
                    className="avatar-sm object-cover"
                  />
                )}
                <span className="truncate font-semibold group-hover:text-white group-hover:underline">
                  {session.user}
                </span>
              </a>
            </Link>
          ) : (
            <div className="group flex items-center">
              {session.user_thumb && (
                <img
                  src={session.user_thumb}
                  alt={`${session.user}'s avatar`}
                  className="avatar-sm object-cover"
                />
              )}
              <span className="truncate font-semibold group-hover:text-white group-hover:underline">
                {session.user}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-bold text-white sm:text-lg">
          {intl.formatMessage(
            { id: 'components.TautulliTopUsersCard.plays', defaultMessage: '{plays} plays' },
            { plays: session.total_plays }
          )}{' '}
          / {playDuration}
        </div>

        <div className="text-xs font-medium text-white overflow-hidden overflow-ellipsis whitespace-nowrap mt-2">
          {intl.formatMessage(
            {
              id: 'components.TautulliTopUsersCard.lastPlay',
              defaultMessage: 'Last play: {lastPlayDate} at {lastPlayTime}',
            },
            { lastPlayDate, lastPlayTime }
          )}
        </div>

        <div className="text-xs font-medium text-white overflow-hidden overflow-ellipsis whitespace-nowrap mt-2">
          {intl.formatMessage(
            {
              id: 'components.TautulliTopUsersCard.lastMedia',
              defaultMessage: 'Last media: ',
            }
          )}
          {session.last_media.overseerrUrl ? (
            <Link href={session.last_media.overseerrUrl}>
              <a className="text-white hover:underline">
                {session.last_media.title}
              </a>
            </Link>
          ) : (
            <span>{session.last_media.title}</span>
          )}
        </div>
      </div>
    </div>
  );
};

TautulliTopUsersCard.Placeholder = TautulliTopUsersCardPlaceholder;
export default TautulliTopUsersCard;
