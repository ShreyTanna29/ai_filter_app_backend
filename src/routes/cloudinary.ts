import { Router, Request, Response, RequestHandler } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const router = Router();

// Endpoint to get video by endpoint name
const getVideo: RequestHandler = async (req, res) => {
  try {
    const endpoint = req.params['endpoint'];
    
    if (!endpoint) {
      res.status(400).json({ 
        success: false, 
        message: 'Endpoint parameter is required' 
      });
      return;
    }
    
    // Construct the Cloudinary URL with the correct format
    const videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/v1754319544/generated-videos/generated-videos/${endpoint}.mp4`;

    // Redirect to the Cloudinary URL
    res.redirect(videoUrl);
    return;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching video from Cloudinary:', errorMessage);
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching video',
      error: errorMessage
    });
    return;
  }
};

router.get('/videos/:endpoint', getVideo);

export default router;
