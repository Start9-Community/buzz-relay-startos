export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Buzz Relay!': 0,
  'PostgreSQL is ready': 1,
  'Waiting for PostgreSQL to be ready': 2,
  'Redis is ready': 3,
  'Waiting for Redis to be ready': 4,
  'MinIO is ready': 5,
  'Waiting for MinIO to be ready': 6,
  'Buzz Relay': 7,
  'Buzz Relay is ready': 8,
  'Buzz Relay is not ready': 9,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
