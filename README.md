# Unconventional

> A complete backend framework built on Cloudflare Workers/Pages and Hono

[![npm version](https://img.shields.io/npm/v/unconventional)](https://www.npmjs.com/package/unconventional)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Unconventional** is a powerful, production-ready backend framework designed for Cloudflare Workers and Pages. It provides a complete set of tools for building RESTful APIs with minimal boilerplate, including automatic CRUD operations, database management, caching, security features, and more.

## ✨ Features

- 🚀 **Complete CRUD Operations** - Automatic REST endpoints for all your models
- 🗄️ **PostgreSQL Integration** - Built-in support via `unconventional-pg-queries`
- 🎨 **Decorator-Based Models** - Define models with `@prop`, `@index`, and `@timestamp` decorators
- ⏰ **Automatic Timestamps** - Built-in `createdAt` and `updatedAt` management
- 💾 **Cloudflare KV Caching** - Intelligent caching layer with automatic invalidation
- 🔒 **Security First** - IDOR protection and private field masking out of the box
- 🔗 **Relationship Support** - HasOne, HasMany, BelongsTo, and ManyToMany relations
- 🛡️ **Middleware Support** - Extensible middleware system for authentication and more
- 📊 **Advanced Querying** - Pagination, filtering, sorting, and query expansion
- 🆔 **Flexible IDs** - Support for both numeric IDs and UUIDs
- 🌐 **CORS Ready** - Pre-configured CORS with sensible defaults
- ⚡ **Edge Optimized** - Built for Cloudflare's edge network

## 📦 Installation

```bash
npm install unconventional
```

### Peer Dependencies

Unconventional requires the following peer dependencies:

```bash
npm install hono@^4 unconventional-pg-queries@^1.6.0
```

**Note:** TypeScript is required for this package.

## 🚀 Quick Start

### 1. Define a Model

```typescript
import { BaseModel, prop, timestamp } from 'unconventional';

@timestamp()
export class User extends BaseModel {
  public static collection = 'users';
  public static db: DB;

  @prop({ required: true, unique: true })
  public email!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ private: true })
  public passwordHash?: string;
}
```

### 2. Create a Controller

```typescript
import { AbstractBaseController } from 'unconventional';
import { User } from './models/user';

export class UserController extends AbstractBaseController<typeof User> {
  constructor() {
    super(User);
  }

  protected async maskPrivateFields(req: RequestContext, response: User | User[]): Promise<void> {
    User.maskPrivate(response);
  }

  protected removeSystemFields(req: RequestContext): void {
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.updatedAt;
  }

  protected async preventIDOR(req: RequestContext): Promise<void> {
    // Implement your IDOR prevention logic
    // For example, check if user owns the resource
  }
}
```

### 3. Set Up Your Server

```typescript
import { BackendServer, PGFactory } from 'unconventional';
import { UserController } from './controllers/user.controller';

const server = new BackendServer({
  basePath: '/api',
  getDB: PGFactory,
  cors: {
    origin: ['https://example.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const userController = new UserController();

server.app
  .get('/users', userController.getAll())
  .get('/users/:id', userController.get())
  .post('/users', userController.create())
  .put('/users/:id', userController.update())
  .delete('/users/:id', userController.delete());

export default server.start();
```

### 4. Configure Cloudflare Workers

In your `wrangler.json`:

```json
{
  "name": "my-api",
  "compatibility_date": "2024-01-01",
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-namespace-id"
    }
  ],
  "services": [
    {
      "binding": "DB_PROXY",
      "service": "your-postgres-service"
    }
  ]
}
```

## 📚 Core Concepts

### BaseModel

The foundation of Unconventional. `BaseModel` provides static methods for database operations and instance methods for data manipulation.

#### Static Methods

- `create(data, upsertConfig?)` - Create a new record
- `createMany(data[], upsertConfig?)` - Create multiple records
- `findById(id, config?)` - Find by ID or key
- `findOne(config)` - Find a single record matching criteria
- `findMany(config?)` - Find multiple records with pagination
- `update(id, data)` - Update a record
- `updateMany(data[])` - Update multiple records
- `delete(id)` - Delete a record
- `deleteMany(config?)` - Delete multiple records
- `count()` - Count all records
- `increment(id, data)` - Increment numeric fields
- `truncate()` - Delete all records

#### Model Configuration

```typescript
export class Product extends BaseModel {
  public static collection = 'products';  // This model's database table
  public static db: DB;                   // The connection to the database. 
                                          // Recommend setting on BaseModel
  public static idField = 'id';           // The table's id column. Default: id
  public static idType = IdType.UUID;     // What column type id is (number or UUID)
  public static keyField = 'slug';        // Optional column used for lookups
  public static ownerField = 'userId';    // For ownership checks
}
```

### BaseService

The service layer provides a clean interface for business logic with built-in caching support.

```typescript
import { BaseService } from 'unconventional';

const userService = BaseService.for(User);

// Create
const user = await userService.create({ email: 'user@example.com', name: 'John' }, {
  cache: ctx.env.CACHE,
  cacheTTL: 3600,
});

// Get with caching
const user = await userService.get(userId, {
  cache: ctx.env.CACHE,
  expand: 'profile,posts',
});

// Update
const updated = await userService.update(userId, { name: 'Jane' }, {
  cache: ctx.env.CACHE,
});

// Delete
await userService.delete(userId, { cache: ctx.env.CACHE });
```

### AbstractBaseController

Provides automatic CRUD endpoints with hooks for customization.

#### Available Methods

- `create(options?)` - POST endpoint
- `createMany(options?)` - POST endpoint for bulk creation
- `get(options?)` - GET endpoint for single resource
- `getAll(options?)` - GET endpoint for paginated list
- `update(options?)` - PUT endpoint
- `updateMany(options?)` - PUT endpoint for bulk updates
- `delete(options?)` - DELETE endpoint
- `deleteMany(options?)` - DELETE endpoint with filter

#### Controller Options

```typescript
const controller = new MyController();

server.app.get('/users/:id', controller.get({
  before: async (req) => {
    // Pre-processing hook
  },
  after: async (req, response) => {
    // Post-processing hook
  },
  cache: true,              // Enable caching for this route
  cacheTTL: 1800,          // Custom TTL
  download: async (req, response) => {
    // Return file download instead of JSON
    return { filename: 'export.json', buffer: Buffer.from(JSON.stringify(response)) };
  },
}));
```

### BackendServer

The main server class that wraps Hono with Unconventional's defaults.

```typescript
import { BackendServer, PGFactory } from 'unconventional';

const server = new BackendServer({
  name: 'My API',
  basePath: '/api/v1',
  getDB: PGFactory,        // Database factory function
  cors: {                  // CORS configuration
    origin: ['https://example.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
  },
  middleware: [            // Middleware to run on all routes
    async (ctx, next) => {
      // Your middleware logic
      return next();
    },
  ],
});

// Access the underlying Hono app
server.app.get('/health', (ctx) => ctx.json({ status: 'ok' }));

export default server.start();
```

## 🎨 Decorators

### @prop

Define model properties with validation and options.

```typescript
export class Post extends BaseModel {
  @prop({ required: true })
  public title!: string;

  @prop({ unique: true })
  public slug!: string;

  @prop({ default: 'draft' })
  public status!: string;

  @prop({ default: () => new Date() })
  public publishedAt?: Date;

  @prop({ private: true })
  public internalNotes?: string;

  @prop({ system: true })
  public systemField?: string;

  @prop({
    relation: {
      type: RelationType.BelongsTo,
      model: User,
      from: 'userId',
      to: 'id',
    },
  })
  public author?: User;
}
```

**Prop Options:**
- `required` - Field is required
- `unique` - Field has a unique index in the DB
- `default` - Default value (can be a function)
- `private` - Hide from non-privileged users (can be a function)
- `system` - Prevent editing by non-privileged users (can be a function)
- `relation` - Define relationships
- `preFormat` - Transform value before saving

### @index

Define database indexes for performance.

```typescript
@index({ email: 1 }, { unique: true })
@index({ createdAt: -1, status: 1 })
export class User extends BaseModel {
  // ...
}
```

### @timestamp

Automatically manage `createdAt` and `updatedAt` fields.

```typescript
@timestamp()
export class Post extends BaseModel {
  @prop()
  public createdAt?: Date;

  @prop()
  public updatedAt?: Date;
}

// Custom field names
@timestamp({ createdField: 'created_at', updatedField: 'updated_at' })
export class Article extends BaseModel {
  // ...
}
```

## 🔗 Relationships

Unconventional supports four types of relationships:

### BelongsTo

```typescript
export class Comment extends BaseModel {
  @prop({
    relation: {
      type: RelationType.BelongsTo,
      model: Post,
      from: 'postId',
      to: 'id',
    },
  })
  public post?: Post;
}
```

### HasOne / HasMany

```typescript
export class User extends BaseModel {
  @prop({
    relation: {
      type: RelationType.HasOne,
      model: Profile,
      from: 'id',
      to: 'userId',
    },
  })
  public profile?: Profile;

  @prop({
    relation: {
      type: RelationType.HasMany,
      model: Post,
      from: 'id',
      to: 'authorId',
    },
  })
  public posts?: Post[];
}
```

### ManyToMany

```typescript
export class User extends BaseModel {
  @prop({
    relation: {
      type: RelationType.ManyToMany,
      model: Role,
      from: 'id',
      to: 'id',
      through: {
        model: UserRole,
        from: 'userId',
        to: 'roleId',
      },
    },
  })
  public roles?: Role[];
}
```

### Query Expansion

Load relationships using the `expand` query parameter:

```
GET /api/users/123?expand=profile,posts,posts.comments
```

## 💾 Caching

Unconventional provides intelligent caching with Cloudflare KV.

### Automatic Caching

```typescript
const controller = new UserController();

// Enable caching at controller level
const controller = new UserController({
  cache: true,
  cacheTTL: 3600, // 1 hour
});

// Or per-route
server.app.get('/users/:id', controller.get({ cache: true }));
```

### Manual Cache Management

```typescript
import { BaseCache } from 'unconventional';

// Set a model in cache
await BaseCache.setModel(cache, user, undefined, 3600);

// Get a model from cache
const cached = await BaseCache.getModel(cache, User, userId);

// Clear cache
await BaseCache.clearModel(cache, user);
await BaseCache.clearPage(cache, User);
```

## 🔒 Security

### IDOR Prevention

Implement ownership checks in your controller:

```typescript
protected async preventIDOR(req: RequestContext): Promise<void> {
  const ownerId = req.get(BaseEnvKey.ownerId);
  const isPrivileged = req.get(BaseEnvKey.isPrivileged);

  if (isPrivileged) return;

  // For updates/deletes, check ownership
  if (req.params.id) {
    const resource = await User.findById(req.params.id);
    if (resource?.userId !== ownerId) {
      throw APIError.errForbidden('Access denied');
    }
  }

  // For creates, ensure user can't set someone else as owner
  if (req.body.userId && req.body.userId !== ownerId) {
    throw APIError.errForbidden('Cannot create resource for another user');
  }
}
```

### Private Fields

Fields marked with `private: true` are automatically masked:

```typescript
@prop({ private: true })
public passwordHash?: string;

@prop({ private: (model, field) => !model.isPublic })
public internalData?: string;
```

### System Fields

Fields marked with `system: true` cannot be edited by non-privileged users:

```typescript
@prop({ system: true })
public systemField?: string;

protected removeSystemFields(req: RequestContext): void {
  const isPrivileged = req.get(BaseEnvKey.isPrivileged);
  if (!isPrivileged) {
    delete req.body.systemField;
  }
}
```

## 📊 Querying & Pagination

### Filtering

```typescript
// Using query parameters
GET /api/users?filter=status eq 'active' AND age gt 18

// In code
const users = await User.findMany({
  filter: 'status eq \'active\' AND age gt 18',
});
```

### Sorting

```typescript
// Query parameter
GET /api/users?orderBy=createdAt desc

// In code
const users = await User.findMany({
  sort: 'createdAt desc
});
```

### Pagination

```typescript
// Cursor-based pagination
GET /api/users?limit=20&cursor=123

// In code
const users = await User.findMany({
  limit: 20,
  cursor: '123',
});

// Get all (limit < 0)
const allUsers = await User.findMany({ limit: -1 });
```

## 🛠️ Advanced Features

### Custom Middleware

```typescript
import { AbstractBaseMiddleware } from 'unconventional';

export class UserMiddleware extends AbstractBaseMiddleware<typeof User> {
  constructor() {
    super(User);
  }

  async findOwner(id: string | number): Promise<User | null> {
    return this.findAncestor(id, (model) => model === User);
  }
}
```

### Error Handling

Unconventional includes a comprehensive error handling system:

```typescript
import { APIError } from 'unconventional';

// Predefined errors
throw APIError.errNotFound('User not found');
throw APIError.errBadRequest('Invalid input');
throw APIError.errUnauthorized('Authentication required');
throw APIError.errForbidden('Access denied');
throw APIError.errResourceCreationFailed('Failed to create user');
```

### Upsert Operations

```typescript
// Create or update based on unique constraint
const user = await User.create(
  { email: 'user@example.com', name: 'John' },
  {
    action: ConflictResolution.doUpdate,
    constraint: 'email',
  }
);
```

## 📖 Complete Example

```typescript
// models/user.ts
import { BaseModel, prop, timestamp, RelationType } from 'unconventional';
import { Profile } from './profile';

@timestamp()
export class User extends BaseModel {
  public static collection = 'users';
  public static db: DB;

  @prop({ required: true, unique: true })
  public email!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ private: true })
  public passwordHash?: string;

  @prop({
    relation: {
      type: RelationType.HasOne,
      model: Profile,
      from: 'id',
      to: 'userId',
    },
  })
  public profile?: Profile;
}

// controllers/user.controller.ts
import { AbstractBaseController, APIError, BaseEnvKey } from 'unconventional';
import { User } from '../models/user';

export class UserController extends AbstractBaseController<typeof User> {
  constructor() {
    super(User, {
      cache: true,
      cacheTTL: 3600,
    });
  }

  protected async maskPrivateFields(req: RequestContext, response: User | User[]): Promise<void> {
    User.maskPrivate(response);
  }

  protected async preventIDOR(req: RequestContext): Promise<void> {
    const ownerId = req.get(BaseEnvKey.ownerId);
    const isPrivileged = req.get(BaseEnvKey.isPrivileged);

    if (isPrivileged) return;

    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (!user || user.id !== ownerId) {
        throw APIError.errForbidden('Access denied');
      }
    }
  }
}

// server.ts
import { BackendServer, PGFactory } from 'unconventional';
import { UserController } from './controllers/user.controller';

const server = new BackendServer({
  basePath: '/api',
  getDB: PGFactory,
  cors: {
    origin: ['https://example.com'],
  },
});

const userController = new UserController();

server.app
  .get('/users', userController.getAll())
  .get('/users/:id', userController.get())
  .post('/users', userController.create())
  .put('/users/:id', userController.update())
  .delete('/users/:id', userController.delete());

export default server.start();
```

## 📚 API Reference

### BaseModel

#### Static Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `create(data, upsertConfig?)` | Create a new record | `Promise<InstanceType<T> \| null>` |
| `createMany(data[], upsertConfig?)` | Create multiple records | `Promise<InstanceType<T>[] \| null>` |
| `findById(id, config?)` | Find by ID or key | `Promise<InstanceType<T> \| null>` |
| `findOne(config)` | Find a single record | `Promise<InstanceType<T> \| null>` |
| `findMany(config?)` | Find multiple records | `Promise<InstanceType<T>[]>` |
| `update(id, data)` | Update a record | `Promise<InstanceType<T> \| null>` |
| `updateMany(data[])` | Update multiple records | `Promise<InstanceType<T>[] \| null>` |
| `delete(id)` | Delete a record | `Promise<InstanceType<T> \| null>` |
| `deleteMany(config?)` | Delete multiple records | `Promise<InstanceType<T>[] \| null>` |
| `count()` | Count all records | `Promise<number \| null>` |
| `increment(id, data)` | Increment numeric fields | `Promise<InstanceType<T> \| null>` |
| `truncate()` | Delete all records | `Promise<void>` |
| `maskPrivate(data)` | Mask private fields | `void` |

#### Instance Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `$id()` | Get the ID field value | `string \| number` |
| `$key()` | Get the key field value | `string \| undefined` |
| `$owner()` | Get the owner field value | `string \| number \| undefined` |

### BaseService

| Method | Description | Returns |
|--------|-------------|---------|
| `create(data, config?)` | Create with caching | `Promise<InstanceType<M>>` |
| `createMany(data[], config?)` | Create many with caching | `Promise<InstanceType<M>[]>` |
| `get(identifier, config?)` | Get with caching | `Promise<InstanceType<M>>` |
| `getAll(config?)` | Get all with pagination | `Promise<InstanceType<M>[]>` |
| `update(identifier, data, config?)` | Update with cache invalidation | `Promise<InstanceType<M>>` |
| `updateMany(data[], config?)` | Update many | `Promise<InstanceType<M>[]>` |
| `delete(identifier, config?)` | Delete with cache invalidation | `Promise<InstanceType<M>>` |
| `deleteMany(config?)` | Delete many | `Promise<InstanceType<M>[]>` |

### Configuration Types

#### ServerConfig

```typescript
interface ServerConfig {
  name?: string;
  basePath?: string;
  getDB: (ctx: Context) => DB;
  cors?: CorsOptions;
  middleware?: Middleware[];
}
```

#### ControllerOptions

```typescript
interface ControllerOptions {
  cache?: boolean;
  cacheTTL?: number;
}
```

#### ServiceConfig

```typescript
interface ServiceConfig<M> {
  cache?: KVNamespace;
  cacheTTL?: number;
  upsertConfig?: UpsertConfig<M>;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Dean Mauro**

- GitHub: [@cloudflare-extension](https://github.com/cloudflare-extension)
- Repository: [unconventional](https://github.com/cloudflare-extension/unconventional)

## 🙏 Acknowledgments

- Built on [Hono](https://hono.dev/) - Ultrafast web framework
- Powered by [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- Database queries via [unconventional-pg-queries](https://github.com/cloudflare-extension/unconventional-pg-queries)

---

Made with ❤️ for the Cloudflare ecosystem
