import { Router, Request, Response, RequestHandler } from "express";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint to get video by endpoint name
const getVideo: RequestHandler = async (req, res) => {
  try {
    const endpoint = req.params["endpoint"];

    if (!endpoint) {
      res.status(400).json({
        success: false,
        message: "Endpoint parameter is required",
      });
      return;
    }

    // Construct the Cloudinary URL with the correct format
    const videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1754319544/generated-videos/generated-videos/${endpoint}.mp4`;

    // Redirect to the Cloudinary URL
    res.redirect(videoUrl);
    return;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error fetching video from Cloudinary:", errorMessage);

    res.status(500).json({
      success: false,
      message: "Error fetching video",
      error: errorMessage,
    });
    return;
  }
};

// POST /api/cloudinary/upload - image upload endpoint
// Accepts multipart/form-data with field "image" OR JSON body with { url }
router.post(
  "/upload",
  upload.single("image"),
  async function (req: Request, res: Response) {
    try {
      // If a direct URL is provided (fallback path)
      const urlFromBody = (req.body && (req.body as any).url) as
        | string
        | undefined;

      if (!req.file && !urlFromBody) {
        res
          .status(400)
          .json({ success: false, error: "No file uploaded or url provided" });
        return;
      }

      // 1) If URL provided, let Cloudinary pull it
      if (urlFromBody) {
        try {
          const result = await cloudinary.uploader.upload(urlFromBody, {
            resource_type: "image",
            folder: "uploads",
            use_filename: true,
          });
          res.json({ success: true, url: result.secure_url });
          return;
        } catch (e: any) {
          console.error("Cloudinary URL upload error:", e?.message || e);
          res
            .status(500)
            .json({ success: false, error: e?.message || String(e) });
          return;
        }
      }

      // 2) Multipart upload via stream with fallback to data URI
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file uploaded" });
        return;
      }

      const attemptStreamUpload = () =>
        new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "uploads",
              use_filename: true,
            },
            (error, result) => {
              if (error) return reject(error);
              if (!result)
                return reject(new Error("No result from Cloudinary"));
              resolve(result);
            }
          );
          stream.end(req.file!.buffer);
        });

      try {
        const result = await attemptStreamUpload();
        res.json({ success: true, url: result.secure_url });
        return;
      } catch (primaryErr: any) {
        console.error(
          "Cloudinary stream upload error:",
          primaryErr?.message || primaryErr
        );
        // Fallback: data URI upload
        try {
          const base64 = req.file.buffer.toString("base64");
          const dataUri = `data:${req.file.mimetype};base64,${base64}`;
          const result = await cloudinary.uploader.upload(dataUri, {
            resource_type: "image",
            folder: "uploads",
            use_filename: true,
          });
          res.json({ success: true, url: result.secure_url });
          return;
        } catch (fallbackErr: any) {
          console.error(
            "Cloudinary data URI upload error:",
            fallbackErr?.message || fallbackErr
          );
          res.status(500).json({
            success: false,
            error:
              fallbackErr?.message || primaryErr?.message || "Upload failed",
          });
          return;
        }
      }
    } catch (err: any) {
      console.error("Unexpected Cloudinary upload error:", err?.message || err);
      res
        .status(500)
        .json({ success: false, error: err?.message || "Internal error" });
    }
  }
);

router.get("/videos/:endpoint", getVideo);

export default router;
