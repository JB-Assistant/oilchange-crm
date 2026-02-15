import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encrypt, decrypt, isEncrypted } from '@/lib/crypto'

// Use a fixed test encryption key (64 hex chars = 32 bytes)
const TEST_KEY = 'a'.repeat(64)

describe('crypto', () => {
  beforeEach(() => {
    vi.stubEnv('TWILIO_ENCRYPTION_KEY', TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('encrypt/decrypt round-trip', () => {
    it('encrypts and decrypts a simple string', () => {
      const plaintext = 'my-secret-token'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('encrypts and decrypts an empty string', () => {
      const encrypted = encrypt('')
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe('')
    })

    it('encrypts and decrypts a long string', () => {
      const plaintext = 'x'.repeat(1000)
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('encrypts and decrypts unicode', () => {
      const plaintext = 'Hello \u{1F30E} World'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same-input'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)
      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('encrypt output format', () => {
    it('produces colon-separated base64 parts (iv:tag:ciphertext)', () => {
      const encrypted = encrypt('test')
      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)
    })

    it('IV is 12 bytes (16 base64 chars)', () => {
      const encrypted = encrypt('test')
      const iv = Buffer.from(encrypted.split(':')[0], 'base64')
      expect(iv.length).toBe(12)
    })

    it('auth tag is 16 bytes', () => {
      const encrypted = encrypt('test')
      const tag = Buffer.from(encrypted.split(':')[1], 'base64')
      expect(tag.length).toBe(16)
    })
  })

  describe('decrypt error handling', () => {
    it('throws on invalid format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted format')
    })

    it('throws on invalid IV length', () => {
      const badIv = Buffer.from('short').toString('base64')
      const tag = Buffer.alloc(16).toString('base64')
      const data = Buffer.from('test').toString('base64')
      expect(() => decrypt(`${badIv}:${tag}:${data}`)).toThrow('Invalid IV or auth tag length')
    })

    it('throws on tampered ciphertext', () => {
      const encrypted = encrypt('secret')
      const parts = encrypted.split(':')
      // Tamper with ciphertext
      parts[2] = Buffer.from('tampered-data').toString('base64')
      expect(() => decrypt(parts.join(':'))).toThrow()
    })
  })

  describe('isEncrypted', () => {
    it('returns true for encrypted strings', () => {
      const encrypted = encrypt('test')
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('returns false for plain strings', () => {
      expect(isEncrypted('plain-text')).toBe(false)
    })

    it('returns false for strings with wrong number of parts', () => {
      expect(isEncrypted('a:b')).toBe(false)
      expect(isEncrypted('a:b:c:d')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isEncrypted('')).toBe(false)
    })

    it('returns false when IV/tag have wrong sizes', () => {
      const badIv = Buffer.from('short').toString('base64')
      const badTag = Buffer.from('short').toString('base64')
      const data = Buffer.from('test').toString('base64')
      expect(isEncrypted(`${badIv}:${badTag}:${data}`)).toBe(false)
    })
  })

  describe('missing encryption key', () => {
    it('throws when TWILIO_ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('TWILIO_ENCRYPTION_KEY', '')
      expect(() => encrypt('test')).toThrow()
    })
  })
})
