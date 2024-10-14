import { getRepository } from '@server/datasource';
import PlexAPI from 'plex-api';
import { User } from '@server/entity/User';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';
import axios from 'axios';
import xml2js from 'xml2js';

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
          authenticate: (plexApi: any, cb: any) => {
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

      // Map display names to usernames
      const usersArray = usersResult.MediaContainer.User || [];
      const displayNameToUsernameMap: { [key: string]: string } = {};

      usersArray.forEach((user: any) => {
        const username = user.$.username;
        const displayName = user.$.title;
        displayNameToUsernameMap[displayName] = username;
      });

      // Include 'includeUser=1' to get more user details
      const sessions = await plexClient.query('/status/sessions?includeUser=1');

      if (sessions && sessions.MediaContainer && sessions.MediaContainer.Metadata) {
        const activeSessions = sessions.MediaContainer.Metadata;

        let sessionCount = 0;

        for (const session of activeSessions) {
          // Attempt to retrieve the real username
          let sessionUsername = 'Unknown User';

          if (session.User && session.User.title) {
            // This is the display name of the user
            const displayName = session.User.title;

            if (displayName === ownDisplayName) {
              // It's your own session
              sessionUsername = ownUsername;
            } else if (displayNameToUsernameMap[displayName]) {
              // Match the display name to the username
              sessionUsername = displayNameToUsernameMap[displayName];
            } else {
              sessionUsername = displayName; // Fallback to display name
            }
          } else if (session.usernames && session.usernames[0]) {
            // Try accessing 'session.usernames[0]'
            sessionUsername = session.usernames[0];
          }

          const sessionId = session.Session.id;

          if (!sessionUsername || sessionUsername === 'Unknown User') {
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

            logger.warn(
              `Stopped the stream for user with username ${activeUser.plexUsername} due to expired subscription.`
            );

            sessionCount++;
          }
        }

        if (sessionCount > 0) {
          logger.info(`Stopped ${sessionCount} session(s) due to expired or null subscriptions.`);
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
