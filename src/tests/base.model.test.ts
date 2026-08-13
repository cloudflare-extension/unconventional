import { strict as assert } from 'assert';
import { BaseModel } from '../core/base.model';
import { DB, DBCall, SqlAction } from '../types/db.types';
import { OneOrMany, SqlWhereOperator } from 'unconventional-pg-queries';

class Membership extends BaseModel {
  static override collection = 'user_partner';
  static override schema = {
    indexes: [],
    props: {
      id: { relation: undefined },
      user_id: { relation: undefined },
      removed_at: { relation: undefined },
      connected_at: { relation: undefined }
    }
  };

  user_id!: number;
  removed_at!: string | null;
  connected_at!: string | null;
}

async function main() {
  let capturedQuery: DBCall | null = null;
  const db: DB = {
    fetch: async <R extends object>(query: DBCall): Promise<R | null> => {
      capturedQuery = query;
      return { id: 1, user_id: 42, removed_at: null, connected_at: '2026-08-13T12:00:00.000Z' } as unknown as R;
    },
    raw: async <R extends object>(): Promise<R | null> => null
  };
  Membership.db = db;

  const connectedAt = '2026-08-13T12:00:00.000Z';
  const result = await Membership.updateWhere(
    { connected_at: connectedAt },
    { filter: 'user_id = 42 AND removed_at IS NULL AND connected_at IS NULL' }
  );

  assert.equal(capturedQuery?.action, SqlAction.Update);
  assert.equal(capturedQuery?.type, OneOrMany.Many);
  assert.deepEqual(capturedQuery?.data, { connected_at: connectedAt });
  assert.deepEqual(capturedQuery?.where, [
    { field: 'user_id', jsonPath: [], operator: SqlWhereOperator.Eq, value: '42', andOr: undefined, relationPath: undefined },
    { field: 'removed_at', jsonPath: [], operator: SqlWhereOperator.IsNull, value: null, andOr: 'AND', relationPath: undefined },
    { field: 'connected_at', jsonPath: [], operator: SqlWhereOperator.IsNull, value: null, andOr: 'AND', relationPath: undefined }
  ]);
  assert.equal(result?.length, 1);

  // @ts-expect-error Filtered updates require a filter.
  await assert.rejects(async () => await Membership.updateWhere({ connected_at: connectedAt }));
  console.log('✓ updateWhere applies one patch to all rows matching a required filter');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
