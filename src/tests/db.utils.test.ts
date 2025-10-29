import { getWhere } from '../utils/db.utils';
import { BaseModel } from '../core/base.model';
import { AndOr, SqlWhereOperator } from 'unconventional-pg-queries';

// Create a mock test model
class TestModel extends BaseModel {
  static override collection = 'test_collection';
  static override idField = 'id';
  static override schema = {
    indexes: [],
    props: {
      id: { relation: undefined },
      name: { relation: undefined },
      age: { relation: undefined },
      city: { relation: undefined },
      email: { relation: undefined },
      status: { relation: undefined }
    }
  };

  name!: string;
  age!: number;
  city!: string;
  email!: string;
  status!: string;
}

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(description: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${description}`);
  } catch (error) {
    failCount++;
    console.error(`✗ ${description}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  if (actualStr !== expectedStr) {
    throw new Error(
      `${message || 'Assertion failed'}\nExpected:\n${expectedStr}\nActual:\n${actualStr}`
    );
  }
}

function assertThrows(fn: () => void, message?: string) {
  try {
    fn();
    throw new Error(message || 'Expected function to throw but it did not');
  } catch (error) {
    // Expected to throw
    if (error instanceof Error && error.message.startsWith('Expected function to throw')) {
      throw error;
    }
  }
}

// Run tests
console.log('\nRunning getWhere tests...\n');

// Basic filter tests
test('handles empty filter string', () => {
  const result = getWhere(TestModel, '');
  assertEquals(result, []);
});

test('handles undefined filter string', () => {
  const result = getWhere(TestModel);
  assertEquals(result, []);
});

test('parses simple equality filter', () => {
  const result = getWhere(TestModel, "name = 'Greg'");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'"
    }
  ]);
});

test('parses simple greater than filter', () => {
  const result = getWhere(TestModel, 'age > 25');
  assertEquals(result, [
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '25'
    }
  ]);
});

test('parses IS NULL operator', () => {
  const result = getWhere(TestModel, 'email IS NULL');
  assertEquals(result, [
    {
      field: 'email',
      jsonPath: [],
      operator: SqlWhereOperator.IsNull,
      value: null
    }
  ]);
});

test('parses IS NOT NULL operator', () => {
  const result = getWhere(TestModel, 'email IS NOT NULL');
  assertEquals(result, [
    {
      field: 'email',
      jsonPath: [],
      operator: SqlWhereOperator.IsNotNull,
      value: null
    }
  ]);
});

// AND/OR combination tests
test('parses two filters with AND', () => {
  const result = getWhere(TestModel, "name = 'Greg' AND age > 25");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'"
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '25',
      andOr: AndOr.And
    }
  ]);
});

test('parses two filters with OR', () => {
  const result = getWhere(TestModel, "name = 'Greg' OR name = 'John'");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'"
    },
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'John'",
      andOr: AndOr.Or
    }
  ]);
});

test('parses multiple filters with mixed AND/OR', () => {
  const result = getWhere(TestModel, "name = 'Greg' AND age > 25 OR city = 'NYC'");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'"
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '25',
      andOr: AndOr.And
    },
    {
      field: 'city',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'NYC'",
      andOr: AndOr.Or
    }
  ]);
});

// IN operator tests
test('parses IN operator with single value', () => {
  const result = getWhere(TestModel, "name IN ('Greg')");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.In,
      value: "('Greg')"
    }
  ]);
});

test('parses IN operator with multiple values', () => {
  const result = getWhere(TestModel, "name IN ('Greg','John','Jane')");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.In,
      value: "('Greg','John','Jane')"
    }
  ]);
});

test('parses NOT IN operator', () => {
  const result = getWhere(TestModel, "status NOT IN ('active','pending')");
  assertEquals(result, [
    {
      field: 'status',
      jsonPath: [],
      operator: SqlWhereOperator.NotIn,
      value: "('active','pending')"
    }
  ]);
});

test('parses IN operator with AND', () => {
  const result = getWhere(TestModel, "name IN ('Greg','Lou') AND age > 25");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.In,
      value: "('Greg','Lou')"
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '25',
      andOr: AndOr.And
    }
  ]);
});

// Compound clause tests (parentheses)
test('parses simple compound clause', () => {
  const result = getWhere(TestModel, "(name = 'Greg' OR name = 'John')");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'",
      clauses: [
        {
          field: 'name',
          jsonPath: [],
          operator: SqlWhereOperator.Eq,
          value: "'John'",
          andOr: AndOr.Or
        }
      ]
    }
  ]);
});

test('parses compound clause with AND before it', () => {
  const result = getWhere(TestModel, "city = 'NYC' AND (name = 'Greg' OR name = 'John')");
  assertEquals(result, [
    {
      field: 'city',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'NYC'"
    },
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'",
      andOr: AndOr.And,
      clauses: [
        {
          field: 'name',
          jsonPath: [],
          operator: SqlWhereOperator.Eq,
          value: "'John'",
          andOr: AndOr.Or
        }
      ]
    }
  ]);
});

test('parses compound clause with filter after it', () => {
  const result = getWhere(TestModel, "(name = 'Greg' OR name = 'John') AND age > 18");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'",
      clauses: [
        {
          field: 'name',
          jsonPath: [],
          operator: SqlWhereOperator.Eq,
          value: "'John'",
          andOr: AndOr.Or
        }
      ]
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '18',
      andOr: AndOr.And
    }
  ]);
});

test('parses compound clause with OR inside', () => {
  const result = getWhere(TestModel, "name = 'Greg' AND (age > 25 OR age < 18)");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'"
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '25',
      andOr: AndOr.And,
      clauses: [
        {
          field: 'age',
          jsonPath: [],
          operator: SqlWhereOperator.Lt,
          value: '18',
          andOr: AndOr.Or
        }
      ]
    }
  ]);
});

test('parses nested compound clauses', () => {
  const result = getWhere(TestModel, "city = 'NYC' AND (name = 'Greg' OR (age > 25 AND age < 40))");
  assertEquals(result, [
    {
      field: 'city',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'NYC'"
    },
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Eq,
      value: "'Greg'",
      andOr: AndOr.And,
      clauses: [
        {
          field: 'age',
          jsonPath: [],
          operator: SqlWhereOperator.Gt,
          value: '25',
          andOr: AndOr.Or,
          clauses: [
            {
              field: 'age',
              jsonPath: [],
              operator: SqlWhereOperator.Lt,
              value: '40',
              andOr: AndOr.And
            }
          ]
        }
      ]
    }
  ]);
});

test('parses compound clause containing IN operator', () => {
  const result = getWhere(TestModel, "(name IN ('Greg','Lou') OR name = 'John') AND age > 18");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.In,
      value: "('Greg','Lou')",
      clauses: [
        {
          field: 'name',
          jsonPath: [],
          operator: SqlWhereOperator.Eq,
          value: "'John'",
          andOr: AndOr.Or
        }
      ]
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '18',
      andOr: AndOr.And
    }
  ]);
});

test('parses IN operator followed by compound clause', () => {
  const result = getWhere(TestModel, "name IN ('Greg','Lou') AND (age > 25 OR age < 18)");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.In,
      value: "('Greg','Lou')"
    },
    {
      field: 'age',
      jsonPath: [],
      operator: SqlWhereOperator.Gt,
      value: '25',
      andOr: AndOr.And,
      clauses: [
        {
          field: 'age',
          jsonPath: [],
          operator: SqlWhereOperator.Lt,
          value: '18',
          andOr: AndOr.Or
        }
      ]
    }
  ]);
});

// Operator precedence tests
test('parses LIKE operator', () => {
  const result = getWhere(TestModel, "name LIKE '%Greg%'");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.Like,
      value: "'%Greg%'"
    }
  ]);
});

test('parses NOT LIKE operator (longer operator takes precedence)', () => {
  const result = getWhere(TestModel, "name NOT LIKE '%Greg%'");
  assertEquals(result, [
    {
      field: 'name',
      jsonPath: [],
      operator: SqlWhereOperator.NotLike,
      value: "'%Greg%'"
    }
  ]);
});

// Error handling tests
test('throws error for invalid field', () => {
  assertThrows(() => {
    getWhere(TestModel, "invalidField = 'value'");
  });
});

test('throws error for missing operator', () => {
  assertThrows(() => {
    getWhere(TestModel, "name 'Greg'");
  });
});

test('throws error for unmatched parentheses', () => {
  assertThrows(() => {
    getWhere(TestModel, "(name = 'Greg'");
  });
});

test('throws error for unmatched closing parentheses', () => {
  assertThrows(() => {
    getWhere(TestModel, "name = 'Greg')");
  });
});

// Print summary
console.log(`\n${testCount} tests, ${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
  // @ts-ignore
  process.exit(1);
}