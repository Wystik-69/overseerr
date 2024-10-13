import { getRepository } from '@server/datasource';
import PlexAPI from 'plex-api';
import { User } from '@server/entity/User';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';

class PlexSubscriptionManager {
  /**
   * Checks active Plex sessions and logs if a user with an expired or null subscription is streaming.
   * If the user's subscription has expired, their Plex stream will be stopped with a message.
   */
  public async checkPlexSubscriptionsStatus(): Promise<void> {
    const userRepository = getRepository(User);

    try {
      // Fetch user with ID 1 to retrieve the Plex token
      const user = await userRepository.findOne({
        where: { id: 1 },
        select: ['id', 'username', 'email', 'plexToken', 'subscriptionStatus'],
      });

      if (!user || !user.plexToken) {
        logger.warn('User with ID 1 or their Plex token not found.');
        return;
      }

      // Use the token for user 1, ensuring it's a string
      const plexToken: string = user.plexToken;

      // Retrieve Plex settings from Overseerr
      const settings = getSettings().plex;

      const plexClient = new PlexAPI({
        hostname: settings.ip,
        port: settings.port,
        token: plexToken,
        https: settings.useSsl,
        authenticator: {
          authenticate: (plexApi, cb) => {
            cb(undefined, plexToken);
          },
        },
        options: {
          identifier: 'Plex Subscriptions Manager',
          product: 'Overseerr',
          deviceName: 'Server',
          platform: 'Node.js',
        },
      });

      // Fetch active Plex sessions
      const sessions = await plexClient.query('/status/sessions');

      if (sessions && sessions.MediaContainer && sessions.MediaContainer.Metadata) {
        const activeSessions = sessions.MediaContainer.Metadata;

        let sessionCount = 0;

        for (const session of activeSessions) {
          // Attempt to retrieve the real username, fallback to display name if not available
          const sessionUsername = session.User?.username || session.User?.title;
          const sessionId = session.Session.id;

          if (!sessionUsername) {
            logger.warn('No username found for the session.');
            continue;
          }

          // Find the user by plexUsername in Overseerr
          const activeUser = await userRepository.findOne({
            where: { plexUsername: sessionUsername },
            select: ['id', 'username', 'email', 'plexUsername', 'subscriptionStatus'],
          });

          if (activeUser && (activeUser.subscriptionStatus === 'Expired' || activeUser.subscriptionStatus === null)) {
            // Get the reason from the settings
            const reason = encodeURIComponent(getSettings().main.plexStopSubscriptionReason);

            // Stop the stream for this user with URL-encoded reason message
            await plexClient.query(`/status/sessions/terminate?sessionId=${sessionId}&reason=${reason}`);

            logger.warn(`Stopped the stream for user with username ${activeUser.plexUsername} due to expired subscription.`);

            sessionCount++;
          }
        }
      }
    } catch (error) {
      // Log the error
      logger.error('Error checking Plex sessions:', error);
    }
  }
}

const plexSubscriptionManager = new PlexSubscriptionManager();
export default plexSubscriptionManager;
