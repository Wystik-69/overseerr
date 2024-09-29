import { getRepository } from '@server/datasource';
import PlexAPI from 'plex-api';
import { User } from '@server/entity/User';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';

class PlexAccountSharingManager {
  /**
   * Checks active Plex sessions and logs if users are sharing their accounts by comparing IP addresses.
   * If the IPs don't match between sessions, both of the user's streams will be terminated with a message about suspicious activity.
   */
  public async checkAccountSharing(): Promise<void> {
    const userRepository = getRepository(User);

    try {
      // Fetch user with ID 1 to retrieve the Plex token
      const user = await userRepository.findOne({
        where: { id: 1 },
        select: ['id', 'username', 'email', 'plexToken'],
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
          identifier: 'Plex Account Sharing Manager',
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
        const userSessions: Record<string, { sessionId: string, ipAddress: string }> = {}; // Store session IDs and IP addresses

        for (const session of activeSessions) {
          const sessionUsername = session?.User?.title;
          const sessionId = session?.Session?.id;
          const sessionIp = session?.Player?.remotePublicAddress;  // Retrieve IP address from the session

          if (!sessionUsername || !sessionIp || !sessionId) {
            continue;
          }

          // Check if the user already has a session running with a different IP
          if (userSessions[sessionUsername] && userSessions[sessionUsername].ipAddress !== sessionIp) {
            // Log suspicious activity
            logger.warn(`Suspicious activity detected for user ${sessionUsername}. IP mismatch: multiple sessions detected with different IPs.`);

            const reason = encodeURIComponent(
              "Activité suspecte détectée. Vos sessions Plex ont été arrêtées en raison d'une tentative de partage de compte."
            );

            // Terminate both sessions (the existing session and the current one)
            const originalSessionId = userSessions[sessionUsername].sessionId;
            await plexClient.query(`/status/sessions/terminate?sessionId=${originalSessionId}&reason=${reason}`);
            await plexClient.query(`/status/sessions/terminate?sessionId=${sessionId}&reason=${reason}`);

            logger.warn(`Stopped both sessions for user ${sessionUsername} due to suspicious activity (IP mismatch).`);

            sessionCount++;
          } else {
            // Store the IP address and session ID for this session
            userSessions[sessionUsername] = {
              sessionId,
              ipAddress: sessionIp,
            };
          }
        }

        // Log the number of users with suspicious activity
        logger.info(`Found ${sessionCount} session(s) with suspicious IP activity.`);
      }
    } catch (error) {
      // Log the error
      logger.error(`Error checking Plex account sharing: ${error.message}`);
    }
  }
}

const plexAccountSharingManager = new PlexAccountSharingManager();
export default plexAccountSharingManager;
