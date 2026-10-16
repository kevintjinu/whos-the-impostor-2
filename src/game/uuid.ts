export type RandomValuesFiller = (values: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>

export class SecureRandomUnavailableError extends Error {
  constructor() {
    super('Cryptographically secure randomness is unavailable in this browser.')
    this.name = 'SecureRandomUnavailableError'
  }
}

function fillWithSecureRandomValues(values: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const cryptoApi = globalThis.crypto

  if (!cryptoApi?.getRandomValues) {
    throw new SecureRandomUnavailableError()
  }

  cryptoApi.getRandomValues(values)
  return values
}

export function createUuidV4(fillRandomValues: RandomValuesFiller = fillWithSecureRandomValues): string {
  const values = fillRandomValues(new Uint8Array(new ArrayBuffer(16)))

  values[6] = (values[6] & 0x0f) | 0x40
  values[8] = (values[8] & 0x3f) | 0x80

  const hex = Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
