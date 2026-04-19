import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const providers = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID || "",
    clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
  }),
] as NextAuthConfig["providers"];

export default {
  providers,
  secret: process.env.AUTH_SECRET || "development-secret",
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
