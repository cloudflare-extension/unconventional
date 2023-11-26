
/** Hashes the given value using SHA-256 */
export function sha256(value: string) {
  var buffer = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", buffer).then(hex);
}

/** Encodes a buffer in hex notation */
function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}