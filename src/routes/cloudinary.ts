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

// POST /api/cloudinary/upload - image upload endpoint (type-safe, returns void)
router.post(
  "/upload",
  upload.single("image"),
  function (req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) {
          res.status(500).json({ success: false, error: error.message });
          return;
        }
        if (!result) {
          res
            .status(500)
            .json({ success: false, error: "No result from Cloudinary" });
          return;
        }
        res.json({ success: true, url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  }
);

router.get("/videos/:endpoint", getVideo);

export default router;
