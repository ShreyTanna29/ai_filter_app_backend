import { Router, Request, Response } from "express";
import { verifyAccessToken, requireRole, ROLES } from "../middleware/auth";

const router = Router();

router.get(
  "/dashboard",
  verifyAccessToken,
  requireRole(ROLES.ADMIN),
  (req: Request, res: Response) => {
    res.json({
      message: "Welcome to the admin dashboard!",
      user: req.user,
    });
  }
);

export default router;
