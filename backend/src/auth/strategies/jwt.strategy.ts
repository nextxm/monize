import { Strategy } from "passport-strategy";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthService } from "../auth.service";
import { PatService } from "../pat.service";

/**
 * Extract token from request - tries Authorization header first, then auth_token cookie
 */
const extractTokenFromRequest = (req: Request): string | null => {
  // Try Authorization header first (Bearer token)
  const authorization = req.headers?.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    const bearerToken = authorization.slice(7).trim();
    if (bearerToken) {
      return bearerToken;
    }
  }

  // Fall back to httpOnly cookie
  if (req.cookies && req.cookies["auth_token"]) {
    return req.cookies["auth_token"];
  }

  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private readonly jwtSecret: string;

  constructor(
    configService: ConfigService,
    private authService: AuthService,
    private patService: PatService,
    private jwtService: JwtService,
  ) {
    const jwtSecret = configService.get<string>("JWT_SECRET");

    // SECURITY: Fail startup if JWT_SECRET is missing or too short.
    // A weak secret undermines all JWT signature verification.
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error(
        "JWT_SECRET environment variable must be at least 32 characters. " +
          "Generate one with: openssl rand -base64 32",
      );
    }

    super();
    this.jwtSecret = jwtSecret;
  }

  async authenticate(req: Request): Promise<void> {
    const token = extractTokenFromRequest(req);
    if (!token) {
      this.fail(new UnauthorizedException("No auth token"), 401);
      return;
    }

    try {
      if (token.startsWith("pat_")) {
        const validatedToken = await this.patService.validateToken(token);
        const user = await this.authService.getUserById(validatedToken.userId);

        if (!user || !user.isActive) {
          throw new UnauthorizedException("User not found or inactive");
        }

        this.success({ ...user, patScopes: validatedToken.scopes });
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
        algorithms: ["HS256"],
      });
      const user = await this.validate(payload);
      this.success(user);
    } catch {
      this.fail(new UnauthorizedException("Invalid token"), 401);
    }
  }

  async validate(payload: any) {
    // SECURITY: Reject 2FA pending tokens — they should only be used at /auth/2fa/verify
    if (payload.type === "2fa_pending") {
      throw new UnauthorizedException("2FA verification required");
    }
    const user = await this.authService.getUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }
    return user;
  }
}
