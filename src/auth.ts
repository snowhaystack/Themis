import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { getUserByEmail, createUser, verifyPassword, touchUser } from '@/lib/redis/users'
import type { UserRole } from '@/lib/types/user'

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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        if (!user.email) return false
        let dbUser = await getUserByEmail(user.email)
        if (!dbUser) {
          dbUser = await createUser({
            email: user.email,
            name: user.name ?? undefined,
            role: 'normal',
            provider: account.provider as 'google' | 'github',
          })
        }
        await touchUser(dbUser.id)
        user.id = dbUser.id
        user.role = dbUser.role
      }
      return true
    },

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

  secret: process.env.NEXTAUTH_SECRET,
})
