import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

const router = Router();

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
      // Simple session token (in production, use proper JWT or session management)
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

// Signup endpoint with database storage
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role = "user" } = req.body;

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

    // Create new user in database
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role,
      },
    });

    console.log("User created successfully:", newUser.email);

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
