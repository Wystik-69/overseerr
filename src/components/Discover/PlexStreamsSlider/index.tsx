import Slider from '@app/components/Slider';
import PlexStreamsCard from '@app/components/PlexStreamsCard';
import { Permission, useUser } from '@app/hooks/useUser';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages({
  currentlyStreaming: 'Plex Current Streams',
  emptyStreams: 'No active streams found.',
});

const PlexStreamsSlider = () => {
  const intl = useIntl();
  const { hasPermission } = useUser();

  const { data: sessions, error: sessionsError } = useSWR<{ sessions: Array<any> }>(
    '/api/v1/plexstreams',
    { revalidateOnMount: true }
  );

  if (sessions && sessions.sessions.length === 0 && !sessionsError) {
    return null;
  }

  return (
    <>
      <div className="slider-header">
        <a className="slider-title">
          <span>{intl.formatMessage(messages.currentlyStreaming)}</span>
        </a>
      </div>
      <Slider
        sliderKey="plexstreams"
        isLoading={!sessions}
        items={(sessions?.sessions ?? []).map((session) => (
          <PlexStreamsCard
            key={`plex-stream-slider-item-${session.sessionId}`}
            session={session}
          />
        ))}
        placeholder={<PlexStreamsCard.Placeholder />} 
      />

      {sessionsError && (
        <div className="mt-16 mb-16 text-center font-medium text-gray-400">
          {intl.formatMessage({ id: 'Error loading streams.' })}
        </div>
      )}
    </>
  );
};

export default PlexStreamsSlider;
