import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEqualPartnerShares1789400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE department_partner_shares ADD COLUMN equal_share boolean NOT NULL DEFAULT false');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE department_partner_shares DROP COLUMN equal_share');
  }
}
