import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { VALIDATION } from '@taskbuddy/shared';

export const authRouter = Router();

// Validation schemas
const registerSchema = z.object({
  familyName: z.string().min(2).max(100),
  parent: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    password: z.string().min(VALIDATION.PASSWORD.MIN_LENGTH),
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const childLoginSchema = z.object({
  familyId: z.string().uuid(),
  childIdentifier: z.string().min(1),
  pin: z.string().regex(VALIDATION.PIN.PATTERN, 'PIN must be exactly 4 digits'),
  deviceId: z.string().optional(),
});

const setupPinSchema = z.object({
  childId: z.string().uuid(),
  pin: z.string().regex(VALIDATION.PIN.PATTERN, 'PIN must be exactly 4 digits'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(VALIDATION.PASSWORD.MIN_LENGTH),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// POST /auth/register - Register new family
authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login - Login (parent)
authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/child/login - Child login with PIN
authRouter.post('/child/login', validateBody(childLoginSchema), async (req, res, next) => {
  try {
    const result = await authService.childLogin(req.body);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/child/pin/setup - Set up PIN for child
authRouter.post('/child/pin/setup', authenticate, validateBody(setupPinSchema), async (req, res, next) => {
  try {
    await authService.setupPin(req.body.childId, req.body.pin, req.user!.userId);

    res.json({
      success: true,
      data: { message: 'PIN set up successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/refresh - Refresh access token
authRouter.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    // Try to get refresh token from cookie first, then body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const tokens = await authService.refreshToken(refreshToken);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout - Logout
authRouter.post('/logout', (_req, res) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

// PUT /auth/password - Change password
authRouter.put('/password', authenticate, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    await authService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me - Get current user
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});
