'use server'

import {
  appAuth,
  type AccessNeed,
  type AppUser,
  type ConfirmationStyle,
  type InteractionMode,
  type ResponseDetail,
} from '@/lib/app-auth'

const NEEDS = new Set(['vision', 'hearing', 'motor', 'cognitive', 'sensory', 'speech'])
const INTERACTION_MODES = new Set(['voice-first', 'voice-and-touch', 'touch-first'])
const RESPONSE_DETAILS = new Set(['brief', 'balanced', 'detailed'])
const CONFIRMATION_STYLES = new Set([
  'spoken',
  'visual',
  'spoken-and-visual',
  'vibration-and-visual',
])

export type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; message: string; field?: 'name' | 'email' | 'password' }

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function registerUser(input: {
  name: unknown
  email: unknown
  password: unknown
  accessNeeds: unknown
  interactionMode: unknown
  responseDetail: unknown
  confirmationStyle: unknown
  extraResponseTime: unknown
}): Promise<AuthResult> {
  const name = cleanText(input.name, 80)
  const email = cleanText(input.email, 254).toLowerCase()
  const password = typeof input.password === 'string' ? input.password : ''

  if (name.length < 2) return { ok: false, field: 'name', message: 'Enter your name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, field: 'email', message: 'Enter a valid email address.' }
  }
  if (password.length < 8 || password.length > 128) {
    return {
      ok: false,
      field: 'password',
      message: 'Use a password between 8 and 128 characters.',
    }
  }

  const accessNeeds = Array.isArray(input.accessNeeds)
    ? input.accessNeeds.filter(
        (item): item is AccessNeed => typeof item === 'string' && NEEDS.has(item as AccessNeed),
      )
    : []
  const interactionMode =
    typeof input.interactionMode === 'string' && INTERACTION_MODES.has(input.interactionMode)
      ? (input.interactionMode as InteractionMode)
      : 'voice-and-touch'
  const responseDetail =
    typeof input.responseDetail === 'string' && RESPONSE_DETAILS.has(input.responseDetail)
      ? (input.responseDetail as ResponseDetail)
      : 'balanced'
  const confirmationStyle =
    typeof input.confirmationStyle === 'string' && CONFIRMATION_STYLES.has(input.confirmationStyle)
      ? (input.confirmationStyle as ConfirmationStyle)
      : 'spoken-and-visual'

  try {
    const user = await appAuth.register({
      name,
      email,
      password,
      accessNeeds,
      assistantPreferences: {
        interactionMode,
        responseDetail,
        confirmationStyle,
        extraResponseTime: input.extraResponseTime === true,
      },
    })
    return { ok: true, user }
  } catch {
    return {
      ok: false,
      message: 'We could not create that account. The email may already be registered.',
    }
  }
}

export async function loginUser(input: { email: unknown; password: unknown }): Promise<AuthResult> {
  const email = cleanText(input.email, 254).toLowerCase()
  const password = typeof input.password === 'string' ? input.password : ''

  if (!email || !password) {
    return { ok: false, message: 'Enter both your email and password.' }
  }

  try {
    const user = await appAuth.login(email, password)
    return { ok: true, user }
  } catch {
    return { ok: false, message: 'Email or password was not recognized.' }
  }
}

export async function logoutUser(): Promise<{ ok: true }> {
  await appAuth.logout()
  return { ok: true }
}
