import NextAuth, { AuthOptions, SessionStrategy, User } from "next-auth";
import CredentialsProvider, { CredentialsConfig } from "next-auth/providers/credentials";
import { CredentialInput } from "next-auth/providers";
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getTrialDaysLeft } from '@/lib/auth';

// Definim un tip extins pentru User
interface CustomUser extends User {
  id: string;
  role?: string | null;
  subscription?: string | null;
  image?: string | null;
  trialOffered?: boolean;
  trialExpires?: string | null;
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
          image: user.image || null,
          trialOffered: user.trialOffered || false,
          trialExpires: user.trialExpires || null
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
        token.trialOffered = (user as CustomUser).trialOffered;
        token.trialExpires = (user as CustomUser).trialExpires;
      }
      
      // Verificăm dacă trial-ul a expirat
      if (token.subscription === 'trial' && token.trialExpires) {
        const now = new Date();
        const trialExpires = new Date(token.trialExpires);
        
        if (now > trialExpires) {
          // Actualizăm utilizatorul la abonament free
          await prisma.user.update({
            where: { id: token.id as string },
            data: { 
              subscription: 'free',
              trialExpires: null
            }
          });
          
          // Actualizăm token-ul
          token.subscription = 'free';
          token.trialExpires = null;
        }
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
            image: true,
            trialOffered: true,
            trialExpires: true
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
    strategy: "jwt" as SessionStrategy
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };