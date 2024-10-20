import { Router, Request, Response } from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import { isAuthenticated } from '@server/middleware/auth';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';
import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';

const imageCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

interface TautulliTopUser {
  user: string;
  user_thumb: string;
  total_plays: number;
  total_duration_seconds: number;
  total_duration: string;
  last_play: string;
  thumb: string | null;
  grandparent_thumb: string | null;
  art: string | null;
  last_media: {
    title: string;
    grandparent_title: string;
    grandchild_title: string;
    year: number | string;
  };
  userProfileLink: string | null;
}

function convertSecondsToHoursMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatUnixTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function buildTautulliImageUrl(path: string, ratingKey: string): string {
  const decodedPath = decodeURIComponent(path);
  const encodedPath = encodeURIComponent(decodedPath);
  const settings = getSettings();
  const tautulliConfig = settings.tautulli;

  return `http://${tautulliConfig.hostname}:${tautulliConfig.port}/pms_image_proxy?img=${encodedPath}&rating_key=${ratingKey}`;
}

function buildImageProxyUrl(path: string, ratingKey: string): string {
  return `/api/v1/tautulli/imageproxy?url=${encodeURIComponent(
    buildTautulliImageUrl(path, ratingKey)
  )}`;
}

const router = Router();

router.get('/top-users', isAuthenticated(), async (req: Request, res: Response) => {
  const settings = getSettings();
  const tautulliConfig = settings.tautulli;

  if (!tautulliConfig) {
    logger.error('Tautulli configuration not found in server settings.');
    return res.status(500).json({ error: 'Tautulli configuration not found.' });
  }

  const { hostname, port, apiKey, useSsl } = tautulliConfig;
  const protocol = useSsl ? 'https' : 'http';
  const url = `${protocol}://${hostname}:${port}/api/v2`;

  const params = {
    apikey: apiKey,
    cmd: 'get_home_stats',
    stat_id: 'top_users',
    time_range: 30,
    stats_type: 'duration',
    stats_count: 100,
  };

  try {
    const response = await axios.get(url, { params });

    if (
      response.data &&
      response.data.response &&
      response.data.response.result === 'success' &&
      response.data.response.data &&
      response.data.response.data.stat_id === 'top_users' &&
      Array.isArray(response.data.response.data.rows)
    ) {
      const userRepository = getRepository(User);
      const users = response.data.response.data.rows;

      const filteredUsers: TautulliTopUser[] = await Promise.all(
        users.map(async (user: any) => {
          const activeUser = await userRepository.findOne({
            where: { plexUsername: user.user },
            select: ['id', 'username', 'plexUsername'],
          });

          const userProfileLink = activeUser ? `/users/${activeUser.id}` : null;

          return {
            user: user.friendly_name || user.user,
            user_thumb: user.user_thumb,
            total_plays: user.total_plays,
            total_duration_seconds: user.total_duration,
            total_duration: convertSecondsToHoursMinutes(user.total_duration),
            last_play: formatUnixTimestamp(user.last_play),
            thumb: user.thumb ? buildImageProxyUrl(user.thumb, user.rating_key) : null,
            grandparent_thumb: user.grandparent_thumb
              ? buildImageProxyUrl(user.grandparent_thumb, user.rating_key)
              : null,
            art: user.art ? buildImageProxyUrl(user.art, user.rating_key) : null,
            last_media: {
              title: user.title,
              grandparent_title: user.grandparent_title || 'N/A',
              grandchild_title: user.grandchild_title || 'N/A',
              year: user.year || 'N/A',
            },
            userProfileLink,
          };
        })
      );

      filteredUsers.sort((a, b) => b.total_duration_seconds - a.total_duration_seconds);

      return res.status(200).json({
        message: 'Top users from the last 30 days (sorted by total duration)',
        users: filteredUsers,
      });
    } else {
      logger.error('Unexpected response structure from Tautulli:', response.data);
      return res.status(500).json({ error: 'Unexpected response structure from Tautulli API.' });
    }
  } catch (error: any) {
    if (error.response) {
      logger.error(`Error fetching data from Tautulli API: ${error.response.status} ${error.response.statusText}`);
      logger.error('Error details:', error.response.data);
      return res.status(error.response.status).json({ error: 'Error from Tautulli API.', details: error.response.data });
    } else {
      logger.error('Error making request to Tautulli:', error.message);
      return res.status(500).json({ error: 'Error making request to Tautulli API.', details: error.message });
    }
  }
});

router.get('/imageproxy', isAuthenticated(), async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(url as string);

    const cachedImage = imageCache.get(decodedUrl);
    if (cachedImage) {
      logger.info(`Serving cached image for: ${decodedUrl}`);
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(cachedImage);
    }

    logger.info(`Fetching image from: ${decodedUrl}`);
    const response = await axios.get(decodedUrl, { responseType: 'arraybuffer' });

    imageCache.set(decodedUrl, response.data);

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Expires', new Date(Date.now() + 86400000).toUTCString());

    res.send(response.data);
  } catch (error) {
    logger.error('Error fetching image from Tautulli:', error);
    return res.status(500).json({ error: 'Failed to fetch image from Tautulli.' });
  }
});

export default router;
