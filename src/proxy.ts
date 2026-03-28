import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Edge-safe proxy — uses only JWT decoding, no DB calls
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: [
    // Protect account and user API routes
    "/account/:path*",
    "/api/user/:path*",
    "/api/stripe/:path*",
  ],
};
