import { Router, Request, Response } from 'express';
import { getRepository } from '@server/datasource';
import PlexAPI from 'plex-api';
import { User } from '@server/entity/User';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';
import { isAuthenticated } from '@server/middleware/auth';
import axios from 'axios';
import xml2js from 'xml2js';

interface PlexSession {
  User?: { id?: string; title?: string };
  usernames?: string[];
  title: string;
  grandparentTitle?: string;
  thumb?: string;
  art?: string;
  grandparentThumb?: string;
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
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); 

    // Send the image data
    res.send(response.data);
  } catch (error) {
    logger.error('Error fetching image from Plex:', error);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
});

plexStreamsRoutes.get('/', isAuthenticated(), async (req: Request, res: Response) => {
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
        product: 'YourAppName',
        deviceName: 'Server',
        platform: 'Node.js',
      },
    });

    // Fetch your own Plex account information
    const accountResponse = await plexClient.query('/myplex/account');
    const ownDisplayName = accountResponse.MediaContainer?.title || 'Unknown';
    const ownUsername = accountResponse.MediaContainer?.username || 'Unknown';
    const ownEmail = accountResponse.MediaContainer?.email || 'Unknown Email';

    // Fetch Plex account users (friends or shared users)
    const usersResponse = await axios.get('https://plex.tv/api/users', {
      headers: {
        'X-Plex-Token': plexToken,
      },
    });

    // Parse the XML response
    const parser = new xml2js.Parser();
    const usersResult = await parser.parseStringPromise(usersResponse.data);

    // Map display names to usernames and emails
    const usersArray = usersResult.MediaContainer.User || [];
    const displayNameToUserInfoMap: { [key: string]: { username: string; email: string } } = {};

    usersArray.forEach((user: any) => {
      const username = user.$.username;
      const email = user.$.email;
      const displayName = user.$.title;
      displayNameToUserInfoMap[displayName] = { username, email };
    });

    // Include 'includeUser=1' to get more user details
    const sessions = await plexClient.query('/status/sessions?includeUser=1');

    if (sessions?.MediaContainer?.Metadata) {
      const activeSessions = await Promise.all(
        sessions.MediaContainer.Metadata.map(async (session: PlexSession) => {
          const playbackPosition = session.viewOffset ? formatTime(session.viewOffset) : 'N/A';
          const totalDuration = session.duration ? formatTime(session.duration) : 'N/A';
          const playbackState = session.Player?.state || 'Unknown';

          // Attempt to retrieve the username from the session
          let sessionUsername = 'Unknown User';
          let userEmail = 'Unknown Email';

          if (session.User && session.User.title) {
            // This is the display name of the user
            const displayName = session.User.title;

            if (displayName === ownDisplayName) {
              // It's your own session
              sessionUsername = ownUsername;
              userEmail = ownEmail;
            } else if (displayNameToUserInfoMap[displayName]) {
              // Match the display name to the username and email
              sessionUsername = displayNameToUserInfoMap[displayName].username;
              userEmail = displayNameToUserInfoMap[displayName].email;
            } else {
              sessionUsername = displayName; // Fallback to display name
            }
          } else if (session.usernames && session.usernames[0]) {
            // Try accessing 'session.usernames[0]'
            sessionUsername = session.usernames[0];
          }
          // Build poster and background URLs
          let posterUrl = 'Unknown Poster';
          let backgroundUrl = 'Unknown Background';

          if (session.type === 'movie') {
            posterUrl = session.thumb
              ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(
                  `http://${settings.ip}:${settings.port}${session.thumb}?X-Plex-Token=${plexToken}`
                )}`
              : posterUrl;
            backgroundUrl = session.art
              ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(
                  `http://${settings.ip}:${settings.port}${session.art}?X-Plex-Token=${plexToken}`
                )}`
              : backgroundUrl;
          } else if (session.type === 'episode') {
            // Use the `grandparentThumb` for the series poster
            posterUrl = session.grandparentThumb
              ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(
                  `http://${settings.ip}:${settings.port}${session.grandparentThumb}?X-Plex-Token=${plexToken}`
                )}`
              : posterUrl;
            backgroundUrl = session.art
              ? `/api/v1/plexstreams/imageproxy?url=${encodeURIComponent(
                  `http://${settings.ip}:${settings.port}${session.art}?X-Plex-Token=${plexToken}`
                )}`
              : backgroundUrl;
          }

          // Fetch user entity from your database if needed
          const userEntity = await userRepository.findOne({
            where: { plexUsername: sessionUsername },
          });
          const avatarUrl = userEntity ? userEntity.avatar : null;

          const title =
            session.type === 'episode' ? session.grandparentTitle || 'Unknown Series' : session.title;

          const releaseYear = session.year || 'Unknown Year';

          return {
            username: sessionUsername,
            email: userEmail,
            title,
            sessionId: session.Session?.id,
            mediaType: session.type,
            state: playbackState,
            currentTime: playbackPosition,
            totalTime: totalDuration,
            posterUrl,
            backgroundUrl,
            avatarUrl,
            releaseYear,
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
});

export default plexStreamsRoutes;