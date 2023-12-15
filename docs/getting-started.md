# Getting Started

Unconventional Queries is a tiny query builder for the [pg](https://www.npmjs.com/package/pg) library. Perfect for edge workers with size limits, such as [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/limits#worker-size), where every line of code counts. Unlock the utility of your Postgres DB, minimize bloat, and never write a line of SQL manually again!

Getting started is easy. Simply install the package, initialize your client, and execute a query:

## Installation

::: code-group

```[npm]
npm i unconventional-pg-queries
```

```[yarn]
yarn add unconventional-pg-queries
```

```[pnpm]
pnpm add unconventional-pg-queries
```

:::

## Create Client

Each query accepts a [pg client](https://node-postgres.com/apis/client), which it uses to execute the call to your database. Start by initializing and opening a connection from this client:

```ts
import { Client } from 'pg';

const client = new Client({
  host: <host>,
  user: <user>,
  password: <password>,
  database: <database>,
  port: <port>,
  ssl: true
});

await client.connect();
```

## Execute Query

Then pass your client to any of the supported [action methods](./actions/select.md) with a query definition. The example below selects the first row of the `public.users` table.

```ts
import { selectOne, SqlWhereOperator } from 'unconventional-pg-queries';

const response = await selectOne(client, {
    table: 'public.users',
    where: [{ field: 'id', operator: SqlWhereOperator.Eq, value: 1 }]
});
```

That's it! You're now ready to go!