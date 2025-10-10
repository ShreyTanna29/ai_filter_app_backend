// Ensure the add feature modal is hidden on page load

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
        "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-templates"
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
            "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-templates"
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
        "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-templates"
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

  var modal = document.getElementById("featureCrudModal");
  if (modal) modal.classList.add("hidden");

  // Tab switching logic
  const sidebarButtons = document.querySelectorAll("aside nav ul li button");
  const tabIds = ["tab-dashboard", "tab-filters", "tab-templates"];
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
        ensureFeaturesLoaded();
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
  const tabIds = ["tab-dashboard", "tab-filters", "tab-templates"];
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

  if (showId === "tab-filters") {
    ensureFeaturesLoaded();
  }
};

// Dashboard initialization function
async function initializeDashboard() {
  console.log("initializeDashboard called");

  // Show dashboard UI
  console.log("Showing dashboard UI elements");
  document
    .querySelectorAll(
      "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-templates"
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
    // Load templates and endpoints (non-blocking)
    loadTemplates();
    loadAvailableEndpoints();

    // Load graphics first, then features to ensure videos are available when features display
    console.log("Loading feature graphics...");
    await loadFeatureGraphics(); // This now loads both graphics and latest videos
    console.log("Feature graphics loaded, now loading features...");

    // Load features for dashboard stats
    await ensureFeaturesLoaded();
    console.log("Features loaded and displayed");

    // Update stats with initial values
    updateStats();

    console.log("Dashboard initialization complete");
  } catch (error) {
    console.error("Error during dashboard initialization:", error);
  }
}

let features = [];
let featuresLoading = false;
let featuresInitialRequested = false;

async function ensureFeaturesLoaded() {
  if (!featuresInitialRequested) {
    featuresInitialRequested = true;
    await loadAllFeatures();
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
    const response = await fetch(`/api/features/all?${params.toString()}`);

    // If the endpoint doesn't exist, fallback to regular endpoint with high limit
    if (!response.ok && response.status === 404) {
      const fallbackParams = new URLSearchParams({
        offset: "0",
        limit: "10000", // Very high limit to get all features
      });
      if (searchEl && searchEl.value.trim()) {
        fallbackParams.set("q", searchEl.value.trim());
      }
      const fallbackResponse = await fetch(
        `/api/features?${fallbackParams.toString()}`
      );
      const fallbackData = await fallbackResponse.json();
      if (!fallbackResponse.ok)
        throw new Error(fallbackData.message || "Failed");
      features = fallbackData.items || [];
    } else {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed");
      features = Array.isArray(data) ? data : data.items || [];
    }

    if (features.length === 0) {
      if (grid) {
        grid.innerHTML =
          '<div class="text-sm text-gray-500">No features found.</div>';
      }
      return;
    }

    // Check if graphics are loaded, if not wait for them
    const graphicsCount = Object.keys(featureGraphics).length;
    const videosCount = Object.keys(latestVideos).length;
    console.log(
      `Before displaying: ${graphicsCount} graphics, ${videosCount} videos loaded`
    );

    if (graphicsCount === 0 && videosCount === 0) {
      console.log("Graphics not loaded yet, loading them now...");
      await loadFeatureGraphics();
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

  const searchTerm = document
    .getElementById("featureSearch")
    .value.toLowerCase();
  const filteredFeatures = features.filter(
    (feature) =>
      feature.endpoint.toLowerCase().includes(searchTerm) ||
      feature.prompt.toLowerCase().includes(searchTerm)
  );

  const cardsHtml = filteredFeatures
    .map((feature) => {
      // Priority: 1. Manual feature graphics, 2. Latest generated video, 3. No video
      const videoUrl =
        featureGraphics[feature.endpoint] || latestVideos[feature.endpoint];

      const videoHtml = videoUrl
        ? `<div class="video-preview">
             <video controls preload="metadata" style="width: 100%;">
               <source src="${videoUrl}" type="video/mp4">
               Your browser does not support the video tag.
             </video>
           </div>`
        : `<div class="video-preview">
             <div class="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
               <i class="fas fa-video text-3xl mb-2"></i>
               <div>No video generated yet</div>
             </div>
           </div>`;

      return `
        <div class="feature-card bg-white rounded-lg shadow p-4 flex flex-col gap-2 cursor-pointer" data-endpoint="${feature.endpoint}">
          <div class="feature-name font-semibold text-lg mb-2">${feature.endpoint}</div>
          ${videoHtml}
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
        if (endpoint) showFeatureDetailPage(endpoint);
      }
    }
  });
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

// Show feature detail as a full page (hides all tab content, shows detail page)
function showFeatureDetailPage(endpoint) {
  console.log("showFeatureDetailPage called with endpoint:", endpoint);
  console.log("Current features array:", features);
  try {
    const feature = features.find((f) => f.endpoint === endpoint);
    console.log("Found feature:", feature);
    if (!feature) {
      console.error("Feature not found for endpoint:", endpoint);
      return;
    }
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
    const videoUrl =
      featureGraphics[feature.endpoint] || latestVideos[feature.endpoint];
    const videoEl = document.getElementById("featureDetailVideo");
    console.log("Video element:", videoEl, "Video URL:", videoUrl);
    if (videoEl) {
      if (videoUrl) {
        videoEl.src = videoUrl;
        videoEl.style.display = "block";
      } else {
        videoEl.style.display = "none";
      }
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
    let featureLastFrameUrl = null;
    let featureRef2Url = null;
    let featureRef3Url = null;

    // Reset UI
    if (preview) {
      preview.style.display = "none";
      preview.src = "";
    }
    if (uploadStatus) uploadStatus.textContent = "";
    if (genStatus) genStatus.textContent = "";
    uploadedImageUrl = null;

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
        fetch("/api/cloudinary/upload", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((r) => {
            if (r && r.success && r.url) {
              featureLastFrameUrl = r.url;
              if (featureLastFramePreview) {
                featureLastFramePreview.src = r.url;
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
        fetch("/api/cloudinary/upload", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((r) => {
            if (r && r.success && r.url) {
              featureRef2Url = r.url;
              if (featureRef2Preview) {
                featureRef2Preview.src = r.url;
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
        fetch("/api/cloudinary/upload", { method: "POST", body: formData })
          .then((r) => r.json())
          .then((r) => {
            if (r && r.success && r.url) {
              featureRef3Url = r.url;
              if (featureRef3Preview) {
                featureRef3Preview.src = r.url;
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
    if (featureModelSelect && featureLastFrameWrapper) {
      const toggleFeatureLastFrame = () => {
        const val = featureModelSelect.value || "";
        const isPixTrans = /pixverse-v4-transition/i.test(val);
        const isVidu = /vidu-q1-reference-to-video/i.test(val);
        const isViduImage2Video =
          /vidu-(1\.5|q1)-image-to-video|veo-2-image-to-video|veo-3-image-to-video/i.test(
            val
          );
        featureLastFrameWrapper.style.display = isPixTrans ? "flex" : "none";
        if (!isPixTrans) {
          featureLastFrameUrl = null;
          if (featureLastFramePreview)
            featureLastFramePreview.style.display = "none";
        }
        // Toggle vidu extra refs (only for reference-to-video model)
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
      };
      featureModelSelect.addEventListener("change", toggleFeatureLastFrame);
      toggleFeatureLastFrame();
    }
    function handleFeatureImageUpload() {
      const file = input.files && input.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("image", file);
      if (uploadStatus) uploadStatus.textContent = "Uploading...";
      fetch("/api/cloudinary/upload", { method: "POST", body: formData })
        .then((res) => res.json())
        .then((result) => {
          if (result && result.success && result.url) {
            uploadedImageUrl = result.url;
            if (preview) {
              preview.src = result.url;
              preview.style.display = "block";
              preview.classList.add("image-preview");
            }
            if (uploadStatus) {
              uploadStatus.textContent = "Image uploaded!";
              uploadStatus.className =
                "upload-status success text-sm mt-3 text-center";
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

    if (genBtn) {
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
          const response = await fetch(
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
                  if (/vidu-q1-reference-to-video/i.test(selectedModel || "")) {
                    if (featureRef2Url) payload.image_url2 = featureRef2Url;
                    if (featureRef3Url) payload.image_url3 = featureRef3Url;
                  }
                  return payload;
                })()
              ),
            }
          );
          const data = await response.json();
          if (response.ok && data && data.video && data.video.url) {
            const vEl = document.getElementById("featureDetailVideo");
            if (vEl) vEl.src = data.video.url;
            if (genStatus) {
              genStatus.textContent = "Video generated!";
              genStatus.style.color = "green";
            }
            // Refresh latest videos to update feature cards without full reload
            await refreshLatestVideos();
          } else {
            throw new Error((data && data.error) || "Failed to generate video");
          }
        } catch (e) {
          if (genStatus) genStatus.textContent = `Error: ${e.message || e}`;
          if (genStatus) genStatus.style.color = "red";
        } finally {
          genBtn.disabled = false;
        }
      };
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
  features.unshift(newFeature);
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
      "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-templates"
    )
    .forEach((el) => {
      if (el) {
        console.log("Restoring element:", el.tagName, el.id || el.className);
        el.style.display = "";
        el.classList.remove("hidden");
      }
    });

  // Use the normal tab switching functionality to show filters tab
  // This ensures proper tab state management and allows users to switch to other tabs
  switchTab("filters");

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
  document.getElementById("stepDetailPage").classList.remove("hidden");
  // Reset video gen UI
  document.getElementById("stepImagePreview").style.display = "none";
  document.getElementById("stepImagePreview").src = "";
  document.getElementById("stepUploadStatus").textContent = "";
  document.getElementById("stepGenStatus").textContent = "";
  const legacyPreview = document.getElementById("stepVideoPreview");
  if (legacyPreview) legacyPreview.style.display = "none";
  window._stepUploadedImageUrl = null;
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
          .map(
            (v) =>
              `<div class="relative rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow group" data-url="${v.url}" data-id="${v.id}">
       <video src="${v.url}" class="w-full transition-opacity duration-300 cursor-pointer step-detail-video"  controls preload="metadata" style="object-fit:cover"></video>
       <button class="absolute top-1 right-1 bg-red-600/80 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition delete-step-video-btn" title="Delete video"><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='pointer-events-none'><path d='M3 6h18'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/><path d='M10 11v6'/><path d='M14 11v6'/></svg></button>
     </div>`
          )
          .join("");
        generatedListEl.innerHTML = html;
        // Selection highlight
        generatedListEl
          .querySelectorAll("video.step-detail-video")
          .forEach((vid) => {
            vid.addEventListener("click", (e) => {
              e.preventDefault();
              generatedListEl
                .querySelectorAll("div[data-id]")
                .forEach((n) => n.classList.remove("ring", "ring-blue-400"));
              const parent = vid.closest("div[data-id]");
              if (parent) parent.classList.add("ring", "ring-blue-400");
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
    fetch("/api/cloudinary/upload", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((result) => {
        if (result && result.success && result.url) {
          window._stepUploadedImageUrl = result.url;
          if (preview) {
            preview.src = result.url;
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
      fetch("/api/cloudinary/upload", { method: "POST", body: formData })
        .then((r) => r.json())
        .then((r) => {
          if (r && r.success && r.url) {
            window._stepLastFrameUrl = r.url;
            if (stepLastFramePreview) {
              stepLastFramePreview.src = r.url;
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
      fetch("/api/cloudinary/upload", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((r) => {
          if (r && r.success && r.url) {
            window._stepRef2Url = r.url;
            if (stepRef2Preview) {
              stepRef2Preview.src = r.url;
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
      fetch("/api/cloudinary/upload", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((r) => {
          if (r && r.success && r.url) {
            window._stepRef3Url = r.url;
            if (stepRef3Preview) {
              stepRef3Preview.src = r.url;
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
      "main, aside, header, .tab-content, #tab-dashboard, #tab-filters, #tab-templates"
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

  // Reset step detail state
  window._currentStepTemplateId = null;
  window._currentStepIndex = null;

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
      const res = await fetch("/api/features");
      window.featureEndpointsFull = await res.json();
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
      // Endpoint select
      const select = document.createElement("select");
      select.className = "flex-1 border border-gray-300 rounded px-2 py-1";
      select.required = true;
      select.innerHTML =
        `<option value="">Select endpoint...</option>` +
        window.featureEndpointsFull
          .map(
            (f) =>
              `<option value="${f.endpoint}" ${
                step.endpoint === f.endpoint ? "selected" : ""
              }>${f.name ? f.name : f.endpoint}</option>`
          )
          .join("");
      select.value = step.endpoint;
      stepDiv.appendChild(select);
      // Remove button
      const removeStepBtn = document.createElement("button");
      removeStepBtn.type = "button";
      removeStepBtn.className =
        "text-red-500 hover:text-red-700 text-xs removeStepBtn";
      removeStepBtn.textContent = "Remove";
      removeStepBtn.onclick = () => stepDiv.remove();
      stepDiv.appendChild(removeStepBtn);
      // Generated videos list for this step
      const generatedWrap = document.createElement("div");
      generatedWrap.className = "step-generated-videos w-full mt-2";
      stepDiv.appendChild(generatedWrap);
      stepsDiv.appendChild(stepDiv);
      // Wire generated videos list
      const onPick = (url) => {
        // show a small inline preview on pick
        let preview = stepDiv.querySelector(".step-picked-video");
        if (!preview) {
          preview = document.createElement("div");
          preview.className = "step-picked-video w-full mt-2";
          stepDiv.appendChild(preview);
        }
        preview.innerHTML = `<video src="${url}" controls style="width:100%;max-width:400px;"></video>`;
      };
      const refresh = () =>
        renderStepGeneratedVideos(generatedWrap, select.value, onPick);
      select.addEventListener("change", refresh);
      refresh();
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
      const select = document.createElement("select");
      select.className = "flex-1 border border-gray-300 rounded px-2 py-1";
      select.required = true;
      select.innerHTML =
        `<option value="">Select endpoint...</option>` +
        window.featureEndpointsFull
          .map(
            (f) =>
              `<option value="${f.endpoint}">${
                f.name ? f.name : f.endpoint
              }</option>`
          )
          .join("");
      stepDiv.appendChild(select);
      const removeStepBtn = document.createElement("button");
      removeStepBtn.type = "button";
      removeStepBtn.className =
        "text-red-500 hover:text-red-700 text-xs removeStepBtn";
      removeStepBtn.textContent = "Remove";
      removeStepBtn.onclick = () => stepDiv.remove();
      stepDiv.appendChild(removeStepBtn);
      // Generated videos list
      const generatedWrap = document.createElement("div");
      generatedWrap.className = "step-generated-videos w-full mt-2";
      stepDiv.appendChild(generatedWrap);
      stepsDiv.appendChild(stepDiv);
      const onPick = (url) => {
        let preview = stepDiv.querySelector(".step-picked-video");
        if (!preview) {
          preview = document.createElement("div");
          preview.className = "step-picked-video w-full mt-2";
          stepDiv.appendChild(preview);
        }
        preview.innerHTML = `<video src="${url}" controls style="width:100%;max-width:400px;"></video>`;
      };
      const refresh = () =>
        renderStepGeneratedVideos(generatedWrap, select.value, onPick);
      select.addEventListener("change", refresh);
      refresh();
    };
    subcatDiv.appendChild(addStepBtn);
    // Remove subcategory button
    const removeSubcatBtn = document.createElement("button");
    removeSubcatBtn.type = "button";
    removeSubcatBtn.className = "ml-4 text-red-500 hover:text-red-700 text-xs";
    removeSubcatBtn.textContent = "Remove Subcategory";
    removeSubcatBtn.onclick = () => subcatDiv.remove();
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
    <div class="step-generated-videos" style="margin-top:8px;"></div>
  </div>`;

  stepsContainer.insertAdjacentHTML("beforeend", stepHtml);

  const newStep = stepsContainer.lastElementChild;
  if (!newStep) return;
  const endpointSelect = newStep.querySelector(".step-endpoint-select");
  const generateBtn = newStep.querySelector(".step-generate-btn");
  const statusDiv = newStep.querySelector(".step-status-message");
  const videoPreviewDiv = newStep.querySelector(".step-video-preview");
  const generatedListDiv = newStep.querySelector(".step-generated-videos");

  const getUploadedImageUrl = setupStepImageUpload(newStep);

  const onSelectGenerated = (url) => {
    if (!url) return;
    videoPreviewDiv.style.display = "block";
    videoPreviewDiv.innerHTML = `<video src="${url}" controls style="width:100%;max-width:400px;"></video>`;
  };
  const refreshGeneratedForSelect = () => {
    const ep = endpointSelect.value;
    renderStepGeneratedVideos(generatedListDiv, ep, onSelectGenerated);
  };
  endpointSelect.addEventListener("change", refreshGeneratedForSelect);
  refreshGeneratedForSelect();

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
  button.parentElement.remove();
  updateStepNumbers();
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
               <video src="${v.url}#t=0.1" class="w-full" style="aspect-ratio:16/9" preload="metadata"></video>
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

// Handle card click to show Cloudinary video in dialog
function toggleVideo(endpoint) {
  const cloudinaryVideo = document.getElementById(`cloudinary-${endpoint}`);
  const generatedVideo = document.getElementById(`generated-${endpoint}`);

  // If there's a generated video, show it in the dialog
  if (generatedVideo && generatedVideo.src) {
    showVideoDialog(generatedVideo.src);
  } else if (cloudinaryVideo) {
    // Otherwise show the Cloudinary video in the dialog
    showVideoDialog(cloudinaryVideo.querySelector("source").src);
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
  // If called from endpoint modal, use uploaded image
  if (document.getElementById("endpointImagePreview")) {
    imageUrl = endpointUploadedImageUrl;
    statusDiv = document.getElementById("featureModalStatus");
    generateButton = document.getElementById("featureModalGenerate");
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
    const response = await fetch(`/api/generate-video/${endpoint}`, {
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
    const result = await response.json();
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
    // Build endpoint select (features) only; prompt removed
    const select = document.createElement("select");
    select.className = "flex-1 border border-gray-300 rounded px-2 py-1";
    select.required = true;
    const endpoints =
      Array.isArray(window.featureEndpointsFull) &&
      window.featureEndpointsFull.length
        ? window.featureEndpointsFull
        : Array.isArray(availableEndpoints)
        ? availableEndpoints
        : [];
    select.innerHTML =
      `<option value="">Select endpoint...</option>` +
      endpoints
        .map(
          (f) =>
            `<option value="${f.endpoint}">${
              f.name ? f.name : f.endpoint
            }</option>`
        )
        .join("");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className =
      "text-red-500 hover:text-red-700 text-xs removeStepBtn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => stepDiv.remove();
    stepDiv.appendChild(select);
    stepDiv.appendChild(removeBtn);
    stepsDiv.appendChild(stepDiv);
  };
  subcatDiv.appendChild(addStepBtn);

  // Remove subcategory button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "ml-4 text-red-500 hover:text-red-700 text-xs";
  removeBtn.textContent = "Remove Subcategory";
  removeBtn.onclick = () => subcatDiv.remove();
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
          const select = stepDiv.querySelector("select");
          const endpoint = select?.value || "";
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
          const newFeature = await response.json();
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
