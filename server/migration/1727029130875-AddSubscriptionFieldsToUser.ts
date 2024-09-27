import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionFieldsToUser1727029130875 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subscriptionStatus column
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "subscriptionStatus" varchar;
    `);
    
    // Add subscriptionExpiration column
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "subscriptionExpiration" datetime;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove subscriptionStatus column
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN "subscriptionStatus";
    `);
    
    // Remove subscriptionExpiration column
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN "subscriptionExpiration";
    `);
  }
}
