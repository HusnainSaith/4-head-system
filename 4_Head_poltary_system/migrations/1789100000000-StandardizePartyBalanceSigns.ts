import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforces the application-wide party balance convention:
 *   credit - debit > 0  => payable to the party
 *   credit - debit < 0  => receivable from the party
 *
 * Older brokerage opening balances were posted with the inverse entry type.
 * Rewriting both sides from the authoritative parties.opening_balance value is
 * deterministic and idempotent.
 */
export class StandardizePartyBalanceSigns1789100000000
  implements MigrationInterface
{
  name = 'StandardizePartyBalanceSigns1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE ledger_entries entry
         SET entry_type = CASE
               WHEN party.opening_balance::numeric > 0 THEN 'credit'::ledger_entries_entry_type_enum
               ELSE 'debit'::ledger_entries_entry_type_enum
             END,
             account_id = CASE
               WHEN party.opening_balance::numeric > 0 THEN payable.id
               ELSE receivable.id
             END
        FROM parties party
        JOIN chart_of_accounts payable ON payable.code::text = 'accounts_payable'
        JOIN chart_of_accounts receivable ON receivable.code::text = 'accounts_receivable'
       WHERE entry.source_type = 'opening_balance'
         AND entry.source_id = party.id
         AND entry.party_id = party.id
         AND party.opening_balance::numeric <> 0
    `);

    await queryRunner.query(`
      UPDATE ledger_entries entry
         SET entry_type = CASE
               WHEN party.opening_balance::numeric > 0 THEN 'debit'::ledger_entries_entry_type_enum
               ELSE 'credit'::ledger_entries_entry_type_enum
             END,
             account_id = CASE
               WHEN party.opening_balance::numeric > 0 THEN payable.id
               ELSE receivable.id
             END
        FROM parties party
        JOIN chart_of_accounts payable ON payable.code::text = 'accounts_payable'
        JOIN chart_of_accounts receivable ON receivable.code::text = 'accounts_receivable'
       WHERE entry.source_type = 'opening_balance'
         AND entry.source_id = party.id
         AND entry.party_id IS NULL
         AND party.opening_balance::numeric <> 0
    `);
  }

  public async down(): Promise<void> {
    // This is an intentional semantic data repair. Reversing it would corrupt
    // balances created after deployment, so rollback is deliberately a no-op.
  }
}
