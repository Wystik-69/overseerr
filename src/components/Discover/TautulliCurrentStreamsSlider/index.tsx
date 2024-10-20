import Slider from '@app/components/Slider';
import TautulliCurrentStreamCard from '@app/components/TautulliCurrentStreamsCard';
import { useUser } from '@app/hooks/useUser';
import { defineMessages, useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages({
  currentStreams: 'Currently Streaming',
  emptyCurrentStreams:
    'No active streams at the moment.',
  tautulliNotConfigured:
    'Please link Overseerr to Tautulli in order to show current streams.',
  errorLoadingCurrentStreams: 'Error loading current streams.',
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TautulliCurrentStreamsSlider = () => {
  const intl = useIntl();
  const { hasPermission } = useUser();
  const { data: streams, error: streamsError } = useSWR<{ streams: Array<any> }>(
    '/api/v1/tautulli/current-streams',
    fetcher,
    { refreshInterval: 10000 }
  );

  return (
    <>
      <div className="slider-header">
        <a className="slider-title">
          <span>{intl.formatMessage(messages.currentStreams)}</span>
        </a>
      </div>

      {streamsError?.status === 500 && (
        <div className="mt-16 mb-16 text-center font-medium text-gray-400">
          {intl.formatMessage(messages.tautulliNotConfigured)}
        </div>
      )}

      {!streamsError && (
        <Slider
          sliderKey="tautullicurrentstreams"
          isLoading={!streams && !streamsError}
          isEmpty={!!streams && streams.streams.length === 0}
          emptyMessage={intl.formatMessage(messages.emptyCurrentStreams)}
          items={(streams?.streams ?? []).map((stream) => (
            <TautulliCurrentStreamCard
              key={`tautulli-current-streams-slider-item-${stream.session_id}`}
              stream={stream}
            />
          ))}
          placeholder={<TautulliCurrentStreamCard.Placeholder />}
        />
      )}

      {streamsError && streamsError?.status !== 500 && (
        <div className="mt-16 mb-16 text-center font-medium text-gray-400">
          {intl.formatMessage(messages.errorLoadingCurrentStreams)}
        </div>
      )}
    </>
  );
};

export default TautulliCurrentStreamsSlider;
