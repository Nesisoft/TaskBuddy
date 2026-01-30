import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './database';
import { config } from '../config';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../middleware/errorHandler';
import type { TokenPayload } from '../middleware/auth';
import { getAgeGroup } from '@taskbuddy/shared';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  familyName: string;
  parent: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChildLoginInput {
  familyId: string;
  childIdentifier: string;
  pin: string;
  deviceId?: string;
}

export interface AddChildInput {
  familyId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  username?: string;
  pin?: string;
  createdBy: string;
}

export class AuthService {
  // Register a new family with parent account
  async register(input: RegisterInput) {
    const { familyName, parent } = input;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parent.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(parent.password, SALT_ROUNDS);

    // Create family and parent user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create family
      const family = await tx.family.create({
        data: { familyName },
      });

      // Create parent user
      const user = await tx.user.create({
        data: {
          familyId: family.id,
          email: parent.email.toLowerCase(),
          passwordHash,
          role: 'parent',
          firstName: parent.firstName,
          lastName: parent.lastName,
        },
      });

      // Create default family settings
      await tx.familySettings.create({
        data: { familyId: family.id },
      });

      return { family, user };
    });

    // Generate tokens
    const tokens = this.generateTokens({
      userId: result.user.id,
      familyId: result.family.id,
      role: result.user.role,
    });

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = result.user;

    return {
      family: result.family,
      user: userWithoutPassword,
      tokens,
    };
  }

  // Parent login with email/password
  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        family: true,
        childProfile: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      familyId: user.familyId,
      role: user.role,
      ageGroup: user.childProfile?.ageGroup || undefined,
    });

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      profile: user.childProfile,
      tokens,
    };
  }

  // Child login with PIN
  async childLogin(input: ChildLoginInput) {
    const { familyId, childIdentifier, pin } = input;

    // Find child by family and identifier (firstName or username)
    const user = await prisma.user.findFirst({
      where: {
        familyId,
        role: 'child',
        deletedAt: null,
        OR: [
          { firstName: { equals: childIdentifier, mode: 'insensitive' } },
          { username: { equals: childIdentifier, mode: 'insensitive' } },
        ],
      },
      include: {
        childProfile: true,
      },
    });

    if (!user || !user.childProfile) {
      throw new NotFoundError('Child not found');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked');
    }

    // Verify PIN
    if (!user.childProfile.pinHash) {
      throw new UnauthorizedError('PIN not set up for this account');
    }

    const isValid = await bcrypt.compare(pin, user.childProfile.pinHash);
    if (!isValid) {
      // TODO: Track failed attempts and lock account
      throw new UnauthorizedError('Invalid PIN');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      familyId: user.familyId,
      role: user.role,
      ageGroup: user.childProfile.ageGroup || undefined,
    });

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;
    const { pinHash: __, ...profileWithoutPin } = user.childProfile;

    return {
      user: userWithoutPassword,
      profile: profileWithoutPin,
      tokens,
    };
  }

  // Add a child to the family
  async addChild(input: AddChildInput) {
    const { familyId, firstName, lastName, dateOfBirth, username, pin, createdBy } = input;

    // Verify creator is parent in same family
    const creator = await prisma.user.findUnique({
      where: { id: createdBy },
    });

    if (!creator || creator.familyId !== familyId || creator.role !== 'parent') {
      throw new UnauthorizedError('Not authorized to add children to this family');
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
      });
      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }
    }

    // Determine age group
    const ageGroup = getAgeGroup(dateOfBirth);
    if (!ageGroup) {
      throw new ValidationError('Child must be between 10-16 years old');
    }

    // Hash PIN if provided
    let pinHash: string | undefined;
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        throw new ValidationError('PIN must be exactly 4 digits');
      }
      pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    }

    // Create child user and profile
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          familyId,
          role: 'child',
          firstName,
          lastName,
          username: username?.toLowerCase(),
        },
      });

      const profile = await tx.childProfile.create({
        data: {
          userId: user.id,
          dateOfBirth,
          ageGroup: ageGroup === '10-12' ? 'YOUNGER' : 'OLDER',
          pinHash,
        },
      });

      return { user, profile };
    });

    // Remove sensitive data
    const { pinHash: _, ...profileWithoutPin } = result.profile;

    return {
      user: result.user,
      profile: profileWithoutPin,
    };
  }

  // Set up PIN for a child
  async setupPin(childId: string, pin: string, parentId: string) {
    // Verify parent owns this child
    const [child, parent] = await Promise.all([
      prisma.user.findUnique({
        where: { id: childId },
        include: { childProfile: true },
      }),
      prisma.user.findUnique({
        where: { id: parentId },
      }),
    ]);

    if (!child || !child.childProfile) {
      throw new NotFoundError('Child not found');
    }

    if (!parent || child.familyId !== parent.familyId || parent.role !== 'parent') {
      throw new UnauthorizedError('Not authorized to set PIN for this child');
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      throw new ValidationError('PIN must be exactly 4 digits');
    }

    // Hash and store PIN
    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    await prisma.childProfile.update({
      where: { userId: childId },
      data: { pinHash },
    });
  }

  // Change password for parent user
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'parent') {
      throw new UnauthorizedError('Only parents can change passwords');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash and save new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // Refresh access token
  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as TokenPayload & { type: string };

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Get user to check if still valid
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { childProfile: true },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedError('User no longer active');
      }

      // Generate new tokens
      return this.generateTokens({
        userId: user.id,
        familyId: user.familyId,
        role: user.role,
        ageGroup: user.childProfile?.ageGroup || undefined,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        family: true,
        childProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;
    const profile = user.childProfile
      ? { ...user.childProfile, pinHash: undefined }
      : undefined;

    return {
      ...userWithoutPassword,
      childProfile: profile,
    };
  }

  // Generate JWT tokens
  private generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Parse expiry for response
    const decoded = jwt.decode(accessToken) as { exp: number };
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }
}

export const authService = new AuthService();
