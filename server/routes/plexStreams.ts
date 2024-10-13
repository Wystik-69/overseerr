import { Router, Request, Response } from 'express';
import { getRepository } from '@server/datasource';
import PlexAPI from 'plex-api';
import { User } from '@server/entity/User';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';
import { isAuthenticated } from '@server/middleware/auth';
import axios from 'axios';  // Using axios instead of node-fetch

interface PlexSession {
  User?: { title: string };
  title: string;
  grandparentTitle?: string;
  thumb?: string;
  art?: string;
  grandparentThumb?: string;  // Series-level poster for episodes
  Session?: { id: string };
  Player?: { state: string };
  type: string;
  viewOffset?: number;
  duration?: number;
  year?: number;
}

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? `${hours}:` : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const plexStreamsRoutes = Router();

// Proxy route to serve images from Plex through the server using Axios
plexStreamsRoutes.get('/imageproxy', isAuthenticated(), async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    // URL-encode the incoming `url` parameter to prevent errors
    const encodedUrl = encodeURI(url as string);

    // Fetching image using axios
    const response = await axios.get(encodedUrl, { responseType: 'arraybuffer' });

    // Set caching headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');  // Cache for 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());  // Set expiration to 1 year

    // Send the image data
    res.send(response.data);
  } catch (error) {
    logger.error('Error fetching image from Plex:', error);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
});

plexStreamsRoutes.get(
  '/',
  isAuthenticated(),
  async (req: Request, res: Response) => {
    const userRepository = getRepository(User);

    try {
      const user = await userRepository.findOne({
        where: { id: 1 },
        select: ['id', 'plexToken'],
      });

      if (!user || !user.plexToken) {
        logger.warn('User with ID 1 or their Plex token not found.');
        return res.status(404).json({ error: 'User or Plex token not found' });
      }

      const plexToken: string = user.plexToken;
      const settings = getSettings().plex;

      const plexClient = new PlexAPI({
        hostname: settings.ip,
        port: settings.port,
        token: plexToken,
        https: settings.useSsl,
        authenticator: {
          authenticate: (plexApi: any, cb: any) => {
            cb(undefined, plexToken);
          },
        },
        options: {
          identifier: 'Plex Streams Fetcher',
          product: 'Overseerr',
          deviceName: 'Server',
          platform: 'Node.js',
        },
      });
      
      const sessions = await plexClient.query('/status/sessions');

      if (sessions?.MediaContainer?.Metadata) {
        const activeSessions = await Promise.all(
          sessions.MediaContainer.Metadata.map(async (session: PlexSession) => {
            const playbackPosition = session.viewOffset ? formatTime(session.viewOffset) : 'N/A';
            const totalDuration = session.duration ? formatTime(session.duration) : 'N/A';
            const playbackState = session.Player?.state || 'Unknown';

            let posterUrl = 'Unknown Poster';
            let backgroundUrl = 'Unknown Background';

            if (session.type === 'movie') {
              posterUrl = session.thumb ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(`http://${settings.ip}:${settings.port}${session.thumb}?X-Plex-Token=${plexToken}`)}` : posterUrl;
              backgroundUrl = session.art ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(`http://${settings.ip}:${settings.port}${session.art}?X-Plex-Token=${plexToken}`)}` : backgroundUrl;
            } else if (session.type === 'episode') {
              // Use the `grandparentThumb` for the series poster
              posterUrl = session.grandparentThumb ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(`http://${settings.ip}:${settings.port}${session.grandparentThumb}?X-Plex-Token=${plexToken}`)}` : posterUrl;
              backgroundUrl = session.art ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(`http://${settings.ip}:${settings.port}${session.art}?X-Plex-Token=${plexToken}`)}` : backgroundUrl;
            }

            const user = await userRepository.findOne({ where: { plexUsername: session.User?.title } });
            const avatarUrl = user ? user.avatar : null;

            const title = session.type === 'episode'
              ? session.grandparentTitle || 'Unknown Series'
              : session.title;

            const releaseYear = session.year || 'Unknown Year';

            return {
              username: session.User?.title || 'Unknown',
              title,
              sessionId: session.Session?.id,
              mediaType: session.type,
              state: playbackState,
              currentTime: playbackPosition,
              totalTime: totalDuration,
              posterUrl,
              backgroundUrl,
              avatarUrl,
              releaseYear
            };
          })
        );

        return res.status(200).json({ sessions: activeSessions });
      } else {
        return res.status(200).json({ sessions: [] });
      }
    } catch (error) {
      logger.error('Error retrieving Plex sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch Plex sessions' });
    }
  }
);

export default plexStreamsRoutes;
