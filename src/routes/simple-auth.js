"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// Login endpoint with database authentication
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const user = yield prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            console.log("User not found:", email);
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        // Compare password with hashed password in database
        const passwordMatch = yield bcryptjs_1.default.compare(password, user.password);
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
        }
        else {
            console.log("Invalid password");
            res.status(401).json({ message: "Invalid credentials" });
        }
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed" });
    }
}));
// Signup endpoint with database storage
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existingUser) {
            res.status(409).json({ message: "User with this email already exists" });
            return;
        }
        // Hash the password
        const saltRounds = 12;
        const hashedPassword = yield bcryptjs_1.default.hash(password, saltRounds);
        // Create new user in database with 'user' role
        const newUser = yield prisma_1.default.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                role: role,
            },
        });
        console.log("User created successfully:", newUser.email, "with role:", newUser.role);
        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
            },
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        // Handle Prisma unique constraint error
        if (error.code === "P2002") {
            res.status(409).json({ message: "User with this email already exists" });
        }
        else {
            res.status(500).json({ message: "Signup failed" });
        }
    }
}));
// Logout endpoint
router.post("/logout", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: "Logged out successfully" });
}));
exports.default = router;
