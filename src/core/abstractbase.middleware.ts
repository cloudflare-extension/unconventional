import { RelationType } from "../types";
import { buildExpansionString, getRelationModel } from "../utils";
import { BaseModel } from "./base.model";

/** A predicate that matches a model to a given condition */
export type ModelPredicate = (model: typeof BaseModel) => boolean;

/** Middleware base class with methods that can find the ancestors of a model */
export class AbstractBaseMiddleware<M extends typeof BaseModel> {
  protected model: M;

  constructor(model: M) {
    this.model = model;
  }

  /**
   * Finds an ancestor that matches the predicate
   * @param id - The ID of the model to find the ancestor for
   * @param predicate - The predicate to match the ancestor
   * @returns The ancestor that matches the predicate or null if no ancestor is found
   */
  public async findAncestor(id: string | number, predicate: ModelPredicate): Promise<any | null> {
    const expansion = this.buildAncestralPath(predicate);
    if (!expansion) return null;

    const result = await this.model.findById(id, {
      expand: buildExpansionString(expansion)
    });
    if (!result) return null;

    // Navigate through the expanded chain to get the owner
    return expansion.reduce((obj, key) => obj?.[key], result);
  }

  /**
   * Builds the relation path to reach an ancestor that matches the predicate
   * @param predicate - The predicate to match the ancestor
   * @returns The relation path (e.g. ['comments', 'post', 'user']) to the ancestor or null if no ancestor is found
   */
  protected buildAncestralPath(predicate: ModelPredicate): string[] | null {
    let currentModel: typeof BaseModel = this.model;
    const path: string[] = [];
    const visited = new Set<typeof BaseModel>();

    while (!visited.has(currentModel)) {
      // Found model that matches predicate
      if (predicate(currentModel)) {
        return path;
      }

      visited.add(currentModel);

      // Find first BelongsTo relation
      const belongsToRelation = Object.entries(currentModel.schema.props)
        .find(([_, prop]) => prop.relation?.type === RelationType.BelongsTo);

      if (!belongsToRelation) return null;

      const [relationKey, prop] = belongsToRelation;
      const parentModel = getRelationModel(prop.relation!.model);
      
      path.push(relationKey);
      currentModel = parentModel;
    }

    return null; // Circular reference found or no matching owner
  }
}