import Slider from '@app/components/Slider';
import TautulliTopUsersCard from '@app/components/TautulliTopUsersCard';
import { useUser } from '@app/hooks/useUser';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages({
  topUsers: 'Plex Top Users (Last 30 days)',
  emptyTopUsers:
    'Top users will be shown here when enough data is available in Tautulli.',
  tautulliNotConfigured:
    'Please link Overseerr to Tautulli in order to show top users.',
  errorLoadingTopUsers: 'Error loading top users.',
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TautulliTopUsersSlider = () => {
  const intl = useIntl();
  const { hasPermission } = useUser();

  // Fetch the top Tautulli users from your API
  const { data: users, error: usersError } = useSWR<{ users: Array<any> }>(
    '/api/v1/tautulli/top-users',
    fetcher,
    { revalidateOnMount: true }
  );

  return (
    <>
      <div className="slider-header">
        <a className="slider-title">
          <span>{intl.formatMessage(messages.topUsers)}</span>
        </a>
      </div>

      {usersError?.status === 500 && (
        <div className="mt-16 mb-16 text-center font-medium text-gray-400">
          {intl.formatMessage(messages.tautulliNotConfigured)}
        </div>
      )}

      {!usersError && (
        <Slider
          sliderKey="tautullitopusers"
          isLoading={!users && !usersError}
          isEmpty={!!users && users.users.length === 0}
          emptyMessage={intl.formatMessage(messages.emptyTopUsers)}
          items={(users?.users ?? []).map((user) => (
            <TautulliTopUsersCard
              key={`tautulli-top-users-slider-item-${user.user}`}
              session={{
                user: user.user,
                user_thumb: user.user_thumb,
                total_plays: user.total_plays,
                total_duration_seconds: user.total_duration_seconds,
                last_play: user.last_play,
                thumb: user.thumb,
                art: user.art,
                last_media: {
                  title: user.last_media.title,
                  grandparent_title: user.last_media.grandparent_title,
                  grandchild_title: user.last_media.grandchild_title,
                  year: user.last_media.year,
                  grandparent_year: user.last_media.grandparent_year,
                  overseerrUrl: user.last_media.overseerrUrl,
                },
                userProfileLink: user.userProfileLink,
              }}
            />
          ))}
          placeholder={<TautulliTopUsersCard.Placeholder />}
        />
      )}

      {usersError && usersError?.status !== 500 && (
        <div className="mt-16 mb-16 text-center font-medium text-gray-400">
          {intl.formatMessage(messages.errorLoadingTopUsers)}
        </div>
      )}
    </>
  );
};

export default TautulliTopUsersSlider;
