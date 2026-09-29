import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const DEFAULT_KEY = '0000000000000000000000000000000000000000000000000000000000000000'

function getKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY
  const hexKey = rawKey.length === 64 ? rawKey : rawKey.padEnd(64, '0').slice(0, 64)
  return Buffer.from(hexKey, 'hex')
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decrypt(stored: string): string {
  const key = getKey()
  const [ivHex, tagHex, encHex] = stored.split(':')
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted value format')
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return (
    decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') +
    decipher.final('utf8')
  )
}
