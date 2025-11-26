import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const router = Router();

// Temporary storage for pending 2FA verifications (in production, use Redis or similar)
const pending2FAVerifications: Map<
  string,
  { email: string; token: string; expiresAt: number }
> = new Map();

// Clean up expired pending verifications every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pending2FAVerifications.entries()) {
    if (value.expiresAt < now) {
      pending2FAVerifications.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Login endpoint with database authentication
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", {
      email,
      password: password ? "***" : "empty",
    });

    if (!email || !password) {
      console.log("Missing email or password");
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log("User not found:", email);
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Compare password with hashed password in database
    const passwordMatch = await bcrypt.compare(password, user.password);

    console.log("Comparing credentials:", {
      provided: email,
      userFound: !!user,
      passwordMatch: passwordMatch,
    });

    if (passwordMatch) {
      // Check if user is admin and needs 2FA
      if (user.role === "admin") {
        // If 2FA is enabled, require TOTP verification
        if (user.totpEnabled && user.totpSecret) {
          // Generate a temporary token for 2FA verification
          const tempToken = Buffer.from(
            `2fa:${email}:${Date.now()}:${Math.random()}`
          ).toString("base64");

          // Store pending verification (expires in 5 minutes)
          pending2FAVerifications.set(tempToken, {
            email: user.email,
            token: tempToken,
            expiresAt: Date.now() + 5 * 60 * 1000,
          });

          console.log("Admin requires 2FA verification");
          res.json({
            message: "2FA verification required",
            requires2FA: true,
            tempToken: tempToken,
            user: { email: user.email, role: user.role },
          });
          return;
        }

        // If 2FA is not set up yet, require setup
        if (!user.totpEnabled) {
          // Generate a temporary token for 2FA setup
          const tempToken = Buffer.from(
            `setup:${email}:${Date.now()}:${Math.random()}`
          ).toString("base64");

          // Store pending setup (expires in 10 minutes)
          pending2FAVerifications.set(tempToken, {
            email: user.email,
            token: tempToken,
            expiresAt: Date.now() + 10 * 60 * 1000,
          });

          console.log("Admin requires 2FA setup");
          res.json({
            message: "2FA setup required for admin accounts",
            requires2FASetup: true,
            tempToken: tempToken,
            user: { email: user.email, role: user.role },
          });
          return;
        }
      }

      // For non-admin users or if somehow we get here, proceed with normal login
      const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

      console.log("Login successful, sending token");
      res.json({
        message: "Login successful",
        accessToken: token,
        user: { email: user.email, role: user.role },
      });
    } else {
      console.log("Invalid password");
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Generate TOTP secret and QR code for admin 2FA setup
router.post(
  "/2fa/setup",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tempToken } = req.body;

      if (!tempToken) {
        res.status(400).json({ message: "Temporary token is required" });
        return;
      }

      // Verify temp token
      const pending = pending2FAVerifications.get(tempToken);
      if (!pending || pending.expiresAt < Date.now()) {
        pending2FAVerifications.delete(tempToken);
        res
          .status(401)
          .json({ message: "Session expired, please login again" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: pending.email },
      });

      if (!user || user.role !== "admin") {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }

      // Generate new TOTP secret
      const secret = authenticator.generateSecret();

      // Generate otpauth URL for QR code
      const appName = "AI Filters Admin";
      const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      // Store the secret temporarily (will be confirmed when user verifies)
      // We'll store it in the pending verification
      pending2FAVerifications.set(tempToken, {
        ...pending,
        secret: secret,
      } as any);

      console.log("2FA setup initiated for:", user.email);
      res.json({
        success: true,
        qrCode: qrCodeDataUrl,
        secret: secret, // Show secret for manual entry
        message: "Scan the QR code with Google Authenticator",
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ message: "2FA setup failed" });
    }
  }
);

// Verify TOTP code and complete 2FA setup
router.post(
  "/2fa/setup/verify",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tempToken, totpCode } = req.body;

      if (!tempToken || !totpCode) {
        res
          .status(400)
          .json({ message: "Temporary token and TOTP code are required" });
        return;
      }

      // Verify temp token
      const pending = pending2FAVerifications.get(tempToken) as any;
      if (!pending || pending.expiresAt < Date.now() || !pending.secret) {
        pending2FAVerifications.delete(tempToken);
        res
          .status(401)
          .json({ message: "Session expired, please login again" });
        return;
      }

      // Verify the TOTP code
      const isValid = authenticator.verify({
        token: totpCode,
        secret: pending.secret,
      });

      if (!isValid) {
        res.status(400).json({ message: "Invalid verification code" });
        return;
      }

      // Save the secret and enable 2FA
      const user = await prisma.user.update({
        where: { email: pending.email },
        data: {
          totpSecret: pending.secret,
          totpEnabled: true,
        },
      });

      // Clean up pending verification
      pending2FAVerifications.delete(tempToken);

      // Generate final access token
      const accessToken = Buffer.from(`${user.email}:${Date.now()}`).toString(
        "base64"
      );

      console.log("2FA setup completed for:", user.email);
      res.json({
        success: true,
        message: "2FA setup complete. You are now logged in.",
        accessToken: accessToken,
        user: { email: user.email, role: user.role },
      });
    } catch (error) {
      console.error("2FA setup verification error:", error);
      res.status(500).json({ message: "2FA verification failed" });
    }
  }
);

// Verify TOTP code for login
router.post(
  "/2fa/verify",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tempToken, totpCode } = req.body;

      if (!tempToken || !totpCode) {
        res
          .status(400)
          .json({ message: "Temporary token and TOTP code are required" });
        return;
      }

      // Verify temp token
      const pending = pending2FAVerifications.get(tempToken);
      if (!pending || pending.expiresAt < Date.now()) {
        pending2FAVerifications.delete(tempToken);
        res
          .status(401)
          .json({ message: "Session expired, please login again" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: pending.email },
      });

      if (!user || !user.totpSecret) {
        res.status(400).json({ message: "2FA not configured" });
        return;
      }

      // Verify the TOTP code
      const isValid = authenticator.verify({
        token: totpCode,
        secret: user.totpSecret,
      });

      if (!isValid) {
        res.status(400).json({ message: "Invalid verification code" });
        return;
      }

      // Clean up pending verification
      pending2FAVerifications.delete(tempToken);

      // Generate final access token
      const accessToken = Buffer.from(`${user.email}:${Date.now()}`).toString(
        "base64"
      );

      console.log("2FA verification successful for:", user.email);
      res.json({
        success: true,
        message: "Login successful",
        accessToken: accessToken,
        user: { email: user.email, role: user.role },
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      res.status(500).json({ message: "2FA verification failed" });
    }
  }
);

// Signup endpoint with database storage
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    // Force all new signups to have 'user' role by default (admins must be created separately in DB)
    const role = "user";

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(409).json({ message: "User with this email already exists" });
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user in database with 'user' role
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role,
      },
    });

    console.log(
      "User created successfully:",
      newUser.email,
      "with role:",
      newUser.role
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);

    // Handle Prisma unique constraint error
    if (error.code === "P2002") {
      res.status(409).json({ message: "User with this email already exists" });
    } else {
      res.status(500).json({ message: "Signup failed" });
    }
  }
});

// Logout endpoint
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

export default router;
