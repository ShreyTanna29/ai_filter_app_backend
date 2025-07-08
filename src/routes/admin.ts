import { Router, Request, Response } from "express";
import { requireRole, ROLES } from "../middleware/roles";

const router = Router();

router.get(
  "/dashboard",
  requireRole(ROLES.ADMIN),
  (req: Request, res: Response) => {
    res.json({ message: "Welcome to the admin dashboard!" });
  }
);

export default router;
