import { Router, Request, Response } from "express";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Plainly API configuration
const PLAINLY_API_BASE_URL =
  process.env.PLAINLY_API_BASE_URL || "https://api.plainlyvideos.com/api/v2";
const PLAINLY_API_KEY = process.env.PLAINLY_API_KEY;

// Helper to get Plainly authorization header
function getPlainlyHeaders() {
  if (!PLAINLY_API_KEY) {
    throw new Error("PLAINLY_API_KEY environment variable is not set");
  }
  return {
    Authorization: `ApiKey ${PLAINLY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateRenderBody {
  /** Required: The ID of the project to render */
  projectId: string;
  /** Optional: The ID of the template to use (defaults to project default) */
  templateId?: string;
  /** Optional: Parameters for resolving template parametrized layers */
  parameters?: Record<string, unknown>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/plainly/renders
 * Invoke a new render on Plainly by providing a projectId (and optionally templateId / parameters)
 */
router.post("/renders", async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectId, templateId, parameters }: CreateRenderBody = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }

    const payload: Record<string, unknown> = { projectId };
    if (templateId) payload.templateId = templateId;
    if (parameters) payload.parameters = parameters;

    const response = await axios.post(
      `${PLAINLY_API_BASE_URL}/renders`,
      payload,
      { headers: getPlainlyHeaders() },
    );

    return res.status(201).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: "Plainly API error",
        details: axiosError.response.data,
      });
    }
    console.error("Error creating Plainly render:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/plainly/renders/:renderId
 * Get the status and details of a specific render
 */
router.get(
  "/renders/:renderId",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { renderId } = req.params;

      const response = await axios.get(
        `${PLAINLY_API_BASE_URL}/renders/${renderId}`,
        { headers: getPlainlyHeaders() },
      );

      return res.status(200).json({
        success: true,
        data: response.data,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return res.status(axiosError.response.status).json({
          success: false,
          message: "Plainly API error",
          details: axiosError.response.data,
        });
      }
      console.error("Error fetching Plainly render:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

/**
 * GET /api/plainly/renders
 * List all renders
 */
router.get("/renders", async (req: Request, res: Response): Promise<any> => {
  try {
    const response = await axios.get(`${PLAINLY_API_BASE_URL}/renders`, {
      headers: getPlainlyHeaders(),
      params: req.query, // forward any query params (pagination, filters, etc.)
    });

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: "Plainly API error",
        details: axiosError.response.data,
      });
    }
    console.error("Error listing Plainly renders:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
