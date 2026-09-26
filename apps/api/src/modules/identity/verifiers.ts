import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ErrorCodes } from "@atlas/contracts";
import { AppError } from "../../shared/http/app-error";

export type VerifiedIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export class GoogleTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly audiences: string[]) {}

  async verify(idToken: string, nonce: string): Promise<VerifiedIdentity> {
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.audiences });
    const payload = ticket.getPayload();
    if (!payload?.sub || payload.nonce !== nonce) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Google sign-in could not be verified.", 401);
    }
    return {
      subject: payload.sub,
      email: payload.email ?? null,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
    };
  }
}

export class AppleTokenVerifier {
  constructor(private readonly audiences: string[]) {}

  async verify(idToken: string, nonce: string): Promise<VerifiedIdentity> {
    try {
      const { payload } = await jwtVerify(idToken, appleJwks, {
        issuer: "https://appleid.apple.com",
        audience: this.audiences,
        algorithms: ["RS256"],
      });
      if (typeof payload.sub !== "string" || payload.nonce !== nonce) {
        throw new Error("invalid apple token");
      }
      return {
        subject: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
        emailVerified: payload.email_verified === true || payload.email_verified === "true",
        name: null,
      };
    } catch {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Apple sign-in could not be verified.", 401);
    }
  }
}
