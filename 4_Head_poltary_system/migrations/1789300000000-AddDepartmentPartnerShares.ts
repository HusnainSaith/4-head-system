import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentPartnerShares1789300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE department_partner_shares (
      department_id uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      party_id uuid NOT NULL UNIQUE REFERENCES parties(id) ON DELETE RESTRICT,
      percentage numeric(7,4) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
      updated_by uuid NOT NULL REFERENCES users(id),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (department_id, user_id)
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE department_partner_shares');
  }
}
