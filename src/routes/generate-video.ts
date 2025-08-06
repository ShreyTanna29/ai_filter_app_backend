import { Router, Request, Response, NextFunction } from 'express';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import dotenv from 'dotenv';
import axios, { AxiosResponse } from 'axios';

dotenv.config();

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Missing required Cloudinary configuration');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const router = Router();

// Define interfaces for better type safety
interface VideoGenerationRequest {
  imageUrl: string;
}

interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  cloudinaryId?: string;
  error?: string;
  details?: string;
}

// Generate video from feature endpoint
router.post<{ feature: string }, VideoGenerationResponse, VideoGenerationRequest>('/:feature', 
  async (req: Request<{ feature: string }, VideoGenerationResponse, VideoGenerationRequest>, 
         res: Response<VideoGenerationResponse>, 
         next: NextFunction): Promise<void> => {
    try {
      const { feature } = req.params;
      const { imageUrl } = req.body;

      if (!imageUrl) {
        res.status(400).json({ 
          success: false,
          error: 'Image URL is required' 
        });
        return;
      }

      // Call the feature endpoint
      const response = await axios.post(`https://your-api-base-url.com/api/${feature}`, {
        imageUrl
      });

      // Extract video URL from the nested response
      const videoUrl = response.data?.video?.url;
      if (!videoUrl) {
        throw new Error('Invalid response from feature endpoint: missing video.url');
      }

      // Download the video as a stream
      const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });

      // Upload the video stream to Cloudinary
      const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'generated-videos',
            public_id: `${feature}-${Date.now()}`,
            chunk_size: 6000000
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result as UploadApiResponse);
          }
        );
        videoResponse.data.pipe(uploadStream);
      });

      res.status(200).json({
        success: true,
        videoUrl: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id
      });
    } catch (error) {
      console.error('Error generating video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: 'Failed to generate video',
        details: errorMessage
      });
    }
  }
);

export default router;
