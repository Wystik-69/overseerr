import { Router, Request, Response } from 'express'; 
import axios from 'axios';
import { isAuthenticated } from '@server/middleware/auth';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';
import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import TheMovieDb from '@server/api/themoviedb';

interface TautulliTopUser {
  user: string;
  user_thumb: string;
  total_plays: number;
  total_duration_seconds: number;
  total_duration: string;
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
  } | null;
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
  const baseUrl = `${protocol}://${hostname}:${port}/api/v2`;

  try {
    const paramsTopUsers = {
      apikey: apiKey,
      cmd: 'get_home_stats',
      stat_id: 'top_users',
      time_range: 30,
      stats_type: 'duration',
      stats_count: 100,
    };

    const responseTopUsers = await axios.get(baseUrl, { params: paramsTopUsers });

    if (
      responseTopUsers.data?.response?.result === 'success' &&
      responseTopUsers.data.response.data?.stat_id === 'top_users' &&
      Array.isArray(responseTopUsers.data.response.data.rows)
    ) {
      const userRepository = getRepository(User);
      const topUsers = responseTopUsers.data.response.data.rows;

      const tmdb = new TheMovieDb();

      const filteredUsers: TautulliTopUser[] = await Promise.all(
        topUsers.map(async (user: any) => {
          const activeUser = await userRepository.findOne({
            where: { plexUsername: user.user },
            select: ['id', 'username', 'plexUsername'],
          });

          const userProfileLink = activeUser ? `/users/${activeUser.id}` : null;

          const paramsHistory = {
            apikey: apiKey,
            cmd: 'get_history',
            user_id: user.user_id,
            order_column: 'date',
            order_dir: 'desc',
            length: 1,
          };

          const responseHistory = await axios.get(baseUrl, { params: paramsHistory });

          let lastMedia: TautulliTopUser['last_media'] | null = null;
          let overseerrUrl: string | null = null;
          let posterUrl: string | null = null;
          let backdropUrl: string | null = null;

          if (
            responseHistory.data?.response?.result === 'success' &&
            responseHistory.data.response.data?.data?.length > 0
          ) {
            const media = responseHistory.data.response.data.data[0];

            const mediaTypeFromTautulli = media.media_type;

            // Ajustement du titre pour les séries
            let lastMediaTitle = media.title;
            if (mediaTypeFromTautulli === 'episode' || mediaTypeFromTautulli === 'show') {
              lastMediaTitle = `${media.grandparent_title} - ${media.title}`;
            }

            lastMedia = {
              title: lastMediaTitle,
              grandparent_title: media.grandparent_title || 'N/A',
              grandchild_title: media.grandchild_title || 'N/A',
              year: media.year || 'N/A',
              grandparent_year: media.grandparent_year || 'N/A',
              overseerrUrl: null,
            };

            try {
              if (mediaTypeFromTautulli === 'movie') {
                const searchResults = await tmdb.searchMovies({
                  query: media.title,
                  year: parseInt(media.year, 10),
                  language: 'fr',
                });

                if (searchResults.results?.length > 0) {
                  const movie = searchResults.results[0];
                  const tmdbId = movie.id;

                  overseerrUrl = `/movie/${tmdbId}`;

                  const movieDetails = await tmdb.getMovie({ movieId: tmdbId, language: 'fr' });

                  if (movieDetails.poster_path) {
                    posterUrl = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${movieDetails.poster_path}`;
                  }
                  if (movieDetails.backdrop_path) {
                    backdropUrl = `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${movieDetails.backdrop_path}`;
                  }
                }
              } else if (mediaTypeFromTautulli === 'episode' || mediaTypeFromTautulli === 'show') {
                const showTitle = media.grandparent_title || media.parent_title || media.title;
                const grandparentYear = media.grandparent_year;

                const yearValue = parseInt(grandparentYear, 10);
                const isValidYear = !isNaN(yearValue) && yearValue > 0;

                const searchParams: any = {
                  query: showTitle,
                  language: 'fr',
                };
                if (isValidYear) {
                  searchParams.year = yearValue;
                }

                let searchResults = await tmdb.searchTvShows(searchParams);

                if (searchResults.results?.length === 0) {
                  delete searchParams.year;
                  searchResults = await tmdb.searchTvShows(searchParams);
                }

                if (searchResults.results?.length > 0) {
                  const tvShow = searchResults.results[0];
                  const tmdbId = tvShow.id;

                  overseerrUrl = `/tv/${tmdbId}`;

                  const tvDetails = await tmdb.getTvShow({ tvId: tmdbId, language: 'fr' });

                  if (tvDetails.poster_path) {
                    posterUrl = `https://image.tmdb.org/t/p/w600_and_h900_bestv2${tvDetails.poster_path}`;
                  }
                  if (tvDetails.backdrop_path) {
                    backdropUrl = `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${tvDetails.backdrop_path}`;
                  }
                }
              }
            } catch (error) {
              logger.error(`Error fetching TMDB data for user ${user.user}: ${error.message}`);
            }

            lastMedia.overseerrUrl = overseerrUrl;
          }

          return {
            user: user.friendly_name || user.user,
            user_thumb: user.user_thumb,
            total_plays: user.total_plays,
            total_duration_seconds: user.total_duration,
            total_duration: convertSecondsToHoursMinutes(user.total_duration),
            last_play: formatUnixTimestamp(user.last_play),
            thumb: posterUrl,
            art: backdropUrl,
            last_media: lastMedia,
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
      logger.error('Unexpected response structure from Tautulli:', responseTopUsers.data);
      return res
        .status(500)
        .json({ error: 'Unexpected response structure from Tautulli API.' });
    }
  } catch (error: any) {
    if (error.response) {
      logger.error(
        `Error fetching data from Tautulli API: ${error.response.status} ${error.response.statusText}`
      );
      logger.error('Error details:', error.response.data);
      return res
        .status(error.response.status)
        .json({ error: 'Error from Tautulli API.', details: error.response.data });
    } else {
      logger.error('Error making request to Tautulli:', error.message);
      return res
        .status(500)
        .json({ error: 'Error making request to Tautulli API.', details: error.message });
    }
  }
});

export default router;
