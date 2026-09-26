export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      correlationId: string;
      user?: {
        userId: string;
        sessionId: string;
        roles: string[];
      };
    }
  }
}
