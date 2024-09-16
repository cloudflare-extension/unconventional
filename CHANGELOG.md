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
