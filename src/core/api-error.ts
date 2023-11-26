import { StatusCode } from "hono/utils/http-status";

export class APIError extends Error {
  public readonly statusCode!: StatusCode;
  public readonly name!: string;

  constructor(
    name: string,
    message: string,
    statusCode: StatusCode,
    public data?: any,
    public internalProperties?: any
  ) {
    super();
    this.name = name;
    this.statusCode = statusCode;
    this.message = message;
  }
  
  public static errBadRequest(message: string, data?: any, internalProperties?: any) {
    return new APIError('BadRequest', message, 400, data, internalProperties);
  }
  public static errInvalidQueryParameter(message: string, data?: any, internalProperties?: any) {
    return new APIError('InvalidQueryParameter', message, 400, data, internalProperties);
  }
  public static errMissingBody(data?: any, internalProperties?: any) {
    return new APIError('MissingBody', 'Missing Data in Request Body.', 400, data, internalProperties);
  }
  public static errInvalidBody(data?: any, internalProperties?: any) {
    return new APIError('InvalidBody', 'Invalid Request Body.', 422, data, internalProperties);
  }
  public static errInvalidParameterValue(message: string, data?: any, internalProperties?: any) {
    return new APIError('InvalidParameterValue', message, 400, data, internalProperties);
  }
  public static errInvalidHeaderParameter(message: string, data?: any, internalProperties?: any) {
    return new APIError('InvalidHeaderParameter', message, 400, data, internalProperties);
  }
  public static errUnauthorized(data?: any, internalProperties?: any) {
    return new APIError('Unauthorized', 'Client Authorization Failed.', 401, data, internalProperties);
  }
  public static errInvalidAccessToken(data?: any, internalProperties?: any) {
    return new APIError('InvalidAccessToken', 'Invalid authentication token', 401, data, internalProperties);
  }
  public static errInvalidIdToken(data?: any, internalProperties?: any) {
    return new APIError('InvalidIdToken', 'Invalid Id Token', 401, data, internalProperties);
  }
  public static errInvalidAuthToken(message?: string, data?: any, internalProperties?: any) {
    message = message ? message : 'Invalid Auth Token';
    return new APIError('InvalidAuthToken', message, 401, data, internalProperties);
  }
  public static errInvalidSessionToken(message?: string, data?: any, internalProperties?: any) {
    message = message ? message : 'Invalid Session Token';
    return new APIError('InvalidAuthToken', message, 401, data, internalProperties);
  }
  public static errPermissionDenied(message?: string, data?: any, internalProperties?: any) {
    message = message ? message : "You don't have permission to perform this action.";
    return new APIError('Forbidden', message, 403, data, internalProperties);
  }
  public static errAlreadyExists(data?: any, internalProperties?: any) {
    return new APIError('AlreadyExists', 'Requested resource already exists', 409, data, internalProperties);
  }
  public static errNotFound(message?: string, data?: any, internalProperties?: any) {
    message = message ? message : 'Requested resource does not exist';
    return new APIError('Resource not found', message, 404, data, internalProperties);
  }
  public static errResourceCreationFailed(message: string, data?: any, internalProperties?: any) {
    return new APIError('ResourceCreationFailed', message, 409, data, internalProperties);
  }
  public static errResourceUpdateFailed(message: string, data?: any, internalProperties?: any) {
    return new APIError('ResourceUpdateFailed', message, 409, data, internalProperties);
  }
  public static errResourceDeletionFailed(message: string, data?: any, internalProperties?: any) {
    return new APIError('ResourceDeletionFailed', message, 409, data, internalProperties);
  }
  public static errFailedDependency(message?: string, data?: any, internalProperties?: any) {
    return new APIError('FailedDependency', message || 'Try again later.', 424, data, internalProperties);
  }
  public static errTemporarilyUnavailable(message?: string, data?: any, internalProperties?: any) {
    return new APIError('ServiceTemporarilyUnavailable', message || 'Try again later.', 503, data, internalProperties);
  }
  public static errServerError(data?: any, internalProperties?: any) {
    return new APIError(
      'Internal Server Error',
      'Request could not be carried out.',
      500,
      data,
      internalProperties
    );
  }
}