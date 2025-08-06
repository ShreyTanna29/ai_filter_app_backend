# AI Video Generation API

This API provides a large set of POST endpoints for generating short AI-powered videos from a single image and a descriptive prompt, using Alibaba Cloud Model Studio's `wan2.1-i2v-turbo` model. Each endpoint corresponds to a unique theme or transformation.

---

## Table of Contents

- [Base URL](#base-url)
- [Environment Variables](#environment-variables)
- [Request](#request)
- [Response](#response)
- [Example Request (cURL)](#example-request-curl)
- [Available Endpoints](#available-endpoints)
- [Error Codes](#error-codes)
- [Notes](#notes)
- [Example Response](#example-response)
- [Contact](#contact)

---

## Base URL

```
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

## Contact

For support or questions, please contact the development team.
