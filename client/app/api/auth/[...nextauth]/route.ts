import NextAuth, { AuthOptions, SessionStrategy, User } from "next-auth";
import CredentialsProvider, { CredentialsConfig } from "next-auth/providers/credentials";
import { CredentialInput } from "next-auth/providers";
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

// Definim un tip extins pentru User
interface CustomUser extends User {
  id: string;
  role?: string | null;
  subscription?: string | null;
  image?: string | null;
}

// Definim tipul pentru credentialele noastre
interface CustomCredentials extends Record<string, CredentialInput> {
  email: CredentialInput;
  password: CredentialInput;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      } as CustomCredentials,
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || null,
          subscription: user.subscription || null,
          image: user.image || null
        } as CustomUser;
      }
    }) as CredentialsConfig<CustomCredentials>
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as CustomUser).role;
        token.subscription = (user as CustomUser).subscription;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            role: true,
            subscription: true,
            name: true,
            email: true,
            image: true
          }
        });

        if (dbUser) {
          session.user = {
            ...session.user,
            ...dbUser
          };
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: "jwt" as SessionStrategy // Tip explicit
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };