interface CloudflareMessage {
  code: number;
  message: string;
}

interface CloudflareResponse {
  success: boolean;
  errors: CloudflareMessage[];
  messages: CloudflareMessage[];
}

interface BulkDeleteResponse extends CloudflareResponse {
  result: {
    successful_key_count: number;
    unsuccessful_keys: string[];
  };
}

export interface CloudflareKVAPI {
  accountId: string;
  apiToken: string;
  namespaceId: string;
}

export class CloudflareKV {
  private url: string;

  constructor(private api: CloudflareKVAPI) {
    this.url = `https://api.cloudflare.com/client/v4/accounts/${this.api.accountId}/storage/kv/namespaces/${this.api.namespaceId}`;
  }

  /**
   * Deletes multiple keys from a KV namespace
   * @param namespaceId The namespace to delete keys from
   * @param keys Array of key names to delete (max 10,000)
   */
  async deleteKeys(keys: string[]): Promise<BulkDeleteResponse> {
    if (keys.length > 10000) {
      throw new Error('Cannot delete more than 10,000 keys at once');
    }

    const response = await fetch(
      `${this.url}/bulk/delete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.api.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keys)
      }
    );

    return response.json();
  }
}