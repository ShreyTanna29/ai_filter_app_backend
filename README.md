# AI Video Generation API

This API provides a large set of POST endpoints for generating short AI-powered videos from a single image and a descriptive prompt, using Alibaba Cloud Model Studio's `wan2.1-i2v-turbo` model. Each endpoint corresponds to a unique theme or transformation.

---

## Table of Contents

- [AI Video Generation API](#ai-video-generation-api)
  - [Table of Contents](#table-of-contents)
  - [Base URL](#base-url)
  - [Environment Variables](#environment-variables)
  - [Request](#request)
    - [Method](#method)
    - [Content-Type](#content-type)
    - [Body Parameters](#body-parameters)
    - [Image Requirements](#image-requirements)
    - [Image URL Examples](#image-url-examples)
  - [Response](#response)
    - [Success Response](#success-response)
    - [Response Fields](#response-fields)
  - [Example Request (cURL)](#example-request-curl)
  - [Available Endpoints](#available-endpoints)
  - [Error Codes](#error-codes)
  - [Notes](#notes)
  - [Example Response](#example-response)
  - [Contact](#contact)

---

## Base URL

```bash
/api/ai-<feature>
```

Replace `<feature>` with the desired endpoint key (see [Available Endpoints](#available-endpoints) below).

---

## Environment Variables

Your server must have these keys set as environment variables:

```
.env

ALIBABA_API_KEY=your_alibaba_cloud_api_key
DATABASE_URL=your_postgres_db_url
DIRECT_URL=if_using_supabase_as_db
SENDGRID_API_KEY=your_sendgrid_api_key
LUMA_API_KEY=your_luma_api_key
MINIMAX_API_KEY=your_minimax_api_key
PIXVERSE_API_KEY=your_eachlabs_or_pixverse_api_key
# Nexrender Cloud integration
NEXRENDER_API_KEY=your_nexrender_cloud_api_key
NEXRENDER_API_URL=https://api.nexrender.com/api/v2
WEBHOOK_BASE_URL=https://your-server.com
# Optional Pixverse tuning
PIXVERSE_DURATION=5                 # default 5
PIXVERSE_QUALITY=540p               # 540p or 720p etc.
PIXVERSE_MOTION_MODE=normal         # normal / slow / fast (if supported)
PIXVERSE_WEBHOOK_URL=https://your.domain/webhooks/pixverse
# Optional Vidu Q1 (Eachlabs) tuning (uses same PIXVERSE_API_KEY/EACHLABS key)
VIDU_Q1_VERSION=0.0.1
VIDU_Q1_DURATION=5              # seconds
VIDU_Q1_ASPECT_RATIO=16:9
VIDU_Q1_RESOLUTION=1080p
VIDU_Q1_MOVEMENT_AMPLITUDE=auto # auto|low|high (if supported)
VIDU_Q1_BGM=false               # background music generation toggle
VIDU_Q1_WEBHOOK_URL=https://your.domain/webhooks/vidu
# Optional Vidu 2.0 (Eachlabs) tuning (uses same PIXVERSE_API_KEY/EACHLABS key)
VIDU_20_VERSION=0.0.1
VIDU_20_DURATION=5              # seconds
VIDU_20_ASPECT_RATIO=16:9
VIDU_20_RESOLUTION=1080p
VIDU_20_WEBHOOK_URL=https://your.domain/webhooks/vidu2
# Optional Google Veo 2 (Eachlabs) tuning (uses same PIXVERSE_API_KEY/EACHLABS key)
VEO_2_VERSION=0.0.1
VEO_2_DURATION=5                # seconds
VEO_2_ASPECT_RATIO=16:9
VEO_2_RESOLUTION=1080p
VEO_2_WEBHOOK_URL=https://your.domain/webhooks/veo2
```

---

## Request

### Method

`POST`

### Content-Type

`application/json`

### Body Parameters

| Parameter   | Type   | Required | Description                                           |
| ----------- | ------ | -------- | ----------------------------------------------------- |
| `image_url` | string | Yes      | Public URL of the input image (JPG, PNG, BMP, WEBP)   |
| `prompt`    | string | No       | Custom prompt to override the default endpoint prompt |

### Image Requirements

- **Formats**: JPEG, JPG, PNG (alpha channel not supported), BMP, WEBP
- **Resolution**: Width and height must be between 360 and 2,000 pixels
- **Size**: Maximum 10 MB
- **Access**: URL must be publicly accessible via HTTP or HTTPS
- **Direct Link**: Must be a direct link to the image file, not a webpage containing images

### Image URL Examples

✅ **Valid URLs:**

- `https://example.com/image.jpg`
- `https://cdn.example.com/photo.png`
- `https://images.unsplash.com/photo-1234567890.jpg`

❌ **Invalid URLs:**

- `https://www.istockphoto.com/photos/woman-full-length` (webpage, not direct image)
- `https://example.com/page.html` (webpage, not image file)
- `ftp://example.com/image.jpg` (wrong protocol)

---

## Response

### Success Response

```json
{
  "video": {
    "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/1d/xxx.mp4?Exp",
    "content_type": "video/mp4",
    "file_name": "video_436310e6-5404-42ef-b875-xxxxxx.mp4",
    "file_size": 0
  },
  "seed": 123456,
  "task_id": "436310e6-5404-42ef-b875-xxxxxx",
  "prompt": "a cat running on the grass",
  "actual_prompt": "A white cat running on the grass, with its tail held high and a light breeze"
}
```

### Response Fields

| Field                | Type   | Description                                               |
| -------------------- | ------ | --------------------------------------------------------- |
| `video.url`          | string | Download URL for the generated video (valid for 24 hours) |
| `video.content_type` | string | MIME type of the video file                               |
| `video.file_name`    | string | Generated filename for the video                          |
| `video.file_size`    | number | File size (not provided by Alibaba API)                   |
| `seed`               | number | Random seed used for generation                           |
| `task_id`            | string | Unique task identifier                                    |
| `prompt`             | string | Original prompt used                                      |
| `actual_prompt`      | string | Enhanced prompt used by the model                         |

---

## Example Request (cURL)

```bash
curl -X POST http://localhost:3000/api/ai-dance \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "prompt": "a person dancing energetically"
  }'
```

---

## Available Endpoints

Take a look at `src/filters/features.ts` for all available endpoints and their default prompts.

---

## Error Codes

| Status Code | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| 400         | Bad Request (missing image_url, invalid URL format)               |
| 500         | Internal Server Error (API key not configured, generation failed) |

---

## Notes

- **Processing Time**: Video generation takes approximately 1-2 minutes
- **Video URL Validity**: Generated video URLs are valid for 24 hours
- **Task ID Validity**: Task IDs are valid for 24 hours
- **Polling**: The API automatically polls for completion every 10 seconds
- **Resolution**: Videos are generated at 720P resolution (1280x720 pixels)
- **Duration**: Videos are 5 seconds long
- **Watermark**: No watermark is added to generated videos

---

## Example Response

```json
{
  "video": {
    "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/1d/xxx.mp4?Exp",
    "content_type": "video/mp4",
    "file_name": "video_436310e6-5404-42ef-b875-xxxxxx.mp4",
    "file_size": 0
  },
  "seed": 123456,
  "task_id": "436310e6-5404-42ef-b875-xxxxxx",
  "prompt": "a cat running on the grass",
  "actual_prompt": "A white cat running on the grass, with its tail held high and a light breeze"
}
```

---

## Nexrender Cloud Integration

The API provides integration with Nexrender Cloud for rendering After Effects templates with dynamic content.

### Environment Variables for Nexrender

Add these environment variables to your `.env` file:

```env
NEXRENDER_API_KEY=your_nexrender_cloud_api_key
NEXRENDER_API_URL=https://api.nexrender.com/api/v2  # optional, uses default
WEBHOOK_BASE_URL=https://your-server.com            # for receiving webhook callbacks
```

### Nexrender Endpoints

#### 1. List All Templates

**GET** `/api/nexrender/templates`

Get all available After Effects templates from Nexrender Cloud.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (e.g., "ready", "processing", "error") |

**Response (200):**

```json
{
  "success": true,
  "templates": [
    {
      "id": "01JTGM9GCR71JV7EJYDF45QAFD",
      "type": "aep",
      "displayName": "My Template",
      "status": "ready",
      "createdAt": "2026-02-09T10:00:00.000Z",
      "updatedAt": "2026-02-09T10:00:00.000Z",
      "compositions": ["main", "intro", "outro"],
      "layers": ["title", "subtitle", "logo", "background"],
      "mogrt": {},
      "error": null
    }
  ],
  "total": 1
}
```

#### 2. Get Template Details

**GET** `/api/nexrender/templates/:id`

Get detailed information about a specific template including its compositions and layers.

**Response (200):**

```json
{
  "success": true,
  "template": {
    "id": "01JTGM9GCR71JV7EJYDF45QAFD",
    "type": "aep",
    "displayName": "My Template",
    "status": "ready",
    "createdAt": "2026-02-09T10:00:00.000Z",
    "updatedAt": "2026-02-09T10:00:00.000Z",
    "compositions": ["main", "intro", "outro"],
    "layers": ["title", "subtitle", "logo", "background"],
    "mogrt": {},
    "error": null,
    "uploadInfo": {
      "url": "...",
      "method": "PUT",
      "expiresIn": 123,
      "key": "...",
      "fields": {}
    }
  }
}
```

**Template Status Values:**
| Status | Description |
|--------|-------------|
| `ready` | Template is ready for rendering |
| `processing` | Template is being processed |
| `error` | Template has an error (see `error` field) |

#### 3. Submit a Render Job

**POST** `/api/nexrender/jobs`

Submit a render job to Nexrender Cloud with full control over assets and settings.

**Request Body:**

```json
{
  "templateId": "01JTGM9GCR71JV7EJYDF45QAFD",
  "composition": "main",
  "assets": [
    { "type": "text", "layerName": "title", "value": "Hello World!" },
    {
      "type": "image",
      "layerName": "logo",
      "src": "https://example.com/logo.png"
    },
    {
      "type": "video",
      "layerName": "background",
      "src": "https://example.com/video.mp4"
    }
  ],
  "preview": false,
  "settings": {
    "outputModule": "H.264"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "job": {
    "id": 1,
    "nexrenderId": "01JTRDF7HCR8QAHYW8GPCP4S9Y",
    "templateId": "01JTGM9GCR71JV7EJYDF45QAFD",
    "composition": "main",
    "status": "queued",
    "progress": 0,
    "outputUrl": null,
    "createdAt": "2026-02-09T12:00:00.000Z"
  }
}
```

#### 4. Render Template (Simplified)

**POST** `/api/nexrender/render-template`

A simplified endpoint for common use cases with text, image, video and audio replacements.

**Request Body:**

```json
{
  "templateId": "01JTGM9GCR71JV7EJYDF45QAFD",
  "composition": "main",
  "textReplacements": {
    "title": "My Video Title",
    "subtitle": "Made with AI"
  },
  "imageReplacements": {
    "logo": "https://example.com/logo.png",
    "background": "https://example.com/bg.jpg"
  },
  "videoReplacements": {
    "mainVideo": "https://example.com/video.mp4"
  },
  "audioReplacements": {
    "music": "https://example.com/audio.mp3"
  }
}
```

#### 5. Get Job Status

**GET** `/api/nexrender/jobs/:id`

Get the current status of a render job. Supports both internal database ID and Nexrender job ID.

**Response (200):**

```json
{
  "success": true,
  "job": {
    "id": 1,
    "nexrenderId": "01JTRDF7HCR8QAHYW8GPCP4S9Y",
    "templateId": "01JTGM9GCR71JV7EJYDF45QAFD",
    "status": "finished",
    "progress": 100,
    "outputUrl": "https://nx1-outputs-eu.nexrender.com/01K4B3YH2GP21...",
    "renderDuration": 45,
    "createdAt": "2026-02-09T12:00:00.000Z",
    "finishedAt": "2026-02-09T12:00:45.000Z"
  }
}
```

**Job Status Values:**
| Status | Description |
|--------|-------------|
| `queued` | Job is waiting to be picked up by render engine |
| `render:dorender` | Currently being processed |
| `finished` | Successfully rendered; `outputUrl` available |
| `error` | Encountered an error (see `error` field) |

#### 6. Wait for Job Completion

**GET** `/api/nexrender/jobs/:id/wait`

Poll and wait for a job to complete. Useful for synchronous workflows.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | number | 300 | Max seconds to wait (max: 600) |
| `interval` | number | 5 | Polling interval in seconds (min: 2) |

**Response:**

```json
{
  "success": true,
  "timedOut": false,
  "job": {
    "id": 1,
    "status": "finished",
    "outputUrl": "https://nx1-outputs-eu.nexrender.com/..."
  }
}
```

#### 7. List Jobs

**GET** `/api/nexrender/jobs`

List all render jobs with pagination and optional filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | — | Filter by status |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 100) |

**Response:**

```json
{
  "success": true,
  "jobs": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### 8. Cancel Job

**DELETE** `/api/nexrender/jobs/:id`

Cancel a render job. Only works for jobs that haven't started rendering yet.

#### 9. Webhook Endpoint

**POST** `/api/nexrender/webhook`

Receives webhook notifications from Nexrender Cloud when job status changes. This endpoint is called automatically by Nexrender Cloud and updates the job status in the database.

### Asset Types

| Type     | Description                | Required Fields      |
| -------- | -------------------------- | -------------------- |
| `text`   | Replace text layer content | `layerName`, `value` |
| `image`  | Replace image layer source | `layerName`, `src`   |
| `video`  | Replace video layer source | `layerName`, `src`   |
| `audio`  | Replace audio layer source | `layerName`, `src`   |
| `data`   | JSON data for expressions  | `layerName`, `value` |
| `script` | Run ExtendScript code      | `layerName`, `src`   |

---

## Contact

For support or questions, please contact the development team.
