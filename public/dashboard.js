const PHOTO_MODEL_OPTIONS = [
  { value: "bfl:2@1", label: "FLUX.1 Schnell" },
  { value: "bfl:1@8", label: "FLUX.1 Dev" },
  { value: "bfl:1@4", label: "FLUX.1 Pro" },
  { value: "bytedance:5@0", label: "Seeddream 4.0 (Runware)" },
  { value: "sourceful:1@1", label: "Riverflow 1.1 (Runware)" },
];
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
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("step-video-modal-close").onclick = function () {
    modal.style.display = "none";
    document.getElementById("step-video-modal-player").src = "";
  };
}

function showStepVideoModal(videoUrl) {
  const modal = document.getElementById("step-video-modal");
  const player = document.getElementById("step-video-modal-player");
  player.src = videoUrl;
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

    // Clear token from localStorage
    localStorage.removeItem("token");

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
        // Persist token and user email
        if (data && data.accessToken) {
          localStorage.setItem("token", data.accessToken);
        }
        if (data && data.user && data.user.email) {
          localStorage.setItem("userEmail", data.user.email);
        } else {
          localStorage.setItem("userEmail", email);
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

  var modal = document.getElementById("featureCrudModal");
  if (modal) modal.classList.add("hidden");

  // Tab switching logic
  const sidebarButtons = document.querySelectorAll("aside nav ul li button");
  const tabIds = [
    "tab-dashboard",
    "tab-filters",
    "tab-photo-filters",
    "tab-templates",
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
    "tab-apps",
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
  if (showId === "tab-filters" && !featuresInitialRequested) {
    loadAllFeatures();
    featuresInitialRequested = true;
  } else if (showId === "tab-photo-filters") {
    if (!photoFeaturesInitialRequested) {
      loadAllPhotoFeatures().then(() => displayPhotoFeatures());
      photoFeaturesInitialRequested = true;
    } else {
      displayPhotoFeatures();
    }
  } else if (showId === "tab-apps") {
    if (!appsInitialRequested) {
      initAppsTab();
      loadApps();
      appsInitialRequested = true;
    } else {
      renderApps();
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
  }
}

let features = [];
let featuresLoading = false;
let featuresInitialRequested = false;
// Photo Filters data store (from Photo_Features model)
let photoFeatures = [];
let photoFeaturesLoading = false;
let photoFeaturesInitialRequested = false;
let savedScrollPosition = 0;

// === Apps tab state ===
let apps = [];
let appsLoading = false;
let appsInitialRequested = false;

function getStoredApiKey() {
  return (
    localStorage.getItem("adminApiKey") || localStorage.getItem("apiKey") || ""
  );
}

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
              }" class="rotate-app px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">Rotate Key</button>
              <button data-app-id="${
                app.id
              }" class="delete-app px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Delete</button>
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

    // Fetch all features without pagination
    const response = await fetch(`/api/features/all`);

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
    const response = await fetch(`/api/photo-features/all`);
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

  const graphicsCount = Object.keys(featureGraphics).length;
  const videosCount = Object.keys(latestVideos).length;
  console.log(
    `displayPhotoFeatures: ${graphicsCount} graphics, ${videosCount} videos available`
  );

  const searchInput = document.getElementById("photoFeatureSearch");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

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
    const featureVideoEl = document.getElementById("featureDetailVideo");
    const featurePhotoEl = document.getElementById("featureDetailPhoto");

    async function updateFeatureDetailVideo() {
      let videoUrl =
        featureGraphics[feature.endpoint] || latestVideos[feature.endpoint];
      if (!videoUrl) {
        try {
          const res = await fetch(
            `/api/generate-video/videos/${feature.endpoint}`
          );
          const videos = await res.json();
          if (Array.isArray(videos) && videos.length > 0) {
            videoUrl =
              videos[0].cloudinaryUrl ||
              videos[0].url ||
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
    const featureLastFrameWrapper = document.getElementById(
      "featureLastFrameWrapper"
    );
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

    // Reset UI
    if (preview) {
      preview.style.display = "none";
      preview.src = "";
    }
    if (uploadStatus) uploadStatus.textContent = "";
    if (genStatus) genStatus.textContent = "";
    uploadedImageUrl = null;
    featureRunwareImageUUID = null;
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
    const featureModelSelect = document.getElementById("featureModelSelect");
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
      featureRunwareImageUUID = null;
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
        featureRunwareImageUUID = data.imageUUID;
        if (uploadStatus)
          uploadStatus.textContent = "Image ready for Runware edits.";
      } catch (err) {
        featureRunwareImageUUID = null;
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
          if (!featureUploadedImageFile && !uploadedImageUrl) {
            if (genStatus)
              genStatus.textContent = "Please upload an image first.";
            return;
          }
          const modelSelect = document.getElementById("featureModelSelect");
          const selectedModel = modelSelect ? modelSelect.value : "";
          if (!selectedModel) {
            if (genStatus)
              genStatus.textContent = "Select a model before generating.";
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
              response = await fetch("/api/runware/generate-photo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  feature: feature.endpoint,
                  prompt: promptText,
                  model: selectedModel,
                  seedImage,
                  width: 1024,
                  height: 1024,
                  numberResults: 1,
                }),
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
            featureGraphics[feature.endpoint] = imageUrl;
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
                  body: formData,
                }
              );
              data = await response.json();
            } else {
              response = await fetch(
                `/api/generate-video/${encodeURIComponent(feature.endpoint)}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    (() => {
                      const payload = {
                        imageUrl: uploadedImageUrl,
                        model: selectedModel,
                        prompt: promptOverride,
                      };
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
          const res = await fetch(
            `/api/features/${encodeURIComponent(feature.endpoint)}/rename`,
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
          const res = await fetch(
            `/api/features/${encodeURIComponent(feature.endpoint)}`,
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
          await fetch(`/api/features/${encodeURIComponent(feature.endpoint)}`, {
            method: "DELETE",
          });
          page.classList.add("hidden");
          loadFeatures();
          const filtersTab = document.getElementById("tab-filters");
          if (filtersTab) filtersTab.classList.remove("hidden");
        }
      };
    }
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
            <div class="flex gap-2">
              <button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded shadow-sm flex items-center gap-1" onclick="editTemplate(${
                template.id
              })">
                <i class="fas fa-edit"></i> <span class="hidden sm:inline">Edit</span>
              </button>
              <button class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm flex items-center gap-1" onclick="deleteTemplate(${
                template.id
              })">
                <i class="fas fa-trash"></i> <span class="hidden sm:inline">Delete</span>
              </button>
            </div>
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

  // Load existing generated videos for this step's endpoint
  const generatedListEl = document.getElementById("stepGeneratedList");
  if (generatedListEl && step.endpoint) {
    generatedListEl.innerHTML =
      '<div class="col-span-full text-xs text-gray-500 flex items-center gap-1"><svg class="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" fill="none"></path></svg> Loading...</div>';
    fetch(`/api/videos/${encodeURIComponent(step.endpoint)}`)
      .then((r) => r.json())
      .then((videos) => {
        if (!Array.isArray(videos) || videos.length === 0) {
          generatedListEl.innerHTML =
            '<div class="col-span-full text-xs text-gray-500">No videos yet for this endpoint.</div>';
          return;
        }
        const html = videos
          .map((v) => {
            const vidUrl = v.signedUrl || v.url;
            return `<div class="relative rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow group step-detail-thumb" data-url="${vidUrl}" data-id="${v.id}" style="width:120px;height:213px;display:inline-block;vertical-align:top;background:#000;cursor:pointer;">
       <video src="${vidUrl}" class="w-full h-full object-cover" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
       <button class="absolute top-1 right-1 bg-red-600/80 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition delete-step-video-btn" title="Delete video"><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='pointer-events-none'><path d='M3 6h18'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/><path d='M10 11v6'/><path d='M14 11v6'/></svg></button>
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
            const url = el.getAttribute("data-url");
            if (url) showStepVideoModal(url);
          });
        });
        // Deletion
        generatedListEl
          .querySelectorAll(".delete-step-video-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const wrapper = btn.closest("div[data-id]");
              if (!wrapper) return;
              const id = wrapper.getAttribute("data-id");
              if (!id) return;
              if (!confirm("Delete this video?")) return;
              btn.disabled = true;
              btn.textContent = "...";
              try {
                const resp = await fetch(`/api/videos/${id}`, {
                  method: "DELETE",
                });
                if (!resp.ok) throw new Error("Failed");
                wrapper.remove();
                if (!generatedListEl.querySelector("div[data-id]")) {
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
      const res = await fetch("/api/features/all");
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
  const modelSelect = document.getElementById("stepModelSelect");
  const selectedModel = modelSelect ? modelSelect.value : undefined;
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
        body: formData,
      });
      result = await response.json();
    } else {
      response = await fetch(`/api/generate-video/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                    v.url
                  }" controls style="width:100%;max-width:400px;"></video>
                  <div style="font-size:12px;color:#888">${new Date(
                    v.createdAt
                  ).toLocaleString()}</div>
                  <button class="btn btn-secondary set-graphic-btn" data-video-url="${
                    v.url
                  }" style="margin-top:5px;">
                    <i class="fas fa-image"></i> Set as Graphic
                  </button>
                </div>
              `
            )
            .join("");
        // Add event listeners for set as graphic buttons
        videoList.querySelectorAll(".set-graphic-btn").forEach((btn) => {
          btn.onclick = function () {
            setFeatureCardGraphic(endpoint, btn.getAttribute("data-video-url"));
          };
        });
      } else {
        videoList.innerHTML =
          '<h4>Generated Videos</h4><div style="color:#888">No videos generated yet.</div>';
      }
    });
}
// Set the selected video as the graphic for the feature card
async function setFeatureCardGraphic(endpoint, videoUrl) {
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
  // Persist to backend
  try {
    await fetch(`/api/feature-graphic/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl }),
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
