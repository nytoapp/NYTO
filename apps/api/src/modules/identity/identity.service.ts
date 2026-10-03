import { randomUUID } from "node:crypto";
import { limits, type ApiEnv } from "@atlas/config";
import { ErrorCodes, type AuthSession } from "@atlas/contracts";
import { AppError } from "../../shared/http/app-error";
import {
  hashOtp,
  hashPassword,
  hashRefreshToken,
  newOtpCode,
  newRefreshToken,
  signAccessToken,
  verifyPassword,
} from "./crypto";
import { IdentityRepository, type DeviceInput } from "./identity.repository";
import { AppleTokenVerifier, GoogleTokenVerifier } from "./verifiers";

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly env: ApiEnv,
    private readonly google: GoogleTokenVerifier,
    private readonly apple: AppleTokenVerifier,
  ) {}

  async startPhone(phoneE164: string, requestId: string): Promise<{ challengeId: string; expiresInSeconds: number }> {
    this.assertCallingCode(phoneE164);
    await this.assertSendBudget("phone", phoneE164);
    return this.issueChallenge("phone", phoneE164, requestId);
  }

  async verifyPhone(phoneE164: string, code: string, device: DeviceInput, requestId: string): Promise<AuthSession> {
    const ok = await this.repository.takeChallenge("phone", phoneE164, hashOtp(code, this.env.AUTH_REFRESH_PEPPER));
    if (!ok) {
      await this.repository.audit("auth.phone_failed", requestId, null, null);
      throw new AppError(ErrorCodes.UNAUTHORIZED, "That code is not valid.", 401);
    }
    const existing = await this.repository.findByProvider("phone", phoneE164);
    if (existing) {
      const session = await this.repository.openSession(existing.userId, device);
      return this.issueSession(existing.userId, session.sessionId);
    }
    const created = await this.repository.createUserWithIdentity({
      provider: "phone",
      providerSubject: phoneE164,
      email: null,
      emailVerified: false,
      phone: phoneE164,
      passwordHash: null,
      displayName: null,
      device,
    });
    return this.issueSession(created.userId, created.sessionId);
  }

  async registerEmail(email: string, password: string, requestId: string): Promise<{ challengeId: string; expiresInSeconds: number }> {
    const normalized = email.toLowerCase();
    if (await this.repository.emailExists(normalized)) {
      return { challengeId: randomUUID(), expiresInSeconds: limits.otpTtlSeconds };
    }
    const passwordHash = await hashPassword(password);
    const issued = await this.issueChallenge("email", normalized, requestId, passwordHash);
    await this.repository.audit("auth.email_register_started", requestId, null, null);
    return issued;
  }

  async verifyEmail(email: string, code: string, device: DeviceInput, requestId: string): Promise<AuthSession> {
    const normalized = email.toLowerCase();
    const taken = await this.repository.takeChallenge("email", normalized, hashOtp(code, this.env.AUTH_REFRESH_PEPPER));
    if (!taken?.passwordHash) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "That code is not valid.", 401);
    }
    const passwordHash = taken.passwordHash;
    const created = await this.repository.createUserWithIdentity({
      provider: "email",
      providerSubject: normalized,
      email: normalized,
      emailVerified: true,
      phone: null,
      passwordHash,
      displayName: null,
      device,
    });
    await this.repository.audit("auth.email_verified", requestId, created.userId, created.userId);
    return this.issueSession(created.userId, created.sessionId);
  }

  async loginEmail(email: string, password: string, device: DeviceInput, requestId: string): Promise<AuthSession> {
    const identity = await this.repository.findEmailIdentity(email.toLowerCase());
    const matches = identity?.passwordHash ? await verifyPassword(password, identity.passwordHash) : false;
    if (!identity || !matches) {
      await this.repository.audit("auth.email_failed", requestId, null, null);
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Email or password is incorrect.", 401);
    }
    const session = await this.repository.openSession(identity.userId, device);
    return this.issueSession(identity.userId, session.sessionId);
  }

  async signInGoogle(idToken: string, nonce: string, device: DeviceInput, requestId: string): Promise<AuthSession> {
    if (this.googleAudiences().length === 0) {
      throw new AppError(ErrorCodes.AUTH_PROVIDER_NOT_CONFIGURED, "Google sign-in is not available.", 503);
    }
    const identity = await this.google.verify(idToken, nonce);
    return this.signInVerified("google", identity.subject, identity.emailVerified ? identity.email : null, identity.emailVerified, identity.name, device, requestId);
  }

  async signInApple(idToken: string, nonce: string, device: DeviceInput, requestId: string): Promise<AuthSession> {
    if (this.appleAudiences().length === 0) {
      throw new AppError(ErrorCodes.AUTH_PROVIDER_NOT_CONFIGURED, "Apple sign-in is not available.", 503);
    }
    const identity = await this.apple.verify(idToken, nonce);
    return this.signInVerified("apple", identity.subject, identity.emailVerified ? identity.email : null, identity.emailVerified, identity.name, device, requestId);
  }

  async linkGoogle(userId: string, idToken: string, nonce: string, requestId: string): Promise<{ status: "linked" | "exists" }> {
    if (this.googleAudiences().length === 0) {
      throw new AppError(ErrorCodes.AUTH_PROVIDER_NOT_CONFIGURED, "Google sign-in is not available.", 503);
    }
    const identity = await this.google.verify(idToken, nonce);
    const result = await this.repository.linkIdentity({
      userId,
      provider: "google",
      providerSubject: identity.subject,
      email: identity.emailVerified ? identity.email : null,
      emailVerified: identity.emailVerified,
    });
    if (result === "conflict") {
      throw new AppError(ErrorCodes.CONFLICT, "That Google account is already linked to someone else.", 409);
    }
    await this.repository.audit("auth.linked_google", requestId, userId, userId);
    return { status: result };
  }

  async logout(sessionId: string, requestId: string, userId: string): Promise<{ signedOut: true }> {
    await this.repository.revokeSession(sessionId, "logout");
    await this.repository.audit("auth.logout", requestId, userId, sessionId);
    return { signedOut: true };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const next = newRefreshToken();
    const rotated = await this.repository.rotateRefresh(hashRefreshToken(refreshToken, this.env.AUTH_REFRESH_PEPPER), hashRefreshToken(next, this.env.AUTH_REFRESH_PEPPER));
    if (rotated === "reuse" || !rotated) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Sign in again.", 401);
    }
    return this.tokens(rotated.userId, rotated.sessionId, next);
  }

  private async signInVerified(
    provider: "google" | "apple",
    subject: string,
    email: string | null,
    emailVerified: boolean,
    name: string | null,
    device: DeviceInput,
    requestId: string,
  ): Promise<AuthSession> {
    const existing = await this.repository.findByProvider(provider, subject);
    if (existing) {
      const session = await this.repository.openSession(existing.userId, device);
      await this.repository.audit(`auth.${provider}`, requestId, existing.userId, existing.userId);
      return this.issueSession(existing.userId, session.sessionId);
    }
    const created = await this.repository.createUserWithIdentity({
      provider,
      providerSubject: subject,
      email,
      emailVerified,
      phone: null,
      passwordHash: null,
      displayName: name,
      device,
    });
    await this.repository.audit(`auth.${provider}`, requestId, created.userId, created.userId);
    return this.issueSession(created.userId, created.sessionId);
  }

  private async issueChallenge(channel: "phone" | "email", target: string, requestId: string, pendingPasswordHash: string | null = null) {
    const code = this.env.NODE_ENV === "development" && this.env.AUTH_LOG_DEV_OTP ? "123456" : newOtpCode();
    const created = await this.repository.insertChallenge(channel, target, hashOtp(code, this.env.AUTH_REFRESH_PEPPER), pendingPasswordHash);
    if (this.env.AUTH_LOG_DEV_OTP && this.env.NODE_ENV === "development") {
      console.log(JSON.stringify({ level: "info", message: "dev auth code", requestId, channel, challengeId: created.id, code }));
    }
    return { challengeId: created.id, expiresInSeconds: limits.otpTtlSeconds };
  }

  private async assertSendBudget(channel: "phone" | "email", target: string): Promise<void> {
    const count = await this.repository.countRecentChallenges(channel, target);
    if (count >= limits.otpMaxSendsPerHour) {
      throw new AppError(ErrorCodes.RATE_LIMITED, "Too many codes were requested. Try again later.", 429, true);
    }
  }

  private assertCallingCode(phoneE164: string): void {
    const allowlist = this.env.PHONE_COUNTRY_ALLOWLIST.split(",").map((item) => item.trim()).filter(Boolean);
    if (allowlist.length === 0) {
      throw new AppError(ErrorCodes.AUTH_PROVIDER_NOT_CONFIGURED, "Phone sign-in is not available.", 503);
    }
    const digits = phoneE164.slice(1);
    const allowed = [...allowlist].sort((left, right) => right.length - left.length).some((code) => digits.startsWith(code));
    if (!allowed) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Phone sign-in is not available for that number.", 422);
    }
  }

  private googleAudiences(): string[] {
    return this.env.GOOGLE_CLIENT_IDS.split(",").map((item) => item.trim()).filter(Boolean);
  }

  private appleAudiences(): string[] {
    return this.env.APPLE_CLIENT_IDS.split(",").map((item) => item.trim()).filter(Boolean);
  }

  private async issueSession(userId: string, sessionId: string): Promise<AuthSession> {
    const refreshToken = newRefreshToken();
    await this.repository.storeRefresh(sessionId, hashRefreshToken(refreshToken, this.env.AUTH_REFRESH_PEPPER), randomUUID());
    return this.tokens(userId, sessionId, refreshToken);
  }

  private async tokens(userId: string, sessionId: string, refreshToken: string): Promise<AuthSession> {
    return {
      userId,
      refreshToken,
      accessToken: await signAccessToken(this.env.AUTH_JWT_SECRET, userId, sessionId),
      expiresInSeconds: limits.accessTokenTtlSeconds,
    };
  }
}
