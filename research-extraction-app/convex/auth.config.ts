// Tells Convex to trust JWTs issued by your Clerk instance.
// CLERK_JWT_ISSUER_DOMAIN is the issuer URL from your Clerk JWT template
// named "convex" (e.g. https://moving-coyote-12.clerk.accounts.dev).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex'
    }
  ]
};
