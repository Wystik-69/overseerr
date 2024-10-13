import Slider from '@app/components/Slider';
import PlexStreamsCard from '@app/components/PlexStreamsCard'; // Import your custom PlexStreamsCard
import { Permission, useUser } from '@app/hooks/useUser';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import { defineMessages, useIntl } from 'react-intl';
import Link from 'next/link';
import useSWR from 'swr';

const messages = defineMessages({
  currentlyStreaming: 'Plex Current Streams',
  emptyStreams:
    'No active streams found.',
});

const PlexStreamsSlider = () => {
  const intl = useIntl();
  const { hasPermission } = useUser();

  // Fetch the active Plex streams from your API
  const { data: sessions, error: sessionsError } = useSWR<{ sessions: Array<any> }>(
    '/api/v1/plexstreams', // Your custom API endpoint for Plex streams
    { revalidateOnMount: true }
  );

  // Check if the user has the required permissions
  if (!hasPermission([Permission.MANAGE_REQUESTS, Permission.RECENT_VIEW], { type: 'or' })) {
    return null;
  }

  return (
    <>
      <div className="slider-header">
          <a className="slider-title">
            <span>{intl.formatMessage(messages.currentlyStreaming)}</span>
          </a>
      </div>

      {/* Render Slider component */}
      <Slider
        sliderKey="plexstreams"
        isLoading={!sessions && !sessionsError}
        isEmpty={!!sessions && sessions.sessions.length === 0}
        emptyMessage={intl.formatMessage(messages.emptyStreams)}
        items={(sessions?.sessions ?? []).map((session) => (
          <PlexStreamsCard
            key={`plex-stream-slider-item-${session.sessionId}`}
            session={session} // Pass the session data to PlexStreamsCard
          />
        ))}
      />

      {/* Error handling */}
      {sessionsError && (
        <div className="mt-16 mb-16 text-center font-medium text-gray-400">
          {intl.formatMessage({ id: 'Error loading streams.' })}
        </div>
      )}
    </>
  );
};

export default PlexStreamsSlider;
