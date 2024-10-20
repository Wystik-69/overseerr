import type DiscoverSlider from '@server/entity/DiscoverSlider';

export enum DiscoverSliderType {
  TAUTULLI_TOP_USERS = 1,
  RECENTLY_ADDED,
  RECENT_REQUESTS,
  TAUTULLI_CURRENT_STREAMS,
  PLEX_WATCHLIST,
  TRENDING,
  POPULAR_MOVIES,
  MOVIE_GENRES,
  UPCOMING_MOVIES,
  STUDIOS,
  POPULAR_TV,
  TV_GENRES,
  UPCOMING_TV,
  NETWORKS,
  TMDB_MOVIE_KEYWORD,
  TMDB_MOVIE_GENRE,
  TMDB_TV_KEYWORD,
  TMDB_TV_GENRE,
  TMDB_SEARCH,
  TMDB_STUDIO,
  TMDB_NETWORK,
  TMDB_MOVIE_STREAMING_SERVICES,
  TMDB_TV_STREAMING_SERVICES,
}

export const defaultSliders: Partial<DiscoverSlider>[] = [
  {
    type: DiscoverSliderType.TAUTULLI_TOP_USERS,
    enabled: true,
    isBuiltIn: true,
    order: 0,
  },
  {
    type: DiscoverSliderType.RECENTLY_ADDED,
    enabled: true,
    isBuiltIn: true,
    order: 1,
  },
  {
    type: DiscoverSliderType.RECENTLY_ADDED,
    enabled: true,
    isBuiltIn: true,
    order: 2,
  },
  {
    type: DiscoverSliderType.RECENT_REQUESTS,
    enabled: true,
    isBuiltIn: true,
    order: 3,
  },
  {
    type: DiscoverSliderType.TAUTULLI_CURRENT_STREAMS,
    enabled: true,
    isBuiltIn: true,
    order: 4,
  },
  {
    type: DiscoverSliderType.PLEX_WATCHLIST,
    enabled: true,
    isBuiltIn: true,
    order: 5,
  },
  {
    type: DiscoverSliderType.TRENDING,
    enabled: true,
    isBuiltIn: true,
    order: 6,
  },
  {
    type: DiscoverSliderType.POPULAR_MOVIES,
    enabled: true,
    isBuiltIn: true,
    order: 7,
  },
  {
    type: DiscoverSliderType.MOVIE_GENRES,
    enabled: true,
    isBuiltIn: true,
    order: 8,
  },
  {
    type: DiscoverSliderType.UPCOMING_MOVIES,
    enabled: true,
    isBuiltIn: true,
    order: 9,
  },
  {
    type: DiscoverSliderType.STUDIOS,
    enabled: true,
    isBuiltIn: true,
    order: 10,
  },
  {
    type: DiscoverSliderType.POPULAR_TV,
    enabled: true,
    isBuiltIn: true,
    order: 11,
  },
  {
    type: DiscoverSliderType.TV_GENRES,
    enabled: true,
    isBuiltIn: true,
    order: 12,
  },
  {
    type: DiscoverSliderType.UPCOMING_TV,
    enabled: true,
    isBuiltIn: true,
    order: 13,
  },
  {
    type: DiscoverSliderType.NETWORKS,
    enabled: true,
    isBuiltIn: true,
    order: 14,
  },
];
