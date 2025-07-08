import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import sgMail from "@sendgrid/mail";
import { PrismaClient } from "../generated/prisma";
import { otpStore } from "./otpStore";

const router = Router();
const prisma = new PrismaClient();

// Send OTP endpoint
router.post("/send-otp", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
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

// Admin login (OTP)
router.post(
  "/login-otp",
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    if (otpStore[email] !== otp) {
      res.status(401).json({ message: "Invalid OTP" });
      return;
    }
    delete otpStore[email];
    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.json({
      message: "OTP login successful",
      user: { email: user.email, role: user.role },
    });
  }
);

// Admin login (email/password)
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
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
  req.session.user = { id: user.id, email: user.email, role: user.role };
  res.json({
    message: "Login successful",
    user: { email: user.email, role: user.role },
  });
});

// Logout
router.post("/logout", (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: "Logout failed" });
      return;
    }
    res.json({ message: "Logged out" });
  });
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
