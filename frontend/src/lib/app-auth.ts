import 'server-only'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

const SESSION_COOKIE = 'app-session'
const appUserCollection = 'users' as const

export type AppUser = {
  id: number | string
  email: string
  name: string
  accessNeeds?: string[] | null
  assistantPreferences?: {
    interactionMode?: string | null
    responseDetail?: string | null
    confirmationStyle?: string | null
    extraResponseTime?: boolean | null
  } | null
}

export type AccessNeed = 'vision' | 'hearing' | 'motor' | 'cognitive' | 'sensory' | 'speech'
export type InteractionMode = 'voice-first' | 'voice-and-touch' | 'touch-first'
export type ResponseDetail = 'brief' | 'balanced' | 'detailed'
export type ConfirmationStyle = 'spoken' | 'visual' | 'spoken-and-visual' | 'vibration-and-visual'

function publicUser(user: Record<string, unknown>): AppUser {
  return {
    id: user.id as number | string,
    email: String(user.email ?? ''),
    name: String(user.name ?? ''),
    accessNeeds: (user.accessNeeds as string[] | null | undefined) ?? [],
    assistantPreferences: (user.assistantPreferences as AppUser['assistantPreferences']) ?? null,
  }
}

export function createAppAuth() {
  async function setSession(token: string, exp?: number) {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: exp ? Math.max(exp - Math.floor(Date.now() / 1000), 60) : 60 * 60 * 24 * 7,
    })
  }

  return {
    async currentUser(): Promise<AppUser | null> {
      const token = (await cookies()).get(SESSION_COOKIE)?.value
      if (!token) return null

      const payload = await getPayload({ config })
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })
      if (!user || user.collection !== appUserCollection) return null

      return publicUser(user as unknown as Record<string, unknown>)
    },

    async login(email: string, password: string): Promise<AppUser> {
      const payload = await getPayload({ config })
      const result = await payload.login({
        collection: appUserCollection,
        data: { email, password },
      })
      if (!result.token || !result.user) throw new Error('Unable to sign in with those details.')

      await setSession(result.token, result.exp)
      return publicUser(result.user as unknown as Record<string, unknown>)
    },

    async register(data: {
      name: string
      email: string
      password: string
      accessNeeds: AccessNeed[]
      assistantPreferences: {
        interactionMode: InteractionMode
        responseDetail: ResponseDetail
        confirmationStyle: ConfirmationStyle
        extraResponseTime: boolean
      }
    }): Promise<AppUser> {
      const payload = await getPayload({ config })
      await payload.create({
        collection: appUserCollection,
        data,
        overrideAccess: false,
      })
      return this.login(data.email, data.password)
    },

    async logout() {
      ;(await cookies()).delete(SESSION_COOKIE)
    },
  }
}

export const appAuth = createAppAuth()
