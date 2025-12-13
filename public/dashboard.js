const IDEOGRAM_MODEL_ID = "ideogram:4@1";
const IDEOGRAM_REMIX_MODEL_ID = "ideogram:4@2";
const IDEOGRAM_EDIT_MODEL_ID = "ideogram:4@3";
const IDEOGRAM_REFRAME_MODEL_ID = "ideogram:4@4";
const IDEOGRAM_BASE_DIMENSIONS = [
  { width: 1536, height: 512 },
  { width: 1536, height: 576 },
  { width: 1472, height: 576 },
  { width: 1408, height: 576 },
  { width: 1536, height: 640 },
  { width: 1472, height: 640 },
  { width: 1408, height: 640 },
  { width: 1344, height: 640 },
  { width: 1472, height: 704 },
  { width: 1408, height: 704 },
  { width: 1344, height: 704 },
  { width: 1280, height: 704 },
  { width: 1312, height: 736 },
  { width: 1344, height: 768 },
  { width: 1216, height: 704 },
  { width: 1280, height: 768 },
  { width: 1152, height: 704 },
  { width: 1280, height: 800 },
  { width: 1216, height: 768 },
  { width: 1248, height: 832 },
  { width: 1216, height: 832 },
  { width: 1088, height: 768 },
  { width: 1152, height: 832 },
  { width: 1152, height: 864 },
  { width: 1088, height: 832 },
  { width: 1152, height: 896 },
  { width: 1120, height: 896 },
  { width: 1024, height: 832 },
  { width: 1088, height: 896 },
  { width: 960, height: 832 },
  { width: 1024, height: 896 },
  { width: 1088, height: 960 },
  { width: 960, height: 896 },
  { width: 1024, height: 960 },
  { width: 1024, height: 1024 },
];
const IDEOGRAM_REMIX_BASE_DIMENSIONS = [
  { width: 1536, height: 512 },
  { width: 1536, height: 576 },
  { width: 1472, height: 576 },
  { width: 1408, height: 576 },
  { width: 1536, height: 640 },
  { width: 1472, height: 640 },
  { width: 1408, height: 640 },
  { width: 1344, height: 640 },
  { width: 1472, height: 704 },
  { width: 1408, height: 704 },
  { width: 1344, height: 704 },
  { width: 1312, height: 736 },
  { width: 1344, height: 768 },
  { width: 1280, height: 704 },
  { width: 1216, height: 704 },
  { width: 1280, height: 768 },
  { width: 1152, height: 704 },
  { width: 1280, height: 800 },
  { width: 1216, height: 768 },
  { width: 1248, height: 832 },
  { width: 1216, height: 832 },
  { width: 1088, height: 768 },
  { width: 1152, height: 832 },
  { width: 1152, height: 864 },
  { width: 1088, height: 832 },
  { width: 1152, height: 896 },
  { width: 1120, height: 896 },
  { width: 1024, height: 832 },
  { width: 1088, height: 896 },
  { width: 960, height: 832 },
  { width: 1024, height: 896 },
  { width: 1088, height: 960 },
  { width: 960, height: 896 },
  { width: 1024, height: 960 },
  { width: 1024, height: 1024 },
  { width: 960, height: 1024 },
  { width: 896, height: 960 },
  { width: 960, height: 1088 },
  { width: 896, height: 1024 },
  { width: 832, height: 960 },
  { width: 896, height: 1088 },
  { width: 832, height: 1088 },
  { width: 864, height: 1152 },
  { width: 832, height: 1152 },
  { width: 768, height: 1088 },
  { width: 832, height: 1216 },
  { width: 832, height: 1248 },
  { width: 768, height: 1216 },
  { width: 800, height: 1280 },
  { width: 704, height: 1152 },
  { width: 768, height: 1280 },
  { width: 704, height: 1216 },
  { width: 768, height: 1344 },
  { width: 736, height: 1328 },
  { width: 704, height: 1280 },
  { width: 704, height: 1344 },
  { width: 704, height: 1408 },
  { width: 704, height: 1472 },
  { width: 640, height: 1334 },
  { width: 640, height: 1408 },
  { width: 640, height: 1472 },
  { width: 640, height: 1536 },
  { width: 576, height: 1408 },
  { width: 576, height: 1472 },
  { width: 576, height: 1536 },
  { width: 512, height: 1536 },
];

// Ideogram 3.0 Edit (Inpainting) supported dimensions
const IDEOGRAM_EDIT_BASE_DIMENSIONS = [
  { width: 1536, height: 512 },
  { width: 1536, height: 576 },
  { width: 1472, height: 576 },
  { width: 1408, height: 576 },
  { width: 1536, height: 640 },
  { width: 1472, height: 640 },
  { width: 1408, height: 640 },
  { width: 1344, height: 640 },
  { width: 1472, height: 704 },
  { width: 1408, height: 704 },
  { width: 1344, height: 704 },
  { width: 1280, height: 704 },
  { width: 1312, height: 736 },
  { width: 1344, height: 768 },
  { width: 1216, height: 704 },
  { width: 1280, height: 768 },
  { width: 1152, height: 704 },
  { width: 1280, height: 800 },
  { width: 1216, height: 768 },
  { width: 1248, height: 832 },
  { width: 1216, height: 832 },
  { width: 1088, height: 768 },
  { width: 1152, height: 832 },
  { width: 1152, height: 864 },
  { width: 1088, height: 832 },
  { width: 1152, height: 896 },
  { width: 1120, height: 896 },
  { width: 1024, height: 832 },
  { width: 1088, height: 896 },
  { width: 960, height: 832 },
  { width: 1024, height: 896 },
  { width: 1088, height: 960 },
  { width: 960, height: 896 },
  { width: 1024, height: 960 },
  { width: 1024, height: 1024 },
  { width: 960, height: 1024 },
  { width: 896, height: 960 },
  { width: 960, height: 1088 },
  { width: 896, height: 1024 },
  { width: 832, height: 960 },
  { width: 896, height: 1088 },
  { width: 832, height: 1088 },
  { width: 864, height: 1152 },
  { width: 832, height: 1152 },
  { width: 768, height: 1088 },
  { width: 832, height: 1216 },
  { width: 832, height: 1248 },
  { width: 768, height: 1216 },
  { width: 800, height: 1280 },
  { width: 704, height: 1152 },
  { width: 768, height: 1280 },
  { width: 704, height: 1216 },
  { width: 768, height: 1344 },
  { width: 736, height: 1312 },
  { width: 704, height: 1280 },
  { width: 704, height: 1344 },
  { width: 704, height: 1408 },
  { width: 704, height: 1472 },
  { width: 640, height: 1344 },
  { width: 640, height: 1408 },
  { width: 640, height: 1472 },
  { width: 640, height: 1536 },
  { width: 576, height: 1408 },
  { width: 576, height: 1472 },
  { width: 576, height: 1536 },
  { width: 512, height: 1536 },
];

// Ideogram 3.0 Reframe (Outpainting) supported dimensions
const IDEOGRAM_REFRAME_BASE_DIMENSIONS = [
  { width: 1536, height: 512 },
  { width: 1536, height: 576 },
  { width: 1472, height: 576 },
  { width: 1408, height: 576 },
  { width: 1536, height: 640 },
  { width: 1472, height: 640 },
  { width: 1408, height: 640 },
  { width: 1344, height: 640 },
  { width: 1472, height: 704 },
  { width: 1408, height: 704 },
  { width: 1344, height: 704 },
  { width: 1280, height: 704 },
  { width: 1312, height: 736 },
  { width: 1344, height: 768 },
  { width: 1216, height: 704 },
  { width: 1280, height: 768 },
  { width: 1152, height: 704 },
  { width: 1280, height: 800 },
  { width: 1216, height: 768 },
  { width: 1248, height: 832 },
  { width: 1216, height: 832 },
  { width: 1088, height: 768 },
  { width: 1152, height: 832 },
  { width: 1152, height: 864 },
  { width: 1088, height: 832 },
  { width: 1152, height: 896 },
  { width: 1120, height: 896 },
  { width: 1024, height: 832 },
  { width: 1088, height: 896 },
  { width: 960, height: 832 },
  { width: 1024, height: 896 },
  { width: 1088, height: 960 },
  { width: 960, height: 896 },
  { width: 1024, height: 960 },
  { width: 1024, height: 1024 },
  { width: 960, height: 1024 },
  { width: 896, height: 960 },
  { width: 960, height: 1088 },
  { width: 896, height: 1024 },
  { width: 832, height: 960 },
  { width: 896, height: 1088 },
  { width: 832, height: 1088 },
  { width: 864, height: 1152 },
  { width: 832, height: 1152 },
  { width: 768, height: 1088 },
  { width: 832, height: 1216 },
  { width: 832, height: 1248 },
  { width: 768, height: 1216 },
  { width: 800, height: 1280 },
  { width: 704, height: 1152 },
  { width: 768, height: 1280 },
  { width: 704, height: 1216 },
  { width: 768, height: 1344 },
  { width: 736, height: 1312 },
  { width: 704, height: 1280 },
  { width: 704, height: 1344 },
  { width: 704, height: 1408 },
  { width: 704, height: 1472 },
  { width: 640, height: 1344 },
  { width: 640, height: 1408 },
  { width: 640, height: 1472 },
  { width: 640, height: 1536 },
  { width: 576, height: 1408 },
  { width: 576, height: 1472 },
  { width: 576, height: 1536 },
  { width: 512, height: 1536 },
];

function buildIdeogramDimensionOptions(list) {
  const seen = new Set();
  const values = [];
  list.forEach((dim) => {
    const forwardKey = `${dim.width}x${dim.height}`;
    if (!seen.has(forwardKey)) {
      values.push(dim);
      seen.add(forwardKey);
    }
    if (dim.width !== dim.height) {
      const swappedKey = `${dim.height}x${dim.width}`;
      if (!seen.has(swappedKey)) {
        values.push({ width: dim.height, height: dim.width });
        seen.add(swappedKey);
      }
    }
  });
  return values;
}

const IDEOGRAM_DIMENSION_OPTIONS = buildIdeogramDimensionOptions(
  IDEOGRAM_BASE_DIMENSIONS
);
const IDEOGRAM_REMIX_DIMENSION_OPTIONS = buildIdeogramDimensionOptions(
  IDEOGRAM_REMIX_BASE_DIMENSIONS
);
const IDEOGRAM_EDIT_DIMENSION_OPTIONS = buildIdeogramDimensionOptions(
  IDEOGRAM_EDIT_BASE_DIMENSIONS
);
const IDEOGRAM_REFRAME_DIMENSION_OPTIONS = buildIdeogramDimensionOptions(
  IDEOGRAM_REFRAME_BASE_DIMENSIONS
);

function pickIdeogramDefault(options) {
  return (
    options.find((dim) => dim.width === 1024 && dim.height === 1024) ||
    options[0]
  );
}

const IDEOGRAM_DEFAULT_DIMENSION = pickIdeogramDefault(
  IDEOGRAM_DIMENSION_OPTIONS
);
const IDEOGRAM_REMIX_DEFAULT_DIMENSION = pickIdeogramDefault(
  IDEOGRAM_REMIX_DIMENSION_OPTIONS
);
const IDEOGRAM_EDIT_DEFAULT_DIMENSION = pickIdeogramDefault(
  IDEOGRAM_EDIT_DIMENSION_OPTIONS
);
const IDEOGRAM_REFRAME_DEFAULT_DIMENSION = pickIdeogramDefault(
  IDEOGRAM_REFRAME_DIMENSION_OPTIONS
);

function getIdeogramDimensionOptions(modelId) {
  if (modelId === IDEOGRAM_REMIX_MODEL_ID)
    return IDEOGRAM_REMIX_DIMENSION_OPTIONS;
  if (modelId === IDEOGRAM_EDIT_MODEL_ID)
    return IDEOGRAM_EDIT_DIMENSION_OPTIONS;
  if (modelId === IDEOGRAM_REFRAME_MODEL_ID)
    return IDEOGRAM_REFRAME_DIMENSION_OPTIONS;
  return IDEOGRAM_DIMENSION_OPTIONS;
}

function getIdeogramDefaultDimension(modelId) {
  if (modelId === IDEOGRAM_REMIX_MODEL_ID)
    return IDEOGRAM_REMIX_DEFAULT_DIMENSION;
  if (modelId === IDEOGRAM_EDIT_MODEL_ID)
    return IDEOGRAM_EDIT_DEFAULT_DIMENSION;
  if (modelId === IDEOGRAM_REFRAME_MODEL_ID)
    return IDEOGRAM_REFRAME_DEFAULT_DIMENSION;
  return IDEOGRAM_DEFAULT_DIMENSION;
}

function initializeIdeogramDropdown(modelId = IDEOGRAM_MODEL_ID) {
  if (!window.__ideogramDimensionSelect) return;
  const select = window.__ideogramDimensionSelect;
  const targetModel = modelId || IDEOGRAM_MODEL_ID;
  const options = getIdeogramDimensionOptions(targetModel);
  select.innerHTML = options
    .map(
      (dim) =>
        `<option value="${dim.width}x${
          dim.height
        }">${formatIdeogramDimensionLabel(dim)}</option>`
    )
    .join("");
  const defaultDim = getIdeogramDefaultDimension(targetModel);
  select.value = `${defaultDim.width}x${defaultDim.height}`;
  select.dataset.activeModel = targetModel;
}

function gcd(a, b) {
  if (!b) return a;
  return gcd(b, a % b);
}

function formatAspectRatio(width, height) {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function formatIdeogramDimensionLabel(dim) {
  return `${dim.width}×${dim.height} (${formatAspectRatio(
    dim.width,
    dim.height
  )})`;
}

const PHOTO_MODEL_OPTIONS = [
  { value: "bfl:2@1", label: "FLUX.1 Schnell" },
  { value: "bfl:1@8", label: "FLUX.1 Dev" },
  { value: "bfl:1@4", label: "FLUX.1 Pro" },
  { value: "runware:400@1", label: "FLUX.2 [dev] (Runware)" },
  { value: "runware:97@3", label: "HiDream Fast (Runware)" },
  { value: "runware:97@2", label: "HiDream Dev (Runware)" },
  { value: "runware:97@1", label: "HiDream Full (Runware)" },
  { value: "runware:108@1", label: "Qwen Image (Runware)" },
  {
    value: "runware:108@22",
    label: "Qwen Image Edit Plus (Runware, image editing)",
    requiresReferences: true,
  },
  { value: "midjourney:3@1", label: "Midjourney V7 (Runware)" },
  { value: "bytedance:5@0", label: "Seeddream 4.0 (Runware)" },
  {
    value: "google:2@1",
    label: "Imagen 4.0 Preview (Runware)",
    textOnly: true,
  },
  {
    value: "google:2@2",
    label: "Imagen 4.0 Ultra (Runware)",
    textOnly: true,
  },
  {
    value: "google:2@3",
    label: "Imagen 4.0 Fast (Runware)",
    textOnly: true,
  },
  {
    value: "google:4@1",
    label: "Nano Banana / Gemini Flash Image 2.5 (Runware)",
    textOnly: true,
  },
  {
    value: "google:4@2",
    label: "Nano Banana 2 Pro / Gemini 3 Pro Image (Runware)",
    textOnly: true,
  },
  {
    value: "openai:1@1",
    label: "GPT Image 1 (Runware)",
    textOnly: true,
  },
  { value: IDEOGRAM_MODEL_ID, label: "Ideogram 3.0 (Runware)", textOnly: true },
  {
    value: IDEOGRAM_REMIX_MODEL_ID,
    label: "Ideogram 3.0 Remix (Runware, needs reference)",
    textOnly: true,
  },
  {
    value: IDEOGRAM_EDIT_MODEL_ID,
    label: "Ideogram 3.0 Edit (Runware, inpainting)",
    textOnly: true,
    requiresSeedImage: true,
    requiresMaskImage: true,
  },
  {
    value: IDEOGRAM_REFRAME_MODEL_ID,
    label: "Ideogram 3.0 Reframe (Runware, outpainting)",
    textOnly: true,
    requiresSeedImage: true,
  },
  { value: "sourceful:1@1", label: "Riverflow 1.1 (Runware)" },
  {
    value: "sourceful:1@0",
    label: "Riverflow 1.1 Mini (Runware, image editing)",
    requiresReferences: true,
  },
  {
    value: "sourceful:1@2",
    label: "Riverflow 1.1 Pro (Runware, pro image editing)",
    requiresReferences: true,
  },
  {
    value: "bytedance:4@1",
    label: "SeedEdit 3.0 (Runware, image editing)",
    requiresReferences: true,
  },
  {
    value: "hunyuan:1@1",
    label: "Hunyuan Image V3 (EachLabs)",
    textOnly: true,
  },
];
const PHOTO_MODEL_META = new Map(
  PHOTO_MODEL_OPTIONS.map((opt) => [opt.value, opt])
);
let featureModelSelectVideoOptionsHtml = "";

// Helper to choose playable video URL (prefers signed S3 URL when present)
function selectPlayableUrl(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return obj;
  if (obj.signedUrl) return obj.signedUrl;
  if (obj.url) return obj.url;
  return null;
}
// --- Scroll position preservation for template page ---
let savedTemplateScrollPosition = 0;
let featureDetailOriginTab = "filters";
// --- Video Modal for Step Details ---
if (!document.getElementById("step-video-modal")) {
  const modal = document.createElement("div");
  modal.id = "step-video-modal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.7)";
  modal.style.display = "none";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "9999";
  modal.innerHTML = `
    <div id="step-video-modal-content" style="background:#fff; padding:0; border-radius:8px; max-width:90vw; max-height:90vh; display:flex; flex-direction:column; align-items:center;">
      <button id="step-video-modal-close" style="align-self:flex-end; margin:8px 8px 0 0; font-size:1.5rem; background:none; border:none; cursor:pointer;">&times;</button>
      <video id="step-video-modal-player" controls style="max-width:80vw; max-height:70vh; border-radius:8px;"></video>
      <audio id="step-video-modal-audio" style="display:none;"></audio>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("step-video-modal-close").onclick = function () {
    modal.style.display = "none";
    const player = document.getElementById("step-video-modal-player");
    const audio = document.getElementById("step-video-modal-audio");
    player.pause();
    audio.pause();
    player.src = "";
    audio.src = "";
  };
}

function showStepVideoModal(videoUrl, audioUrl = null) {
  const modal = document.getElementById("step-video-modal");
  const player = document.getElementById("step-video-modal-player");
  const audio = document.getElementById("step-video-modal-audio");

  player.src = videoUrl;

  // If audio URL is provided, set it up to play synchronized with video
  if (audioUrl) {
    audio.src = audioUrl;
    audio.loop = true; // Loop audio to match video duration

    // Synchronize audio with video playback
    player.onplay = () => {
      audio.currentTime = player.currentTime % audio.duration || 0;
      audio.play().catch((e) => console.error("Audio play failed:", e));
    };

    player.onpause = () => {
      audio.pause();
    };

    player.onseeked = () => {
      // When seeking in video, adjust audio to corresponding position in its loop
      if (audio.duration) {
        audio.currentTime = player.currentTime % audio.duration;
      }
    };

    player.ontimeupdate = () => {
      // Keep audio in sync during playback, accounting for loops
      if (audio.duration && !audio.paused && !player.paused) {
        const expectedAudioTime = player.currentTime % audio.duration;
        const timeDiff = Math.abs(audio.currentTime - expectedAudioTime);
        // Re-sync if drift is more than 0.3 seconds
        if (timeDiff > 0.3) {
          audio.currentTime = expectedAudioTime;
        }
      }
    };

    // Ensure audio volume matches video (video is muted, audio provides sound)
    player.muted = true;
    audio.volume = 1.0;
  } else {
    // No audio URL, unmute video in case it has embedded audio
    player.muted = false;
    audio.src = "";
    audio.loop = false;
    player.onplay = null;
    player.onpause = null;
    player.onseeked = null;
    player.ontimeupdate = null;
  }

  modal.style.display = "flex";
}
// Ensure the add feature modal is hidden on page load

// --- Fullscreen Loader ---
function showFullscreenLoader() {
  let loader = document.getElementById("fullscreenLoader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "fullscreenLoader";
    loader.style.position = "fixed";
    loader.style.top = 0;
    loader.style.left = 0;
    loader.style.width = "100vw";
    loader.style.height = "100vh";
    loader.style.background = "rgba(255,255,255,0.95)";
    loader.style.display = "flex";
    loader.style.flexDirection = "column";
    loader.style.justifyContent = "center";
    loader.style.alignItems = "center";
    loader.style.zIndex = 99999;
    loader.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:24px;">
        <svg class="animate-spin" style="height:64px;width:64px;color:#2563eb;" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round" stroke-dasharray="31.4 31.4"/>
        </svg>
        <div style="font-size:2rem;font-weight:bold;color:#2563eb;letter-spacing:1px;">Loading Dashboard...</div>
        <div style="color:#555;font-size:1.1rem;">Please wait while we load features and graphics.</div>
      </div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = "flex";
}

function hideFullscreenLoader() {
  const loader = document.getElementById("fullscreenLoader");
  if (loader) loader.style.display = "none";
}

window.addEventListener("DOMContentLoaded", function () {
  // Auth modal logic (must be defined before any call)
  window.showSignInModal = function () {
    document.getElementById("signUpModal").style.display = "none";
    document.getElementById("signInModal").style.display = "flex";
  };
  window.showSignUpModal = function () {
    document.getElementById("signInModal").style.display = "none";
    document.getElementById("signUpModal").style.display = "flex";
  };

  // User dropdown functions
  window.toggleUserDropdown = function () {
    const dropdown = document.getElementById("userDropdownMenu");
    if (dropdown) {
      dropdown.classList.toggle("hidden");
    }
  };

  window.handleLogout = function () {
    console.log("Logging out user");

    // Clear token, user email and role from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");

    // Hide dropdown
    const dropdown = document.getElementById("userDropdownMenu");
    if (dropdown) {
      dropdown.classList.add("hidden");
    }

    // Hide dashboard and show login modal
    document
      .querySelectorAll(
        "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
      )
      .forEach((el) => {
        if (el) el.style.display = "none";
      });

    showSignInModal();
  };

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    const dropdown = document.getElementById("userDropdownMenu");
    const button = document.getElementById("userDropdownBtn");
    if (!dropdown || !button) return;
    if (!button.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  // Sign Up form submit
  const signUpForm = document.getElementById("signUpForm");
  if (signUpForm) {
    signUpForm.onsubmit = async function (e) {
      e.preventDefault();
      console.log("Sign up form submitted");

      const email = document.getElementById("signUpEmail").value;
      const password = document.getElementById("signUpPassword").value;
      const confirm = document.getElementById("signUpConfirmPassword").value;
      const errorDiv = document.getElementById("signUpError");
      const signUpBtn = document.getElementById("signUpBtn");
      const signUpBtnText = document.getElementById("signUpBtnText");
      const signUpLoader = document.getElementById("signUpLoader");

      errorDiv.textContent = "";

      // Validation
      if (!email || !password || !confirm) {
        errorDiv.textContent = "All fields are required.";
        return;
      }

      if (password !== confirm) {
        errorDiv.textContent = "Passwords do not match.";
        return;
      }

      if (password.length < 6) {
        errorDiv.textContent = "Password must be at least 6 characters long.";
        return;
      }

      // Show loading state
      if (signUpBtn) signUpBtn.disabled = true;
      if (signUpBtnText) signUpBtnText.textContent = "Creating Account...";
      if (signUpLoader) signUpLoader.classList.remove("hidden");

      try {
        console.log("Making signup request to /api/auth/signup");
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            password,
            role: "user",
          }),
        });

        const data = await res.json();
        console.log("Signup response:", { status: res.status, data });

        if (res.ok) {
          console.log("Signup successful");
          document.getElementById("signUpModal").style.display = "none";

          // Show success message and redirect to login
          const signInModal = document.getElementById("signInModal");
          if (signInModal) {
            signInModal.style.display = "flex";
            const signInError = document.getElementById("signInError");
            if (signInError) {
              signInError.className = "text-green-500 text-sm mt-2";
              signInError.textContent =
                "Account created successfully! Please sign in.";

              // Reset error styling after 5 seconds
              setTimeout(() => {
                signInError.className = "text-red-500 text-sm mt-2";
                signInError.textContent = "";
              }, 5000);
            }
          }
        } else {
          console.log("Signup failed:", data.message);
          errorDiv.textContent = data.message || "Sign up failed.";
        }
      } catch (err) {
        console.error("Sign up error:", err);
        errorDiv.textContent = "Network error. Please try again.";
      } finally {
        // Reset loading state
        if (signUpBtn) signUpBtn.disabled = false;
        if (signUpBtnText) signUpBtnText.textContent = "Sign Up";
        if (signUpLoader) signUpLoader.classList.add("hidden");
      }
    };
  }

  // Sign In form submit
  const signInForm = document.getElementById("signInForm");
  if (signInForm) {
    signInForm.onsubmit = async function (e) {
      e.preventDefault();
      const emailEl = document.getElementById("signInEmail");
      const passEl = document.getElementById("signInPassword");
      const errorDiv = document.getElementById("signInError");
      const signInBtn = document.getElementById("signInBtn");
      const signInBtnText = document.getElementById("signInBtnText");
      const signInLoader = document.getElementById("signInLoader");

      const email = emailEl ? emailEl.value.trim().toLowerCase() : "";
      const password = passEl ? passEl.value : "";
      if (errorDiv) errorDiv.textContent = "";

      if (!email || !password) {
        if (errorDiv) errorDiv.textContent = "Email and password are required.";
        return;
      }

      if (signInBtn) signInBtn.disabled = true;
      if (signInBtnText) signInBtnText.textContent = "Signing In...";
      if (signInLoader) signInLoader.classList.remove("hidden");

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (errorDiv)
            errorDiv.textContent = data.message || "Invalid credentials.";
          return;
        }

        // Check if 2FA is required (admin login)
        if (data.requires2FA) {
          // Hide sign in modal and show 2FA verification modal
          const signInModal = document.getElementById("signInModal");
          if (signInModal) signInModal.style.display = "none";
          show2FAVerifyModal(data.tempToken, data.user);
          return;
        }

        // Check if 2FA setup is required (admin first login)
        if (data.requires2FASetup) {
          // Hide sign in modal and show 2FA setup modal
          const signInModal = document.getElementById("signInModal");
          if (signInModal) signInModal.style.display = "none";
          show2FASetupModal(data.tempToken, data.user);
          return;
        }

        // Persist token, user email and role
        if (data && data.accessToken) {
          localStorage.setItem("token", data.accessToken);
        }
        if (data && data.user && data.user.email) {
          localStorage.setItem("userEmail", data.user.email);
        } else {
          localStorage.setItem("userEmail", email);
        }
        if (data && data.user && data.user.role) {
          localStorage.setItem("userRole", data.user.role);
        } else {
          localStorage.setItem("userRole", "user");
        }
        // Hide auth modal and show dashboard
        const signInModal = document.getElementById("signInModal");
        if (signInModal) signInModal.style.display = "none";

        // Show main UI and initialize
        document
          .querySelectorAll(
            "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
          )
          .forEach((el) => {
            if (el) el.style.display = "";
          });
        initializeDashboard();
      } catch (err) {
        if (errorDiv) errorDiv.textContent = "Network error. Please try again.";
      } finally {
        if (signInBtn) signInBtn.disabled = false;
        if (signInBtnText) signInBtnText.textContent = "Sign In";
        if (signInLoader) signInLoader.classList.add("hidden");
      }
    };
  }

  // Require authentication for dashboard
  const token = localStorage.getItem("token");
  if (!token) {
    // Hide dashboard content and force sign in
    document
      .querySelectorAll(
        "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
      )
      .forEach((el) => {
        if (el) el.style.display = "none";
      });
    showSignInModal();
    return;
  }

  // If authenticated, initialize dashboard
  initializeDashboard();

  // Wire up Add Template button to open the modal
  const addTemplateBtn = document.getElementById("addTemplateBtn");
  if (addTemplateBtn) {
    addTemplateBtn.addEventListener("click", openCreateTemplateModal);
  }

  // Wire up Add Feature button to open the modal
  const addFeatureBtn = document.getElementById("addFeatureBtn");
  if (addFeatureBtn) {
    addFeatureBtn.addEventListener("click", openFeatureCrudModal);
  }
  // Wire up Add Photo Filter button to reuse same modal
  const addPhotoFeatureBtn = document.getElementById("addPhotoFeatureBtn");
  if (addPhotoFeatureBtn) {
    addPhotoFeatureBtn.addEventListener("click", openFeatureCrudModal);
  }

  // Wire up Add Cartoon Character button to open the modal
  const addCartoonCharacterBtn = document.getElementById(
    "addCartoonCharacterBtn"
  );
  if (addCartoonCharacterBtn) {
    addCartoonCharacterBtn.addEventListener(
      "click",
      openCartoonCharacterCrudModal
    );
  }

  var modal = document.getElementById("featureCrudModal");
  if (modal) modal.classList.add("hidden");

  var cartoonModal = document.getElementById("cartoonCharacterCrudModal");
  if (cartoonModal) cartoonModal.classList.add("hidden");

  // Tab switching logic
  const sidebarButtons = document.querySelectorAll("aside nav ul li button");
  const tabIds = [
    "tab-dashboard",
    "tab-filters",
    "tab-photo-filters",
    "tab-templates",
    "tab-cartoon-characters",
    "tab-apps",
  ];
  sidebarButtons.forEach((button, idx) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      // Remove active class from all buttons
      sidebarButtons.forEach((b) =>
        b.classList.remove("bg-blue-50", "text-blue-600", "font-medium")
      );
      // Add active class to clicked button
      button.classList.add("bg-blue-50", "text-blue-600", "font-medium");
      // Hide all tab contents
      tabIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });
      // Show selected tab
      const showId = tabIds[idx];
      const showEl = document.getElementById(showId);
      if (showEl) showEl.classList.remove("hidden");
      if (showId === "tab-filters") {
        if (!featuresInitialRequested && !featuresLoading) {
          loadAllFeatures();
          featuresInitialRequested = true;
        } else {
          displayFeatures();
        }
      } else if (showId === "tab-photo-filters") {
        if (!photoFeaturesInitialRequested && !photoFeaturesLoading) {
          loadAllPhotoFeatures().then(() => displayPhotoFeatures());
          photoFeaturesInitialRequested = true;
        } else {
          displayPhotoFeatures();
        }
      } else if (showId === "tab-cartoon-characters") {
        if (!cartoonCharactersInitialRequested && !cartoonCharactersLoading) {
          loadAllCartoonCharacters().then(() => displayCartoonCharacters());
          cartoonCharactersInitialRequested = true;
        } else {
          displayCartoonCharacters();
        }
      } else if (showId === "tab-apps") {
        if (!appsInitialRequested && !appsLoading) {
          initAppsTab();
          loadApps();
          appsInitialRequested = true;
        } else {
          renderApps();
        }
      }
    });
  });
  // Show dashboard tab by default
  tabIds.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", idx !== 0);
  });
});

// Global function for tab switching (called from HTML onclick)
window.switchTab = function (tabName) {
  const tabIds = [
    "tab-dashboard",
    "tab-filters",
    "tab-photo-filters",
    "tab-templates",
    "tab-cartoon-characters",
    "tab-apps",
    "tab-ai-workflows",
  ];
  const tabIndex = tabIds.findIndex((id) => id === `tab-${tabName}`);

  if (tabIndex === -1) return;

  const sidebarButtons = document.querySelectorAll("aside nav ul li button");

  // Remove active class from all buttons
  sidebarButtons.forEach((b) =>
    b.classList.remove("bg-blue-50", "text-blue-600", "font-medium")
  );

  // Add active class to clicked button
  if (sidebarButtons[tabIndex]) {
    sidebarButtons[tabIndex].classList.add(
      "bg-blue-50",
      "text-blue-600",
      "font-medium"
    );
  }

  // Hide all tab contents
  tabIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  // Show selected tab
  const showId = tabIds[tabIndex];
  const showEl = document.getElementById(showId);
  if (showEl) showEl.classList.remove("hidden");

  // Only load features on tab switch if not already loaded
  // Skip re-rendering if we're returning from detail page (scroll restoration handles this)
  if (showId === "tab-filters" && !featuresInitialRequested) {
    loadAllFeatures();
    featuresInitialRequested = true;
  } else if (showId === "tab-photo-filters") {
    if (!photoFeaturesInitialRequested) {
      Promise.all([loadAllPhotoFeatures(), loadPhotoGraphics()]).then(() =>
        displayPhotoFeatures()
      );
      photoFeaturesInitialRequested = true;
    } else if (!isReturningFromDetailPage) {
      // Only reload graphics if not returning from detail page
      loadPhotoGraphics().then(() => displayPhotoFeatures());
    }
    // Reset the flag after handling
    isReturningFromDetailPage = false;
  } else if (showId === "tab-cartoon-characters") {
    if (!cartoonCharactersInitialRequested) {
      loadAllCartoonCharacters().then(() => displayCartoonCharacters());
      cartoonCharactersInitialRequested = true;
    } else {
      displayCartoonCharacters();
    }
  } else if (showId === "tab-apps") {
    if (!appsInitialRequested) {
      initAppsTab();
      loadApps();
      appsInitialRequested = true;
    } else {
      renderApps();
    }
  } else if (showId === "tab-ai-workflows") {
    if (
      typeof window.loadWorkflows === "function" &&
      (!window.allWorkflows || window.allWorkflows.length === 0)
    ) {
      window.loadWorkflows();
      if (typeof window.initWorkflowSearch === "function") {
        window.initWorkflowSearch();
      }
    }
  }
};

// Dashboard initialization function
async function initializeDashboard() {
  console.log("initializeDashboard called");

  // Show dashboard UI
  console.log("Showing dashboard UI elements");
  document
    .querySelectorAll(
      "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
    )
    .forEach((el) => {
      if (el) {
        console.log("Showing element:", el.tagName, el.id || el.className);
        el.style.display = "";
      }
    });

  // Display user email in dropdown
  const storedEmail = localStorage.getItem("userEmail");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  if (storedEmail && userEmailDisplay) {
    userEmailDisplay.textContent = storedEmail;
    console.log("User email displayed:", storedEmail);
  }

  // Display user role badge
  const storedRole = localStorage.getItem("userRole") || "user";
  const userRoleBadge = document.getElementById("userRoleBadge");
  if (userRoleBadge) {
    userRoleBadge.textContent = storedRole;
    if (storedRole === "admin") {
      userRoleBadge.className =
        "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700";
    } else {
      userRoleBadge.className =
        "inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600";
    }
  }

  console.log("Starting data loading sequence...");

  try {
    // Show loader before starting
    showFullscreenLoader();

    // Load templates and endpoints (non-blocking)
    loadTemplates();
    loadAvailableEndpoints();

    await loadFeatureGraphics();
    await loadAllFeatures();

    console.log("Feature graphics and features loaded");

    // Update stats with initial values
    updateStats();

    console.log("Dashboard initialization complete");
  } catch (error) {
    console.error("Error during dashboard initialization:", error);
  } finally {
    // Always hide loader after both finish (success or error)
    hideFullscreenLoader();
    // Apply role-based UI restrictions
    applyRoleBasedUI();
  }
}

let features = [];
let featuresLoading = false;
let featuresInitialRequested = false;
let currentStatusFilter = null; // null means show all, or "completed", "not-completed", "needs-more-videos"
// Photo Filters data store (from Photo_Features model)
let photoFeatures = [];
let photoFeaturesLoading = false;
let photoFeaturesInitialRequested = false;
let savedScrollPosition = 0;
let isReturningFromDetailPage = false;

// === Cartoon Characters tab state ===
let cartoonCharacters = [];
let cartoonCharactersLoading = false;
let cartoonCharactersInitialRequested = false;
let cartoonCharacterGraphics = {};
let cartoonCharacterLatestVideos = {};

// === Apps tab state ===
let apps = [];
let appsLoading = false;
let appsInitialRequested = false;

function getStoredApiKey() {
  return "supersecretadminkey12345";
}

// Check if the current user is an admin
function isAdmin() {
  const role = localStorage.getItem("userRole");
  return role === "admin";
}

// Apply role-based UI restrictions - hide/disable admin-only elements for non-admin users
function applyRoleBasedUI() {
  const hideForUser = !isAdmin();

  // Hide Templates and Apps navigation tabs for non-admin users
  const adminOnlyNavItems = ["nav-templates", "nav-apps"];
  adminOnlyNavItems.forEach((id) => {
    const navItem = document.getElementById(id);
    if (navItem) navItem.style.display = hideForUser ? "none" : "";
  });

  // Hide Add buttons for features, photo filters, templates, cartoon characters
  const addButtons = [
    "addFeatureBtn",
    "addPhotoFeatureBtn",
    "addTemplateBtn",
    "addCartoonCharacterBtn",
  ];
  addButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = hideForUser ? "none" : "";
  });

  // Hide create app form for non-admins
  const createAppForm = document.getElementById("createAppForm");
  if (createAppForm) {
    const formParent = createAppForm.closest(".bg-white.rounded-xl");
    if (formParent) formParent.style.display = hideForUser ? "none" : "";
  }

  // Hide delete buttons in feature detail and cartoon character detail
  const detailDeleteBtns = [
    "featureDetailDeleteBtn",
    "cartoonCharacterDetailDeleteBtn",
  ];
  detailDeleteBtns.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = hideForUser ? "none" : "";
  });

  // Hide rename/edit buttons for non-admins
  const editBtns = document.querySelectorAll(
    "#editFeatureNameBtn, #editCartoonCharacterNameBtn, #editFeaturePromptBtn, #editCartoonCharacterPromptBtn"
  );
  editBtns.forEach((btn) => {
    if (btn) btn.style.display = hideForUser ? "none" : "";
  });

  // Hide generate video buttons for non-admins (this is a write operation)
  const generateBtns = ["featureGenerateVideoBtn", "cartoonGenerateVideoBtn"];
  generateBtns.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = hideForUser ? "none" : "";
  });

  // Hide save prompt buttons for non-admins
  const savePromptBtns = document.querySelectorAll(
    "#featureModalSavePrompt, #cartoonCharacterSavePromptBtn"
  );
  savePromptBtns.forEach((btn) => {
    if (btn) btn.style.display = hideForUser ? "none" : "";
  });

  // Hide video generation sections for non-admins (contains upload + generate)
  const videoGenSections = ["featureVideoGenSection", "cartoonVideoGenSection"];
  videoGenSections.forEach((id) => {
    const section = document.getElementById(id);
    if (section) section.style.display = hideForUser ? "none" : "";
  });

  // Hide status filter buttons and status/prompt sections for non-admins
  const adminOnlySections = [
    "statusFilterButtons", // Status filter buttons on Filters tab
    "featureDetailStatusSection", // Status selector in feature detail
    "featureDetailPromptSection", // Prompt section in feature detail
  ];
  adminOnlySections.forEach((id) => {
    const section = document.getElementById(id);
    if (section) section.style.display = hideForUser ? "none" : "";
  });
}

// Make isAdmin globally available
window.isAdmin = isAdmin;
window.applyRoleBasedUI = applyRoleBasedUI;

function setStoredApiKey(key) {
  if (key && typeof key === "string") {
    localStorage.setItem("adminApiKey", key.trim());
  }
}

// Robust clipboard copy with fallback for non-secure contexts
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // will fallback below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    const selection = document.getSelection();
    const currentRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    if (currentRange && selection) {
      selection.removeAllRanges();
      selection.addRange(currentRange);
    }
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureApiKey(interactive = false) {
  let key = getStoredApiKey();
  if (!key && interactive) {
    key = window.prompt("Enter admin API key (x-api-key):", "");
    if (key) setStoredApiKey(key);
  }
  return key;
}

function apiKeyHeaders() {
  const key = getStoredApiKey();
  return key ? { "x-api-key": key } : {};
}

function initAppsTab() {
  const form = document.getElementById("createAppForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await createApp();
    });
  }
}

async function loadApps() {
  if (appsLoading) return;
  appsLoading = true;
  const listEl = document.getElementById("appsList");
  if (listEl) {
    listEl.innerHTML =
      '<div class="text-sm text-gray-500">Loading apps...</div>';
  }
  try {
    let res = await fetch("/api/apps", { headers: { ...apiKeyHeaders() } });
    if (res.status === 401) {
      // Prompt for API key and retry once
      await ensureApiKey(true);
      res = await fetch("/api/apps", { headers: { ...apiKeyHeaders() } });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || `Failed to load apps (${res.status})`);
    }
    apps = Array.isArray(data) ? data : data.apps || [];
    renderApps();
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `<div class="text-sm text-red-500">${
        (err && err.message) || "Failed to load apps"
      }</div>`;
    }
  } finally {
    appsLoading = false;
  }
}

function maskKey(k) {
  if (!k || typeof k !== "string") return "";
  if (k.length <= 8) return k;
  return `${k.slice(0, 6)}••••${k.slice(-4)}`;
}

function renderApps() {
  const listEl = document.getElementById("appsList");
  if (!listEl) return;
  if (!apps || apps.length === 0) {
    listEl.innerHTML =
      '<div class="text-sm text-gray-500">No apps yet. Create one above.</div>';
    return;
  }
  const adminUser = isAdmin();
  listEl.innerHTML = apps
    .map((app) => {
      const created = app.createdAt
        ? new Date(app.createdAt).toLocaleString()
        : "";
      const keyMasked = app.apiKey ? maskKey(app.apiKey) : "";
      return `
        <div class="border rounded-lg p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold text-gray-800">${app.name}</div>
              <div class="text-xs text-gray-500">${created}</div>
            </div>
            <div class="flex items-center gap-2">
              <button data-app-id="${
                app.id
              }" class="view-app-details px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"><i class="fa fa-eye mr-1"></i>View Details</button>
              ${
                adminUser
                  ? `<button data-app-id="${app.id}" class="rotate-app px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">Rotate Key</button>`
                  : ""
              }
              ${
                adminUser
                  ? `<button data-app-id="${app.id}" class="delete-app px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Delete</button>`
                  : ""
              }
            </div>
          </div>
          <div class="mt-3 p-2 bg-gray-50 rounded border text-sm flex items-center justify-between">
            <code class="truncate flex-1" title="${
              app.apiKey || ""
            }">${keyMasked}</code>
            <div class="flex items-center gap-2 ml-3">
              <button data-key="${
                app.apiKey || ""
              }" class="copy-key px-2 py-1 bg-blue-600 text-white rounded text-xs">Copy</button>
              <button data-key-full="${
                app.apiKey || ""
              }" class="reveal-key px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">Reveal</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Wire up buttons
  listEl.querySelectorAll(".copy-key").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-key") || "";
      if (!key) return;
      const ok = await copyToClipboard(key);
      if (ok) {
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      } else {
        alert("Could not copy to clipboard. Please copy manually.");
      }
    });
  });
  listEl.querySelectorAll(".reveal-key").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key-full") || "";
      if (!key) return;
      alert(`API Key:\n${key}`);
    });
  });
  listEl.querySelectorAll(".rotate-app").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-app-id");
      if (!id) return;
      await rotateAppKey(+id, btn);
    });
  });
  listEl.querySelectorAll(".delete-app").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-app-id");
      if (!id) return;
      if (!confirm("Delete this app?")) return;
      await deleteApp(+id, btn);
    });
  });
  listEl.querySelectorAll(".view-app-details").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-app-id");
      if (!id) return;
      await showAppDetailPage(+id);
    });
  });
}

async function createApp() {
  const nameEl = document.getElementById("newAppName");
  const statusEl = document.getElementById("createAppStatus");
  if (!nameEl) return;
  const name = nameEl.value.trim();
  if (!name) {
    if (statusEl) statusEl.textContent = "Name is required";
    return;
  }
  if (statusEl) statusEl.textContent = "Creating app...";
  try {
    let res = await fetch("/api/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
      body: JSON.stringify({ name }),
    });
    if (res.status === 401) {
      await ensureApiKey(true);
      res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({ name }),
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || `Failed (${res.status})`);
    }
    // Clear input and reload
    nameEl.value = "";
    if (statusEl) statusEl.textContent = "App created!";
    await loadApps();
  } catch (err) {
    if (statusEl)
      statusEl.textContent = (err && err.message) || "Failed to create app";
  }
}

async function rotateAppKey(id, btn) {
  if (btn) btn.disabled = true;
  try {
    let res = await fetch(`/api/apps/${id}/rotate`, {
      method: "POST",
      headers: { ...apiKeyHeaders() },
    });
    if (res.status === 401) {
      await ensureApiKey(true);
      res = await fetch(`/api/apps/${id}/rotate`, {
        method: "POST",
        headers: { ...apiKeyHeaders() },
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || `Failed (${res.status})`);
    }
    await loadApps();
  } catch (err) {
    alert((err && err.message) || "Failed to rotate key");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function deleteApp(id, btn) {
  if (btn) btn.disabled = true;
  try {
    let res = await fetch(`/api/apps/${id}`, {
      method: "DELETE",
      headers: { ...apiKeyHeaders() },
    });
    if (res.status === 401) {
      await ensureApiKey(true);
      res = await fetch(`/api/apps/${id}`, {
        method: "DELETE",
        headers: { ...apiKeyHeaders() },
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data && data.success === false)) {
      throw new Error(data?.message || `Failed (${res.status})`);
    }
    await loadApps();
  } catch (err) {
    alert((err && err.message) || "Failed to delete app");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// === App Detail Page Functions ===
let currentAppDetail = null;
let appResources = null;
let appAnalytics = null;

async function showAppDetailPage(appId) {
  showFullscreenLoader();
  try {
    // Fetch app details, resources, and analytics in parallel
    const [appRes, resourcesRes, analyticsRes] = await Promise.all([
      fetch(`/api/apps/${appId}`, { headers: { ...apiKeyHeaders() } }),
      fetch(`/api/apps/resources/all`, { headers: { ...apiKeyHeaders() } }),
      fetch(`/api/apps/${appId}/analytics`, {
        headers: { ...apiKeyHeaders() },
      }),
    ]);

    const appData = await appRes.json();
    const resourcesData = await resourcesRes.json();
    const analyticsData = await analyticsRes.json();

    if (!appRes.ok || !appData.success) {
      throw new Error(appData.message || "Failed to load app details");
    }
    if (!resourcesRes.ok || !resourcesData.success) {
      throw new Error(resourcesData.message || "Failed to load resources");
    }

    currentAppDetail = appData.app;
    appResources = resourcesData;
    appAnalytics = analyticsData.success ? analyticsData.analytics : null;

    renderAppDetailPage();

    // Hide apps tab, show detail page
    document.getElementById("tab-apps").classList.add("hidden");
    document.getElementById("appDetailPage").classList.remove("hidden");
  } catch (err) {
    alert((err && err.message) || "Failed to load app details");
  } finally {
    hideFullscreenLoader();
  }
}

function renderAppDetailPage() {
  const page = document.getElementById("appDetailPage");
  if (!page || !currentAppDetail) return;

  // Get currently allowed IDs
  const allowedFeatureIds = new Set(
    (currentAppDetail.allowedFeatures || []).map((af) => af.featureId)
  );
  const allowedPhotoFeatureIds = new Set(
    (currentAppDetail.allowedPhotoFeatures || []).map(
      (apf) => apf.photoFeatureId
    )
  );
  const allowedVideoIds = new Set(
    (currentAppDetail.allowedVideos || []).map((av) => av.generatedVideoId)
  );
  const allowedPhotoIds = new Set(
    (currentAppDetail.allowedPhotos || []).map((ap) => ap.generatedPhotoId)
  );

  const keyMasked = currentAppDetail.apiKey
    ? maskKey(currentAppDetail.apiKey)
    : "";
  const created = currentAppDetail.createdAt
    ? new Date(currentAppDetail.createdAt).toLocaleString()
    : "";

  page.innerHTML = `
    <div class="max-w-5xl mx-auto bg-white rounded-xl shadow p-8">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <button onclick="closeAppDetailPage()" class="text-gray-400 hover:text-gray-700 text-xl">
            <i class="fa fa-arrow-left"></i>
          </button>
          <h2 class="text-2xl font-bold text-gray-800">${
            currentAppDetail.name
          }</h2>
          <span class="px-2 py-1 text-xs rounded ${
            currentAppDetail.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }">
            ${currentAppDetail.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div class="text-sm text-gray-500">Created: ${created}</div>
      </div>

      <!-- API Key Section -->
      <div class="mb-8 p-4 bg-gray-50 rounded-lg border">
        <div class="font-semibold text-gray-700 mb-2">API Key</div>
        <div class="flex items-center gap-3">
          <code class="flex-1 bg-white p-2 rounded border text-sm" id="appDetailApiKey">${keyMasked}</code>
          <button onclick="copyAppDetailKey()" class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Copy</button>
          <button onclick="revealAppDetailKey()" class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">Reveal</button>
        </div>
      </div>

      <!-- API Usage Analytics Section -->
      ${renderAppAnalyticsSection()}

      <!-- Permissions Section -->
      <div class="mb-6">
        <h3 class="text-xl font-semibold text-gray-800 mb-4">Permissions</h3>
        <p class="text-sm text-gray-500 mb-4">Select which resources this app can access via its API key.</p>

        <!-- Filters (Video Features) -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-gray-700"><i class="fa fa-film mr-2 text-blue-500"></i>Video Filters</h4>
            <div class="flex gap-2">
              <button onclick="selectAllPermissions('features')" class="text-xs text-blue-600 hover:underline">Select All</button>
              <button onclick="deselectAllPermissions('features')" class="text-xs text-gray-500 hover:underline">Deselect All</button>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded border" id="appFeaturesCheckboxes">
            ${
              (appResources?.features || [])
                .map(
                  (f) => `
              <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                <input type="checkbox" name="feature" value="${f.id}" ${
                    allowedFeatureIds.has(f.id) ? "checked" : ""
                  } class="rounded text-blue-600">
                <span class="truncate" title="${f.endpoint}">${
                    f.endpoint
                  }</span>
              </label>
            `
                )
                .join("") ||
              '<span class="text-gray-400 text-sm">No video filters available</span>'
            }
          </div>
        </div>

        <!-- Photo Filters -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-gray-700"><i class="fa fa-image mr-2 text-green-500"></i>Photo Filters</h4>
            <div class="flex gap-2">
              <button onclick="selectAllPermissions('photoFeatures')" class="text-xs text-blue-600 hover:underline">Select All</button>
              <button onclick="deselectAllPermissions('photoFeatures')" class="text-xs text-gray-500 hover:underline">Deselect All</button>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded border" id="appPhotoFeaturesCheckboxes">
            ${
              (appResources?.photoFeatures || [])
                .map(
                  (pf) => `
              <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                <input type="checkbox" name="photoFeature" value="${pf.id}" ${
                    allowedPhotoFeatureIds.has(pf.id) ? "checked" : ""
                  } class="rounded text-green-600">
                <span class="truncate" title="${pf.endpoint}">${
                    pf.endpoint
                  }</span>
              </label>
            `
                )
                .join("") ||
              '<span class="text-gray-400 text-sm">No photo filters available</span>'
            }
          </div>
        </div>

        <!-- Generated Videos -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-gray-700"><i class="fa fa-video mr-2 text-purple-500"></i>Generated Videos</h4>
            <div class="flex gap-2">
              <button onclick="selectAllPermissions('generatedVideos')" class="text-xs text-blue-600 hover:underline">Select All</button>
              <button onclick="deselectAllPermissions('generatedVideos')" class="text-xs text-gray-500 hover:underline">Deselect All</button>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded border" id="appGeneratedVideosCheckboxes">
            ${
              (appResources?.generatedVideos || [])
                .map(
                  (v) => `
              <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                <input type="checkbox" name="generatedVideo" value="${v.id}" ${
                    allowedVideoIds.has(v.id) ? "checked" : ""
                  } class="rounded text-purple-600">
                <span class="truncate text-blue-600 hover:underline cursor-pointer" title="${
                  v.feature
                } - ${
                    v.id
                  }" onclick="event.preventDefault(); event.stopPropagation(); showAppMediaPreview('video', '${encodeURIComponent(
                    v.signedUrl || v.url
                  )}', '${v.feature} (#${v.id})')">${v.feature} (#${
                    v.id
                  })</span>
              </label>
            `
                )
                .join("") ||
              '<span class="text-gray-400 text-sm">No generated videos available</span>'
            }
          </div>
        </div>

        <!-- Generated Photos -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-gray-700"><i class="fa fa-photo-video mr-2 text-orange-500"></i>Generated Photos</h4>
            <div class="flex gap-2">
              <button onclick="selectAllPermissions('generatedPhotos')" class="text-xs text-blue-600 hover:underline">Select All</button>
              <button onclick="deselectAllPermissions('generatedPhotos')" class="text-xs text-gray-500 hover:underline">Deselect All</button>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded border" id="appGeneratedPhotosCheckboxes">
            ${
              (appResources?.generatedPhotos || [])
                .map(
                  (p) => `
              <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                <input type="checkbox" name="generatedPhoto" value="${p.id}" ${
                    allowedPhotoIds.has(p.id) ? "checked" : ""
                  } class="rounded text-orange-600">
                <span class="truncate text-blue-600 hover:underline cursor-pointer" title="${
                  p.feature
                } - ${
                    p.id
                  }" onclick="event.preventDefault(); event.stopPropagation(); showAppMediaPreview('image', '${encodeURIComponent(
                    p.signedUrl || p.url
                  )}', '${p.feature} (#${p.id})')">${p.feature} (#${
                    p.id
                  })</span>
              </label>
            `
                )
                .join("") ||
              '<span class="text-gray-400 text-sm">No generated photos available</span>'
            }
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-3">
        <button onclick="closeAppDetailPage()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
        ${
          isAdmin()
            ? `<button onclick="saveAppPermissions()" id="saveAppPermissionsBtn" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <i class="fa fa-save mr-2"></i>Save Permissions
        </button>`
            : ""
        }
      </div>
      <div id="appDetailStatus" class="text-sm mt-3 text-center"></div>
    </div>
  `;

  // Disable checkboxes for non-admin users
  if (!isAdmin()) {
    page.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.disabled = true;
      cb.style.opacity = "0.6";
    });
    // Hide select/deselect all buttons for non-admins
    page
      .querySelectorAll(
        '[onclick*="selectAllPermissions"], [onclick*="deselectAllPermissions"]'
      )
      .forEach((btn) => {
        btn.style.display = "none";
      });
  }
}

// Render the analytics section for app detail page
function renderAppAnalyticsSection() {
  if (!appAnalytics) {
    return `
      <div class="mb-8 p-4 bg-gray-50 rounded-lg border">
        <h3 class="text-xl font-semibold text-gray-800 mb-4"><i class="fa fa-chart-bar mr-2 text-blue-500"></i>API Usage Analytics</h3>
        <p class="text-gray-500 text-sm">No API usage data available yet. Analytics will appear here once API calls are made.</p>
      </div>
    `;
  }

  const {
    totalCalls,
    successCalls,
    errorCalls,
    successRate,
    avgResponseTime,
    callsByEndpoint,
    callsByFeatureType,
    callsByModel,
    dailyCalls,
    recentCalls,
  } = appAnalytics;

  // Format response time
  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return "N/A";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Build top filters list
  const topFiltersHtml =
    (callsByEndpoint || [])
      .slice(0, 5)
      .map(
        (item) => `
    <div class="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span class="text-sm text-gray-700 truncate flex-1" title="${item.endpoint}">${item.endpoint}</span>
      <span class="text-sm font-semibold text-blue-600 ml-2">${item.count}</span>
    </div>
  `
      )
      .join("") || '<p class="text-gray-400 text-sm">No filter usage yet</p>';

  // Build feature type breakdown
  const featureTypeHtml =
    (callsByFeatureType || [])
      .map((item) => {
        const icon =
          item.featureType === "video"
            ? "fa-film text-purple-500"
            : item.featureType === "photo"
            ? "fa-image text-green-500"
            : item.featureType === "cartoon"
            ? "fa-paint-brush text-orange-500"
            : "fa-question text-gray-400";
        return `
      <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded">
        <i class="fa ${icon}"></i>
        <span class="text-sm text-gray-700 capitalize">${
          item.featureType || "Unknown"
        }</span>
        <span class="text-sm font-semibold text-blue-600 ml-auto">${
          item.count
        }</span>
      </div>
    `;
      })
      .join("") || '<p class="text-gray-400 text-sm">No data</p>';

  // Build top models list
  const topModelsHtml =
    (callsByModel || [])
      .slice(0, 5)
      .map(
        (item) => `
    <div class="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span class="text-sm text-gray-700 truncate flex-1" title="${
        item.model
      }">${item.model || "N/A"}</span>
      <span class="text-sm font-semibold text-blue-600 ml-2">${
        item.count
      }</span>
    </div>
  `
      )
      .join("") || '<p class="text-gray-400 text-sm">No model usage data</p>';

  // Build recent calls table
  const recentCallsHtml =
    (recentCalls || [])
      .slice(0, 10)
      .map((call) => {
        const statusColor =
          call.status === "success" ? "text-green-600" : "text-red-600";
        const statusIcon =
          call.status === "success" ? "fa-check-circle" : "fa-times-circle";
        const timeAgo = getTimeAgo(new Date(call.createdAt));
        return `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-2 px-2 text-sm">
          <i class="fa ${statusIcon} ${statusColor} mr-1"></i>
          <span class="${statusColor} capitalize">${call.status}</span>
        </td>
        <td class="py-2 px-2 text-sm text-gray-700 truncate max-w-[150px]" title="${
          call.endpoint
        }">${call.endpoint || "N/A"}</td>
        <td class="py-2 px-2 text-sm text-gray-500">${
          call.featureType || "N/A"
        }</td>
        <td class="py-2 px-2 text-sm text-gray-500 truncate max-w-[100px]" title="${
          call.model
        }">${call.model || "N/A"}</td>
        <td class="py-2 px-2 text-sm text-gray-500">${formatTime(
          call.responseTime
        )}</td>
        <td class="py-2 px-2 text-sm text-gray-400">${timeAgo}</td>
        <td class="py-2 px-2 text-sm text-red-500 truncate max-w-[150px]" title="${
          call.errorMessage || ""
        }">${call.errorMessage || "-"}</td>
      </tr>
    `;
      })
      .join("") ||
    '<tr><td colspan="7" class="py-4 text-center text-gray-400">No recent API calls</td></tr>';

  return `
    <div class="mb-8 p-4 bg-gray-50 rounded-lg border">
      <h3 class="text-xl font-semibold text-gray-800 mb-4"><i class="fa fa-chart-bar mr-2 text-blue-500"></i>API Usage Analytics</h3>
      
      <!-- Summary Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg border text-center">
          <div class="text-3xl font-bold text-blue-600">${totalCalls || 0}</div>
          <div class="text-sm text-gray-500">Total Calls</div>
        </div>
        <div class="bg-white p-4 rounded-lg border text-center">
          <div class="text-3xl font-bold text-green-600">${
            successCalls || 0
          }</div>
          <div class="text-sm text-gray-500">Successful</div>
        </div>
        <div class="bg-white p-4 rounded-lg border text-center">
          <div class="text-3xl font-bold text-red-600">${errorCalls || 0}</div>
          <div class="text-sm text-gray-500">Errors</div>
        </div>
        <div class="bg-white p-4 rounded-lg border text-center">
          <div class="text-3xl font-bold text-purple-600">${
            successRate || 0
          }%</div>
          <div class="text-sm text-gray-500">Success Rate</div>
        </div>
      </div>

      <!-- Avg Response Time -->
      <div class="mb-6 bg-white p-3 rounded-lg border inline-block">
        <span class="text-gray-600"><i class="fa fa-clock mr-2"></i>Avg Response Time:</span>
        <span class="font-semibold text-blue-600 ml-2">${formatTime(
          avgResponseTime
        )}</span>
      </div>

      <!-- Feature Type & Top Filters/Models -->
      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <!-- Feature Type Breakdown -->
        <div class="bg-white p-4 rounded-lg border">
          <h4 class="font-semibold text-gray-700 mb-3"><i class="fa fa-layer-group mr-2 text-indigo-500"></i>By Type</h4>
          <div class="flex flex-col gap-2">
            ${featureTypeHtml}
          </div>
        </div>

        <!-- Top Filters -->
        <div class="bg-white p-4 rounded-lg border">
          <h4 class="font-semibold text-gray-700 mb-3"><i class="fa fa-filter mr-2 text-blue-500"></i>Top Filters</h4>
          ${topFiltersHtml}
        </div>

        <!-- Top Models -->
        <div class="bg-white p-4 rounded-lg border">
          <h4 class="font-semibold text-gray-700 mb-3"><i class="fa fa-robot mr-2 text-green-500"></i>Top Models</h4>
          ${topModelsHtml}
        </div>
      </div>

      <!-- Recent API Calls Table -->
      <div class="bg-white rounded-lg border overflow-hidden">
        <h4 class="font-semibold text-gray-700 p-4 border-b"><i class="fa fa-history mr-2 text-gray-500"></i>Recent API Calls</h4>
        <div class="overflow-x-auto max-h-64 overflow-y-auto">
          <table class="w-full text-left">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Filter</th>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Model</th>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">When</th>
                <th class="py-2 px-2 text-xs font-semibold text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody>
              ${recentCallsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Helper function to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function closeAppDetailPage() {
  document.getElementById("appDetailPage").classList.add("hidden");
  document.getElementById("tab-apps").classList.remove("hidden");
  currentAppDetail = null;
}

async function copyAppDetailKey() {
  if (!currentAppDetail?.apiKey) return;
  const ok = await copyToClipboard(currentAppDetail.apiKey);
  if (ok) {
    alert("API Key copied to clipboard!");
  } else {
    alert("Could not copy. Key: " + currentAppDetail.apiKey);
  }
}

function revealAppDetailKey() {
  if (!currentAppDetail?.apiKey) return;
  const keyEl = document.getElementById("appDetailApiKey");
  if (keyEl) {
    if (keyEl.dataset.revealed === "true") {
      keyEl.textContent = maskKey(currentAppDetail.apiKey);
      keyEl.dataset.revealed = "false";
    } else {
      keyEl.textContent = currentAppDetail.apiKey;
      keyEl.dataset.revealed = "true";
    }
  }
}

function selectAllPermissions(type) {
  let containerId;
  switch (type) {
    case "features":
      containerId = "appFeaturesCheckboxes";
      break;
    case "photoFeatures":
      containerId = "appPhotoFeaturesCheckboxes";
      break;
    case "generatedVideos":
      containerId = "appGeneratedVideosCheckboxes";
      break;
    case "generatedPhotos":
      containerId = "appGeneratedPhotosCheckboxes";
      break;
    default:
      return;
  }
  const container = document.getElementById(containerId);
  if (container) {
    container
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = true));
  }
}

function deselectAllPermissions(type) {
  let containerId;
  switch (type) {
    case "features":
      containerId = "appFeaturesCheckboxes";
      break;
    case "photoFeatures":
      containerId = "appPhotoFeaturesCheckboxes";
      break;
    case "generatedVideos":
      containerId = "appGeneratedVideosCheckboxes";
      break;
    case "generatedPhotos":
      containerId = "appGeneratedPhotosCheckboxes";
      break;
    default:
      return;
  }
  const container = document.getElementById(containerId);
  if (container) {
    container
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
  }
}

async function saveAppPermissions() {
  if (!currentAppDetail) return;

  const statusEl = document.getElementById("appDetailStatus");
  const saveBtn = document.getElementById("saveAppPermissionsBtn");

  // Gather selected IDs
  const featureIds = Array.from(
    document.querySelectorAll(
      '#appFeaturesCheckboxes input[name="feature"]:checked'
    )
  ).map((cb) => parseInt(cb.value));
  const photoFeatureIds = Array.from(
    document.querySelectorAll(
      '#appPhotoFeaturesCheckboxes input[name="photoFeature"]:checked'
    )
  ).map((cb) => parseInt(cb.value));
  const generatedVideoIds = Array.from(
    document.querySelectorAll(
      '#appGeneratedVideosCheckboxes input[name="generatedVideo"]:checked'
    )
  ).map((cb) => parseInt(cb.value));
  const generatedPhotoIds = Array.from(
    document.querySelectorAll(
      '#appGeneratedPhotosCheckboxes input[name="generatedPhoto"]:checked'
    )
  ).map((cb) => parseInt(cb.value));

  if (saveBtn) saveBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Saving permissions...";

  try {
    const res = await fetch(`/api/apps/${currentAppDetail.id}/permissions`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...apiKeyHeaders(),
      },
      body: JSON.stringify({
        featureIds,
        photoFeatureIds,
        generatedVideoIds,
        generatedPhotoIds,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to save permissions");
    }

    currentAppDetail = data.app;
    if (statusEl) {
      statusEl.textContent = "Permissions saved successfully!";
      statusEl.className = "text-sm mt-3 text-center text-green-600";
    }

    // Refresh app list in background
    loadApps();
  } catch (err) {
    if (statusEl) {
      statusEl.textContent =
        (err && err.message) || "Failed to save permissions";
      statusEl.className = "text-sm mt-3 text-center text-red-600";
    }
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// Make app detail functions globally available
window.showAppDetailPage = showAppDetailPage;
window.closeAppDetailPage = closeAppDetailPage;
window.copyAppDetailKey = copyAppDetailKey;
window.revealAppDetailKey = revealAppDetailKey;
window.selectAllPermissions = selectAllPermissions;
window.deselectAllPermissions = deselectAllPermissions;
window.saveAppPermissions = saveAppPermissions;

// App Media Preview Modal
function showAppMediaPreview(type, encodedUrl, title) {
  const url = decodeURIComponent(encodedUrl);

  // Create or get the modal
  let modal = document.getElementById("appMediaPreviewModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "appMediaPreviewModal";
    modal.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 id="appMediaPreviewTitle" class="font-semibold text-gray-800"></h3>
          <button onclick="closeAppMediaPreview()" class="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <div id="appMediaPreviewContent" class="p-4 flex justify-center items-center bg-gray-100" style="min-height: 300px; max-height: 70vh;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAppMediaPreview();
    });
  }

  const titleEl = document.getElementById("appMediaPreviewTitle");
  const contentEl = document.getElementById("appMediaPreviewContent");

  if (titleEl)
    titleEl.textContent =
      title || (type === "video" ? "Video Preview" : "Image Preview");

  if (contentEl) {
    if (type === "video") {
      contentEl.innerHTML = `
        <video controls autoplay class="max-w-full max-h-full rounded" style="max-height: 60vh;">
          <source src="${url}" type="video/mp4">
          Your browser does not support video playback.
        </video>
      `;
    } else {
      contentEl.innerHTML = `
        <img src="${url}" alt="${
        title || "Image preview"
      }" class="max-w-full max-h-full rounded object-contain" style="max-height: 60vh;" />
      `;
    }
  }

  modal.style.display = "flex";
}

function closeAppMediaPreview() {
  const modal = document.getElementById("appMediaPreviewModal");
  if (modal) {
    modal.style.display = "none";
    // Stop video if playing
    const video = modal.querySelector("video");
    if (video) {
      video.pause();
      video.src = "";
    }
  }
}

window.showAppMediaPreview = showAppMediaPreview;
window.closeAppMediaPreview = closeAppMediaPreview;

// Load all features at once
async function loadAllFeatures() {
  if (featuresLoading) return;

  featuresLoading = true;
  const grid = document.getElementById("featuresGrid");

  // Show loading indicator
  if (grid) {
    grid.innerHTML =
      '<div class="col-span-full text-sm text-gray-500">Loading all features...</div>';
  }

  try {
    const searchEl = document.getElementById("featureSearch");
    const params = new URLSearchParams();

    if (searchEl && searchEl.value.trim()) {
      params.set("q", searchEl.value.trim());
    }

    // Add status filter if set
    if (currentStatusFilter) {
      params.set("status", currentStatusFilter);
    }

    // Fetch all features without pagination (with optional status filter)
    const url = currentStatusFilter
      ? `/api/features/all?status=${encodeURIComponent(currentStatusFilter)}`
      : `/api/features/all`;
    const response = await fetch(url, {
      headers: apiKeyHeaders(),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed");
    // Handle new API response format: { success: true, features: [...] }
    const incomingFeatures =
      data.features || (Array.isArray(data) ? data : data.items || []);
    features = incomingFeatures.map((feature) => ({
      ...feature,
      featureType: "video",
    }));

    if (features.length === 0) {
      if (grid) {
        grid.innerHTML =
          '<div class="text-sm text-gray-500">No features found.</div>';
      }
      return;
    }

    displayFeatures();
    updateStats();
  } catch (e) {
    console.error("Error loading features", e);
    if (grid) {
      grid.innerHTML =
        '<div class="text-sm text-red-500">Error loading features. Please try again.</div>';
    }
  } finally {
    featuresLoading = false;
  }
}

// Load all photo features (Photo_Features model)
async function loadAllPhotoFeatures() {
  if (photoFeaturesLoading) return;

  photoFeaturesLoading = true;
  const grid = document.getElementById("photoFeaturesGrid");

  if (grid) {
    grid.innerHTML =
      '<div class="col-span-full text-sm text-gray-500">Loading all photo filters...</div>';
  }

  try {
    const response = await fetch(`/api/photo-features/all`, {
      headers: apiKeyHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed");
    const incomingPhotoFeatures =
      data.features || (Array.isArray(data) ? data : data.items || []);
    photoFeatures = incomingPhotoFeatures.map((feature) => ({
      ...feature,
      featureType: "photo",
    }));

    if (photoFeatures.length === 0) {
      if (grid) {
        grid.innerHTML =
          '<div class="text-sm text-gray-500">No photo filters found.</div>';
      }
      return;
    }

    displayPhotoFeatures();
  } catch (e) {
    console.error("Error loading photo features", e);
    if (grid) {
      grid.innerHTML =
        '<div class="text-sm text-red-500">Error loading photo filters. Please try again.</div>';
    }
  } finally {
    photoFeaturesLoading = false;
  }
}

let templates = [];
let availableEndpoints = [];
let featureGraphics = {};
let latestVideos = {};
let photoGraphics = {};

// Display features
function displayFeatures() {
  const grid = document.getElementById("featuresGrid");

  // Debug info
  const graphicsCount = Object.keys(featureGraphics).length;
  const videosCount = Object.keys(latestVideos).length;
  console.log(
    `displayFeatures: ${graphicsCount} graphics, ${videosCount} videos available`
  );
  if (graphicsCount > 0) {
    console.log("Sample graphics:", Object.keys(featureGraphics).slice(0, 3));
  }

  const searchInput = document.getElementById("featureSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  // Use the existing grid variable from the outer scope if present
  function renderFeatureCards(featureArr) {
    const cardsHtml = featureArr
      .map((feature) => {
        const videoUrl =
          featureGraphics[feature.endpoint] || latestVideos[feature.endpoint];
        const playable =
          videoUrl && typeof videoUrl === "object"
            ? videoUrl.signedUrl || videoUrl.url
            : videoUrl;
        const videoHtml = playable
          ? `<div class="video-preview lazy-video" data-src="${playable}">
              <div class="video-skeleton" style="width:100%;height:180px;background:#111;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;border-radius:4px;">Loading preview...</div>
            </div>`
          : `<div class=\"video-preview\">
               <div class=\"bg-gray-100 rounded-lg p-8 text-center text-gray-500\">
                 <i class=\"fas fa-video text-3xl mb-2\"></i>
                 <div>No video generated yet</div>
               </div>
             </div>`;
        return `
          <div class=\"feature-card bg-white rounded-lg shadow p-4 flex flex-col gap-2 cursor-pointer\" data-endpoint=\"${feature.endpoint}\">
            <div class=\"feature-name font-semibold text-lg mb-2\">${feature.endpoint}</div>
            ${videoHtml}
            <div class=\"text-gray-600 text-sm mt-1\"></div>
            <div class=\"mt-2\">
              <button class=\"view-feature-details px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700\">View details</button>
            </div>
          </div>
        `;
      })
      .join("");
    grid.innerHTML = cardsHtml;
    if (window.initializeLazyVideos) window.initializeLazyVideos();
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".view-feature-details");
      if (btn) {
        const card = btn.closest(".feature-card");
        if (card) {
          const endpoint = card.getAttribute("data-endpoint");
          if (endpoint) showFeatureDetailPage(endpoint, "filters");
        }
      }
    });
  }
  if (searchTerm) {
    fetch(`/api/features?search=${encodeURIComponent(searchTerm)}`)
      .then((res) => res.json())
      .then((data) => {
        let filtered = [];
        if (data && data.success && Array.isArray(data.features)) {
          filtered = data.features;
        }
        renderFeatureCards(filtered);
      })
      .catch(() => {
        renderFeatureCards([]);
      });
  } else {
    renderFeatureCards(features);
  }
}

// Display features in Photo Filters tab (reuses same data and card layout)
function displayPhotoFeatures() {
  const grid = document.getElementById("photoFeaturesGrid");
  if (!grid) return;

  const graphicsCount = Object.keys(photoGraphics).length;
  console.log(
    `displayPhotoFeatures: ${graphicsCount} photo graphics available`
  );

  const searchInput = document.getElementById("photoFeatureSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

  function renderFeatureCards(featureArr) {
    const cardsHtml = featureArr
      .map((feature) => {
        const photoUrl = photoGraphics[feature.endpoint];
        const playable =
          photoUrl && typeof photoUrl === "object"
            ? photoUrl.signedUrl || photoUrl.url
            : photoUrl;
        const photoHtml = playable
          ? `<div class="photo-preview" style="width:100%;min-height:120px;max-height:300px;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f9fafb;">
                         <img src="${playable}" alt="${feature.endpoint}" style="max-width:100%;max-height:300px;height:auto;width:auto;object-fit:contain;" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;\\'>Image failed to load</div>'" />
                       </div>`
          : `<div class="photo-preview"> 
               <div class="bg-gray-100 rounded-lg p-8 text-center text-gray-500" style="height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                 <i class="fas fa-image text-3xl mb-2"></i>
                 <div>No photo generated yet</div>
               </div>
             </div>`;
        return `
          <div class="feature-card bg-white rounded-lg shadow p-4 flex flex-col gap-2 cursor-pointer" data-endpoint="${feature.endpoint}"> 
            <div class="feature-name font-semibold text-lg mb-2">${feature.endpoint}</div>
            ${photoHtml}
            <div class="text-gray-600 text-sm mt-1"></div>
            <div class="mt-2">
              <button class="view-feature-details px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">View details</button>
            </div>
          </div>
        `;
      })
      .join("");
    grid.innerHTML = cardsHtml;
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".view-feature-details");
      if (btn) {
        const card = btn.closest(".feature-card");
        if (card) {
          const endpoint = card.getAttribute("data-endpoint");
          if (endpoint) showFeatureDetailPage(endpoint, "photo-filters");
        }
      }
    });
  }

  if (searchTerm) {
    fetch(`/api/photo-features?search=${encodeURIComponent(searchTerm)}`)
      .then((res) => res.json())
      .then((data) => {
        let filtered = [];
        if (data && data.success && Array.isArray(data.features)) {
          filtered = data.features;
        }
        renderFeatureCards(filtered);
      })
      .catch(() => {
        renderFeatureCards([]);
      });
  } else {
    renderFeatureCards(photoFeatures);
  }
}

// Full reload convenience used by legacy calls
async function loadFeatures() {
  features = [];
  await loadAllFeatures();
}

// Search handling
const featureSearchInput = document.getElementById("featureSearch");
if (featureSearchInput) {
  featureSearchInput.addEventListener("input", () => {
    if (!featuresInitialRequested) return; // don't auto-load if tab never opened
    // For client-side filtering we just re-display
    displayFeatures();
  });
}

// Status filter button handling
function initializeStatusFilters() {
  const filterButtons = document.querySelectorAll(".status-filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status");

      // Toggle: if already active, clear filter (show all)
      if (currentStatusFilter === status) {
        currentStatusFilter = null;
        btn.classList.remove(
          "bg-green-500",
          "bg-red-500",
          "bg-yellow-500",
          "text-white"
        );
        // Reset all buttons to outline style
        filterButtons.forEach((b) => {
          b.classList.remove(
            "bg-green-500",
            "bg-red-500",
            "bg-yellow-500",
            "text-white"
          );
        });
      } else {
        currentStatusFilter = status;
        // Reset all buttons first
        filterButtons.forEach((b) => {
          b.classList.remove(
            "bg-green-500",
            "bg-red-500",
            "bg-yellow-500",
            "text-white"
          );
        });
        // Highlight the active button
        if (status === "completed") {
          btn.classList.add("bg-green-500", "text-white");
        } else if (status === "not-completed") {
          btn.classList.add("bg-red-500", "text-white");
        } else if (status === "needs-more-videos") {
          btn.classList.add("bg-yellow-500", "text-white");
        }
      }

      // Reload features with new filter
      loadAllFeatures();
    });
  });
}

// Initialize status filters when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeStatusFilters);
} else {
  initializeStatusFilters();
}

// Update feature status buttons in detail page to reflect current status
function updateFeatureStatusButtons(currentStatus) {
  const buttons = document.querySelectorAll(".feature-status-btn");
  buttons.forEach((btn) => {
    const status = btn.getAttribute("data-status");
    // Remove all active styles first
    btn.classList.remove(
      "bg-green-500",
      "bg-red-500",
      "bg-yellow-500",
      "text-white"
    );

    // Add active style if this is the current status
    if (status === currentStatus) {
      if (status === "completed") {
        btn.classList.add("bg-green-500", "text-white");
      } else if (status === "not-completed") {
        btn.classList.add("bg-red-500", "text-white");
      } else if (status === "needs-more-videos") {
        btn.classList.add("bg-yellow-500", "text-white");
      }
    }
  });
}

// Update feature status via API
async function updateFeatureStatus(newStatus) {
  const endpoint = window.currentFeatureEndpoint;
  if (!endpoint) {
    console.error("No feature endpoint set");
    return;
  }

  try {
    const response = await fetch(
      `/api/features/${encodeURIComponent(endpoint)}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update status");
    }

    // Update UI
    updateFeatureStatusButtons(newStatus);

    // Update the feature in the local array
    const featureIndex = features.findIndex((f) => f.endpoint === endpoint);
    if (featureIndex !== -1) {
      features[featureIndex].status = newStatus;
    }

    // Also check photo features
    const photoFeatureIndex = photoFeatures.findIndex(
      (f) => f.endpoint === endpoint
    );
    if (photoFeatureIndex !== -1) {
      photoFeatures[photoFeatureIndex].status = newStatus;
    }

    console.log(`Feature ${endpoint} status updated to ${newStatus}`);
  } catch (error) {
    console.error("Error updating feature status:", error);
    alert("Failed to update status: " + error.message);
  }
}

// Make updateFeatureStatus available globally for onclick handlers
window.updateFeatureStatus = updateFeatureStatus;

// Photo Filters search handling
const photoFeatureSearchInput = document.getElementById("photoFeatureSearch");
if (photoFeatureSearchInput) {
  photoFeatureSearchInput.addEventListener("input", () => {
    if (!photoFeaturesInitialRequested) return;
    displayPhotoFeatures();
  });
}

// Show feature detail as a full page (hides all tab content, shows detail page)
function showFeatureDetailPage(endpoint, sourceTab = "filters") {
  featureDetailOriginTab = sourceTab || "filters";
  console.log(
    "showFeatureDetailPage called with endpoint:",
    endpoint,
    "from",
    featureDetailOriginTab
  );
  console.log("Current features array:", features);

  // Save current scroll position before showing detail page
  savedScrollPosition =
    window.pageYOffset || document.documentElement.scrollTop;
  console.log("Saved scroll position:", savedScrollPosition);

  try {
    let feature = features.find((f) => f.endpoint === endpoint);
    if (!feature && Array.isArray(photoFeatures) && photoFeatures.length) {
      feature = photoFeatures.find((f) => f.endpoint === endpoint);
    }
    console.log("Found feature:", feature);
    if (!feature) {
      console.error("Feature not found for endpoint:", endpoint);
      return;
    }
    const isPhotoFeature = feature.featureType === "photo";
    // Hide all tab content and modals (but not the page we want to show)
    console.log("Hiding other elements...");
    const elementsToHide = document.querySelectorAll(
      ".tab-content, #featureCrudModal, #createTemplateModal, #stepDetailPage"
    );
    console.log("Elements to hide:", elementsToHide);
    elementsToHide.forEach((el) => {
      if (el) {
        console.log("Hiding element:", el.id, el.className);
        el.classList.add("hidden");
        el.style.display = "none";
      }
    });
    // Show detail page robustly
    const page = document.getElementById("featureDetailPage");
    console.log("Feature detail page element:", page);
    if (!page) {
      console.error("featureDetailPage element not found");
      // Fallback: show filters tab if detail page missing
      const filtersTab = document.getElementById("tab-filters");
      if (filtersTab) {
        filtersTab.classList.remove("hidden");
        filtersTab.style.display = "";
      }
      return;
    }

    // Set endpoint name and prompt in the detail page
    const endpointNameEl = document.getElementById("featureModalTitle");
    if (endpointNameEl) endpointNameEl.textContent = feature.endpoint || "";
    const endpointDetailNameEl = document.getElementById("featureDetailName");
    if (endpointDetailNameEl)
      endpointDetailNameEl.textContent = feature.endpoint || "";
    // Already declared above if present, do not redeclare

    // Force show the page with multiple approaches
    page.classList.remove("hidden");
    page.style.display = "block";
    page.style.visibility = "visible";
    page.style.position = "absolute";
    page.style.top = "0";
    page.style.left = "0";
    page.style.right = "0";
    page.style.bottom = "0";
    page.style.zIndex = "10";
    page.style.backgroundColor = "#f9fafb"; // bg-gray-50

    // Also ensure parent containers are visible
    let parent = page.parentElement;
    while (parent && parent !== document.body) {
      console.log(
        "Checking parent:",
        parent.tagName,
        parent.id,
        parent.className
      );
      parent.style.display = "";
      parent.classList.remove("hidden");
      parent = parent.parentElement;
    }

    console.log("Page should now be visible");
    console.log("Page computed style:", window.getComputedStyle(page).display);
    console.log("Page classes:", page.className);
    console.log("Page visibility:", window.getComputedStyle(page).visibility);
    console.log("Page position in viewport:", page.getBoundingClientRect());

    // Fill content safely
    const titleEl = document.getElementById("featureDetailTitle");
    const promptEl = document.getElementById("featureDetailPrompt");
    console.log("Title element:", titleEl);
    console.log("Prompt element:", promptEl);
    if (titleEl) titleEl.textContent = feature.endpoint;
    if (promptEl) promptEl.textContent = feature.prompt || "";

    // Update status buttons to reflect current status
    updateFeatureStatusButtons(feature.status || "not-completed");

    // Store current feature endpoint for status updates
    window.currentFeatureEndpoint = feature.endpoint;

    const featureVideoEl = document.getElementById("featureDetailVideo");
    const featurePhotoEl = document.getElementById("featureDetailPhoto");

    async function updateFeatureDetailVideo() {
      let videoUrl =
        featureGraphics[feature.endpoint] || latestVideos[feature.endpoint];
      if (!videoUrl) {
        try {
          const res = await fetch(
            `/api/videos/${encodeURIComponent(feature.endpoint)}`
          );
          const videos = await res.json();
          if (Array.isArray(videos) && videos.length > 0) {
            videoUrl =
              videos[0].signedUrl ||
              videos[0].url ||
              videos[0].cloudinaryUrl ||
              videos[0].videoUrl ||
              videos[0].video_url ||
              "";
            latestVideos[feature.endpoint] = videoUrl;
          }
        } catch (e) {
          videoUrl = "";
        }
      }
      if (featureVideoEl) {
        if (videoUrl) {
          featureVideoEl.src = videoUrl;
          featureVideoEl.style.display = "block";
        } else {
          featureVideoEl.style.display = "none";
        }
      }
      if (featurePhotoEl) featurePhotoEl.style.display = "none";
    }

    async function updateFeatureDetailPhoto() {
      if (featureVideoEl) featureVideoEl.style.display = "none";
      if (!featurePhotoEl) return;
      try {
        const res = await fetch(`/api/photo-graphic/${feature.endpoint}`);
        const photos = await res.json();
        const latest =
          Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
        const url = latest?.signedUrl || latest?.url;
        if (url) {
          featurePhotoEl.src = url;
          featurePhotoEl.style.display = "block";
        } else {
          featurePhotoEl.style.display = "none";
        }
      } catch (err) {
        featurePhotoEl.style.display = "none";
      }
    }

    if (isPhotoFeature) {
      updateFeatureDetailPhoto();
    } else {
      updateFeatureDetailVideo();
    }

    // --- Feature video generation logic ---
    let uploadedImageUrl = null;
    const uploadSection = document.getElementById("featureImageUploadSection");
    const input = document.getElementById("featureImageInput");
    const preview = document.getElementById("featureImagePreview");
    const uploadStatus = document.getElementById("featureUploadStatus");
    const genBtn = document.getElementById("featureGenerateVideoBtn");
    const genStatus = document.getElementById("featureGenStatus");
    const featureModelSelect = document.getElementById("featureModelSelect");
    const featureLastFrameWrapper = document.getElementById(
      "featureLastFrameWrapper"
    );
    const ideogramOptionsPanel = document.getElementById(
      "ideogramOptionsPanel"
    );
    const ideogramDimensionSelect = document.getElementById(
      "ideogramDimensionSelect"
    );
    if (ideogramDimensionSelect && !window.__ideogramDimensionSelect) {
      window.__ideogramDimensionSelect = ideogramDimensionSelect;
    }
    const ideogramReferenceUuidInput = document.getElementById(
      "ideogramReferenceUuidInput"
    );
    const ideogramRenderingSpeedSelect = document.getElementById(
      "ideogramRenderingSpeedSelect"
    );
    const ideogramMagicPromptToggle = document.getElementById(
      "ideogramMagicPromptToggle"
    );
    const ideogramStyleTypeInput = document.getElementById(
      "ideogramStyleTypeInput"
    );
    const ideogramStylePresetInput = document.getElementById(
      "ideogramStylePresetInput"
    );
    const ideogramStyleCodeInput = document.getElementById(
      "ideogramStyleCodeInput"
    );
    const ideogramRemixStrengthInput = document.getElementById(
      "ideogramRemixStrengthInput"
    );
    const ideogramReferenceNotice = document.getElementById(
      "ideogramReferenceNotice"
    );
    const ideogramReferenceLabel = ideogramReferenceUuidInput
      ? ideogramReferenceUuidInput.closest("label")
      : null;
    const ideogramRemixStrengthLabel = ideogramRemixStrengthInput
      ? ideogramRemixStrengthInput.closest("label")
      : null;
    // Vidu Q1 extra reference wrappers
    const featureRef2Wrapper = document.getElementById("featureRef2Wrapper");
    const featureRef3Wrapper = document.getElementById("featureRef3Wrapper");
    const featureRef2Input = document.getElementById("featureRef2Input");
    const featureRef3Input = document.getElementById("featureRef3Input");
    const featureRef2Preview = document.getElementById("featureRef2Preview");
    const featureRef3Preview = document.getElementById("featureRef3Preview");
    const featureLastFrameInput = document.getElementById(
      "featureLastFrameInput"
    );
    const featureLastFramePreview = document.getElementById(
      "featureLastFramePreview"
    );
    const featureAudioUploadSection = document.getElementById(
      "featureAudioUploadSection"
    );
    const featureAudioInput = document.getElementById("featureAudioInput");
    const featureAudioPreview = document.getElementById("featureAudioPreview");
    const featureAudioStatus = document.getElementById("featureAudioStatus");
    let featureLastFrameUrl = null;
    let featureRef2Url = null;
    let featureRef3Url = null;
    let featureRunwareImageUUID = null;
    let featureImageDataUri = null;
    let featureUploadedImageFile = null;

    const getIdeogramSelectionState = () => {
      if (!isPhotoFeature || !featureModelSelect) {
        return {
          selectedModel: null,
          isBase: false,
          isRemix: false,
          isFamily: false,
        };
      }
      const selectedModel = featureModelSelect.value;
      const isBase = selectedModel === IDEOGRAM_MODEL_ID;
      const isRemix = selectedModel === IDEOGRAM_REMIX_MODEL_ID;
      return {
        selectedModel,
        isBase,
        isRemix,
        isFamily: isBase || isRemix,
      };
    };

    const updateIdeogramOptionsState = (opts = {}) => {
      if (!ideogramOptionsPanel) return;
      const { selectedModel, isFamily, isRemix } = getIdeogramSelectionState();
      if (!isPhotoFeature || !isFamily) {
        ideogramOptionsPanel.style.display = "none";
        if (ideogramReferenceLabel)
          ideogramReferenceLabel.style.display = "none";
        if (ideogramRemixStrengthLabel)
          ideogramRemixStrengthLabel.style.display = "none";
        if (ideogramReferenceNotice)
          ideogramReferenceNotice.style.display = "none";
        return;
      }

      ideogramOptionsPanel.style.display = "block";

      if (!opts.skipDropdown) {
        const select = window.__ideogramDimensionSelect;
        const activeModel = select?.dataset?.activeModel;
        if (!select || activeModel !== selectedModel) {
          initializeIdeogramDropdown(selectedModel);
        }
      }

      if (ideogramReferenceLabel) {
        ideogramReferenceLabel.style.display = isRemix ? "flex" : "none";
      }
      if (ideogramRemixStrengthLabel) {
        ideogramRemixStrengthLabel.style.display = isRemix ? "flex" : "none";
      }
      if (ideogramReferenceNotice) {
        ideogramReferenceNotice.style.display = "block";
        ideogramReferenceNotice.textContent = isRemix
          ? featureRunwareImageUUID
            ? "Reference ready. Remix will reuse your uploaded image."
            : "Remix requires a Runware reference. Upload an image to continue."
          : "Optional: upload an image if you want to store its Runware reference.";
      }
    };

    const setFeatureRunwareReference = (uuid) => {
      featureRunwareImageUUID = uuid || null;
      if (ideogramReferenceUuidInput) {
        ideogramReferenceUuidInput.value = featureRunwareImageUUID || "";
      }
      updateIdeogramOptionsState({ skipDropdown: true });
    };

    // Reset UI
    if (preview) {
      preview.style.display = "none";
      preview.src = "";
    }
    if (uploadStatus) uploadStatus.textContent = "";
    if (genStatus) genStatus.textContent = "";
    uploadedImageUrl = null;
    setFeatureRunwareReference(null);
    featureImageDataUri = null;
    featureUploadedImageFile = null;

    // Drag & drop wiring
    if (uploadSection && input) {
      uploadSection.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadSection.classList.add("dragover");
      });
      uploadSection.addEventListener("dragleave", () =>
        uploadSection.classList.remove("dragover")
      );
      uploadSection.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadSection.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith("image/")) {
          input.files = files;
          handleFeatureImageUpload();
        }
      });
      // Remove the onclick handler since the label already handles clicks properly
      // uploadSection.onclick = (e) => {
      //   if (e.target.tagName !== "INPUT") input.click();
      // };
    }
    if (input) {
      input.onchange = handleFeatureImageUpload;
    }
    // Pixverse last frame upload
    if (featureLastFrameInput) {
      featureLastFrameInput.onchange = () => {
        const file =
          featureLastFrameInput.files && featureLastFrameInput.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("image", file);
        if (uploadStatus) uploadStatus.textContent = "Uploading last frame...";
        fetch("/api/upload-image", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((r) => {
            const url = r && r.success ? r.signedUrl || r.url : null;
            if (url) {
              featureLastFrameUrl = url;
              if (featureLastFramePreview) {
                featureLastFramePreview.src = url;
                featureLastFramePreview.style.display = "block";
              }
              if (uploadStatus)
                uploadStatus.textContent = "Last frame uploaded!";
            } else {
              if (uploadStatus)
                uploadStatus.textContent = "Last frame upload failed.";
            }
            featureLastFrameInput.value = "";
          })
          .catch(() => {
            if (uploadStatus)
              uploadStatus.textContent = "Last frame upload failed.";
            featureLastFrameInput.value = "";
          });
      };
    }
    // Vidu Q1 ref2 upload
    if (featureRef2Input) {
      featureRef2Input.onchange = () => {
        const file = featureRef2Input.files && featureRef2Input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("image", file);
        if (uploadStatus) uploadStatus.textContent = "Uploading ref 2...";
        fetch("/api/upload-image", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((r) => {
            const url = r && r.success ? r.signedUrl || r.url : null;
            if (url) {
              featureRef2Url = url;
              if (featureRef2Preview) {
                featureRef2Preview.src = url;
                featureRef2Preview.style.display = "block";
              }
              if (uploadStatus) uploadStatus.textContent = "Ref 2 uploaded!";
            } else {
              if (uploadStatus)
                uploadStatus.textContent = "Ref 2 upload failed.";
            }
            featureRef2Input.value = "";
          })
          .catch(() => {
            if (uploadStatus) uploadStatus.textContent = "Ref 2 upload failed.";
            featureRef2Input.value = "";
          });
      };
    }
    // Vidu Q1 ref3 upload
    if (featureRef3Input) {
      featureRef3Input.onchange = () => {
        const file = featureRef3Input.files && featureRef3Input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("image", file);
        if (uploadStatus) uploadStatus.textContent = "Uploading ref 3...";
        fetch("/api/upload-image", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((r) => {
            const url = r && r.success ? r.signedUrl || r.url : null;
            if (url) {
              featureRef3Url = url;
              if (featureRef3Preview) {
                featureRef3Preview.src = url;
                featureRef3Preview.style.display = "block";
              }
              if (uploadStatus) uploadStatus.textContent = "Ref 3 uploaded!";
            } else {
              if (uploadStatus)
                uploadStatus.textContent = "Ref 3 upload failed.";
            }
            featureRef3Input.value = "";
          })
          .catch(() => {
            if (uploadStatus) uploadStatus.textContent = "Ref 3 upload failed.";
            featureRef3Input.value = "";
          });
      };
    }
    // Toggle display of last frame uploader based on model selection
    if (featureModelSelect && !featureModelSelectVideoOptionsHtml) {
      featureModelSelectVideoOptionsHtml = featureModelSelect.innerHTML;
    }
    if (featureModelSelect) {
      if (isPhotoFeature) {
        featureModelSelect.innerHTML = PHOTO_MODEL_OPTIONS.map(
          (opt) => `<option value="${opt.value}">${opt.label}</option>`
        ).join("");
        featureModelSelect.value = PHOTO_MODEL_OPTIONS[0]?.value || "";
      } else if (featureModelSelectVideoOptionsHtml) {
        featureModelSelect.innerHTML = featureModelSelectVideoOptionsHtml;
      }
    }

    const toggleIdeogramOptions = (opts = {}) => {
      updateIdeogramOptionsState(opts);
    };

    if (isPhotoFeature) {
      if (featureModelSelect) {
        featureModelSelect.addEventListener("change", toggleIdeogramOptions);
      }
      toggleIdeogramOptions();
    } else if (ideogramOptionsPanel) {
      ideogramOptionsPanel.style.display = "none";
    }

    if (featureModelSelect && featureLastFrameWrapper && !isPhotoFeature) {
      let uploadedAudioUrl = null;
      let uploadedAudioFile = null;
      const toggleFeatureLastFrame = () => {
        const val = featureModelSelect.value || "";
        const isPixTrans = /pixverse-v4-transition/i.test(val);
        const isVidu = /vidu-q1-reference-to-video/i.test(val);
        const isBytedance = /bytedance-omnihuman/i.test(val);
        featureLastFrameWrapper.style.display = isPixTrans ? "flex" : "none";
        if (!isPixTrans) {
          featureLastFrameUrl = null;
          if (featureLastFramePreview)
            featureLastFramePreview.style.display = "none";
        }
        if (featureRef2Wrapper)
          featureRef2Wrapper.style.display = isVidu ? "flex" : "none";
        if (featureRef3Wrapper)
          featureRef3Wrapper.style.display = isVidu ? "flex" : "none";
        if (!isVidu) {
          featureRef2Url = null;
          featureRef3Url = null;
          if (featureRef2Preview) featureRef2Preview.style.display = "none";
          if (featureRef3Preview) featureRef3Preview.style.display = "none";
        }
        if (featureAudioUploadSection)
          featureAudioUploadSection.style.display = isBytedance
            ? "block"
            : "none";
        if (!isBytedance && featureAudioPreview) {
          featureAudioPreview.style.display = "none";
          featureAudioPreview.src = "";
          uploadedAudioUrl = null;
          uploadedAudioFile = null;
        }
      };
      featureModelSelect.addEventListener("change", toggleFeatureLastFrame);
      setTimeout(toggleFeatureLastFrame, 0);

      // Model configuration panel handling
      const modelConfigPanel = document.getElementById("modelConfigPanel");
      const durationField = document.getElementById("durationField");
      // Get all config field references
      const resolutionField = document.getElementById("resolutionField");
      const cameraMovementField = document.getElementById(
        "cameraMovementField"
      );
      const styleField = document.getElementById("styleField");
      const motionModeField = document.getElementById("motionModeField");
      const generateAudioField = document.getElementById("generateAudioField");
      const qualityField = document.getElementById("qualityField");
      const widthField = document.getElementById("widthField");
      const heightField = document.getElementById("heightField");
      const fpsField = document.getElementById("fpsField");
      const cfgScaleField = document.getElementById("cfgScaleField");
      const stepsField = document.getElementById("stepsField");
      const movementAmplitudeField = document.getElementById(
        "movementAmplitudeField"
      );
      const bgmField = document.getElementById("bgmField");
      const orientationField = document.getElementById("orientationField");
      const promptOptimizerField = document.getElementById(
        "promptOptimizerField"
      );
      const cameraFixedField = document.getElementById("cameraFixedField");
      const publicFigureThresholdField = document.getElementById(
        "publicFigureThresholdField"
      );
      const controlModeField = document.getElementById("controlModeField");
      const seedField = document.getElementById("seedField");
      const negativePromptField = document.getElementById(
        "negativePromptField"
      );

      function updateModelConfigPanel() {
        const selectedModel = featureModelSelect?.value || "";

        // Hide all fields first
        const allFields = [
          durationField,
          resolutionField,
          cameraMovementField,
          styleField,
          motionModeField,
          generateAudioField,
          qualityField,
          widthField,
          heightField,
          fpsField,
          cfgScaleField,
          stepsField,
          movementAmplitudeField,
          bgmField,
          orientationField,
          promptOptimizerField,
          cameraFixedField,
          publicFigureThresholdField,
          controlModeField,
          seedField,
          negativePromptField,
        ];
        allFields.forEach((field) => {
          if (field) field.style.display = "none";
        });

        let showPanel = false;

        // PixVerse V5 (Text-to-Video via Runware)
        if (
          /pixverse-v5-image-to-video/i.test(selectedModel) ||
          /pixverse:4@1/i.test(selectedModel)
        ) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (resolutionField) resolutionField.style.display = "flex";
          if (cameraMovementField) cameraMovementField.style.display = "flex";
          if (styleField) styleField.style.display = "flex";
          if (motionModeField) motionModeField.style.display = "flex";
        }
        // Google Veo 3 / 3.1 / 3.1 Fast models (native audio support)
        else if (
          /google:3@0|google:3@2|google:3@3|veo.*3.*(?:image|fast)|veo3@fast|veo.*3\.1/i.test(
            selectedModel
          )
        ) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (generateAudioField) generateAudioField.style.display = "flex";
        }
        // Kling 2.5 Turbo Pro (Text-to-Video)
        else if (
          /klingai:6@1|kling-2\.5-turbo-pro(?!.*image)/i.test(selectedModel)
        ) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
        }
        // Kling Image-to-Video models
        else if (/kling.*image-to-video/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
        }
        // Seedance Pro Fast (Bytedance)
        else if (/seedance.*fast|bytedance:2@2/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (cameraFixedField) cameraFixedField.style.display = "flex";
        }
        // LTX-2 Pro
        else if (/ltx.*2.*pro|lightricks:2@0/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (widthField) widthField.style.display = "flex";
          if (heightField) heightField.style.display = "flex";
          if (cfgScaleField) cfgScaleField.style.display = "flex";
          if (stepsField) stepsField.style.display = "flex";
          if (seedField) seedField.style.display = "flex";
        }
        // LTX-2 Fast
        else if (/ltx.*2.*fast|lightricks:2@1/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (widthField) widthField.style.display = "flex";
          if (heightField) heightField.style.display = "flex";
          if (cfgScaleField) cfgScaleField.style.display = "flex";
          if (stepsField) stepsField.style.display = "flex";
        }
        // Vidu Q2 Turbo
        else if (/vidu.*q?2.*turbo|vidu:3@2/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (movementAmplitudeField)
            movementAmplitudeField.style.display = "flex";
          if (bgmField) bgmField.style.display = "flex";
        }
        // Vidu Q2 Pro
        else if (/vidu.*q?2.*pro|vidu:3@1/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (movementAmplitudeField)
            movementAmplitudeField.style.display = "flex";
          if (bgmField) bgmField.style.display = "flex";
        }
        // Runway Gen-4 Turbo
        else if (/runway.*gen.*4.*turbo|runway:1@1/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (widthField) widthField.style.display = "flex";
          if (heightField) heightField.style.display = "flex";
          if (fpsField) fpsField.style.display = "flex";
          if (cfgScaleField) cfgScaleField.style.display = "flex";
          if (publicFigureThresholdField)
            publicFigureThresholdField.style.display = "flex";
        }
        // Sora 2 (OpenAI)
        else if (/sora.*2(?!.*pro)|openai:3@1/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (orientationField) orientationField.style.display = "flex";
        }
        // Sora 2 Pro
        else if (/sora.*2.*pro|openai:3@2/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (orientationField) orientationField.style.display = "flex";
        }
        // Hailuo 2.3 Fast (MiniMax)
        else if (/hailuo.*2\.?3.*fast|minimax:4@2/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
        }
        // Hailuo 2.3
        else if (/hailuo.*2\.?3(?!.*fast)|minimax:4@1/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (promptOptimizerField) promptOptimizerField.style.display = "flex";
        }
        // ControlNet XL Video
        else if (
          /controlnet.*xl.*video|civitai:136070@267493/i.test(selectedModel)
        ) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (widthField) widthField.style.display = "flex";
          if (heightField) heightField.style.display = "flex";
          if (cfgScaleField) cfgScaleField.style.display = "flex";
          if (stepsField) stepsField.style.display = "flex";
          if (controlModeField) controlModeField.style.display = "flex";
          if (seedField) seedField.style.display = "flex";
        }
        // Claymotion F1
        else if (/claymotion.*f1|civitai:855822@957548/i.test(selectedModel)) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (widthField) widthField.style.display = "flex";
          if (heightField) heightField.style.display = "flex";
          if (cfgScaleField) cfgScaleField.style.display = "flex";
          if (stepsField) stepsField.style.display = "flex";
        }
        // PixVerse v4/v4.5 Transition and Image-to-Video models (via EachLabs API)
        else if (
          /pixverse-v4(?:\.5)?-(transition|image-to-video)/i.test(selectedModel)
        ) {
          showPanel = true;
          if (durationField) durationField.style.display = "flex";
          if (qualityField) qualityField.style.display = "flex";
          if (motionModeField) motionModeField.style.display = "flex";
        }

        if (modelConfigPanel) {
          modelConfigPanel.style.display = showPanel ? "block" : "none";
        }
      }

      if (featureModelSelect) {
        featureModelSelect.addEventListener("change", updateModelConfigPanel);
        setTimeout(updateModelConfigPanel, 0);
      }

      if (featureAudioInput && featureAudioStatus && featureAudioPreview) {
        featureAudioInput.onchange = function () {
          const file = featureAudioInput.files && featureAudioInput.files[0];
          if (!file) return;
          if (!/^audio\//.test(file.type)) {
            featureAudioStatus.textContent =
              "Please select a valid audio file.";
            featureAudioStatus.className =
              "upload-status error text-xs mt-2 text-center";
            featureAudioInput.value = "";
            return;
          }
          const audioUrl = URL.createObjectURL(file);
          const audio = new Audio();
          audio.src = audioUrl;
          audio.onloadedmetadata = function () {
            if (audio.duration > 30.5) {
              featureAudioStatus.textContent =
                "Audio must be 30 seconds or less.";
              featureAudioStatus.className =
                "upload-status error text-xs mt-2 text-center";
              featureAudioInput.value = "";
              featureAudioPreview.style.display = "none";
              featureAudioPreview.src = "";
              uploadedAudioUrl = null;
              uploadedAudioFile = null;
              return;
            }
            featureAudioPreview.src = audioUrl;
            featureAudioPreview.style.display = "block";
            featureAudioStatus.textContent = "Audio ready!";
            featureAudioStatus.className =
              "upload-status success text-xs mt-2 text-center";
            uploadedAudioFile = file;
            uploadedAudioUrl = audioUrl;
          };
        };
      }
      window._featureAudioFile = () => uploadedAudioFile;
      window._featureAudioUrl = () => uploadedAudioUrl;
    } else {
      if (featureLastFrameWrapper)
        featureLastFrameWrapper.style.display = "none";
      if (featureRef2Wrapper) featureRef2Wrapper.style.display = "none";
      if (featureRef3Wrapper) featureRef3Wrapper.style.display = "none";
      if (featureAudioUploadSection)
        featureAudioUploadSection.style.display = "none";
      window._featureAudioFile = () => null;
      window._featureAudioUrl = () => null;
    }
    async function handleFeatureImageUpload() {
      const file = input.files && input.files[0];
      if (!file) return;
      featureUploadedImageFile = file;
      featureImageDataUri = null;
      setFeatureRunwareReference(null);
      if (isPhotoFeature) {
        try {
          if (uploadStatus) {
            uploadStatus.textContent = "Processing image...";
            uploadStatus.className = "upload-status text-sm mt-3 text-center";
          }
          const dataUri = await fileToDataUrl(file);
          if (typeof dataUri === "string") {
            featureImageDataUri = dataUri;
            uploadedImageUrl = dataUri;
            if (preview) {
              preview.src = dataUri;
              preview.style.display = "block";
              preview.classList.add("image-preview");
            }
          }
          if (uploadStatus) {
            uploadStatus.textContent = "Uploading Runware reference...";
          }
          await uploadRunwareReference(file);
        } catch (err) {
          featureImageDataUri = null;
          uploadedImageUrl = null;
          if (uploadStatus) {
            uploadStatus.textContent =
              err?.message || "Failed to process image.";
            uploadStatus.className =
              "upload-status error text-sm mt-3 text-center";
          }
        } finally {
          input.value = "";
        }
        return;
      }
      const formData = new FormData();
      formData.append("image", file);
      if (uploadStatus) uploadStatus.textContent = "Uploading...";
      fetch("/api/upload-image", { method: "POST", body: formData })
        .then((res) => res.json())
        .then((result) => {
          const url =
            result && result.success ? result.signedUrl || result.url : null;
          if (url) {
            uploadedImageUrl = url;
            if (preview) {
              preview.src = url;
              preview.style.display = "block";
              preview.classList.add("image-preview");
            }
            if (uploadStatus) {
              uploadStatus.textContent = isPhotoFeature
                ? "Image uploaded. Preparing Runware reference..."
                : "Image uploaded!";
              uploadStatus.className =
                "upload-status success text-sm mt-3 text-center";
            }
            if (isPhotoFeature) {
              uploadRunwareReference(file);
            }
          } else {
            if (uploadStatus) {
              uploadStatus.textContent = "Upload failed.";
              uploadStatus.className =
                "upload-status error text-sm mt-3 text-center";
            }
          }
          input.value = "";
        })
        .catch(() => {
          if (uploadStatus) uploadStatus.textContent = "Upload failed.";
          input.value = "";
        });
    }

    async function uploadRunwareReference(file) {
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/runware/upload-image", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok || !data?.imageUUID) {
          throw new Error(data?.error || "Runware upload failed");
        }
        setFeatureRunwareReference(data.imageUUID);
        if (uploadStatus)
          uploadStatus.textContent = "Image ready for Runware edits.";
      } catch (err) {
        setFeatureRunwareReference(null);
        if (uploadStatus) {
          uploadStatus.textContent =
            err?.message || "Runware upload failed. Please retry.";
          uploadStatus.className =
            "upload-status error text-sm mt-3 text-center";
        }
      }
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    if (genBtn) {
      if (isPhotoFeature) {
        genBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Photo';
        genBtn.onclick = async function () {
          const modelSelect = document.getElementById("featureModelSelect");
          const selectedModel = modelSelect ? modelSelect.value : "";
          if (!selectedModel) {
            if (genStatus)
              genStatus.textContent = "Select a model before generating.";
            return;
          }
          const isIdeogramRemixModel =
            selectedModel === IDEOGRAM_REMIX_MODEL_ID;
          const isIdeogramModel =
            selectedModel === IDEOGRAM_MODEL_ID || isIdeogramRemixModel;
          if (
            !isIdeogramModel &&
            !featureUploadedImageFile &&
            !uploadedImageUrl
          ) {
            if (genStatus)
              genStatus.textContent = "Please upload an image first.";
            return;
          }
          const featurePromptEl = document.getElementById(
            "featureDetailPrompt"
          );
          const promptText =
            (featurePromptEl && featurePromptEl.textContent) || feature.prompt;
          genBtn.disabled = true;
          if (genStatus) {
            genStatus.textContent = "Generating photo...";
            genStatus.style.color = "#6b7280";
          }
          try {
            let response;
            if (selectedModel === "sourceful:1@1") {
              if (!featureRunwareImageUUID && featureUploadedImageFile) {
                await uploadRunwareReference(featureUploadedImageFile);
              }
              if (!featureRunwareImageUUID) {
                throw new Error(
                  "Runware reference missing. Please re-upload the image."
                );
              }
              response = await fetch("/api/runware/riverflow/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: promptText,
                  feature: feature.endpoint,
                  references: [featureRunwareImageUUID],
                  width: 1024,
                  height: 1024,
                  numberResults: 1,
                }),
              });
            } else {
              const requestPayload = {
                feature: feature.endpoint,
                prompt: promptText,
                model: selectedModel,
                numberResults: 1,
              };

              if (isIdeogramModel) {
                const fallbackDimension =
                  getIdeogramDefaultDimension(selectedModel);
                let dimensionValue =
                  (ideogramDimensionSelect && ideogramDimensionSelect.value) ||
                  `${fallbackDimension.width}x${fallbackDimension.height}`;
                if (!/\d+x\d+/.test(dimensionValue)) {
                  dimensionValue = `${fallbackDimension.width}x${fallbackDimension.height}`;
                }
                const [dimW, dimH] = dimensionValue
                  .split("x")
                  .map((val) => parseInt(val, 10));
                const resolvedWidth = Number.isFinite(dimW)
                  ? dimW
                  : fallbackDimension.width;
                const resolvedHeight = Number.isFinite(dimH)
                  ? dimH
                  : fallbackDimension.height;
                requestPayload.width = resolvedWidth;
                requestPayload.height = resolvedHeight;

                const renderingSpeedRaw = ideogramRenderingSpeedSelect
                  ? ideogramRenderingSpeedSelect.value || "QUALITY"
                  : "QUALITY";
                const renderingSpeed = renderingSpeedRaw
                  .toUpperCase()
                  .includes("SPEED")
                  ? "SPEED"
                  : "QUALITY";
                const magicPromptEnabled = ideogramMagicPromptToggle
                  ? ideogramMagicPromptToggle.checked !== false
                  : true;
                const styleTypeValue = ideogramStyleTypeInput
                  ? ideogramStyleTypeInput.value.trim()
                  : "";
                const stylePresetValue = ideogramStylePresetInput
                  ? ideogramStylePresetInput.value.trim()
                  : "";
                const styleCodeValue = ideogramStyleCodeInput
                  ? ideogramStyleCodeInput.value.trim()
                  : "";

                const ideogramSettings = {
                  renderingSpeed,
                  magicPrompt: magicPromptEnabled ? "ON" : "OFF",
                };
                if (styleTypeValue) {
                  ideogramSettings.styleType = styleTypeValue;
                }
                if (stylePresetValue) {
                  ideogramSettings.stylePreset = stylePresetValue;
                }
                if (styleCodeValue) {
                  ideogramSettings.styleCode = styleCodeValue;
                }

                if (isIdeogramRemixModel) {
                  if (!featureRunwareImageUUID) {
                    throw new Error(
                      "Remix requires an uploaded Runware reference. Please upload an image first."
                    );
                  }
                  requestPayload.referenceImages = [featureRunwareImageUUID];
                  ideogramSettings.styleReferenceImages = [
                    featureRunwareImageUUID,
                  ];
                  let remixStrengthValue = ideogramRemixStrengthInput
                    ? parseInt(ideogramRemixStrengthInput.value, 10)
                    : NaN;
                  if (
                    !Number.isFinite(remixStrengthValue) ||
                    remixStrengthValue < 0 ||
                    remixStrengthValue > 100
                  ) {
                    remixStrengthValue = 70;
                  }
                  ideogramSettings.remixStrength = remixStrengthValue;
                }

                requestPayload.ideogramSettings = ideogramSettings;
              } else {
                let seedImage = uploadedImageUrl;
                if (featureUploadedImageFile) {
                  const dataUri =
                    featureImageDataUri ||
                    (await fileToDataUrl(featureUploadedImageFile));
                  if (typeof dataUri === "string") {
                    featureImageDataUri = dataUri;
                    seedImage = dataUri;
                  }
                }
                if (!seedImage) {
                  throw new Error("Unable to determine reference image.");
                }
                requestPayload.seedImage = seedImage;
                requestPayload.width = 1024;
                requestPayload.height = 1024;
              }

              response = await fetch("/api/runware/generate-photo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestPayload),
              });
            }
            const data = await response.json();
            const imageUrl =
              data?.image?.url ||
              (Array.isArray(data?.images) && data.images[0]?.url);
            if (!response.ok || !imageUrl) {
              throw new Error(
                data?.error || data?.message || "Failed to generate photo"
              );
            }
            if (featurePhotoEl) {
              featurePhotoEl.src = imageUrl;
              featurePhotoEl.style.display = "block";
            }
            photoGraphics[feature.endpoint] = imageUrl;
            displayPhotoFeatures();
            if (genStatus) {
              genStatus.textContent = "Photo generated!";
              genStatus.style.color = "green";
            }
          } catch (err) {
            if (genStatus) {
              genStatus.textContent = `Error: ${err?.message || err}`;
              genStatus.style.color = "red";
            }
          } finally {
            genBtn.disabled = false;
            genBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Photo';
          }
        };
      } else {
        genBtn.onclick = async function () {
          if (!uploadedImageUrl) {
            if (genStatus)
              genStatus.textContent = "Please upload an image first.";
            return;
          }
          genBtn.disabled = true;
          if (genStatus) genStatus.textContent = "Generating video...";
          try {
            const modelSelect = document.getElementById("featureModelSelect");
            const selectedModel = modelSelect ? modelSelect.value : undefined;
            const featurePromptEl = document.getElementById(
              "featureDetailPrompt"
            );
            const promptOverride = featurePromptEl
              ? featurePromptEl.textContent
              : undefined;
            // Audio file logic for Bytedance Omnihuman
            let audioFile = null;
            if (window._featureAudioFile) {
              audioFile = window._featureAudioFile();
            }
            let response, data;
            if (/bytedance-omnihuman/i.test(selectedModel || "") && audioFile) {
              // Use FormData for Bytedance Omnihuman/Seeddance with audio
              const formData = new FormData();
              formData.append("image_url", uploadedImageUrl);
              formData.append("model", selectedModel);
              if (promptOverride) formData.append("prompt", promptOverride);
              formData.append("audio_file", audioFile);
              response = await fetch(
                `/api/generate-video/${encodeURIComponent(feature.endpoint)}`,
                {
                  method: "POST",
                  headers: { ...apiKeyHeaders() },
                  body: formData,
                }
              );
              data = await response.json();
            } else {
              response = await fetch(
                `/api/generate-video/${encodeURIComponent(feature.endpoint)}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...apiKeyHeaders(),
                  },
                  body: JSON.stringify(
                    (() => {
                      const payload = {
                        imageUrl: uploadedImageUrl,
                        model: selectedModel,
                        prompt: promptOverride,
                      };

                      // Add model configuration parameters if set
                      const durationSelect = document.getElementById(
                        "modelDurationSelect"
                      );
                      const resolutionSelect = document.getElementById(
                        "modelResolutionSelect"
                      );
                      const cameraMovementSelect = document.getElementById(
                        "modelCameraMovementSelect"
                      );
                      const styleSelect =
                        document.getElementById("modelStyleSelect");
                      const motionModeSelect = document.getElementById(
                        "modelMotionModeSelect"
                      );
                      const generateAudioCheck = document.getElementById(
                        "modelGenerateAudioCheck"
                      );
                      const qualitySelect =
                        document.getElementById("modelQualitySelect");
                      const widthInput =
                        document.getElementById("modelWidthInput");
                      const heightInput =
                        document.getElementById("modelHeightInput");
                      const fpsInput = document.getElementById("modelFpsInput");
                      const cfgScaleInput =
                        document.getElementById("modelCfgScaleInput");
                      const stepsInput =
                        document.getElementById("modelStepsInput");
                      const movementAmplitudeSelect = document.getElementById(
                        "modelMovementAmplitudeSelect"
                      );
                      const bgmCheck = document.getElementById("modelBgmCheck");
                      const orientationSelect = document.getElementById(
                        "modelOrientationSelect"
                      );
                      const promptOptimizerCheck = document.getElementById(
                        "modelPromptOptimizerCheck"
                      );
                      const cameraFixedCheck = document.getElementById(
                        "modelCameraFixedCheck"
                      );
                      const publicFigureThresholdInput =
                        document.getElementById(
                          "modelPublicFigureThresholdInput"
                        );
                      const controlModeSelect = document.getElementById(
                        "modelControlModeSelect"
                      );
                      const seedInput =
                        document.getElementById("modelSeedInput");
                      const negativePromptInput = document.getElementById(
                        "modelNegativePromptInput"
                      );

                      // Basic parameters
                      if (durationSelect?.value) {
                        payload.duration = Number(durationSelect.value);
                      }
                      if (resolutionSelect?.value) {
                        payload.resolution = resolutionSelect.value;
                      }
                      if (cameraMovementSelect?.value) {
                        payload.cameraMovement = cameraMovementSelect.value;
                      }
                      if (styleSelect?.value) {
                        payload.style = styleSelect.value;
                      }
                      if (motionModeSelect?.value) {
                        payload.motionMode = motionModeSelect.value;
                      }
                      if (generateAudioCheck) {
                        payload.generateAudio = generateAudioCheck.checked;
                      }

                      // Additional parameters
                      if (qualitySelect?.value) {
                        payload.quality = qualitySelect.value;
                      }
                      if (widthInput?.value) {
                        payload.width = Number(widthInput.value);
                      }
                      if (heightInput?.value) {
                        payload.height = Number(heightInput.value);
                      }
                      if (fpsInput?.value) {
                        payload.fps = Number(fpsInput.value);
                      }
                      if (cfgScaleInput?.value) {
                        payload.cfgScale = Number(cfgScaleInput.value);
                      }
                      if (stepsInput?.value) {
                        payload.steps = Number(stepsInput.value);
                      }
                      if (movementAmplitudeSelect?.value) {
                        payload.movementAmplitude =
                          movementAmplitudeSelect.value;
                      }
                      if (bgmCheck) {
                        payload.bgm = bgmCheck.checked;
                      }
                      if (orientationSelect?.value) {
                        payload.orientation = orientationSelect.value;
                      }
                      if (promptOptimizerCheck) {
                        payload.promptOptimizer = promptOptimizerCheck.checked;
                      }
                      if (cameraFixedCheck) {
                        payload.cameraFixed = cameraFixedCheck.checked;
                      }
                      if (publicFigureThresholdInput?.value) {
                        payload.publicFigureThreshold = Number(
                          publicFigureThresholdInput.value
                        );
                      }
                      if (controlModeSelect?.value) {
                        payload.controlMode = controlModeSelect.value;
                      }
                      if (seedInput?.value) {
                        payload.seed = Number(seedInput.value);
                      }
                      if (negativePromptInput?.value?.trim()) {
                        payload.negativePrompt =
                          negativePromptInput.value.trim();
                      }

                      if (
                        /pixverse-v4-transition/i.test(selectedModel || "") &&
                        featureLastFrameUrl
                      ) {
                        payload.lastFrameUrl = featureLastFrameUrl;
                      }
                      if (
                        /vidu-q1-reference-to-video/i.test(selectedModel || "")
                      ) {
                        if (featureRef2Url) payload.image_url2 = featureRef2Url;
                        if (featureRef3Url) payload.image_url3 = featureRef3Url;
                      }
                      return payload;
                    })()
                  ),
                }
              );
              data = await response.json();
            }
            if (response.ok && data && data.video && data.video.url) {
              const videoUrl = data.video.url;

              // Update the video element immediately with the generated video
              const vEl = document.getElementById("featureDetailVideo");
              if (vEl) {
                vEl.src = videoUrl;
                vEl.style.display = "block"; // Ensure video is visible
              }

              if (genStatus) {
                genStatus.textContent = "Video generated!";
                genStatus.style.color = "green";
              }

              // Update local cache for this specific endpoint only
              latestVideos[feature.endpoint] = videoUrl;
              featureGraphics[feature.endpoint] = videoUrl;

              // Refresh the feature list display to show the new video thumbnail
              displayFeatures();
            } else {
              const msg =
                (data &&
                  (data.error ||
                    data.provider_output ||
                    data.provider_message ||
                    data.message)) ||
                "Failed to generate video";
              throw new Error(msg);
            }
          } catch (e) {
            if (genStatus) genStatus.textContent = `Error: ${e.message || e}`;
            if (genStatus) genStatus.style.color = "red";
          } finally {
            genBtn.disabled = false;
          }
        };
      }
    }
    // Inline edit for feature name (guarded)
    const editNameBtn = document.getElementById("editFeatureNameBtn");

    if (editNameBtn && titleEl) {
      editNameBtn.onclick = function () {
        const input = document.createElement("input");
        input.type = "text";
        input.value = feature.endpoint;
        input.className =
          "border border-gray-300 rounded px-2 py-1 text-xl font-bold mr-2";
        input.style.minWidth = "150px";
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className =
          "ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700";
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.className =
          "ml-2 px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400";
        const parent = titleEl.parentElement;
        parent.replaceChild(input, titleEl);
        parent.insertBefore(
          saveBtn,
          parent.querySelector("#editFeatureNameBtn")
        );
        parent.insertBefore(cancelBtn, saveBtn.nextSibling);
        parent.querySelector("#editFeatureNameBtn").style.display = "none";
        input.focus();
        saveBtn.onclick = async function (e) {
          e.preventDefault();
          const newName = input.value.trim();
          if (!newName || newName === feature.endpoint) {
            cancelBtn.onclick();
            return;
          }
          const apiPath = isPhotoFeature
            ? "/api/photo-features"
            : "/api/features";
          const res = await fetch(
            `${apiPath}/${encodeURIComponent(feature.endpoint)}/rename`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ newEndpoint: newName }),
            }
          );
          if (res.ok) {
            feature.endpoint = newName;
            titleEl.textContent = newName;
            parent.replaceChild(titleEl, input);
            parent.querySelector("#editFeatureNameBtn").style.display =
              "inline-block";
            saveBtn.remove();
            cancelBtn.remove();
            loadFeatures();
          } else {
            alert("Failed to update feature name");
          }
        };
        cancelBtn.onclick = function (e) {
          if (e) e.preventDefault();
          parent.replaceChild(titleEl, input);
          parent.querySelector("#editFeatureNameBtn").style.display =
            "inline-block";
          saveBtn.remove();
          cancelBtn.remove();
        };
      };
    }

    // Inline edit for prompt (guarded)
    const editPromptBtn = document.getElementById("editFeaturePromptBtn");
    if (editPromptBtn && promptEl) {
      editPromptBtn.onclick = function () {
        const textarea = document.createElement("textarea");
        textarea.value = feature.prompt;
        textarea.className =
          "border border-gray-300 rounded px-2 py-1 w-full text-base";
        textarea.rows = 3;
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className =
          "ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700";
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.className =
          "ml-2 px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400";
        const parent = promptEl.parentElement;
        parent.replaceChild(textarea, promptEl);
        parent.appendChild(saveBtn);
        parent.appendChild(cancelBtn);
        editPromptBtn.style.display = "none";
        textarea.focus();
        saveBtn.onclick = async function (e) {
          e.preventDefault();
          const newPrompt = textarea.value.trim();
          if (!newPrompt || newPrompt === feature.prompt) {
            cancelBtn.onclick();
            return;
          }
          const promptApiPath = isPhotoFeature
            ? "/api/photo-features"
            : "/api/features";
          const res = await fetch(
            `${promptApiPath}/${encodeURIComponent(feature.endpoint)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: newPrompt }),
            }
          );
          if (res.ok) {
            feature.prompt = newPrompt;
            promptEl.textContent = newPrompt;
            parent.replaceChild(promptEl, textarea);
            editPromptBtn.style.display = "inline-block";
            saveBtn.remove();
            cancelBtn.remove();
            loadFeatures();
          } else {
            alert("Failed to update prompt");
          }
        };
        cancelBtn.onclick = function (e) {
          if (e) e.preventDefault();
          parent.replaceChild(promptEl, textarea);
          editPromptBtn.style.display = "inline-block";
          saveBtn.remove();
          cancelBtn.remove();
        };
      };
    }

    // Delete button (guarded)
    const deleteBtn = document.getElementById("featureDetailDeleteBtn");
    if (deleteBtn && page) {
      deleteBtn.onclick = async function () {
        if (confirm("Delete this feature?")) {
          const deleteApiPath = isPhotoFeature
            ? "/api/photo-features"
            : "/api/features";
          await fetch(
            `${deleteApiPath}/${encodeURIComponent(feature.endpoint)}`,
            {
              method: "DELETE",
            }
          );
          page.classList.add("hidden");
          loadFeatures();
          const filtersTab = document.getElementById("tab-filters");
          if (filtersTab) filtersTab.classList.remove("hidden");
        }
      };
    }

    // Apply role-based UI restrictions after setting up the detail page
    applyRoleBasedUI();
  } catch (err) {
    console.error("showFeatureDetailPage failed:", err);
    // Always show filters tab if anything fails
    const filtersTab = document.getElementById("tab-filters");
    if (filtersTab) {
      filtersTab.classList.remove("hidden");
      filtersTab.style.display = "";
    }
  }
}

// Load persisted feature graphics and latest videos from backend
async function loadFeatureGraphics() {
  try {
    console.log("Loading feature graphics...");
    const res = await fetch("/api/feature-graphic");
    const data = await res.json();
    console.log("Feature graphics data received:", data.length, "items");

    featureGraphics = {};
    latestVideos = {};
    if (Array.isArray(data)) {
      data.forEach((g) => {
        // Store both as feature graphics and latest videos
        // since this endpoint returns the latest video per endpoint
        featureGraphics[g.endpoint] = g.graphicUrl;
        latestVideos[g.endpoint] = g.graphicUrl;
      });
    }
    console.log(
      "Feature graphics loaded:",
      Object.keys(featureGraphics).length,
      "items"
    );
    console.log(
      "Latest videos loaded:",
      Object.keys(latestVideos).length,
      "items"
    );
  } catch (e) {
    console.error("Error loading feature graphics:", e);
    // Non-fatal: just proceed without persisted graphics
    featureGraphics = {};
    latestVideos = {};
  }
}

// Load photo graphics from backend (latest generated photo per photo feature)
async function loadPhotoGraphics() {
  try {
    console.log("Loading photo graphics...");
    const res = await fetch("/api/photo-graphic");
    const data = await res.json();
    console.log("Photo graphics data received:", data.length, "items");

    photoGraphics = {};
    if (Array.isArray(data)) {
      data.forEach((g) => {
        photoGraphics[g.endpoint] = g.graphicUrl;
      });
    }
    console.log(
      "Photo graphics loaded:",
      Object.keys(photoGraphics).length,
      "items"
    );
  } catch (e) {
    console.error("Error loading photo graphics:", e);
    // Non-fatal: just proceed without persisted graphics
    photoGraphics = {};
  }
}

// Refresh latest videos and update display immediately
async function refreshLatestVideos() {
  await loadFeatureGraphics(); // This now loads both graphics and latest videos
  // Force refresh the feature display to show new videos
  if (features.length > 0) {
    displayFeatures();
  }
}

// Refresh features display without resetting pagination (for minor updates)
function refreshFeaturesDisplay() {
  if (features.length > 0) {
    displayFeatures();
  }
}

// Add a new feature to the beginning of the list (for newly created features)
function addNewFeatureToList(newFeature) {
  // Add to beginning of features array
  const normalized = { ...newFeature, featureType: "video" };
  features.unshift(normalized);
  // Refresh display
  displayFeatures();
  updateStats();
}

// Close feature detail page and show filters tab
function closeFeatureDetailPage() {
  console.log("Closing feature detail page");

  // Hide the feature detail page
  const page = document.getElementById("featureDetailPage");
  if (page) {
    // Reset all the styles we set when showing the page
    page.classList.add("hidden");
    page.style.display = "none";
    page.style.visibility = "hidden";
    page.style.position = "";
    page.style.top = "";
    page.style.left = "";
    page.style.right = "";
    page.style.bottom = "";
    page.style.zIndex = "";
    page.style.backgroundColor = "";
    console.log("Feature detail page hidden");
  }

  // Ensure all modals are hidden
  const modalsToHide = [
    "createTemplateModal",
    "featureCrudModal",
    "stepDetailPage",
  ];

  modalsToHide.forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
      console.log(`${modalId} hidden`);
    }
  });

  // Restore main UI elements (same as in initializeDashboard)
  console.log("Restoring main UI elements...");
  document
    .querySelectorAll(
      "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
    )
    .forEach((el) => {
      if (el) {
        console.log("Restoring element:", el.tagName, el.id || el.className);
        el.style.display = "";
        el.classList.remove("hidden");
      }
    });

  // Use the normal tab switching functionality to show the originating tab
  const targetTab =
    featureDetailOriginTab === "photo-filters" ? "photo-filters" : "filters";

  // Set flag to prevent re-rendering which would interfere with scroll restoration
  isReturningFromDetailPage = true;
  switchTab(targetTab);

  // Restore the saved scroll position with multiple attempts to handle DOM updates
  // This ensures scroll restoration works even after long sessions when DOM might be heavy
  const scrollTarget = savedScrollPosition;
  if (scrollTarget > 0) {
    console.log("Restoring scroll position:", scrollTarget);

    // Multiple restoration attempts with increasing delays to handle DOM rendering
    const attemptScrollRestore = (attempt = 0) => {
      if (attempt > 5) {
        console.log("Scroll restoration completed after", attempt, "attempts");
        savedScrollPosition = 0; // Reset for next time
        return;
      }

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTarget);

        // Check if scroll was successful, retry if needed
        const currentScroll =
          window.pageYOffset || document.documentElement.scrollTop;
        if (Math.abs(currentScroll - scrollTarget) > 10) {
          // Scroll didn't reach target, try again with longer delay
          setTimeout(
            () => attemptScrollRestore(attempt + 1),
            100 + attempt * 50
          );
        } else {
          console.log("Scroll restored successfully to:", currentScroll);
          savedScrollPosition = 0; // Reset for next time
        }
      });
    };

    // Start first attempt after brief delay for DOM to settle
    setTimeout(() => attemptScrollRestore(0), 50);
  }

  console.log("Main UI restored successfully");
}

async function promptRenameEndpoint(oldEndpoint) {
  const newEndpoint = prompt("Enter new endpoint name", oldEndpoint);
  if (!newEndpoint || newEndpoint === oldEndpoint) return;
  try {
    const res = await fetch(
      `/api/features/${encodeURIComponent(oldEndpoint)}/rename`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEndpoint }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Failed to rename endpoint");
      return;
    }
    // Update local features
    const idx = features.findIndex((f) => f.endpoint === oldEndpoint);
    if (idx >= 0) {
      features[idx].endpoint = newEndpoint;
    }
    // Also update any template steps in-memory that reference oldEndpoint
    templates = templates.map((t) => ({
      ...t,
      steps: t.steps.map((s) => ({
        endpoint: s.endpoint === oldEndpoint ? newEndpoint : s.endpoint,
        prompt: s.prompt || "",
      })),
    }));
    displayFeatures();
    displayTemplates();
    alert("Endpoint renamed");
  } catch (e) {
    alert("Error renaming endpoint");
  }
}

// Load templates
async function loadTemplates() {
  try {
    const response = await fetch("/api/templates");
    templates = await response.json();
    displayTemplates();
    updateStats();
  } catch (error) {
    console.error("Error loading templates:", error);
  }
}

// Display templates
function displayTemplates() {
  const grid = document.getElementById("templatesGrid");
  const searchTerm = document
    .getElementById("templateSearch")
    .value.toLowerCase();

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm))
  );

  const adminUser = isAdmin();
  grid.innerHTML = filteredTemplates
    .map((template) => {
      // Flatten all steps from all subcategories for step count
      const allSteps = (template.subcategories || []).flatMap(
        (subcat) => subcat.steps || []
      );
      return `
        <div class="bg-white rounded-xl shadow-md p-6 mb-6 hover:shadow-lg transition-shadow border border-gray-100">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="text-lg font-bold text-gray-800 mb-1">${
                template.name
              }</div>
              <div class="text-gray-500 text-sm">${
                template.description || ""
              }</div>
            </div>
            ${
              adminUser
                ? `<div class="flex gap-2">
              <button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm flex items-center gap-1" onclick="editTemplate(${template.id})">
                <i class="fas fa-edit"></i> <span class="hidden sm:inline">Edit</span>
              </button>
              <button class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm flex items-center gap-1" onclick="deleteTemplate(${template.id})">
                <i class="fas fa-trash"></i> <span class="hidden sm:inline">Delete</span>
              </button>
            </div>`
                : ""
            }
          </div>
          <div class="mb-4">
            <div class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <i class="fas fa-list-ol"></i> ${allSteps.length} ${
        allSteps.length === 1 ? "step" : "steps"
      }
            </div>
            <div class="space-y-2">
              ${(template.subcategories || [])
                .map(
                  (subcat, scIndex) =>
                    `<div class="mb-2">
                      <div class="font-semibold text-blue-700 mb-1">${
                        subcat.name
                      }</div>
                      ${(subcat.steps || [])
                        .map(
                          (step, index) => `
                            <div class="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-blue-50 cursor-pointer transition" data-template-id="${
                              template.id
                            }" data-subcat-index="${scIndex}" data-step-index="${index}">
                              <div class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">${
                                index + 1
                              }</div>
                              <div class="flex-1">
                                <div class="font-medium text-gray-800">${
                                  step.endpoint
                                }</div>
                                
                              </div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>`
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click listeners for step items
  setTimeout(() => {
    document
      .querySelectorAll("[data-template-id][data-step-index]")
      .forEach((el) => {
        el.addEventListener("click", function (e) {
          const templateId = parseInt(this.getAttribute("data-template-id"));
          const stepIndex = parseInt(this.getAttribute("data-step-index"));
          const subcatIndex = parseInt(this.getAttribute("data-subcat-index"));
          showStepDetailPage(templateId, stepIndex, subcatIndex);
          e.stopPropagation();
        });
      });
  }, 0);
}

// Show step detail page for editing
function showStepDetailPage(templateId, stepIndex, subcatIndex) {
  // Save scroll position of the page before opening step details
  savedTemplateScrollPosition = window.scrollY || window.pageYOffset || 0;
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;
  let step = Array.isArray(template.steps)
    ? template.steps[stepIndex]
    : undefined;
  if (!step && Array.isArray(template.subcategories)) {
    const sc = template.subcategories[subcatIndex];
    if (sc && Array.isArray(sc.steps)) step = sc.steps[stepIndex];
  }
  if (!step) return;
  document.getElementById("stepDetailEndpointInput").value =
    step.endpoint || "";
  document.getElementById("stepDetailPromptInput").value = step.prompt || "";
  document.getElementById("stepDetailStatus").textContent = "";

  // Hide all tab content and show only step details
  document
    .querySelectorAll(".tab-content, #featureDetailPage")
    .forEach((el) => el.classList.add("hidden"));

  const stepDetailPage = document.getElementById("stepDetailPage");
  stepDetailPage.classList.remove("hidden");
  stepDetailPage.style.display = ""; // Reset any inline display style

  // Load existing generated videos for this step's endpoint and apps
  const generatedListEl = document.getElementById("stepGeneratedList");
  if (generatedListEl && step.endpoint) {
    generatedListEl.innerHTML =
      '<div class="col-span-full text-xs text-gray-500 flex items-center gap-1"><svg class="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" fill="none"></path></svg> Loading...</div>';

    // Load both videos and apps in parallel
    Promise.all([
      fetch(`/api/videos/${encodeURIComponent(step.endpoint)}`).then((r) =>
        r.json()
      ),
      fetch("/api/apps", { headers: apiKeyHeaders() }).then((r) => r.json()),
    ])
      .then(([videos, appsData]) => {
        const allApps = appsData.success ? appsData.apps : [];
        if (!Array.isArray(videos) || videos.length === 0) {
          generatedListEl.innerHTML =
            '<div class="col-span-full text-xs text-gray-500">No videos yet for this endpoint.</div>';
          return;
        }

        const html = videos
          .map((v) => {
            const vidUrl = v.signedUrl || v.url;
            const deleteBtn = isAdmin()
              ? `<button class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-700 delete-step-video-btn z-10" title="Delete video"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='pointer-events-none'><path d='M3 6h18'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/><path d='M10 11v6'/><path d='M14 11v6'/></svg></button>`
              : "";

            // Audio indicator overlay
            const audioIndicator = v.audioUrl
              ? `<div class="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-semibold shadow-lg z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </svg>
                  <span>Audio</span>
                </div>`
              : "";

            // Create app checkboxes for this video (admin only)
            let appCheckboxesHtml = "";
            if (isAdmin() && allApps.length > 0) {
              const allowedAppIds = new Set((v.apps || []).map((a) => a.appId));
              appCheckboxesHtml = `
                <div class="mt-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm">
                  <div class="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    Allowed Apps
                  </div>
                  <div class="flex flex-col gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                    ${allApps
                      .map(
                        (app) => `
                      <label class="flex items-center gap-2 text-xs cursor-pointer hover:bg-white px-2 py-1.5 rounded-md transition-colors">
                        <input type="checkbox" 
                          class="video-app-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" 
                          data-video-id="${v.id}" 
                          data-app-id="${app.id}" 
                          ${allowedAppIds.has(app.id) ? "checked" : ""}>
                        <span class="truncate font-medium text-gray-700" title="${
                          app.name
                        }">${app.name}</span>
                      </label>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              `;
            }

            // Audio selector for this video (admin only)
            let audioSelectorHtml = "";
            if (isAdmin()) {
              audioSelectorHtml = `
                <div class="mt-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                  <div class="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    Audio Track
                  </div>
                  ${
                    v.audioUrl
                      ? `<div class="mb-2 p-2 bg-white rounded border border-green-200 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9 12l2 2 4-4"></path>
                          </svg>
                          <span class="text-[10px] text-green-700 font-semibold flex-1 truncate" title="${v.audioUrl}">Audio Added</span>
                        </div>`
                      : `<div class="mb-2 p-2 bg-white rounded border border-gray-200 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                          <span class="text-[10px] text-gray-500 flex-1">No audio</span>
                        </div>`
                  }
                  <button class="video-audio-btn text-xs px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 w-full font-semibold transition-all shadow-sm flex items-center justify-center gap-2" data-video-id="${
                    v.id
                  }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    ${v.audioUrl ? "Change Audio" : "Add Audio"}
                  </button>
                </div>
              `;
            } else if (v.audioUrl) {
              // Show audio indicator for non-admin users
              audioSelectorHtml = `
                <div class="mt-3 p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                    <span class="text-xs text-green-700 font-semibold">Has Audio</span>
                  </div>
                </div>
              `;
            }

            return `<div class="step-video-card transition-all hover:scale-[1.02]" style="display: flex; flex-direction: column;">
              <div class="relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl group step-detail-thumb transition-all" data-url="${vidUrl}" data-audio-url="${
              v.audioUrl || ""
            }" data-key="${v.key || ""}" data-endpoint="${
              v.feature || ""
            }" data-video-id="${
              v.id
            }" style="width:140px;height:249px;background:#000;cursor:pointer;">
                <video src="${vidUrl}" class="w-full h-full object-cover" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
                ${audioIndicator}
                ${deleteBtn}
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
              ${appCheckboxesHtml}
              ${audioSelectorHtml}
            </div>`;
          })
          .join("");
        generatedListEl.innerHTML = html;
        // Initialize thumbnails to show the first frame
        function initializeStepVideoThumbs(container) {
          const vids = container.querySelectorAll(".step-detail-thumb video");
          vids.forEach((vid) => {
            try {
              vid.muted = true;
              vid.playsInline = true;
              vid.preload = "metadata";
              const onMeta = () => {
                try {
                  vid.currentTime = 0.01;
                } catch (_) {}
              };
              const onSeeked = () => {
                try {
                  vid.pause();
                } catch (_) {}
                vid.removeEventListener("seeked", onSeeked);
              };
              vid.addEventListener("loadedmetadata", onMeta, { once: true });
              vid.addEventListener("seeked", onSeeked, { once: true });
              // Timeout fallback
              setTimeout(() => {
                try {
                  vid.pause();
                } catch (_) {}
              }, 4000);
              vid.load();
            } catch (_) {}
          });
        }
        initializeStepVideoThumbs(generatedListEl);
        // Click to open modal
        generatedListEl.querySelectorAll(".step-detail-thumb").forEach((el) => {
          el.addEventListener("click", (e) => {
            if (e.target.classList.contains("delete-step-video-btn")) return;
            if (e.target.classList.contains("video-app-checkbox")) return;
            const url = el.getAttribute("data-url");
            const audioUrl = el.getAttribute("data-audio-url");
            if (url) showStepVideoModal(url, audioUrl || null);
          });
        });

        // Handle app checkbox changes
        generatedListEl
          .querySelectorAll(".video-app-checkbox")
          .forEach((checkbox) => {
            checkbox.addEventListener("change", async (e) => {
              const videoId = parseInt(checkbox.dataset.videoId);
              const appId = parseInt(checkbox.dataset.appId);
              const isChecked = checkbox.checked;

              try {
                const response = await fetch("/api/videos/app-permission", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...apiKeyHeaders(),
                  },
                  body: JSON.stringify({
                    videoId,
                    appId,
                    allowed: isChecked,
                  }),
                });

                if (!response.ok) {
                  throw new Error("Failed to update permission");
                }

                // Show brief success feedback
                const card = checkbox.closest(".step-video-card");
                const originalBg = card.style.backgroundColor;
                card.style.backgroundColor = "#d1fae5";
                setTimeout(() => {
                  card.style.backgroundColor = originalBg;
                }, 300);
              } catch (error) {
                console.error("Error updating app permission:", error);
                checkbox.checked = !isChecked; // Revert on error
                alert("Failed to update app permission");
              }
            });
          });

        // Handle audio button clicks
        generatedListEl.querySelectorAll(".video-audio-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const videoId = parseInt(btn.dataset.videoId);
            const video = videos.find((v) => v.id === videoId);
            if (video) {
              showVideoAudioModal(videoId, video.audioUrl, () => {
                // Reload videos after audio update
                showStepDetailPage(templateId, stepIndex, subcatIndex);
              });
            }
          });
        });

        // Deletion
        generatedListEl
          .querySelectorAll(".delete-step-video-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const wrapper = btn.closest("div[data-key]");
              if (!wrapper) return;
              const key = wrapper.getAttribute("data-key");
              const endpoint = wrapper.getAttribute("data-endpoint");
              if (!key || !endpoint) return;
              if (!confirm("Delete this video?")) return;
              btn.disabled = true;
              btn.textContent = "...";
              try {
                const resp = await fetch(
                  `/api/videos/${encodeURIComponent(endpoint)}`,
                  {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key }),
                  }
                );
                if (!resp.ok) throw new Error("Failed");
                wrapper.remove();
                if (!generatedListEl.querySelector("div[data-key]")) {
                  generatedListEl.innerHTML =
                    '<div class="col-span-full text-xs text-gray-500">No videos yet for this endpoint.</div>';
                }
              } catch (err) {
                alert("Failed to delete video");
                btn.disabled = false;
                btn.textContent = "✕";
              }
            });
          });
      })
      .catch(() => {
        generatedListEl.innerHTML =
          '<div class="col-span-full text-xs text-red-500">Failed to load videos.</div>';
      });
  }
  // Store for save
  window._currentStepTemplateId = templateId;
  window._currentStepIndex = stepIndex;
  window._currentStepSubcatIndex = subcatIndex;

  // Wire up Save / Cancel buttons
  const saveBtn = document.getElementById("stepDetailSaveBtn");
  const cancelBtn = document.getElementById("stepDetailCancelBtn");
  if (cancelBtn) cancelBtn.onclick = () => closeStepDetailPage();

  // Hide save button and disable inputs for non-admin users
  if (!isAdmin()) {
    if (saveBtn) saveBtn.style.display = "none";
    const epInput = document.getElementById("stepDetailEndpointInput");
    const promptInput = document.getElementById("stepDetailPromptInput");
    if (epInput) {
      epInput.readOnly = true;
      epInput.style.backgroundColor = "#f3f4f6";
    }
    if (promptInput) {
      promptInput.readOnly = true;
      promptInput.style.backgroundColor = "#f3f4f6";
    }
  } else if (saveBtn) {
    saveBtn.style.display = "";
    const epInput = document.getElementById("stepDetailEndpointInput");
    const promptInput = document.getElementById("stepDetailPromptInput");
    if (epInput) {
      epInput.readOnly = false;
      epInput.style.backgroundColor = "";
    }
    if (promptInput) {
      promptInput.readOnly = false;
      promptInput.style.backgroundColor = "";
    }
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const epInput = document.getElementById("stepDetailEndpointInput");
      const promptInput = document.getElementById("stepDetailPromptInput");
      const statusEl = document.getElementById("stepDetailStatus");
      if (!epInput || !promptInput) return;
      const newEndpoint = epInput.value.trim();
      const newPrompt = promptInput.value.trim();
      if (!newEndpoint) {
        statusEl.textContent = "Endpoint is required";
        return;
      }
      statusEl.textContent = "Saving...";
      try {
        // Optimistic local update only – backend endpoint for updating a specific step not implemented here.
        step.endpoint = newEndpoint;
        step.prompt = newPrompt;
        statusEl.textContent = "Saved (local).";
      } catch (e) {
        statusEl.textContent = "Failed to save.";
      }
    };
  }

  // Attach image upload event listeners every time the page is shown
  const stepImageInput = document.getElementById("stepImageInput");
  const stepImagePreview = document.getElementById("stepImagePreview");
  const stepUploadStatus = document.getElementById("stepUploadStatus");
  const stepImageUploadSection = document.getElementById(
    "stepImageUploadSection"
  );
  const stepModelSelect = document.getElementById("stepModelSelect");
  const stepLastFrameWrapper = document.getElementById("stepLastFrameWrapper");
  const stepLastFrameInput = document.getElementById("stepLastFrameInput");
  const stepLastFramePreview = document.getElementById("stepLastFramePreview");
  // Vidu Q1 reference wrappers for steps
  const stepRef2Wrapper = document.getElementById("stepRef2Wrapper");
  const stepRef3Wrapper = document.getElementById("stepRef3Wrapper");
  const stepRef2Input = document.getElementById("stepRef2Input");
  const stepRef3Input = document.getElementById("stepRef3Input");
  const stepRef2Preview = document.getElementById("stepRef2Preview");
  const stepRef3Preview = document.getElementById("stepRef3Preview");
  window._stepRef2Url = null;
  window._stepRef3Url = null;
  window._stepLastFrameUrl = null;
  if (stepImageInput && stepImageUploadSection) {
    // Remove previous listeners by cloning
    const newSection = stepImageUploadSection.cloneNode(true);
    stepImageUploadSection.parentNode.replaceChild(
      newSection,
      stepImageUploadSection
    );
    const newInput = newSection.querySelector("#stepImageInput");
    const newPreview = newSection.querySelector("#stepImagePreview");
    const newStatus = newSection.querySelector("#stepUploadStatus");
    newSection.addEventListener("dragover", (e) => {
      e.preventDefault();
      newSection.classList.add("dragover");
    });
    newSection.addEventListener("dragleave", () =>
      newSection.classList.remove("dragover")
    );
    newSection.addEventListener("drop", (e) => {
      e.preventDefault();
      newSection.classList.remove("dragover");
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith("image/")) {
        newInput.files = files;
        handleStepImageUpload(newInput, newPreview, newStatus);
      }
    });
    // Remove the onclick handler since the label already handles clicks properly
    // newSection.onclick = (e) => {
    //   if (e.target.tagName !== "INPUT") newInput.click();
    // };
    newInput.onchange = () =>
      handleStepImageUpload(newInput, newPreview, newStatus);
  }

  function handleStepImageUpload(input, preview, uploadStatus) {
    const file = input.files && input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    if (uploadStatus) uploadStatus.textContent = "Uploading...";
    fetch("/api/upload-image", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((result) => {
        const url =
          result && result.success ? result.signedUrl || result.url : null;
        if (url) {
          window._stepUploadedImageUrl = url;
          if (preview) {
            preview.src = url;
            preview.style.display = "block";
          }
          if (uploadStatus) uploadStatus.textContent = "Image uploaded!";
        } else {
          if (uploadStatus) uploadStatus.textContent = "Upload failed.";
        }
        input.value = "";
      })
      .catch(() => {
        if (uploadStatus) uploadStatus.textContent = "Upload failed.";
        input.value = "";
      });
  }
  // Pixverse last frame upload logic
  if (stepLastFrameInput) {
    stepLastFrameInput.onchange = () => {
      const file = stepLastFrameInput.files && stepLastFrameInput.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("image", file);
      if (stepUploadStatus)
        stepUploadStatus.textContent = "Uploading last frame...";
      fetch("/api/upload-image", { method: "POST", body: formData })
        .then((r) => r.json())
        .then((r) => {
          const url = r && r.success ? r.signedUrl || r.url : null;
          if (url) {
            window._stepLastFrameUrl = url;
            if (stepLastFramePreview) {
              stepLastFramePreview.src = url;
              stepLastFramePreview.style.display = "block";
            }
            if (stepUploadStatus)
              stepUploadStatus.textContent = "Last frame uploaded!";
          } else {
            if (stepUploadStatus)
              stepUploadStatus.textContent = "Last frame upload failed.";
          }
          stepLastFrameInput.value = "";
        })
        .catch(() => {
          if (stepUploadStatus)
            stepUploadStatus.textContent = "Last frame upload failed.";
          stepLastFrameInput.value = "";
        });
    };
  }
  if (stepModelSelect && stepLastFrameWrapper) {
    const toggleStepLastFrame = () => {
      const val = stepModelSelect.value || "";
      const isPixTrans = /pixverse-v4-transition/i.test(val);
      const isVidu = /vidu-q1-reference-to-video/i.test(val);
      const isViduImage2Video =
        /vidu-(1\.5|q1)-image-to-video|veo-2-image-to-video|veo-3-image-to-video/i.test(
          val
        );
      stepLastFrameWrapper.style.display = isPixTrans ? "flex" : "none";
      if (!isPixTrans) {
        window._stepLastFrameUrl = null;
        if (stepLastFramePreview) stepLastFramePreview.style.display = "none";
      }
      // Toggle vidu extra refs (only for reference-to-video model)
      if (stepRef2Wrapper)
        stepRef2Wrapper.style.display = isVidu ? "flex" : "none";
      if (stepRef3Wrapper)
        stepRef3Wrapper.style.display = isVidu ? "flex" : "none";
      if (!isVidu) {
        window._stepRef2Url = null;
        window._stepRef3Url = null;
        if (stepRef2Preview) stepRef2Preview.style.display = "none";
        if (stepRef3Preview) stepRef3Preview.style.display = "none";
      }
    };
    stepModelSelect.addEventListener("change", toggleStepLastFrame);
    toggleStepLastFrame();
  }
  // Step Vidu reference uploads
  if (stepRef2Input) {
    stepRef2Input.onchange = () => {
      const file = stepRef2Input.files && stepRef2Input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("image", file);
      if (stepUploadStatus) stepUploadStatus.textContent = "Uploading ref 2...";
      fetch("/api/upload-image", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((r) => {
          const url = r && r.success ? r.signedUrl || r.url : null;
          if (url) {
            window._stepRef2Url = url;
            if (stepRef2Preview) {
              stepRef2Preview.src = url;
              stepRef2Preview.style.display = "block";
            }
            if (stepUploadStatus)
              stepUploadStatus.textContent = "Ref 2 uploaded!";
          } else {
            if (stepUploadStatus)
              stepUploadStatus.textContent = "Ref 2 upload failed.";
          }
          stepRef2Input.value = "";
        })
        .catch(() => {
          if (stepUploadStatus)
            stepUploadStatus.textContent = "Ref 2 upload failed.";
          stepRef2Input.value = "";
        });
    };
  }
  if (stepRef3Input) {
    stepRef3Input.onchange = () => {
      const file = stepRef3Input.files && stepRef3Input.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("image", file);
      if (stepUploadStatus) stepUploadStatus.textContent = "Uploading ref 3...";
      fetch("/api/upload-image", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((r) => {
          const url = r && r.success ? r.signedUrl || r.url : null;
          if (url) {
            window._stepRef3Url = url;
            if (stepRef3Preview) {
              stepRef3Preview.src = url;
              stepRef3Preview.style.display = "block";
            }
            if (stepUploadStatus)
              stepUploadStatus.textContent = "Ref 3 uploaded!";
          } else {
            if (stepUploadStatus)
              stepUploadStatus.textContent = "Ref 3 upload failed.";
          }
          stepRef3Input.value = "";
        })
        .catch(() => {
          if (stepUploadStatus)
            stepUploadStatus.textContent = "Ref 3 upload failed.";
          stepRef3Input.value = "";
        });
    };
  }
}

// Video Audio Modal functionality
let cachedSounds = null;
let currentVideoIdForAudio = null;
let audioModalCallback = null;

async function fetchSounds() {
  if (cachedSounds) return cachedSounds;

  try {
    const response = await fetch("/api/sounds");
    const data = await response.json();
    if (data.success) {
      cachedSounds = data.sounds;
      return cachedSounds;
    }
  } catch (error) {
    console.error("Error fetching sounds:", error);
  }
  return {};
}

function showVideoAudioModal(
  videoId,
  existingAudioUrl = null,
  callback = null
) {
  const modal = document.getElementById("videoAudioModal");
  const categorySelect = document.getElementById("videoAudioCategorySelect");
  const soundSelect = document.getElementById("videoAudioSoundSelect");
  const audioPreview = document.getElementById("videoAudioPreview");
  const audioPlayer = document.getElementById("videoAudioPlayer");
  const clearBtn = document.getElementById("videoAudioClearBtn");
  const saveBtn = document.getElementById("videoAudioSaveBtn");
  const closeBtn = document.getElementById("videoAudioModalClose");
  const statusEl = document.getElementById("videoAudioStatus");

  currentVideoIdForAudio = videoId;
  audioModalCallback = callback;

  // Reset and show modal
  modal.classList.remove("hidden");
  statusEl.textContent = "";
  window._selectedAudioUrl = existingAudioUrl || null;

  // Initialize dropdowns
  initializeVideoAudioDropdowns(existingAudioUrl);

  // Close button
  closeBtn.onclick = () => {
    modal.classList.add("hidden");
    currentVideoIdForAudio = null;
    audioModalCallback = null;
  };

  // Clear button
  clearBtn.onclick = () => {
    window._selectedAudioUrl = null;
    categorySelect.value = "";
    soundSelect.innerHTML = '<option value="">Select sound...</option>';
    soundSelect.disabled = true;
    audioPreview.classList.add("hidden");
    audioPlayer.src = "";
  };

  // Save button
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    statusEl.textContent = "";

    try {
      const response = await fetch(
        `/api/videos/${currentVideoIdForAudio}/audio`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...apiKeyHeaders(),
          },
          body: JSON.stringify({
            audioUrl: window._selectedAudioUrl || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update audio");
      }

      statusEl.textContent = "✓ Audio updated successfully!";
      statusEl.style.color = "#059669";

      setTimeout(() => {
        modal.classList.add("hidden");
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";

        // Call callback before clearing it
        const callback = audioModalCallback;
        currentVideoIdForAudio = null;
        audioModalCallback = null;
        if (callback) callback();
      }, 800);
    } catch (error) {
      console.error("Error updating video audio:", error);
      statusEl.textContent = "✗ Failed to update audio";
      statusEl.style.color = "#dc2626";
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  };
}

async function initializeVideoAudioDropdowns(existingAudioUrl = null) {
  const categorySelect = document.getElementById("videoAudioCategorySelect");
  const soundSelect = document.getElementById("videoAudioSoundSelect");
  const audioPreview = document.getElementById("videoAudioPreview");
  const audioPlayer = document.getElementById("videoAudioPlayer");

  if (!categorySelect || !soundSelect) return;

  // Reset
  categorySelect.innerHTML = '<option value="">Loading categories...</option>';
  soundSelect.innerHTML = '<option value="">Select sound...</option>';
  soundSelect.disabled = true;
  audioPreview.classList.add("hidden");

  // Fetch sounds
  const sounds = await fetchSounds();
  const categories = Object.keys(sounds).sort();

  // Populate categories
  categorySelect.innerHTML =
    '<option value="">Select category...</option>' +
    categories.map((cat) => `<option value="${cat}">${cat}</option>`).join("");

  // Category change handler
  categorySelect.onchange = () => {
    const selectedCategory = categorySelect.value;
    if (!selectedCategory) {
      soundSelect.innerHTML = '<option value="">Select sound...</option>';
      soundSelect.disabled = true;
      return;
    }

    const categorySounds = sounds[selectedCategory] || [];
    soundSelect.innerHTML =
      '<option value="">Select sound...</option>' +
      categorySounds
        .map(
          (sound) => `<option value="${sound.signedUrl}">${sound.name}</option>`
        )
        .join("");
    soundSelect.disabled = false;
  };

  // Sound change handler
  soundSelect.onchange = () => {
    const selectedUrl = soundSelect.value;
    if (!selectedUrl) {
      audioPreview.classList.add("hidden");
      window._selectedAudioUrl = null;
      return;
    }

    window._selectedAudioUrl = selectedUrl;
    audioPlayer.src = selectedUrl;
    audioPreview.classList.remove("hidden");
  };

  // If existing audio, try to pre-select it
  if (existingAudioUrl) {
    window._selectedAudioUrl = existingAudioUrl;
    audioPlayer.src = existingAudioUrl;
    audioPreview.classList.remove("hidden");

    // Try to find and select the matching category and sound
    for (const [category, categorySounds] of Object.entries(sounds)) {
      const matchingSound = categorySounds.find(
        (s) => s.signedUrl === existingAudioUrl || s.url === existingAudioUrl
      );
      if (matchingSound) {
        categorySelect.value = category;
        categorySelect.dispatchEvent(new Event("change"));
        setTimeout(() => {
          soundSelect.value = matchingSound.signedUrl;
        }, 100);
        break;
      }
    }
  }
}

function closeStepDetailPage() {
  console.log("Closing step detail page");

  // Hide the step detail page
  const stepDetailPage = document.getElementById("stepDetailPage");
  if (stepDetailPage) {
    stepDetailPage.classList.add("hidden");
    stepDetailPage.style.display = "none";
  }

  // Restore main UI elements (same as in initializeDashboard)
  console.log("Restoring main UI elements...");
  document
    .querySelectorAll(
      "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
    )
    .forEach((el) => {
      if (el) {
        console.log("Restoring element:", el.tagName, el.id || el.className);
        el.style.display = "";
        el.classList.remove("hidden");
      }
    });

  // Use the normal tab switching functionality to show templates tab
  // This ensures proper tab state management and allows users to switch to other tabs
  switchTab("templates");

  // Restore the saved scroll position for the template page after a brief delay to ensure DOM is ready
  setTimeout(() => {
    window.scrollTo(0, savedTemplateScrollPosition);
  }, 100);

  // Reset step detail state
  window._currentStepTemplateId = null;
  window._currentStepIndex = null;
  window._currentStepSubcatIndex = null;

  console.log("Main UI restored successfully");
}

async function saveStepDetail() {
  const templateId = window._currentStepTemplateId;
  const stepIndex = window._currentStepIndex;
  if (templateId == null || stepIndex == null) return;
  const endpoint = document
    .getElementById("stepDetailEndpointInput")
    .value.trim();
  const prompt = document.getElementById("stepDetailPromptInput").value.trim();
  const status = document.getElementById("stepDetailStatus");

  if (!endpoint) {
    if (status) {
      status.textContent = "Endpoint is required.";
      status.className = "status-message status-error";
    }
    return;
  }
  // Update in-memory and persist full template via PUT
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;
  const updatedSteps = template.steps.map((s, idx) =>
    idx === stepIndex
      ? { endpoint, prompt }
      : { endpoint: s.endpoint, prompt: s.prompt || "" }
  );
  try {
    const res = await fetch(`/api/templates/${templateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...template, steps: updatedSteps }),
    });
    if (!res.ok) throw new Error("Failed to update step");
    // Update local state
    template.steps = updatedSteps;
    displayTemplates();
    closeStepDetailPage();
  } catch (e) {
    document.getElementById("stepDetailStatus").textContent =
      "Failed to save: " + (e.message || e);
  }
}

async function promptRenameStep(templateId, stepIndex) {
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;
  const current = template.steps[stepIndex]?.endpoint || "";
  const newEndpoint = prompt("Enter new endpoint for this step", current);
  if (!newEndpoint || newEndpoint === current) return;
  // Update in-memory and persist full template via PUT
  const updatedSteps = template.steps.map((s, idx) =>
    idx === stepIndex
      ? { endpoint: newEndpoint, prompt: s.prompt || "" }
      : { endpoint: s.endpoint, prompt: s.prompt || "" }
  );
  try {
    const res = await fetch(`/api/templates/${templateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        description: template.description || "",
        steps: updatedSteps,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to rename step");
      return;
    }
    await loadTemplates();
    alert("Step renamed");
  } catch (e) {
    alert("Error renaming step");
  }
}
// Template modal state
let editingTemplateId = null;

// Open modal for creating a new template
function openCreateTemplateModal() {
  editingTemplateId = null;
  document.getElementById("createTemplateModal").style.display = "block";
  document.getElementById("templateName").value = "";
  document.getElementById("templateDescription").value = "";
  // Clear any legacy steps container if present
  const stepsEl = document.getElementById("templateSteps");
  if (stepsEl) stepsEl.innerHTML = "";
  // Clear dynamic subcategories UI from any previous edit session
  const subcatsContainer = document.getElementById("subcategoriesContainer");
  if (subcatsContainer) subcatsContainer.innerHTML = "";
  // Reset add-subcategory helpers if present
  const subcatInput = document.getElementById("newSubcategoryInput");
  if (subcatInput) subcatInput.value = "";
  const subcatError = document.getElementById("subcategoryError");
  if (subcatError) subcatError.textContent = "";
  loadAvailableEndpoints();
  // Change modal title
  document.querySelector("#createTemplateModal h2").textContent =
    "Create New Template";
  // Change save button text
  const createSaveBtn = document.getElementById("saveTemplateBtn");
  if (createSaveBtn) {
    createSaveBtn.textContent = "Save Template";
  } else {
    const fallbackBtn = document.querySelector(
      "#createTemplateModal .btn-primary"
    );
    if (fallbackBtn) fallbackBtn.textContent = "Save Template";
  }
}

// Open modal for editing an existing template
async function editTemplate(templateId) {
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;
  // Ensure endpoints are loaded
  if (!window.featureEndpointsFull || !window.featureEndpointsFull.length) {
    try {
      const res = await fetch("/api/features/all", {
        headers: { ...apiKeyHeaders() },
      });
      const data = await res.json();
      window.featureEndpointsFull = data.features || [];
    } catch {
      window.featureEndpointsFull = [];
    }
  }
  editingTemplateId = templateId;
  document.getElementById("createTemplateModal").style.display = "block";
  document.getElementById("templateName").value = template.name;
  document.getElementById("templateDescription").value =
    template.description || "";
  // Clear subcategories UI
  const subcatsContainer = document.getElementById("subcategoriesContainer");
  if (subcatsContainer) subcatsContainer.innerHTML = "";
  // Render subcategories and steps
  (template.subcategories || []).forEach((subcat) => {
    // Create subcategory element
    const subcatDiv = document.createElement("div");
    subcatDiv.className = "border rounded-lg p-4 mb-2 bg-gray-50";
    // Subcategory name (readonly)
    const nameLabel = document.createElement("div");
    nameLabel.className = "font-semibold mb-2 text-blue-700";
    nameLabel.textContent = subcat.name;
    subcatDiv.appendChild(nameLabel);
    // Steps container
    const stepsDiv = document.createElement("div");
    stepsDiv.className = "space-y-2 mb-2";
    subcatDiv.appendChild(stepsDiv);
    // Add existing steps
    (subcat.steps || []).forEach((step) => {
      const stepDiv = document.createElement("div");
      stepDiv.className = "flex gap-2 items-center";

      // Create autocomplete endpoint input
      const autocompleteWrapper = createEndpointAutocomplete(step.endpoint);
      stepDiv.appendChild(autocompleteWrapper);

      // Remove button
      const removeStepBtn = document.createElement("button");
      removeStepBtn.type = "button";
      removeStepBtn.className =
        "text-red-500 hover:text-red-700 text-xs removeStepBtn";
      removeStepBtn.textContent = "Remove";
      removeStepBtn.onclick = () => {
        if (confirm("Are you sure you want to remove this step?")) {
          stepDiv.remove();
        }
      };
      stepDiv.appendChild(removeStepBtn);

      stepsDiv.appendChild(stepDiv);
    });
    // Add Step button
    const addStepBtn = document.createElement("button");
    addStepBtn.type = "button";
    addStepBtn.className =
      "px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs";
    addStepBtn.textContent = "+ Add Step";
    addStepBtn.onclick = function () {
      const stepDiv = document.createElement("div");
      stepDiv.className = "flex gap-2 items-center";

      // Create autocomplete endpoint input
      const autocompleteWrapper = createEndpointAutocomplete("");
      stepDiv.appendChild(autocompleteWrapper);

      const removeStepBtn = document.createElement("button");
      removeStepBtn.type = "button";
      removeStepBtn.className =
        "text-red-500 hover:text-red-700 text-xs removeStepBtn";
      removeStepBtn.textContent = "Remove";
      removeStepBtn.onclick = () => {
        if (confirm("Are you sure you want to remove this step?")) {
          stepDiv.remove();
        }
      };
      stepDiv.appendChild(removeStepBtn);

      stepsDiv.appendChild(stepDiv);
    };
    subcatDiv.appendChild(addStepBtn);
    // Remove subcategory button
    const removeSubcatBtn = document.createElement("button");
    removeSubcatBtn.type = "button";
    removeSubcatBtn.className = "ml-4 text-red-500 hover:text-red-700 text-xs";
    removeSubcatBtn.textContent = "Remove Subcategory";
    removeSubcatBtn.onclick = () => {
      if (
        confirm(
          "Are you sure you want to remove this subcategory and all its steps?"
        )
      ) {
        subcatDiv.remove();
      }
    };
    subcatDiv.appendChild(removeSubcatBtn);
    subcatsContainer.appendChild(subcatDiv);
  });
  // Change modal title
  const modalTitle = document.querySelector("#createTemplateModal h2");
  if (modalTitle) {
    modalTitle.textContent = "Edit Template";
  } else {
    console.warn("Modal title h2 not found in #createTemplateModal");
  }
  // Change save button text
  const editSaveBtn = document.getElementById("saveTemplateBtn");
  if (editSaveBtn) {
    editSaveBtn.textContent = "Update Template";
  } else {
    const fallbackBtn = document.querySelector(
      "#createTemplateModal .btn-primary"
    );
    if (fallbackBtn) fallbackBtn.textContent = "Update Template";
    else console.warn("Save button not found in #createTemplateModal");
  }
}

function closeCreateTemplateModal() {
  document.getElementById("createTemplateModal").style.display = "none";
  document.getElementById("templateSteps").innerHTML = "";
  document.getElementById("templateName").value = "";
  document.getElementById("templateDescription").value = "";
  editingTemplateId = null;
}

async function loadAvailableEndpoints() {
  try {
    const response = await fetch("/api/templates/endpoints");
    availableEndpoints = await response.json();
    // Keep unified global list used by dynamic subcategory builder
    if (
      !Array.isArray(window.featureEndpointsFull) ||
      !window.featureEndpointsFull.length
    ) {
      window.featureEndpointsFull = availableEndpoints.slice();
    } else {
      // Merge new endpoints (dedupe by endpoint key)
      const existing = new Set(
        window.featureEndpointsFull.map((e) => e.endpoint)
      );
      availableEndpoints.forEach((e) => {
        if (!existing.has(e.endpoint)) window.featureEndpointsFull.push(e);
      });
    }
    // Refresh any currently rendered step-endpoint selects that are still blank
    document.querySelectorAll(".step-endpoint-select").forEach((sel) => {
      if (sel.options.length <= 1) {
        // only placeholder present
        sel.innerHTML =
          '<option value="">Select endpoint...</option>' +
          (availableEndpoints || [])
            .map(
              (ep) => `<option value="${ep.endpoint}">${ep.endpoint}</option>`
            )
            .join("");
      }
    });
  } catch (error) {
    console.error("Error loading endpoints:", error);
  }
}

// Add a step to the template modal, optionally pre-filling endpoint and prompt
function addTemplateStep(selectedEndpoint = "", promptValue = "") {
  const stepsContainer = document.getElementById("templateSteps");
  if (!stepsContainer) return;
  const stepIndex = stepsContainer.children.length;

  const optionsHtml = (
    Array.isArray(availableEndpoints) ? availableEndpoints : []
  )
    .map((ep) => {
      const sel = ep.endpoint === selectedEndpoint ? "selected" : "";
      return `<option value="${ep.endpoint}" ${sel}>${ep.endpoint}</option>`;
    })
    .join("");

  const stepHtml = `<div class="step-item" style="display:flex;flex-direction:column;gap:10px;background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:15px;">
    <div style="display:flex;align-items:flex-start;gap:15px;width:100%;">
      <div class="step-order">${stepIndex + 1}</div>
      <div class="step-content" style="flex:1;">
        <div class="form-group">
          <label>Endpoint:</label>
          <select class="step-endpoint-select">
            <option value="">Select endpoint...</option>
            ${optionsHtml}
          </select>
        </div>
      </div>
      <button type="button" class="remove-step" onclick="removeStep(this)">Remove</button>
    </div>
    <div class="step-actions" style="display:flex;align-items:center;gap:10px;margin-top:10px;">
      <div class="image-upload-section step-image-upload-section bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
        <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <i class="fas fa-image text-indigo-600"></i>
          Upload Image
        </h4>
        <label class="upload-label cursor-pointer group">
          <div class="upload-area border-2 border-dashed border-indigo-300 rounded-lg p-4 text-center transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50 group-hover:scale-[1.02]">
            <div class="w-8 h-8 mx-auto bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors duration-300 mb-2">
              <i class="fas fa-cloud-upload-alt text-indigo-600 text-sm"></i>
            </div>
            <div class="text-xs font-medium text-gray-600">Click to upload</div>
            <input type="file" class="step-image-input" accept="image/*" style="display:none;" />
          </div>
        </label>
        <img class="step-image-preview rounded-lg shadow border border-gray-200 hidden" style="max-width:200px;margin:10px auto 0;" />
        <div class="step-upload-status upload-status text-xs text-center mt-2"></div>
      </div>
      <button type="button" class="step-generate-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2" style="flex:1;min-width:120px;">
        <i class="fas fa-magic"></i> Generate Video
      </button>
    </div>
    <div class="step-status-message" style="font-size:13px;min-height:18px;margin-top:5px;"></div>
    <div class="step-video-preview" style="margin-top:10px;display:none;"></div>
  </div>`;

  stepsContainer.insertAdjacentHTML("beforeend", stepHtml);

  const newStep = stepsContainer.lastElementChild;
  if (!newStep) return;
  const endpointSelect = newStep.querySelector(".step-endpoint-select");
  const generateBtn = newStep.querySelector(".step-generate-btn");
  const statusDiv = newStep.querySelector(".step-status-message");
  const videoPreviewDiv = newStep.querySelector(".step-video-preview");

  const getUploadedImageUrl = setupStepImageUpload(newStep);

  generateBtn.onclick = async () => {
    const endpoint = endpointSelect.value;
    const feat = (
      Array.isArray(availableEndpoints) ? availableEndpoints : []
    ).find((e) => e.endpoint === endpoint);
    const prompt = feat && feat.prompt ? feat.prompt : "";
    const imageUrl = getUploadedImageUrl();
    if (!endpoint) {
      statusDiv.textContent = "Please select an endpoint.";
      statusDiv.className = "step-status-message error";
      return;
    }
    if (!imageUrl) {
      statusDiv.textContent = "Please upload an image.";
      statusDiv.className = "step-status-message error";
      return;
    }
    statusDiv.textContent = "Generating video...";
    statusDiv.className = "step-status-message info";
    generateBtn.disabled = true;
    generateBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Generating...';
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, prompt }),
      });
      const data = await response.json();
      if (!response.ok || !data.video || !data.video.url) {
        throw new Error(data.error || "Failed to generate video");
      }
      statusDiv.textContent = "Video generated!";
      statusDiv.className = "step-status-message success";
      videoPreviewDiv.style.display = "block";
      videoPreviewDiv.innerHTML = `<video src="${data.video.url}" controls style="width:100%;max-width:400px;"></video>`;

      if (editingTemplateId) {
        try {
          await fetch(`/api/templates/${editingTemplateId}/step-video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stepIndex,
              endpoint,
              videoUrl: data.video.url,
            }),
          });
        } catch (err) {
          console.warn("Failed to persist step video", err);
        }
      }
    } catch (err) {
      statusDiv.textContent = "Error: " + (err.message || err);
      statusDiv.className = "step-status-message error";
      videoPreviewDiv.style.display = "none";
      videoPreviewDiv.innerHTML = "";
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Video';
    }
  };
}

function removeStep(button) {
  if (confirm("Are you sure you want to remove this step?")) {
    button.parentElement.remove();
    updateStepNumbers();
  }
}

function updateStepNumbers() {
  const steps = document.querySelectorAll(".step-item");
  steps.forEach((step, index) => {
    step.querySelector(".step-order").textContent = index + 1;
  });
}

// Render generated videos for a given endpoint into a step container
function renderStepGeneratedVideos(containerEl, endpoint, onSelect) {
  if (!containerEl) return;
  if (!endpoint) {
    containerEl.innerHTML = "";
    return;
  }
  containerEl.dataset.endpoint = endpoint;
  containerEl.innerHTML =
    '<div class="text-sm text-gray-500 flex items-center gap-2"><svg class="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" fill="none"></path></svg> Loading videos...</div>';
  fetch(`/api/videos/${encodeURIComponent(endpoint)}`)
    .then((r) => r.json())
    .then((videos) => {
      if (!Array.isArray(videos) || videos.length === 0) {
        containerEl.innerHTML =
          '<div class="text-sm text-gray-500">No videos yet for this endpoint.</div>';
        return;
      }
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3";
      grid.innerHTML = videos
        .map(
          (v) =>
            `<div class="rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-blue-300 hover:shadow cursor-pointer step-gen-video-item" data-url="${v.url}">
               <video src="${v.url}#t=0.1" class="w-full" style="aspect-ratio:16/9" preload="none"></video>
             </div>`
        )
        .join("");
      containerEl.innerHTML = "";
      containerEl.appendChild(grid);
      containerEl.querySelectorAll(".step-gen-video-item").forEach((el) => {
        el.addEventListener(
          "click",
          () => onSelect && onSelect(el.dataset.url)
        );
      });
    })
    .catch(() => {
      containerEl.innerHTML =
        '<div class="text-sm text-red-500">Failed to load videos.</div>';
    });
}

// Save or update template
async function saveTemplate() {
  const nameInput = document.getElementById("templateName");
  const descInput = document.getElementById("templateDescription");
  if (!nameInput) {
    alert("Template name input not found");
    return;
  }
  const name = nameInput.value;
  const description = descInput ? descInput.value : "";
  if (!name) {
    alert("Template name is required");
    return;
  }
  const steps = [];
  const stepItems = document.querySelectorAll(".step-item");
  stepItems.forEach((item, index) => {
    const endpointSelect = item.querySelector(".step-endpoint-select");
    if (!endpointSelect) {
      // Skip this step if fields are missing
      return;
    }
    const endpoint = endpointSelect.value;
    const prompt = "";
    if (endpoint) {
      steps.push({ endpoint, prompt });
    }
  });

  // Remove any old event listeners for the Save Template button
  const saveBtn = document.getElementById("saveTemplateBtn");
  if (saveBtn) {
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
  }

  // Ensure only one submit handler. The canonical handler is defined later; avoid redefining here.
}

async function deleteTemplate(templateId) {
  // Confirm before deleting
  if (
    !confirm(
      "Are you sure you want to delete this template? This action cannot be undone."
    )
  ) {
    return;
  }

  // Find the delete button and show loading state
  const deleteBtn = document.querySelector(
    `button[onclick="deleteTemplate(${templateId})"]`
  );
  let originalText = null;
  if (deleteBtn) {
    originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  }
  try {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadTemplates();
    } else {
      const error = await response.json();
      console.error("Error deleting template:", error.error);
    }
  } catch (error) {
    console.error("Error deleting template:", error);
  } finally {
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = originalText;
    }
  }
}

// Search functionality
document
  .getElementById("featureSearch")
  .addEventListener("input", displayFeatures);
document
  .getElementById("templateSearch")
  .addEventListener("input", displayTemplates);

// Handle card click to show generated video (S3 signed URL)
function toggleVideo(endpoint) {
  const generatedVideo = document.getElementById(`generated-${endpoint}`);
  if (generatedVideo && generatedVideo.src) {
    showVideoDialog(generatedVideo.src);
  }
}

// Show video dialog with generated video
function showVideoDialog(videoUrl) {
  const dialog = document.getElementById("videoDialog");
  const videoPlayer = document.getElementById("dialogVideo");

  if (videoPlayer) {
    videoPlayer.src = videoUrl;
    videoPlayer.load();
  }

  if (dialog) {
    dialog.style.display = "flex";
  }
}

// Close video dialog
function closeVideoDialog() {
  const dialog = document.getElementById("videoDialog");
  const videoPlayer = document.getElementById("dialogVideo");

  if (videoPlayer) {
    videoPlayer.pause();
    videoPlayer.removeAttribute("src");
  }

  if (dialog) {
    dialog.style.display = "none";
  }
}

// Generate video for a feature
async function generateVideo(endpoint, event) {
  // Unified for both endpoint modal and template steps
  let imageUrl = null;
  let lastFrameUrl = null;
  let statusDiv = null;
  let generateButton = null;
  let audioFile = null;
  // If called from endpoint modal, use uploaded image
  if (document.getElementById("endpointImagePreview")) {
    imageUrl = endpointUploadedImageUrl;
    statusDiv = document.getElementById("featureModalStatus");
    generateButton = document.getElementById("featureModalGenerate");
    // Bytedance audio file (if present)
    if (window._featureAudioFile) {
      audioFile = window._featureAudioFile();
    }
  }
  // fallback for legacy (should not be used)
  if (!imageUrl) {
    const urlInput = document.getElementById("featureModalImageUrl");
    if (urlInput) imageUrl = urlInput.value;
  }
  if (!imageUrl) {
    alert("Please upload an image first.");
    return;
  }
  // If model requires last frame (Pixverse) ensure it's present
  const modelSelect =
    document.getElementById("stepModelSelect") ||
    document.getElementById("featureModelSelect");
  const selectedModel = modelSelect ? modelSelect.value : undefined;
  if (!selectedModel) {
    if (statusDiv) {
      statusDiv.textContent = "Please pick a video model.";
      statusDiv.style.color = "red";
    } else {
      alert("Please pick a video model first.");
    }
    return;
  }
  if (/pixverse-v4-transition/i.test(selectedModel || "")) {
    lastFrameUrl = window._stepLastFrameUrl || null;
    if (!lastFrameUrl) {
      alert("Please upload a last frame image for Pixverse transition.");
      return;
    }
  }
  // For Vidu Q1 gather additional refs if present
  let stepRef2 = null;
  let stepRef3 = null;
  if (/vidu-q1-reference-to-video/i.test(selectedModel || "")) {
    stepRef2 = window._stepRef2Url || null;
    stepRef3 = window._stepRef3Url || null;
  }
  statusDiv.textContent = "Generating video...";
  statusDiv.style.color = "#666";
  try {
    // Use the correct backend endpoint for video generation
    // selectedModel already resolved above
    const promptInput = document.getElementById("stepDetailPromptInput");
    const promptOverride = promptInput ? promptInput.value : undefined;
    let response, result;
    if (/bytedance-omnihuman/i.test(selectedModel || "") && audioFile) {
      // Use FormData for Bytedance Omnihuman with audio
      const formData = new FormData();
      formData.append("image_url", imageUrl);
      formData.append("model", selectedModel);
      if (promptOverride) formData.append("prompt", promptOverride);
      formData.append("audio_file", audioFile);
      response = await fetch(`/api/generate-video/${endpoint}`, {
        method: "POST",
        headers: { ...apiKeyHeaders() },
        body: formData,
      });
      result = await response.json();
    } else {
      response = await fetch(`/api/generate-video/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify(
          (() => {
            const payload = {
              image_url: imageUrl,
              model: selectedModel,
              prompt: promptOverride,
            };
            if (
              /pixverse-v4-transition/i.test(selectedModel || "") &&
              lastFrameUrl
            )
              payload.last_frame_url = lastFrameUrl;
            if (/vidu-q1-reference-to-video/i.test(selectedModel || "")) {
              if (stepRef2) payload.image_url2 = stepRef2;
              if (stepRef3) payload.image_url3 = stepRef3;
            }
            return payload;
          })()
        ),
      });
      result = await response.json();
    }
    if (result.video && result.video.url) {
      statusDiv.textContent = "Video generated successfully!";
      statusDiv.style.color = "green";
      showVideoDialog(result.video.url);
    } else {
      // Prefer provider_message directly for clarity
      let msg =
        typeof result.provider_message === "string" &&
        result.provider_message.trim()
          ? result.provider_message.trim()
          : result.error || "Generation failed";
      if (
        result.provider &&
        msg &&
        !msg.toLowerCase().includes(result.provider.toLowerCase())
      ) {
        msg = `[${result.provider}] ${msg}`;
      }
      if (result.provider_code && msg && !msg.includes(result.provider_code)) {
        msg += ` (code ${result.provider_code})`;
      }
      throw new Error(msg);
    }
  } catch (error) {
    const finalMsg = error?.message || String(error);
    statusDiv.textContent = `Error: ${finalMsg}`;
    statusDiv.style.color = "red";
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = '<i class="fas fa-magic"></i> Generate Video';
  }
}

// Update stats
function updateStats() {
  // Use actual feature count from loaded features
  const totalFeatures = features.length;
  document.getElementById("totalFeatures").textContent = totalFeatures;
  document.getElementById("activeFeatures").textContent = totalFeatures;
  document.getElementById("totalTemplates").textContent = templates.length;
  document.getElementById("activeTemplates").textContent = templates.filter(
    (t) => t.active !== false
  ).length;
  // Demo values for the rest
  document.getElementById("wordsUsed").textContent = 1548;
  document.getElementById("wordsLimit").textContent = 2000;
  document.getElementById("draftsUsed").textContent = 7;
  document.getElementById("docsUsed").textContent = 4;
  document.getElementById("toolsUsed").textContent = 4;

  // Fix for faded/white card: toggle faded class
  const totalTemplatesCard = document.getElementById("totalTemplatesCard");
  if (totalTemplatesCard) {
    if (templates.length > 0) {
      totalTemplatesCard.classList.remove("faded");
    } else {
      totalTemplatesCard.classList.add("faded");
    }
  }
}

let currentOpenEndpoint = null;

function openFeatureModal(endpoint) {
  currentOpenEndpoint = endpoint;
  const feature = features.find((f) => f.endpoint === endpoint);
  if (!feature) return;

  document.getElementById("featureModalTitle").textContent = feature.endpoint;
  const videoPlayer = document.getElementById("featureModalVideo");
  const videoUrl =
    featureGraphics[feature.endpoint] || latestVideos[feature.endpoint];

  if (videoUrl) {
    videoPlayer.src = videoUrl;
    videoPlayer.style.display = "block";
  } else {
    videoPlayer.style.display = "none";
  }

  document.getElementById("featureModalPrompt").value = feature.prompt;
  const endpointInput = document.getElementById("featureModalEndpointName");
  if (endpointInput) endpointInput.value = feature.endpoint;

  // Reset image upload section
  const imagePreview = document.getElementById("endpointImagePreview");
  if (imagePreview) {
    imagePreview.style.display = "none";
    imagePreview.src = "";
  }
  const uploadStatus = document.getElementById("endpointUploadStatus");
  if (uploadStatus) {
    uploadStatus.textContent = "";
  }
  endpointUploadedImageUrl = null; // Reset the uploaded image URL

  document.getElementById("featureModalStatus").innerHTML = "";

  // Fetch and show all generated videos for this endpoint
  fetch(`/api/videos/${endpoint}`)
    .then((res) => res.json())
    .then((videos) => {
      const container = document.getElementById("featureModal");
      let videoList = container.querySelector(".generated-videos-list");
      if (!videoList) {
        videoList = document.createElement("div");
        videoList.className = "generated-videos-list";
        videoList.style.marginTop = "20px";
        container.querySelector(".modal-content").appendChild(videoList);
      }
      if (Array.isArray(videos) && videos.length > 0) {
        videoList.innerHTML =
          `<h4>Generated Videos</h4>` +
          videos
            .map(
              (v) => `
                <div style="margin-bottom:10px">
                  <video src="${
                    v.signedUrl || v.url
                  }" controls style="width:100%;max-width:400px;"></video>
                  <div style="font-size:12px;color:#888">${new Date(
                    v.createdAt
                  ).toLocaleString()}</div>
                  <button class="btn btn-secondary set-graphic-btn" data-video-url="${
                    v.signedUrl || v.url
                  }" data-video-key="${v.key || ""}" style="margin-top:5px;">
                    <i class="fas fa-image"></i> Set as Graphic
                  </button>
                </div>
              `
            )
            .join("");
        // Add event listeners for set as graphic buttons
        videoList.querySelectorAll(".set-graphic-btn").forEach((btn) => {
          btn.onclick = function () {
            setFeatureCardGraphic(
              endpoint,
              btn.getAttribute("data-video-url"),
              btn.getAttribute("data-video-key")
            );
          };
        });
      } else {
        videoList.innerHTML =
          '<h4>Generated Videos</h4><div style="color:#888">No videos generated yet.</div>';
      }
    });
}
// Set the selected video as the graphic for the feature card
async function setFeatureCardGraphic(endpoint, videoUrl, videoKey) {
  // Update UI immediately
  const card = document.querySelector(`.feature-card[onclick*="${endpoint}"]`);
  if (card) {
    const videoPreview = card.querySelector(".video-preview video");
    if (videoPreview) {
      videoPreview.src = videoUrl;
      const source = videoPreview.querySelector("source");
      if (source) source.src = videoUrl;
      videoPreview.load();
    }
  }
  // Persist to backend - send both key and url for flexibility
  try {
    await fetch(`/api/feature-graphic/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl, key: videoKey || undefined }),
    });
    featureGraphics[endpoint] = videoUrl;
  } catch (e) {
    alert("Failed to save graphic video!");
  }
}

// Attach event listeners after modal is shown and elements exist
const savePromptBtn = document.getElementById("featureModalSavePrompt");
if (savePromptBtn)
  savePromptBtn.onclick = (event) => updatePrompt(endpoint, event);
const generateBtn = document.getElementById("featureModalGenerate");
if (generateBtn)
  generateBtn.onclick = (event) => generateVideo(endpoint, event);

// --- CATEGORY/SUBCATEGORY LOGIC FOR TEMPLATE MODAL ---

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) return [];
  return await res.json();
}

// Only show subcategories (children) in the dropdown
function renderSubcategoryOptions(categories) {
  let options = [];
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      for (const sub of cat.children) {
        options.push(`<option value="${sub.id}">${sub.name}</option>`);
      }
    }
  }
  return options;
}

async function populateCategoryDropdown() {
  const select = document.getElementById("categorySelect");
  if (!select) return;
  select.innerHTML = '<option value="">Select subcategory...</option>';
  const cats = await fetchCategories();
  select.innerHTML += renderSubcategoryOptions(cats).join("");
}

function showAddCategoryForm() {
  document.getElementById("addCategoryForm").classList.remove("hidden");
  document.getElementById("addCategoryBtn").classList.add("hidden");
  document.getElementById("categoryError").textContent = "";
}

function hideAddCategoryForm() {
  document.getElementById("addCategoryForm").classList.add("hidden");
  document.getElementById("addCategoryBtn").classList.remove("hidden");
  document.getElementById("newCategoryName").value = "";
  document.getElementById("categoryError").textContent = "";
}

async function createCategory() {
  const name = document.getElementById("newCategoryName").value.trim();
  // Only allow creating subcategories under the main category (template name)
  const mainCategoryName = document.getElementById("templateName").value.trim();
  if (!name) {
    document.getElementById("categoryError").textContent = "Name required";
    return;
  }
  if (!mainCategoryName) {
    document.getElementById("categoryError").textContent =
      "Enter main category name first.";
    return;
  }
  // Find or create the main category first
  let mainCategoryId = null;
  const cats = await fetchCategories();
  for (const c of cats) {
    if (c.name === mainCategoryName) {
      mainCategoryId = c.id;
      break;
    }
  }
  if (!mainCategoryId) {
    // Create main category if not exists
    const resMain = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: mainCategoryName, parentId: null }),
    });
    if (resMain.ok) {
      const data = await resMain.json();
      mainCategoryId = data.id;
    } else {
      document.getElementById("categoryError").textContent =
        "Failed to create main category.";
      return;
    }
  }
  // Now create subcategory under main category
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId: mainCategoryId }),
  });
  if (res.ok) {
    hideAddCategoryForm();
    await populateCategoryDropdown();
    // Select the newly created subcategory
    const cats2 = await fetchCategories();
    let newId = null;
    for (const c of cats2) {
      if (c.id === mainCategoryId && c.children) {
        for (const sub of c.children) {
          if (sub.name === name) {
            newId = sub.id;
            break;
          }
        }
      }
    }
    if (newId) document.getElementById("categorySelect").value = newId;
  } else {
    document.getElementById("categoryError").textContent =
      "Failed to create subcategory.";
  }
}

// --- HOOK UP EVENTS ON MODAL OPEN ---

function setupTemplateModalCategoryUI() {
  populateCategoryDropdown();
  // Disable add step button if no subcategory is selected
  const addStepBtn = document.getElementById("addStepBtn");
  const categorySelect = document.getElementById("categorySelect");
  if (addStepBtn && categorySelect) {
    addStepBtn.disabled = true;
    categorySelect.onchange = function () {
      addStepBtn.disabled = !categorySelect.value;
    };
  }
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  if (addCategoryBtn) addCategoryBtn.onclick = showAddCategoryForm;
  const cancelNewCategoryBtn = document.getElementById("cancelNewCategoryBtn");
  if (cancelNewCategoryBtn) cancelNewCategoryBtn.onclick = hideAddCategoryForm;
  const saveNewCategoryBtn = document.getElementById("saveNewCategoryBtn");
  if (saveNewCategoryBtn) saveNewCategoryBtn.onclick = createCategory;
}

// Call this when opening the modal
const origOpenCreateTemplateModal = window.openCreateTemplateModal;
window.openCreateTemplateModal = function () {
  if (typeof origOpenCreateTemplateModal === "function")
    origOpenCreateTemplateModal();
  // Safe setup (no-op if elements aren't present)
  setupTemplateModalCategoryUI();
  // Ensure subcategory UI actions are wired
  if (typeof setupSubcategoryUI === "function") setupSubcategoryUI();
};

// --- INCLUDE CATEGORY IN TEMPLATE CREATION ---
// Removed duplicate onsubmit chaining; single handler defined earlier handles categoryId safely.
// --- END CATEGORY LOGIC ---

// --- DYNAMIC SUBCATEGORY AND STEP LOGIC ---

// Helper function to create autocomplete endpoint input
function createEndpointAutocomplete(initialValue = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "relative flex-1";
  wrapper.style.position = "relative";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "w-full border border-gray-300 rounded px-2 py-1 pr-8";
  input.placeholder = "Type to search endpoints...";
  input.value = initialValue;
  input.required = true;
  input.autocomplete = "off";

  // Hidden input to store the selected endpoint value
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.value = initialValue;
  hiddenInput.className = "endpoint-value";

  // Dropdown container
  const dropdown = document.createElement("div");
  dropdown.className =
    "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto hidden endpoint-autocomplete-dropdown";
  dropdown.style.top = "100%";
  dropdown.style.left = "0";

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className =
    "absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600";
  clearBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
  clearBtn.style.display = initialValue ? "block" : "none";
  clearBtn.onclick = () => {
    input.value = "";
    hiddenInput.value = "";
    clearBtn.style.display = "none";
    dropdown.classList.add("hidden");
    input.focus();
  };

  // Get endpoints
  const getEndpoints = () => {
    return Array.isArray(window.featureEndpointsFull) &&
      window.featureEndpointsFull.length
      ? window.featureEndpointsFull
      : Array.isArray(availableEndpoints)
      ? availableEndpoints
      : [];
  };

  // Filter and display options
  const updateDropdown = (searchTerm = "") => {
    const endpoints = getEndpoints();
    const filtered = endpoints.filter((f) => {
      const name = f.name || f.endpoint;
      const endpoint = f.endpoint;
      return (
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    if (searchTerm === "" || filtered.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }

    dropdown.innerHTML = filtered
      .map((f) => {
        const name = f.name || f.endpoint;
        return `<div class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0" data-endpoint="${f.endpoint}" data-name="${name}">
        <div class="font-medium text-sm">${name}</div>
        <div class="text-xs text-gray-500">${f.endpoint}</div>
      </div>`;
      })
      .join("");

    dropdown.classList.remove("hidden");

    // Add click handlers to options
    dropdown.querySelectorAll("div[data-endpoint]").forEach((option) => {
      option.onclick = () => {
        const endpoint = option.getAttribute("data-endpoint");
        const name = option.getAttribute("data-name");
        input.value = name;
        hiddenInput.value = endpoint;
        clearBtn.style.display = "block";
        dropdown.classList.add("hidden");
      };
    });
  };

  // Input event handlers
  input.addEventListener("input", (e) => {
    hiddenInput.value = ""; // Clear hidden value when typing
    updateDropdown(e.target.value);
    clearBtn.style.display = e.target.value ? "block" : "none";
  });

  input.addEventListener("focus", () => {
    updateDropdown(input.value);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(hiddenInput);
  wrapper.appendChild(clearBtn);
  wrapper.appendChild(dropdown);

  // Method to get the selected endpoint value
  wrapper.getValue = () => hiddenInput.value;
  wrapper.setValue = (endpoint) => {
    const endpoints = getEndpoints();
    const found = endpoints.find((f) => f.endpoint === endpoint);
    if (found) {
      input.value = found.name || found.endpoint;
      hiddenInput.value = endpoint;
      clearBtn.style.display = "block";
    }
  };

  return wrapper;
}

function createSubcategoryElement(subcatName = "") {
  const subcatDiv = document.createElement("div");
  subcatDiv.className = "border rounded-lg p-4 mb-2 bg-gray-50";

  // Subcategory name (readonly)
  const nameLabel = document.createElement("div");
  nameLabel.className = "font-semibold mb-2 text-blue-700";
  nameLabel.textContent = subcatName;
  subcatDiv.appendChild(nameLabel);

  // Steps container
  const stepsDiv = document.createElement("div");
  stepsDiv.className = "space-y-2 mb-2";
  subcatDiv.appendChild(stepsDiv);

  // Add Step button
  const addStepBtn = document.createElement("button");
  addStepBtn.type = "button";
  addStepBtn.className =
    "px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs";
  addStepBtn.textContent = "+ Add Step";
  addStepBtn.onclick = function () {
    const stepDiv = document.createElement("div");
    stepDiv.className = "flex gap-2 items-center";

    // Create autocomplete endpoint input
    const autocompleteWrapper = createEndpointAutocomplete("");
    stepDiv.appendChild(autocompleteWrapper);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className =
      "text-red-500 hover:text-red-700 text-xs removeStepBtn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      if (confirm("Are you sure you want to remove this step?")) {
        stepDiv.remove();
      }
    };
    stepDiv.appendChild(removeBtn);
    stepsDiv.appendChild(stepDiv);
  };
  subcatDiv.appendChild(addStepBtn);

  // Remove subcategory button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "ml-4 text-red-500 hover:text-red-700 text-xs";
  removeBtn.textContent = "Remove Subcategory";
  removeBtn.onclick = () => {
    if (
      confirm(
        "Are you sure you want to remove this subcategory and all its steps?"
      )
    ) {
      subcatDiv.remove();
    }
  };
  subcatDiv.appendChild(removeBtn);

  return subcatDiv;
}

function setupSubcategoryUI() {
  const subcatsContainer = document.getElementById("subcategoriesContainer");
  const addSubcatBtn = document.getElementById("addSubcategoryBtn");
  const newSubcatInput = document.getElementById("newSubcategoryInput");
  const subcatError = document.getElementById("subcategoryError");

  addSubcatBtn.onclick = function () {
    const name = newSubcatInput.value.trim();
    if (!name) {
      subcatError.textContent = "Subcategory name required";
      return;
    }
    subcatError.textContent = "";
    subcatsContainer.appendChild(createSubcategoryElement(name));
    newSubcatInput.value = "";
  };
}

// --- END DYNAMIC SUBCATEGORY AND STEP LOGIC ---

// Canonical Create/Edit Template submit handler
(function attachCreateTemplateSubmitHandler() {
  const form = document.getElementById("createTemplateForm");
  if (!form) return;
  form.onsubmit = async function (e) {
    e.preventDefault();
    const nameEl = document.getElementById("templateName");
    const descEl = document.getElementById("templateDescription");
    const name = nameEl ? nameEl.value.trim() : "";
    const description = descEl ? descEl.value.trim() : "";
    const categorySelectEl = document.getElementById("categorySelect");
    const categoryId =
      categorySelectEl && categorySelectEl.value
        ? categorySelectEl.value
        : null;
    if (!name) {
      alert("Template name is required");
      return;
    }
    const subcats = [];
    document
      .querySelectorAll("#subcategoriesContainer > div")
      .forEach((subcatDiv) => {
        const subcatName =
          subcatDiv.querySelector("div.font-semibold")?.textContent?.trim() ||
          "";
        const steps = [];
        subcatDiv.querySelectorAll("div.space-y-2 > div").forEach((stepDiv) => {
          // Check for autocomplete hidden input first, fallback to select if exists
          const hiddenInput = stepDiv.querySelector("input.endpoint-value");
          const select = stepDiv.querySelector("select");
          const endpoint = hiddenInput?.value || select?.value || "";
          const prompt = ""; // backend will fill from features.ts
          if (endpoint) steps.push({ endpoint, prompt });
        });
        if (subcatName && steps.length)
          subcats.push({ name: subcatName, steps });
      });
    if (!subcats.length) {
      alert("At least one subcategory with a step is required");
      return;
    }
    const payload = { name, description, subcategories: subcats };
    if (categoryId) payload.categoryId = categoryId;
    const saveBtn = document.getElementById("saveTemplateBtn");
    let originalText = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    try {
      let res;
      if (editingTemplateId) {
        res = await fetch(`/api/templates/${editingTemplateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save template");
      }
      document.getElementById("createTemplateModal").style.display = "none";
      editingTemplateId = null;
      await loadTemplates();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }
    }
  };
})();

// Feature CRUD Modal Functions
function openFeatureCrudModal() {
  console.log("Opening feature CRUD modal");
  const modal = document.getElementById("featureCrudModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";

    // Reset form
    const form = document.getElementById("featureCrudForm");
    if (form) form.reset();

    // Set title to "Create Feature"
    const title = document.getElementById("featureCrudModalTitle");
    if (title) title.textContent = "Create Feature";

    // Add form submission handler
    const formHandler = async function (e) {
      e.preventDefault();

      const endpoint = document
        .getElementById("featureCrudEndpoint")
        .value.trim();
      const prompt = document.getElementById("featureCrudPrompt").value.trim();

      if (!endpoint || !prompt) {
        alert("Please fill in all fields");
        return;
      }

      try {
        const response = await fetch("/api/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, prompt }),
        });

        if (response.ok) {
          const result = await response.json();
          const newFeature = result.feature || result; // Handle { success: true, feature: {...} } format
          closeFeatureCrudModal();
          // Add the new feature to the list efficiently instead of full reload
          if (newFeature && newFeature.endpoint) {
            addNewFeatureToList(newFeature);
          } else {
            // Fallback: just refresh display
            refreshFeaturesDisplay();
          }
          alert("Feature created successfully!");
        } else {
          // Check if response is JSON or HTML
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            alert(error.message || "Failed to create feature");
          } else {
            // Response is likely HTML (404 page)
            alert(
              "Feature creation is not currently supported. The API endpoint does not exist."
            );
          }
        }
      } catch (error) {
        console.error("Error creating feature:", error);
        if (error.message.includes("Unexpected token '<'")) {
          alert(
            "Feature creation is not currently supported. The API endpoint does not exist."
          );
        } else {
          alert("Failed to create feature: " + error.message);
        }
      }
    };

    // Remove any existing listeners and add new one
    if (form) {
      form.removeEventListener("submit", formHandler);
      form.addEventListener("submit", formHandler);
    }
  }
}

function closeFeatureCrudModal() {
  console.log("Closing feature CRUD modal");
  const modal = document.getElementById("featureCrudModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";

    // Reset form
    const form = document.getElementById("featureCrudForm");
    if (form) form.reset();
  }
}

// Make functions globally available
window.openFeatureCrudModal = openFeatureCrudModal;
window.closeFeatureCrudModal = closeFeatureCrudModal;

// Add debugging functions for testing
window.debugVideoData = function () {
  console.log("=== VIDEO DATA DEBUG ===");
  console.log("featureGraphics:", Object.keys(featureGraphics).length, "items");
  console.log("latestVideos:", Object.keys(latestVideos).length, "items");
  console.log("features:", features.length, "items");

  if (Object.keys(featureGraphics).length > 0) {
    console.log(
      "Sample featureGraphics:",
      Object.keys(featureGraphics).slice(0, 5)
    );
    console.log("Sample URLs:", Object.values(featureGraphics).slice(0, 2));
  }

  if (features.length > 0) {
    console.log(
      "Sample features:",
      features.slice(0, 3).map((f) => f.endpoint)
    );

    // Check overlap
    const featuresWithVideos = features.filter(
      (f) => featureGraphics[f.endpoint] || latestVideos[f.endpoint]
    );
    console.log(
      `Features with videos: ${featuresWithVideos.length}/${features.length}`
    );

    if (featuresWithVideos.length > 0) {
      console.log(
        "Sample features with videos:",
        featuresWithVideos.slice(0, 3).map((f) => ({
          endpoint: f.endpoint,
          videoUrl: featureGraphics[f.endpoint] || latestVideos[f.endpoint],
        }))
      );
    }
  }
};

window.refreshDisplayTest = function () {
  console.log("Refreshing display...");
  displayFeatures();
};
// Lazy video hydration with improved first-frame thumbnail capture & throttling
(function setupLazyVideos() {
  const MAX_CONCURRENT = 4; // limit simultaneous metadata loads
  let activeHydrates = 0;
  const queue = [];

  function dequeue() {
    while (activeHydrates < MAX_CONCURRENT && queue.length) {
      const next = queue.shift();
      startHydration(next);
    }
  }

  function createControlsVideo(src) {
    const video = document.createElement("video");
    video.controls = true;
    video.style.width = "100%";
    video.preload = "none";
    video.playsInline = true;
    const source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);
    return video;
  }

  function showThumbnail(container, video, skeleton) {
    // Reuse the decoded video element itself as the thumbnail (paused first frame)
    // Remove off-screen positioning if present
    video.style.position = "static";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.borderRadius = "4px";
    video.removeAttribute("controls"); // hide controls until user clicks
    const wrapper = document.createElement("div");
    wrapper.className = "video-thumb-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.cursor = "pointer";
    wrapper.appendChild(video);
    wrapper.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (wrapper.dataset.playing === "true") return;
      wrapper.dataset.playing = "true";
      const thumbVideo = wrapper.querySelector("video");
      if (thumbVideo) {
        thumbVideo.setAttribute("controls", "controls");
        try {
          thumbVideo.muted = false;
        } catch (_) {}
        const attemptPlay = () => {
          const p = thumbVideo.play();
          if (p && typeof p.then === "function") {
            p.catch(() => {
              /* ignore autoplay block errors */
            });
          }
        };
        attemptPlay();
        thumbVideo.focus();
      } else {
        const src = container.getAttribute("data-src");
        const fullVideo = createControlsVideo(src);
        wrapper.replaceWith(fullVideo);
        try {
          fullVideo.play().catch(() => {});
        } catch (_) {}
        fullVideo.focus();
      }
    });
    skeleton.replaceWith(wrapper);
  }

  function captureAndShow(container, tempVideo, skeleton) {
    let finalized = false;
    function finalize() {
      if (finalized) return;
      finalized = true;
      try {
        tempVideo.pause();
      } catch (_) {}
      showThumbnail(container, tempVideo, skeleton);
      activeHydrates--;
      dequeue();
    }
    tempVideo.addEventListener(
      "loadedmetadata",
      () => {
        try {
          tempVideo.currentTime = 0.01;
        } catch (_) {}
      },
      { once: true }
    );
    tempVideo.addEventListener(
      "seeked",
      () => {
        // Allow paint of frame before using video as thumbnail
        requestAnimationFrame(finalize);
      },
      { once: true }
    );
    tempVideo.addEventListener("error", finalize, { once: true });
    setTimeout(finalize, 4500); // timeout fallback
    tempVideo.load();
  }

  function startHydration(container) {
    const src = container.getAttribute("data-src");
    if (!src) return;
    const skeleton = container.querySelector(".video-skeleton");
    if (!skeleton) return;
    activeHydrates++;
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.style.position = "absolute";
    tempVideo.style.left = "-9999px"; // off-screen during metadata load
    const source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    tempVideo.appendChild(source);
    document.body.appendChild(tempVideo); // ensure decode
    captureAndShow(container, tempVideo, skeleton);
  }

  function enqueueHydration(container) {
    queue.push(container);
    dequeue();
  }

  function initialize() {
    const nodes = document.querySelectorAll(".lazy-video");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(enqueueHydration);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            enqueueHydration(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    nodes.forEach((n) => observer.observe(n));
  }

  window.initializeLazyVideos = initialize;
})();

document.addEventListener("DOMContentLoaded", () => {
  if (window.initializeLazyVideos) window.initializeLazyVideos();
});

// ============================================
// === CARTOON CHARACTERS SECTION ===
// ============================================

// Load all cartoon characters at once
async function loadAllCartoonCharacters() {
  if (cartoonCharactersLoading) return;

  cartoonCharactersLoading = true;
  const grid = document.getElementById("cartoonCharactersGrid");

  if (grid) {
    grid.innerHTML =
      '<div class="col-span-full text-sm text-gray-500">Loading all cartoon characters...</div>';
  }

  try {
    const response = await fetch(`/api/cartoon-characters/all`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed");
    const incomingCharacters =
      data.features || (Array.isArray(data) ? data : data.items || []);
    cartoonCharacters = incomingCharacters.map((character) => ({
      ...character,
      featureType: "cartoon",
    }));

    // Load graphics for cartoon characters
    await loadCartoonCharacterGraphics();

    if (cartoonCharacters.length === 0) {
      if (grid) {
        grid.innerHTML =
          '<div class="text-sm text-gray-500">No cartoon characters found.</div>';
      }
      return;
    }

    displayCartoonCharacters();
  } catch (e) {
    console.error("Error loading cartoon characters", e);
    if (grid) {
      grid.innerHTML =
        '<div class="text-sm text-red-500">Error loading cartoon characters. Please try again.</div>';
    }
  } finally {
    cartoonCharactersLoading = false;
  }
}

// Load persisted cartoon character graphics
async function loadCartoonCharacterGraphics() {
  try {
    const response = await fetch("/api/cartoon-character-graphic");
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data)) {
      data.forEach((item) => {
        cartoonCharacterGraphics[item.endpoint] = item.graphicUrl;
      });
    }
  } catch (e) {
    console.error("Error loading cartoon character graphics:", e);
  }
}

// Display cartoon characters
function displayCartoonCharacters() {
  const grid = document.getElementById("cartoonCharactersGrid");
  if (!grid) return;

  const searchInput = document.getElementById("cartoonCharacterSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

  function renderCartoonCards(characterArr) {
    const cardsHtml = characterArr
      .map((character) => {
        const videoUrl =
          cartoonCharacterGraphics[character.endpoint] ||
          cartoonCharacterLatestVideos[character.endpoint];
        const playable =
          videoUrl && typeof videoUrl === "object"
            ? videoUrl.signedUrl || videoUrl.url
            : videoUrl;
        const videoHtml = playable
          ? `<div class="video-preview lazy-video" data-src="${playable}">
              <div class="video-skeleton" style="width:100%;height:180px;background:#111;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;border-radius:4px;">Loading preview...</div>
            </div>`
          : `<div class="video-preview">
               <div class="bg-purple-100 rounded-lg p-8 text-center text-purple-500">
                 <i class="fas fa-child text-3xl mb-2"></i>
                 <div>No video generated yet</div>
               </div>
             </div>`;
        return `
          <div class="feature-card bg-white rounded-lg shadow p-4 flex flex-col gap-2 cursor-pointer border-l-4 border-purple-500" data-endpoint="${character.endpoint}">
            <div class="feature-name font-semibold text-lg mb-2 text-purple-700">${character.endpoint}</div>
            ${videoHtml}
            <div class="text-gray-600 text-sm mt-1"></div>
            <div class="mt-2">
              <button class="view-cartoon-details px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">View details</button>
            </div>
          </div>
        `;
      })
      .join("");
    grid.innerHTML = cardsHtml;
    if (window.initializeLazyVideos) window.initializeLazyVideos();
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".view-cartoon-details");
      if (btn) {
        const card = btn.closest(".feature-card");
        if (card) {
          const endpoint = card.getAttribute("data-endpoint");
          if (endpoint) showCartoonCharacterDetailPage(endpoint);
        }
      }
    });
  }

  if (searchTerm) {
    fetch(`/api/cartoon-characters?search=${encodeURIComponent(searchTerm)}`)
      .then((res) => res.json())
      .then((data) => {
        let filtered = [];
        if (data && data.success && Array.isArray(data.features)) {
          filtered = data.features;
        }
        renderCartoonCards(filtered);
      })
      .catch(() => {
        renderCartoonCards([]);
      });
  } else {
    renderCartoonCards(cartoonCharacters);
  }
}

// Cartoon Character search handling
const cartoonCharacterSearchInput = document.getElementById(
  "cartoonCharacterSearch"
);
if (cartoonCharacterSearchInput) {
  cartoonCharacterSearchInput.addEventListener("input", () => {
    if (!cartoonCharactersInitialRequested) return;
    displayCartoonCharacters();
  });
}

// Show cartoon character detail page
function showCartoonCharacterDetailPage(endpoint) {
  console.log("showCartoonCharacterDetailPage called with endpoint:", endpoint);

  let character = cartoonCharacters.find((c) => c.endpoint === endpoint);
  if (!character) {
    console.error("Cartoon character not found:", endpoint);
    return;
  }

  // Hide all tabs and detail pages
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach((el) => el.classList.add("hidden"));

  const featureDetailPage = document.getElementById("featureDetailPage");
  if (featureDetailPage) featureDetailPage.classList.add("hidden");

  // Show cartoon character detail page
  const detailPage = document.getElementById("cartoonCharacterDetailPage");
  if (detailPage) {
    detailPage.classList.remove("hidden");
    detailPage.scrollTop = 0;
  }

  // Update content
  const titleEl = document.getElementById("cartoonCharacterDetailTitle");
  const promptEl = document.getElementById("cartoonCharacterDetailPrompt");
  const videoEl = document.getElementById("cartoonCharacterDetailVideo");

  if (titleEl) titleEl.textContent = character.endpoint;
  if (promptEl) promptEl.textContent = character.prompt;

  // Set video source if available
  const videoUrl =
    cartoonCharacterGraphics[endpoint] ||
    cartoonCharacterLatestVideos[endpoint];
  if (videoEl && videoUrl) {
    const playable =
      typeof videoUrl === "object"
        ? videoUrl.signedUrl || videoUrl.url
        : videoUrl;
    videoEl.src = playable;
    videoEl.style.display = "block";
  } else if (videoEl) {
    videoEl.src = "";
    videoEl.style.display = "none";
  }

  // Clear previous image uploads
  const ref1Preview = document.getElementById("cartoonRef1Preview");
  const ref2Preview = document.getElementById("cartoonRef2Preview");
  const ref3Preview = document.getElementById("cartoonRef3Preview");
  if (ref1Preview) {
    ref1Preview.style.display = "none";
    ref1Preview.src = "";
  }
  if (ref2Preview) {
    ref2Preview.style.display = "none";
    ref2Preview.src = "";
  }
  if (ref3Preview) {
    ref3Preview.style.display = "none";
    ref3Preview.src = "";
  }

  const genStatus = document.getElementById("cartoonGenStatus");
  if (genStatus) genStatus.textContent = "";

  // Setup image upload handlers
  let cartoonRef1Url = null;
  let cartoonRef2Url = null;
  let cartoonRef3Url = null;

  const ref1Input = document.getElementById("cartoonRef1Input");
  const ref2Input = document.getElementById("cartoonRef2Input");
  const ref3Input = document.getElementById("cartoonRef3Input");

  async function uploadCartoonImage(file, previewEl, statusEl, setUrl) {
    const formData = new FormData();
    formData.append("image", file);
    if (statusEl) statusEl.textContent = "Uploading...";
    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      const url =
        result && result.success ? result.signedUrl || result.url : null;
      if (url) {
        setUrl(url);
        if (previewEl) {
          previewEl.src = url;
          previewEl.style.display = "block";
        }
        if (statusEl) statusEl.textContent = "Image uploaded!";
      } else {
        if (statusEl) statusEl.textContent = "Upload failed.";
      }
    } catch (e) {
      if (statusEl) statusEl.textContent = "Upload failed.";
    }
  }

  if (ref1Input) {
    ref1Input.onchange = function () {
      const file = ref1Input.files && ref1Input.files[0];
      if (file)
        uploadCartoonImage(file, ref1Preview, genStatus, (url) => {
          cartoonRef1Url = url;
        });
      ref1Input.value = "";
    };
  }

  if (ref2Input) {
    ref2Input.onchange = function () {
      const file = ref2Input.files && ref2Input.files[0];
      if (file)
        uploadCartoonImage(file, ref2Preview, genStatus, (url) => {
          cartoonRef2Url = url;
        });
      ref2Input.value = "";
    };
  }

  if (ref3Input) {
    ref3Input.onchange = function () {
      const file = ref3Input.files && ref3Input.files[0];
      if (file)
        uploadCartoonImage(file, ref3Preview, genStatus, (url) => {
          cartoonRef3Url = url;
        });
      ref3Input.value = "";
    };
  }

  // Generate video button handler
  const genBtn = document.getElementById("cartoonGenerateVideoBtn");
  if (genBtn) {
    genBtn.onclick = async function () {
      if (!cartoonRef1Url || !cartoonRef2Url) {
        if (genStatus) {
          genStatus.textContent = "Please upload at least 2 reference images.";
          genStatus.style.color = "red";
        }
        return;
      }

      genBtn.disabled = true;
      if (genStatus) {
        genStatus.textContent = "Generating video...";
        genStatus.style.color = "blue";
      }

      try {
        const selectedModel =
          document.getElementById("cartoonModelSelect")?.value ||
          "vidu-q1-reference-to-video";
        const promptOverride = character.prompt;

        const payload = {
          imageUrl: cartoonRef1Url,
          model: selectedModel,
          prompt: promptOverride,
          image_url2: cartoonRef2Url,
        };

        if (cartoonRef3Url) {
          payload.image_url3 = cartoonRef3Url;
        }

        const response = await fetch(
          `/api/generate-video/${encodeURIComponent(
            character.endpoint
          )}?type=cartoon`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (response.ok && data && data.video && data.video.url) {
          const videoUrl = data.video.url;

          if (videoEl) {
            videoEl.src = videoUrl;
            videoEl.style.display = "block";
          }

          if (genStatus) {
            genStatus.textContent = "Video generated!";
            genStatus.style.color = "green";
          }

          // Update local cache
          cartoonCharacterLatestVideos[character.endpoint] = videoUrl;
          cartoonCharacterGraphics[character.endpoint] = videoUrl;

          // Refresh the display
          displayCartoonCharacters();
        } else {
          const msg =
            (data &&
              (data.error ||
                data.provider_output ||
                data.provider_message ||
                data.message)) ||
            "Failed to generate video";
          throw new Error(msg);
        }
      } catch (e) {
        if (genStatus) {
          genStatus.textContent = `Error: ${e.message || e}`;
          genStatus.style.color = "red";
        }
      } finally {
        genBtn.disabled = false;
      }
    };
  }

  // Edit name button
  const editNameBtn = document.getElementById("editCartoonCharacterNameBtn");
  if (editNameBtn && titleEl) {
    editNameBtn.onclick = function () {
      const input = document.createElement("input");
      input.type = "text";
      input.value = character.endpoint;
      input.className =
        "border border-gray-300 rounded px-2 py-1 text-xl font-bold mr-2";
      input.style.minWidth = "150px";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.className =
        "ml-2 px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.className =
        "ml-2 px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400";

      const parent = titleEl.parentElement;
      parent.replaceChild(input, titleEl);
      parent.insertBefore(
        saveBtn,
        parent.querySelector("#editCartoonCharacterNameBtn")
      );
      parent.insertBefore(cancelBtn, saveBtn.nextSibling);
      parent.querySelector("#editCartoonCharacterNameBtn").style.display =
        "none";
      input.focus();

      saveBtn.onclick = async function (e) {
        e.preventDefault();
        const newName = input.value.trim();
        if (!newName || newName === character.endpoint) {
          cancelBtn.onclick();
          return;
        }
        const res = await fetch(
          `/api/cartoon-characters/${encodeURIComponent(
            character.endpoint
          )}/rename`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newEndpoint: newName }),
          }
        );
        if (res.ok) {
          character.endpoint = newName;
          titleEl.textContent = newName;
          parent.replaceChild(titleEl, input);
          parent.querySelector("#editCartoonCharacterNameBtn").style.display =
            "inline-block";
          saveBtn.remove();
          cancelBtn.remove();
          loadAllCartoonCharacters();
        } else {
          alert("Failed to update character name");
        }
      };

      cancelBtn.onclick = function (e) {
        if (e) e.preventDefault();
        parent.replaceChild(titleEl, input);
        parent.querySelector("#editCartoonCharacterNameBtn").style.display =
          "inline-block";
        saveBtn.remove();
        cancelBtn.remove();
      };
    };
  }

  // Edit prompt button
  const editPromptBtn = document.getElementById(
    "editCartoonCharacterPromptBtn"
  );
  if (editPromptBtn && promptEl) {
    editPromptBtn.onclick = function () {
      const textarea = document.createElement("textarea");
      textarea.value = character.prompt;
      textarea.className =
        "border border-gray-300 rounded px-2 py-1 w-full text-base";
      textarea.rows = 3;

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.className =
        "ml-2 px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.className =
        "ml-2 px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400";

      const parent = promptEl.parentElement;
      parent.replaceChild(textarea, promptEl);
      parent.appendChild(saveBtn);
      parent.appendChild(cancelBtn);
      editPromptBtn.style.display = "none";
      textarea.focus();

      saveBtn.onclick = async function (e) {
        e.preventDefault();
        const newPrompt = textarea.value.trim();
        if (!newPrompt || newPrompt === character.prompt) {
          cancelBtn.onclick();
          return;
        }
        const res = await fetch(
          `/api/cartoon-characters/${encodeURIComponent(character.endpoint)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: newPrompt }),
          }
        );
        if (res.ok) {
          character.prompt = newPrompt;
          promptEl.textContent = newPrompt;
          parent.replaceChild(promptEl, textarea);
          editPromptBtn.style.display = "inline-block";
          saveBtn.remove();
          cancelBtn.remove();
        } else {
          alert("Failed to update prompt");
        }
      };

      cancelBtn.onclick = function (e) {
        if (e) e.preventDefault();
        parent.replaceChild(promptEl, textarea);
        editPromptBtn.style.display = "inline-block";
        saveBtn.remove();
        cancelBtn.remove();
      };
    };
  }

  // Delete button
  const deleteBtn = document.getElementById("cartoonCharacterDetailDeleteBtn");
  if (deleteBtn) {
    deleteBtn.onclick = async function () {
      if (!confirm(`Delete cartoon character "${character.endpoint}"?`)) return;
      try {
        const res = await fetch(
          `/api/cartoon-characters/${encodeURIComponent(character.endpoint)}`,
          {
            method: "DELETE",
          }
        );
        if (res.ok) {
          closeCartoonCharacterDetailPage();
          loadAllCartoonCharacters();
        } else {
          alert("Failed to delete cartoon character");
        }
      } catch (e) {
        alert("Error deleting cartoon character");
      }
    };
  }

  // Apply role-based UI restrictions after setting up the detail page
  applyRoleBasedUI();
}

// Close cartoon character detail page
function closeCartoonCharacterDetailPage() {
  const detailPage = document.getElementById("cartoonCharacterDetailPage");
  if (detailPage) detailPage.classList.add("hidden");

  const tabEl = document.getElementById("tab-cartoon-characters");
  if (tabEl) tabEl.classList.remove("hidden");

  displayCartoonCharacters();
}

// Cartoon Character CRUD Modal Functions
function openCartoonCharacterCrudModal() {
  const modal = document.getElementById("cartoonCharacterCrudModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }

  const endpointInput = document.getElementById("cartoonCharacterCrudEndpoint");
  const promptInput = document.getElementById("cartoonCharacterCrudPrompt");
  if (endpointInput) endpointInput.value = "";
  if (promptInput) promptInput.value = "";

  const form = document.getElementById("cartoonCharacterCrudForm");
  if (form) {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const endpoint = endpointInput?.value?.trim();
      const prompt = promptInput?.value?.trim();

      if (!endpoint || !prompt) {
        alert("Endpoint and prompt are required");
        return;
      }

      try {
        const res = await fetch("/api/cartoon-characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, prompt }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          closeCartoonCharacterCrudModal();
          // Add to local array and refresh display
          cartoonCharacters.unshift(data.feature);
          displayCartoonCharacters();
        } else {
          alert(data.message || "Failed to create cartoon character");
        }
      } catch (e) {
        alert("Error creating cartoon character");
      }
    };
  }
}

function closeCartoonCharacterCrudModal() {
  const modal = document.getElementById("cartoonCharacterCrudModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

// Make functions globally available
window.openCartoonCharacterCrudModal = openCartoonCharacterCrudModal;
window.closeCartoonCharacterCrudModal = closeCartoonCharacterCrudModal;
window.closeCartoonCharacterDetailPage = closeCartoonCharacterDetailPage;
window.showCartoonCharacterDetailPage = showCartoonCharacterDetailPage;
window.loadAllCartoonCharacters = loadAllCartoonCharacters;
window.displayCartoonCharacters = displayCartoonCharacters;

// ============================================
// === TWO-FACTOR AUTHENTICATION (2FA) ===
// ============================================

// Show 2FA Setup Modal for admin first-time login
async function show2FASetupModal(tempToken, user) {
  const modal = document.getElementById("twoFactorSetupModal");
  if (!modal) {
    console.error("2FA setup modal not found");
    return;
  }

  // Store temp token for later use
  modal.dataset.tempToken = tempToken;
  modal.dataset.userEmail = user.email;
  modal.dataset.userRole = user.role;

  // Reset modal state
  const qrContainer = document.getElementById("twoFactorQRCode");
  const secretDisplay = document.getElementById("twoFactorSecret");
  const verifySection = document.getElementById("twoFactorVerifySection");
  const loadingSection = document.getElementById("twoFactorLoadingSection");
  const errorDiv = document.getElementById("twoFactorSetupError");

  if (qrContainer) qrContainer.innerHTML = "";
  if (secretDisplay) secretDisplay.textContent = "";
  if (verifySection) verifySection.style.display = "none";
  if (loadingSection) loadingSection.style.display = "flex";
  if (errorDiv) errorDiv.textContent = "";

  // Show modal
  modal.classList.remove("hidden");
  modal.style.display = "flex";

  // Fetch QR code and secret from server
  try {
    const res = await fetch("/api/auth/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorDiv)
        errorDiv.textContent = data.message || "Failed to setup 2FA";
      if (loadingSection) loadingSection.style.display = "none";
      return;
    }

    // Display QR code
    if (qrContainer && data.qrCode) {
      qrContainer.innerHTML = `<img src="${data.qrCode}" alt="2FA QR Code" class="mx-auto rounded-lg shadow-md" style="max-width: 200px;" />`;
    }

    // Display secret for manual entry
    if (secretDisplay && data.secret) {
      secretDisplay.textContent = data.secret;
    }

    // Show verification section
    if (loadingSection) loadingSection.style.display = "none";
    if (verifySection) verifySection.style.display = "block";

    // Focus on the code input
    const codeInput = document.getElementById("twoFactorSetupCode");
    if (codeInput) codeInput.focus();
  } catch (err) {
    if (errorDiv) errorDiv.textContent = "Network error. Please try again.";
    if (loadingSection) loadingSection.style.display = "none";
  }
}

// Verify 2FA setup code
async function verify2FASetup() {
  const modal = document.getElementById("twoFactorSetupModal");
  const codeInput = document.getElementById("twoFactorSetupCode");
  const errorDiv = document.getElementById("twoFactorSetupError");
  const verifyBtn = document.getElementById("twoFactorSetupVerifyBtn");

  if (!modal || !codeInput) return;

  const tempToken = modal.dataset.tempToken;
  const totpCode = codeInput.value.trim().replace(/\s/g, "");

  if (!totpCode || totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
    if (errorDiv) errorDiv.textContent = "Please enter a valid 6-digit code";
    return;
  }

  if (verifyBtn) verifyBtn.disabled = true;

  try {
    const res = await fetch("/api/auth/2fa/setup/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, totpCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorDiv) errorDiv.textContent = data.message || "Invalid code";
      return;
    }

    // Success! Store credentials and proceed to dashboard
    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
    }
    if (data.user) {
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userRole", data.user.role);
    }

    // Close modal and show dashboard
    close2FASetupModal();

    // Show success message
    alert("2FA has been set up successfully! You are now logged in.");

    // Show main UI and initialize
    document
      .querySelectorAll(
        "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
      )
      .forEach((el) => {
        if (el) el.style.display = "";
      });
    initializeDashboard();
  } catch (err) {
    if (errorDiv) errorDiv.textContent = "Network error. Please try again.";
  } finally {
    if (verifyBtn) verifyBtn.disabled = false;
  }
}

// Close 2FA setup modal
function close2FASetupModal() {
  const modal = document.getElementById("twoFactorSetupModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

// Show 2FA Verification Modal for admin login
function show2FAVerifyModal(tempToken, user) {
  const modal = document.getElementById("twoFactorVerifyModal");
  if (!modal) {
    console.error("2FA verify modal not found");
    return;
  }

  // Store temp token for later use
  modal.dataset.tempToken = tempToken;
  modal.dataset.userEmail = user.email;
  modal.dataset.userRole = user.role;

  // Reset modal state
  const codeInput = document.getElementById("twoFactorVerifyCode");
  const errorDiv = document.getElementById("twoFactorVerifyError");

  if (codeInput) codeInput.value = "";
  if (errorDiv) errorDiv.textContent = "";

  // Show modal
  modal.classList.remove("hidden");
  modal.style.display = "flex";

  // Focus on the code input
  if (codeInput) codeInput.focus();
}

// Verify 2FA login code
async function verify2FALogin() {
  const modal = document.getElementById("twoFactorVerifyModal");
  const codeInput = document.getElementById("twoFactorVerifyCode");
  const errorDiv = document.getElementById("twoFactorVerifyError");
  const verifyBtn = document.getElementById("twoFactorVerifyBtn");

  if (!modal || !codeInput) return;

  const tempToken = modal.dataset.tempToken;
  const totpCode = codeInput.value.trim().replace(/\s/g, "");

  if (!totpCode || totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
    if (errorDiv) errorDiv.textContent = "Please enter a valid 6-digit code";
    return;
  }

  if (verifyBtn) verifyBtn.disabled = true;

  try {
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, totpCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorDiv) errorDiv.textContent = data.message || "Invalid code";
      return;
    }

    // Success! Store credentials and proceed to dashboard
    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
    }
    if (data.user) {
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userRole", data.user.role);
    }

    // Close modal and show dashboard
    close2FAVerifyModal();

    // Show main UI and initialize
    document
      .querySelectorAll(
        "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-photo-filters, #tab-templates"
      )
      .forEach((el) => {
        if (el) el.style.display = "";
      });
    initializeDashboard();
  } catch (err) {
    if (errorDiv) errorDiv.textContent = "Network error. Please try again.";
  } finally {
    if (verifyBtn) verifyBtn.disabled = false;
  }
}

// Close 2FA verify modal
function close2FAVerifyModal() {
  const modal = document.getElementById("twoFactorVerifyModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

// Make 2FA functions globally available
window.show2FASetupModal = show2FASetupModal;
window.verify2FASetup = verify2FASetup;
window.close2FASetupModal = close2FASetupModal;
window.show2FAVerifyModal = show2FAVerifyModal;
window.verify2FALogin = verify2FALogin;
window.close2FAVerifyModal = close2FAVerifyModal;

// ============================================================
// AI WORKFLOWS SECTION
// ============================================================

let allWorkflows = [];
let currentWorkflow = null;
let selectedCategory = "all";

// Load workflows from API
async function loadWorkflows() {
  const loadingEl = document.getElementById("workflowsLoading");
  const errorEl = document.getElementById("workflowsError");
  const gridEl = document.getElementById("workflowsGrid");
  const categoriesEl = document.getElementById("workflowCategories");

  if (loadingEl) loadingEl.classList.remove("hidden");
  if (errorEl) errorEl.classList.add("hidden");
  if (gridEl) gridEl.innerHTML = "";

  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/workflows", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to fetch workflows");
    }

    allWorkflows = data.workflows || [];
    window.allWorkflows = allWorkflows; // Update global reference

    // Extract unique categories
    const categories = new Set();
    allWorkflows.forEach((wf) => {
      if (wf.category && wf.category.name) {
        categories.add(wf.category.name);
      }
    });

    // Render category buttons
    if (categoriesEl) {
      categoriesEl.innerHTML = `
        <button class="workflow-category-btn px-4 py-2 rounded-full ${
          selectedCategory === "all"
            ? "bg-purple-600 text-white"
            : "bg-gray-200 text-gray-700"
        } text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors" data-category="all" onclick="filterWorkflowsByCategory('all')">All (${
        allWorkflows.length
      })</button>
        ${Array.from(categories)
          .sort()
          .map((cat) => {
            const count = allWorkflows.filter(
              (wf) => wf.category?.name === cat
            ).length;
            return `<button class="workflow-category-btn px-4 py-2 rounded-full ${
              selectedCategory === cat
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700"
            } text-sm font-medium hover:bg-purple-500 hover:text-white transition-colors" data-category="${cat}" onclick="filterWorkflowsByCategory('${cat}')">${cat} (${count})</button>`;
          })
          .join("")}
      `;
    }

    // Render workflows
    renderWorkflows(allWorkflows);
  } catch (err) {
    console.error("Error loading workflows:", err);
    if (errorEl) {
      errorEl.textContent = err.message || "Failed to load workflows";
      errorEl.classList.remove("hidden");
    }
  } finally {
    if (loadingEl) loadingEl.classList.add("hidden");
  }
}

// Filter workflows by category
function filterWorkflowsByCategory(category) {
  selectedCategory = category;

  // Update button styles
  document.querySelectorAll(".workflow-category-btn").forEach((btn) => {
    if (btn.dataset.category === category) {
      btn.classList.remove("bg-gray-200", "text-gray-700");
      btn.classList.add("bg-purple-600", "text-white");
    } else {
      btn.classList.remove("bg-purple-600", "text-white");
      btn.classList.add("bg-gray-200", "text-gray-700");
    }
  });

  // Filter and render
  const filtered =
    category === "all"
      ? allWorkflows
      : allWorkflows.filter((wf) => wf.category?.name === category);

  renderWorkflows(filtered);
}

// Render workflows grid
function renderWorkflows(workflows) {
  const gridEl = document.getElementById("workflowsGrid");
  const searchEl = document.getElementById("workflowSearch");
  const searchTerm = searchEl?.value?.toLowerCase() || "";

  // Apply search filter
  const filtered = workflows.filter((wf) => {
    if (!searchTerm) return true;
    return (
      wf.name?.toLowerCase().includes(searchTerm) ||
      wf.description?.toLowerCase().includes(searchTerm) ||
      wf.category?.name?.toLowerCase().includes(searchTerm)
    );
  });

  if (!gridEl) return;

  if (filtered.length === 0) {
    gridEl.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-500">
        <i class="fas fa-search text-4xl mb-4"></i>
        <p>No workflows found</p>
      </div>
    `;
    return;
  }

  gridEl.innerHTML = filtered
    .map(
      (wf) => `
      <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onclick="openWorkflowDetail('${
        wf.id
      }')">
        <div class="relative">
          <img 
            src="${
              wf.thumbnail ||
              "https://via.placeholder.com/400x300?text=No+Image"
            }" 
            alt="${wf.name}" 
            class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'"
          />
          ${
            wf.category?.name
              ? `<span class="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">${wf.category.name}</span>`
              : ""
          }
          ${
            wf.premium
              ? `<span class="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full"><i class="fas fa-crown mr-1"></i>Premium</span>`
              : ""
          }
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-gray-800 mb-1 truncate">${wf.name}</h3>
          <p class="text-gray-500 text-sm line-clamp-2">${
            wf.description || "No description"
          }</p>
          <div class="flex items-center justify-between mt-3 text-xs text-gray-400">
            <span><i class="fas fa-play mr-1"></i>${
              wf.triggerCount || 0
            } runs</span>
            <span><i class="fas fa-fire mr-1"></i>${wf.popularity || 0}</span>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// Open workflow detail modal
function openWorkflowDetail(workflowId) {
  const workflow = allWorkflows.find((wf) => wf.id === workflowId);
  if (!workflow) {
    console.error("Workflow not found:", workflowId);
    return;
  }

  currentWorkflow = workflow;

  const modal = document.getElementById("workflowDetailModal");
  const thumbnailEl = document.getElementById("workflowDetailThumbnail");
  const nameEl = document.getElementById("workflowDetailName");
  const descEl = document.getElementById("workflowDetailDescription");
  const categoryEl = document.getElementById("workflowDetailCategory");
  const inputsFormEl = document.getElementById("workflowInputsForm");
  const outputSection = document.getElementById("workflowOutputSection");
  const statusEl = document.getElementById("workflowTriggerStatus");

  if (thumbnailEl)
    thumbnailEl.src =
      workflow.thumbnail || "https://via.placeholder.com/128?text=No+Image";
  if (nameEl) nameEl.textContent = workflow.name;
  if (descEl)
    descEl.textContent = workflow.description || "No description available";
  if (categoryEl) {
    const catSpan = categoryEl.querySelector("span");
    if (catSpan) {
      catSpan.textContent = workflow.category?.name || "Uncategorized";
    }
  }

  // Render input fields
  if (inputsFormEl) {
    const inputs = workflow.inputs || [];
    if (inputs.length === 0) {
      inputsFormEl.innerHTML = `<p class="text-gray-500 text-sm">This workflow has no configurable inputs.</p>`;
    } else {
      inputsFormEl.innerHTML = inputs
        .map((input) => {
          const inputId = `workflow-input-${input.name}`;
          const inputType = getInputType(input.type);
          const defaultValue = input.default_value || "";

          if (input.type === "image" || input.type === "file") {
            return `
              <div class="space-y-1">
                <label for="${inputId}" class="block text-sm font-medium text-gray-700">${formatInputName(
              input.name
            )}</label>
                <div class="flex items-center gap-2">
                  <input type="file" id="${inputId}" name="${
              input.name
            }" accept="image/*" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <span class="text-xs text-gray-400">or paste URL below</span>
                </div>
                <input type="text" id="${inputId}-url" name="${
              input.name
            }-url" placeholder="Or enter image URL..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            `;
          }

          if (input.type === "boolean") {
            return `
              <div class="flex items-center gap-2">
                <input type="checkbox" id="${inputId}" name="${input.name}" ${
              defaultValue === "true" ? "checked" : ""
            } class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                <label for="${inputId}" class="text-sm font-medium text-gray-700">${formatInputName(
              input.name
            )}</label>
              </div>
            `;
          }

          if (
            input.type === "textarea" ||
            input.name.toLowerCase().includes("prompt")
          ) {
            return `
              <div class="space-y-1">
                <label for="${inputId}" class="block text-sm font-medium text-gray-700">${formatInputName(
              input.name
            )}</label>
                <textarea id="${inputId}" name="${
              input.name
            }" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Enter ${formatInputName(
              input.name
            ).toLowerCase()}...">${defaultValue}</textarea>
              </div>
            `;
          }

          return `
            <div class="space-y-1">
              <label for="${inputId}" class="block text-sm font-medium text-gray-700">${formatInputName(
            input.name
          )}</label>
              <input type="${inputType}" id="${inputId}" name="${
            input.name
          }" value="${defaultValue}" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Enter ${formatInputName(
            input.name
          ).toLowerCase()}..." />
            </div>
          `;
        })
        .join("");
    }
  }

  // Reset output and status
  if (outputSection) outputSection.classList.add("hidden");
  if (statusEl) statusEl.innerHTML = "";

  // Show modal
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
}

// Close workflow detail modal
function closeWorkflowDetailModal() {
  const modal = document.getElementById("workflowDetailModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
  currentWorkflow = null;
}

// Trigger current workflow
async function triggerCurrentWorkflow() {
  if (!currentWorkflow) {
    alert("No workflow selected");
    return;
  }

  const triggerBtn = document.getElementById("triggerWorkflowBtn");
  const statusEl = document.getElementById("workflowTriggerStatus");
  const outputSection = document.getElementById("workflowOutputSection");
  const outputContent = document.getElementById("workflowOutputContent");

  // Collect input values
  const parameters = {};
  const inputs = currentWorkflow.inputs || [];

  for (const input of inputs) {
    const inputId = `workflow-input-${input.name}`;
    const inputEl = document.getElementById(inputId);
    const urlInputEl = document.getElementById(`${inputId}-url`);

    if (input.type === "image" || input.type === "file") {
      // Check for file upload first
      if (inputEl?.files?.length > 0) {
        // Convert file to base64
        const file = inputEl.files[0];
        const base64 = await fileToBase64(file);
        parameters[input.name] = base64;
      } else if (urlInputEl?.value) {
        parameters[input.name] = urlInputEl.value;
      }
    } else if (input.type === "boolean") {
      parameters[input.name] = inputEl?.checked || false;
    } else {
      parameters[input.name] = inputEl?.value || "";
    }
  }

  // Show loading state
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Running...';
  }
  if (statusEl) {
    statusEl.innerHTML =
      '<span class="text-purple-600"><i class="fas fa-spinner fa-spin mr-2"></i>Triggering workflow and waiting for result...</span>';
  }
  if (outputSection) outputSection.classList.add("hidden");

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("You must be logged in as admin to trigger workflows");
    }

    const res = await fetch(
      `/api/workflows/${currentWorkflow.id}/trigger-and-poll`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ parameters }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to trigger workflow");
    }

    // Show success
    if (statusEl) {
      statusEl.innerHTML =
        '<span class="text-green-600"><i class="fas fa-check-circle mr-2"></i>Workflow completed successfully!</span>';
    }

    // Display output
    if (outputSection && outputContent && data.output) {
      outputSection.classList.remove("hidden");
      outputContent.innerHTML = renderWorkflowOutput(data.output);
    }
  } catch (err) {
    console.error("Error triggering workflow:", err);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-red-600"><i class="fas fa-exclamation-circle mr-2"></i>${err.message}</span>`;
    }
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = '<i class="fas fa-play"></i> Trigger Workflow';
    }
  }
}

// Render workflow output
function renderWorkflowOutput(output) {
  if (typeof output === "string") {
    // Check if it's an image URL
    if (
      output.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
      output.startsWith("data:image")
    ) {
      return `<img src="${output}" alt="Output" class="max-w-full rounded-lg" />`;
    }
    // Check if it's a video URL
    if (output.match(/\.(mp4|webm|mov)$/i)) {
      return `<video src="${output}" controls class="max-w-full rounded-lg"></video>`;
    }
    // Check if it's an audio URL
    if (output.match(/\.(mp3|wav|ogg)$/i)) {
      return `<audio src="${output}" controls class="w-full"></audio>`;
    }
    return `<p class="text-gray-700 whitespace-pre-wrap">${output}</p>`;
  }

  if (Array.isArray(output)) {
    return `<div class="space-y-2">${output
      .map((item) => renderWorkflowOutput(item))
      .join("")}</div>`;
  }

  if (typeof output === "object" && output !== null) {
    // Check for common output patterns
    if (output.url || output.image_url || output.imageUrl) {
      const url = output.url || output.image_url || output.imageUrl;
      return `<img src="${url}" alt="Output" class="max-w-full rounded-lg" />`;
    }
    if (output.video_url || output.videoUrl) {
      const url = output.video_url || output.videoUrl;
      return `<video src="${url}" controls class="max-w-full rounded-lg"></video>`;
    }
    if (output.audio_url || output.audioUrl) {
      const url = output.audio_url || output.audioUrl;
      return `<audio src="${url}" controls class="w-full"></audio>`;
    }
    // JSON output
    return `<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto text-xs">${JSON.stringify(
      output,
      null,
      2
    )}</pre>`;
  }

  return `<p class="text-gray-700">${String(output)}</p>`;
}

// Helper: Get input type for HTML input element
function getInputType(type) {
  switch (type?.toLowerCase()) {
    case "number":
    case "integer":
    case "float":
      return "number";
    case "email":
      return "email";
    case "url":
      return "url";
    default:
      return "text";
  }
}

// Helper: Format input name for display
function formatInputName(name) {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Helper: Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Initialize workflow search
function initWorkflowSearch() {
  const searchEl = document.getElementById("workflowSearch");
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const filtered =
        selectedCategory === "all"
          ? allWorkflows
          : allWorkflows.filter((wf) => wf.category?.name === selectedCategory);
      renderWorkflows(filtered);
    });
  }
}

// Make workflow functions and variables globally available
window.loadWorkflows = loadWorkflows;
window.filterWorkflowsByCategory = filterWorkflowsByCategory;
window.openWorkflowDetail = openWorkflowDetail;
window.closeWorkflowDetailModal = closeWorkflowDetailModal;
window.triggerCurrentWorkflow = triggerCurrentWorkflow;
window.initWorkflowSearch = initWorkflowSearch;
window.allWorkflows = allWorkflows;
