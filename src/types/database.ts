/**
 * Hand-written AMVS_ auth types.
 * Expand as profile tables are added in later phases.
 */

export type AmvsRole = "user" | "admin";

export type AmvsUser = {
  Id: string;
  Username: string;
  PasswordHash: string;
  Email: string | null;
  DisplayName: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
};

export type AmvsUserRole = {
  Id: string;
  UserId: string;
  Role: AmvsRole;
  CreatedAt: string;
};

export type AmvsSession = {
  Id: string;
  UserId: string;
  TokenHash: string;
  ExpiresAt: string;
  RevokedAt: string | null;
  CreatedAt: string;
  UserAgent: string | null;
  IpAddress: string | null;
};
