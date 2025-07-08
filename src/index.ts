import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcryptjs";
import { PrismaClient } from "./generated/prisma";
import sgMail from "@sendgrid/mail";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import facetrixfiltersRouter from "./filters/filter_endpoints";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  })
);

// Extend session type to include user
import { SessionData } from "express-session";
declare module "express-session" {
  interface SessionData {
    user?: { id: number; email: string; role: string };
  }
}

// User roles
const ROLES = {
  ADMIN: "admin",
  SUB_ADMIN: "sub-admin",
  RESELLER: "reseller",
};

const prisma = new PrismaClient();

// Middleware for role-based access
function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.session && req.session.user && req.session.user.role === role) {
      next();
      return;
    }
    res.status(403).json({ message: "Forbidden: insufficient role" });
  };
}

// Temporary in-memory OTP store (for demo, should use DB or cache in production)
const otpStore: { [email: string]: string } = {};

// Send OTP endpoint
app.post(
  "/auth/send-otp",
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;
    // Send email
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
      console.log(error);

      res.status(500).json({ message: "Failed to send OTP", error });
    }
  }
);

// Admin login (OTP)
app.post(
  "/auth/login-otp",
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
    delete otpStore[email]; // Invalidate OTP after use
    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.json({
      message: "OTP login successful",
      user: { email: user.email, role: user.role },
    });
  }
);

// Admin login (email/password)
app.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
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
app.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: "Logout failed" });
      return;
    }
    res.json({ message: "Logged out" });
  });
});

// Protected route example
app.get(
  "/admin/dashboard",
  requireRole(ROLES.ADMIN),
  (req: Request, res: Response) => {
    res.json({ message: "Welcome to the admin dashboard!" });
  }
);

// User signup endpoint
app.post("/auth/signup", async (req: Request, res: Response): Promise<void> => {
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

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/api", facetrixfiltersRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, world!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
