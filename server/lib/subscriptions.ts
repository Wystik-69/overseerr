import { getRepository } from '@server/datasource';
import { User } from '@server/entity/User';
import logger from '@server/logger';

class SubscriptionManager {
  /**
   * Checks for expired subscriptions and updates the subscription status for users.
   */
  public async checkExpiredSubscriptions(): Promise<void> {
    const userRepository = getRepository(User);

    // Fetch users with active subscriptions, selecting `username` and `email` fields
    const users = await userRepository.find({
      where: { subscriptionStatus: 'Active' },
      select: ['id', 'username', 'email', 'plexUsername', 'subscriptionStatus'], // Ensure `username` and `email` are selected
    });

    const currentDate = new Date();

    // Loop through the users to check expiration dates
    for (const user of users) {
      if (user.subscriptionExpiration) {
        // Convert the string to a Date object
        const expirationDate = new Date(user.subscriptionExpiration);

        // Check for invalid expiration date
        if (isNaN(expirationDate.getTime())) {
          logger.warn(`Invalid expiration date for user ${user.username}`, {
            label: 'Subscription',
          });
          continue;
        }

        // Check if the subscription has expired
        if (expirationDate < currentDate) {
          // Check if the subscription is still marked as active
          if (user.subscriptionStatus === 'Active') {
            // Update user to expired
            user.subscriptionStatus = 'Expired';

            // Save changes to the database
            await userRepository.save(user);

            // Log the expiration with username and email
            logger.info(
              `${user.plexUsername}'s subscription has expired`,
              { label: 'Subscription' }
            );
          }
        }
      }
    }
  }

  /**
   * Helper method to format Date object to 'yyyy-MM-ddTHH:mm' without seconds.
   * @param date The Date object to format
   * @returns A string formatted as 'yyyy-MM-ddTHH:mm'
   */
  private formatDateToISOWithoutSeconds(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

const subscriptionManager = new SubscriptionManager();
export default subscriptionManager;
