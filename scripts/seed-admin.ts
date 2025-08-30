import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
    });

    if (existingAdmin) {
      console.log("Admin user already exists!");
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);

    const adminUser = await prisma.user.create({
      data: {
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
      },
    });

    console.log("Admin user created successfully!");
    console.log("Email: admin@example.com");
    console.log("Password: admin123");
    console.log("Role: admin");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdminUser();
