import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { validate as isUUID } from 'uuid'
import { getUserByEmail, verifyPassword, touchUser, getOrCreateGuestUser } from '@/server/domain/identity/users'
import type { UserRole } from '@/shared/types/user'

declare module 'next-auth' {
  interface User {
    role?: UserRole
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: UserRole
    userId?: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await getUserByEmail(email)
        if (!user) return null
        if (!(await verifyPassword(user, password))) return null

        await touchUser(user.id)
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    Credentials({
      id: 'guest',
      credentials: { guestId: {} },
      async authorize(credentials) {
        const guestId = credentials?.guestId as string | undefined
        if (!guestId || !isUUID(guestId)) return null
        const user = await getOrCreateGuestUser(guestId)
        await touchUser(user.id)
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role ?? 'normal'
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.role = (token.role as UserRole) ?? 'normal'
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  // Required when running behind a reverse proxy on a non-Vercel host —
  // without it Auth.js v5 rejects every request with UntrustedHost (500).
  trustHost: true,

  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
})
