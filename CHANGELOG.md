#### 1.14.1 (2024-12-30)

##### Bug Fixes

*  Suppress rate limiting errors thrown by the getCachedOrFetch() method when many calls are made within 1 second to the cache. The cache should not preclude the fetched item from returning. This can happen, for example, when trying to get a user from the DB and cache it for subsequent calls. If too many calls come in at once, the first may not have time to cache its result before the next call comes in. Cloudflare KV will throw a 429 as it sees multiple writes to the same key within 1s. ([5e4b1aa7](https://github.com/cloudflare-extension/unconventional/commit/5e4b1aa726d1e91f2a6eead00313401498f6ab55))

### 1.14.0 (2024-12-29)

##### New Features

*  Support bulk deletes in BaseCache using the KV API in favor of bindings ([326fccae](https://github.com/cloudflare-extension/unconventional/commit/326fccae32eb1680ae1138ee2373a19b31af31df))

#### 1.13.2 (2024-12-15)

##### Bug Fixes

*  Fixed bug where privacy masking would throw an error if the field targeted was undefined ([c9d71505](https://github.com/cloudflare-extension/unconventional/commit/c9d715057a6894449720290591c8f714adecce53))

#### 1.13.1 (2024-12-15)

### 1.13.0 (2024-12-15)

##### New Features

*  New base middleware class provides utilities to traverse a model's ancestors looking for a particular condition to be met. ([4acbdfd1](https://github.com/cloudflare-extension/unconventional/commit/4acbdfd141172bb0daee27f276aee6e9145f4da3))
*  "Private" and "System" flags in the prop decorator now support functions. ([427f00bb](https://github.com/cloudflare-extension/unconventional/commit/427f00bbd3cf4f5ad16783e46aefc793862d8976))

##### Other Changes

* //github.com/cloudflare-extension/unconventional ([2665970a](https://github.com/cloudflare-extension/unconventional/commit/2665970aeb772143d728d189b6e9e573583f8494))

### 1.12.0 (2024-12-10)

##### New Features

*  "Private" and "System" flags in the prop decorator now support functions. ([427f00bb](https://github.com/cloudflare-extension/unconventional/commit/427f00bbd3cf4f5ad16783e46aefc793862d8976))

##### Other Changes

* //github.com/cloudflare-extension/unconventional ([2665970a](https://github.com/cloudflare-extension/unconventional/commit/2665970aeb772143d728d189b6e9e573583f8494))

### 1.12.0 (2024-12-10)

##### New Features

*  "Private" and "System" flags in the prop decorator now support functions. ([427f00bb](https://github.com/cloudflare-extension/unconventional/commit/427f00bbd3cf4f5ad16783e46aefc793862d8976))

##### Other Changes

* //github.com/cloudflare-extension/unconventional ([2665970a](https://github.com/cloudflare-extension/unconventional/commit/2665970aeb772143d728d189b6e9e573583f8494))

### 1.10.0 (2024-10-09)

##### New Features

*  Add maskPrivate method to Base Model, which can be used by the BaseController's maskPrivateFields method ([5099e232](https://github.com/cloudflare-extension/unconventional/commit/5099e23276f367dad26320e3a09064875bf32f23))

### 1.9.1 (2024-09-25)

*  Fix timestamp pollution of parent models. ([e443297](https://github.com/cloudflare-extension/unconventional/commit/e443297f97cee4597989efa7437417495bff5887))

### 1.8.0 (2024-09-23)

*  Make createdAt and updatedAt field names customizable (e.g. created_at and updated_at). ([d05b6bf](https://github.com/cloudflare-extension/unconventional/commit/d05b6bf152baaf3f411c2e87cdff9749a8ba4621))

### 1.7.0 (2024-09-22)

*  Add Truncate and Increment/Decrement methods to BaseModel. ([de7020e](https://github.com/cloudflare-extension/unconventional/commit/de7020e3acafd7385ff50bf47b186abac8b4962e))

### 1.5.0 (2024-09-16)

##### New Features

*  Allow BaseModel.id to be either a number or a UUID. ([980a8200](https://github.com/cloudflare-extension/unconventional/commit/980a82009cd48280c1a43fa5de85d2b27244c5ab))

### 1.4.2 (2024-09-16)

##### Other Changes

*  BaseService.getAll() will now return all records if limit < 0 ([6f048439](https://github.com/cloudflare-extension/unconventional/commit/6f048439c96e43127c6d99abb83039db2ac63452))

### 1.3.2 (2024-09-16)

##### Feature

*  BaseModel can now support circular dependencies in its relations, e.g. if `User HasOne Animal` and `Animal BelongsToOne User`. ([7a0ed60](https://github.com/cloudflare-extension/unconventional/commit/7a0ed609c64c227436595623ecde7c3c4162b415))

Example: 

Set the model field to `() => User` instead of `User`.
```typescript
@prop<typeof User>({ relation: { type: RelationType.BelongsTo, model: () => User, from: "user_id", to: "id" } })
  public owner?: User;
```

### 1.1.0 (2024-08-08)

##### Breaking Changes

*  The type of `BaseModel.id` changed from `number` to `string | number` to allow for GUIDs as primary keys. ([23a70a6
](https://github.com/cloudflare-extension/unconventional/commit/23a70a6d52cada8e6451b69d74ccdaf120faa3b5))
