import { Router, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { requireAdmin } from "../middleware/roles";

dotenv.config();

const router = Router();

// EachLabs Flows API - Note: trailing slash is required for list endpoint
const EACHLABS_FLOWS_API_URL = "https://flows.eachlabs.ai/api/v1";
const EACHLABS_API_URL = "https://api.eachlabs.ai/v1";

// Helper to get EachLabs API headers
function getEachLabsHeaders() {
  const key = process.env.EACHLABS_API_KEY;
  if (!key) {
    throw new Error(
      "EACHLABS_API_KEY not set. Please configure your EachLabs API key in environment variables."
    );
  }
  return {
    "X-API-Key": key,
    "Content-Type": "application/json",
  };
}

// GET /api/workflows - List all AI workflows from EachLabs
router.get("/workflows", async (req: Request, res: Response): Promise<void> => {
  try {
    const headers = getEachLabsHeaders();

    // Note: EachLabs API requires trailing slash for the list endpoint
    const response = await axios.get(`${EACHLABS_FLOWS_API_URL}/`, {
      headers,
      timeout: 30000,
    });

    const data = response.data;

    if (data.status !== "success") {
      res.status(500).json({
        success: false,
        error: data.message || "Failed to fetch workflows",
      });
      return;
    }

    // Transform workflows data for frontend
    const workflows = (data.workflows || []).map((wf: any) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      thumbnail: wf.thumbnail_url,
      category: wf.category,
      inputs: wf.inputs || [],
      outputs: wf.outputs || [],
      premium: wf.premium || false,
      triggerCount: wf.trigger_count || 0,
      popularity: wf.popularity || 0,
      createdAt: wf.created_at,
      updatedAt: wf.updated_at,
    }));

    res.json({
      success: true,
      total: data.total || workflows.length,
      workflows,
    });
  } catch (error: any) {
    console.error("Error fetching workflows:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch workflows from EachLabs",
    });
  }
});

// GET /api/workflows/:id - Get a specific workflow details
router.get(
  "/workflows/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const headers = getEachLabsHeaders();

      // Fetch all workflows and find the specific one (EachLabs requires trailing slash)
      const response = await axios.get(`${EACHLABS_FLOWS_API_URL}/`, {
        headers,
        timeout: 30000,
      });

      const data = response.data;
      const workflow = (data.workflows || []).find((wf: any) => wf.id === id);

      if (!workflow) {
        res.status(404).json({
          success: false,
          error: "Workflow not found",
        });
        return;
      }

      res.json({
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          thumbnail: workflow.thumbnail_url,
          category: workflow.category,
          inputs: workflow.inputs || [],
          outputs: workflow.outputs || [],
          steps: workflow.steps || [],
          premium: workflow.premium || false,
          triggerCount: workflow.trigger_count || 0,
          popularity: workflow.popularity || 0,
          createdAt: workflow.created_at,
          updatedAt: workflow.updated_at,
        },
      });
    } catch (error: any) {
      console.error("Error fetching workflow details:", error.message);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch workflow details",
      });
    }
  }
);

// POST /api/workflows/:id/trigger - Trigger a workflow (Admin only)
router.post(
  "/workflows/:id/trigger",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { parameters, webhook_url } = req.body;
      const headers = getEachLabsHeaders();

      console.log(
        `[Workflow Trigger] Triggering workflow ${id} with parameters:`,
        parameters
      );

      const response = await axios.post(
        `${EACHLABS_FLOWS_API_URL}/${id}/trigger`,
        {
          parameters: parameters || {},
          webhook_url: webhook_url,
        },
        {
          headers,
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.status !== "success") {
        res.status(500).json({
          success: false,
          error: data.message || "Failed to trigger workflow",
        });
        return;
      }

      console.log(
        `[Workflow Trigger] Workflow ${id} triggered successfully, trigger_id: ${data.trigger_id}`
      );

      res.json({
        success: true,
        triggerId: data.trigger_id,
        message: data.message || "Workflow triggered successfully",
      });
    } catch (error: any) {
      console.error("Error triggering workflow:", error.message);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to trigger workflow",
      });
    }
  }
);

// GET /api/workflows/execution/:triggerId - Get workflow execution status
router.get(
  "/workflows/execution/:triggerId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { triggerId } = req.params;
      const headers = getEachLabsHeaders();

      // Poll the execution status
      const response = await axios.get(
        `${EACHLABS_API_URL}/prediction/${triggerId}`,
        {
          headers,
          timeout: 30000,
        }
      );

      const data = response.data;
      const status = data?.status?.toLowerCase();

      res.json({
        success: true,
        triggerId,
        status: status,
        output: data?.output,
        error: data?.error,
        createdAt: data?.created_at,
        completedAt: data?.completed_at,
      });
    } catch (error: any) {
      console.error("Error fetching execution status:", error.message);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch execution status",
      });
    }
  }
);

// POST /api/workflows/:id/trigger-and-poll - Trigger a workflow and poll for result (Admin only)
router.post(
  "/workflows/:id/trigger-and-poll",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { parameters } = req.body;
      const headers = getEachLabsHeaders();

      console.log(
        `[Workflow] Triggering workflow ${id} with parameters:`,
        parameters
      );

      // Step 1: Trigger the workflow
      const triggerResponse = await axios.post(
        `${EACHLABS_FLOWS_API_URL}/${id}/trigger`,
        {
          parameters: parameters || {},
        },
        {
          headers,
          timeout: 30000,
        }
      );

      const triggerData = triggerResponse.data;

      if (triggerData.status !== "success") {
        res.status(500).json({
          success: false,
          error: triggerData.message || "Failed to trigger workflow",
        });
        return;
      }

      const triggerId = triggerData.trigger_id;
      console.log(`[Workflow] Workflow triggered, trigger_id: ${triggerId}`);

      // Step 2: Poll for completion
      const maxAttempts = 120; // 4 minutes max (120 * 2 seconds)
      const intervalMs = 2000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const statusResponse = await axios.get(
          `${EACHLABS_API_URL}/prediction/${triggerId}`,
          {
            headers,
            timeout: 30000,
          }
        );

        const statusData = statusResponse.data;
        const status = statusData?.status?.toLowerCase();

        console.log(
          `[Workflow] Poll attempt ${attempt + 1}, status: ${status}`
        );

        if (
          status === "success" ||
          status === "succeeded" ||
          status === "completed"
        ) {
          console.log(`[Workflow] Workflow completed successfully`);
          res.json({
            success: true,
            triggerId,
            status: "completed",
            output: statusData?.output,
          });
          return;
        }

        if (
          status === "failed" ||
          status === "error" ||
          status === "cancelled"
        ) {
          console.error(`[Workflow] Workflow failed with status: ${status}`);
          res.status(500).json({
            success: false,
            error:
              statusData?.error ||
              statusData?.message ||
              `Workflow failed with status: ${status}`,
          });
          return;
        }

        // Still processing, wait and retry
        await new Promise((r) => setTimeout(r, intervalMs));
      }

      // Timed out
      res.status(408).json({
        success: false,
        triggerId,
        error: `Workflow execution timed out after ${
          (maxAttempts * intervalMs) / 1000
        } seconds. Check status with trigger ID.`,
      });
    } catch (error: any) {
      console.error("Error in trigger-and-poll:", error.message);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to execute workflow",
      });
    }
  }
);

export default router;
