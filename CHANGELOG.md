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
