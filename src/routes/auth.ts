import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import sgMail from "@sendgrid/mail";
import { PrismaClient } from "../generated/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Temporary in-memory OTP store (for demo, should use DB or cache in production)
const otpStore: { [email: string]: string } = {};

// Send OTP endpoint
router.post("/send-otp", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || "noreply@example.com",
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}`,
    html: `<strong>Your OTP code is: ${otp}</strong>`,
  };
  try {
    await sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
    await sgMail.send(msg);
    res.json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error });
  }
});

// Admin login (OTP) - JWT version
router.post(
  "/login-otp",
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    if (otpStore[email] !== otp) {
      res.status(401).json({ message: "Invalid OTP" });
      return;
    }
    delete otpStore[email]; // Invalidate OTP after use

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      message: "OTP login successful",
      user: { email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  }
);

// Admin login (email/password) - JWT version
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token in database
  await storeRefreshToken(user.id, refreshToken);

  res.json({
    message: "Login successful",
    user: { email: user.email, role: user.role },
    accessToken,
    refreshToken,
  });
});

// Refresh token endpoint
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(403).json({ message: "Invalid refresh token" });
      return;
    }

    // Validate refresh token from database
    const isValid = await validateRefreshToken(decoded.id, refreshToken);
    if (!isValid) {
      res.status(403).json({ message: "Refresh token not found in database" });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Store new refresh token
    await storeRefreshToken(user.id, newRefreshToken);

    res.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to refresh token", error });
  }
});

// Logout - JWT version
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded) {
        await revokeRefreshToken(decoded.id);
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  res.json({ message: "Logged out successfully" });
});

// User signup endpoint
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    res.status(400).json({ message: "Email, password, and role are required" });
    return;
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(409).json({ message: "User with this email already exists" });
    return;
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });
    res.status(201).json({
      message: "User registered successfully",
      user: { email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to register user", error });
  }
});

export default router;
