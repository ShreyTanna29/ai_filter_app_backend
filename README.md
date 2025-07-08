# AI Video Generation API

This API provides a large set of POST endpoints for generating short AI-powered videos from a single image and a descriptive prompt, using Fal AI's image-to-video models. Each endpoint corresponds to a unique theme or transformation.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
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

## Authentication

Your server must have this keys set as an environment variable:

```
.env

FAL_KEY=your_fal_api_key (you can ignore it for now)
DATABASE_URL=your postgres db url
DIRECT_URL= if using supabase as db
SENDGRID_API_KEY=
```

No client-side authentication is required by default.

---

## Request

**Method:**  
`POST`

**Content-Type:**  
`multipart/form-data`

**Body Parameters:**

| Field  | Type   | Required | Description                                 |
| ------ | ------ | -------- | ------------------------------------------- |
| image  | file   | Yes      | The input image (JPG, PNG, etc.)            |
| prompt | string | No       | Custom prompt (overrides default, optional) |

---

## Response

- **Success:**  
  `200 OK`  
  JSON object containing the Fal AI model output (usually includes a video URL and metadata).

- **Error:**  
  `4xx` or `5xx`  
  JSON object with `error` and possibly `details`.

---

## Example Request (cURL)

```bash
curl -X POST https://yourdomain.com/api/ai-dance   -F "image=@/path/to/your/image.jpg"
```

**With custom prompt:**

```bash
curl -X POST https://yourdomain.com/api/ai-dance   -F "image=@/path/to/your/image.jpg"   -F "prompt=an astronaut dancing on the moon, cinematic lighting"
```

---

## Available Endpoints

| Endpoint  | Default Prompt             |
| --------- | -------------------------- |
| ai-dance  | a person dancing           |
| ai-bikini | a woman posing in a bikini |
| ai-twerk  | a person twerking          |

...
| ai-live-photo | a still portrait animated with subtle head movement, blinking eyes, gentle smile, and smooth looping motion |

---

`Take a look at Features.ts for all endpoints`

## Error Codes

- `400 Bad Request`: Image file missing or invalid.
- `422 Unprocessable Entity`: Input validation failed (e.g., bad prompt, image upload failed).
- `500 Internal Server Error`: Unexpected server or model error.

---

## Notes

- You can override the default prompt by sending a `prompt` field in your form data.
- The output will include a video URL and possibly other metadata from Fal AI.
- All endpoints require an image upload as `image` in the form data.

---

## Example Response

```json
{
  "video": {
    "url": "https://v3.fal.media/files/zebra/1aHBYwr26yydd2AG24N48_video.mp4",
    "content_type": "video/mp4",
    "file_name": "video.mp4",
    "file_size": 4100379
  },
  "seed": 142263008
}
```

---

## Contact

For support or to request new features, contact the API maintainer.
