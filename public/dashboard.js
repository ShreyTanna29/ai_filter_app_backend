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
  const sidebarLinks = document.querySelectorAll("aside nav ul li a");
  const tabIds = ["tab-dashboard", "tab-filters", "tab-templates"];
  sidebarLinks.forEach((link, idx) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      // Remove active class from all links
      sidebarLinks.forEach((l) =>
        l.classList.remove("bg-blue-50", "text-blue-600", "font-medium")
      );
      // Add active class to clicked link
      link.classList.add("bg-blue-50", "text-blue-600", "font-medium");
      // Hide all tab contents
      tabIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });
      // Show selected tab
      const showId = tabIds[idx];
      const showEl = document.getElementById(showId);
      if (showEl) showEl.classList.remove("hidden");
    });
  });
  // Show dashboard tab by default
  tabIds.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", idx !== 0);
  });
});

// Dashboard initialization function
function initializeDashboard() {
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

  console.log("Loading initial data");
  // Load initial data
  loadFeatures();
  loadTemplates();
  loadFeatureGraphics();
  loadAvailableEndpoints();

  console.log("Dashboard initialization complete");
}

let features = [];
let templates = [];
let availableEndpoints = [];
let featureGraphics = {};

// Display features
function displayFeatures() {
  const grid = document.getElementById("featuresGrid");
  const searchTerm = document
    .getElementById("featureSearch")
    .value.toLowerCase();

  const filteredFeatures = features.filter(
    (feature) =>
      feature.endpoint.toLowerCase().includes(searchTerm) ||
      feature.prompt.toLowerCase().includes(searchTerm)
  );

  grid.innerHTML = filteredFeatures
    .map((feature) => {
      const videoUrl =
        featureGraphics[feature.endpoint] ||
        `https://res.cloudinary.com/do60wtwwc/video/upload/v1754319544/generated-videos/generated-videos/${feature.endpoint}.mp4#t=0.5`;
      return `
        <div class="feature-card bg-white rounded-lg shadow p-4 flex flex-col gap-2 cursor-pointer" data-endpoint="${feature.endpoint}">
          <div class="feature-name font-semibold text-lg mb-2">${feature.endpoint}</div>
          <div class="video-preview">
            <video controls preload="metadata" style="width: 100%;">
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
          <div class="text-gray-600 text-sm mt-1"></div>
          <div class="mt-2">
            <button class="view-feature-details px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">View details</button>
          </div>
        </div>
          `;
    })
    .join("");
  // Delegated click handling for reliable navigation
  grid.addEventListener("click", (e) => {
    console.log("Grid click event:", e.target);
    const btn = e.target.closest(".view-feature-details");
    const name = e.target.closest(".feature-name");
    let card = null;
    if (btn) {
      console.log("Clicked view details button");
      card = btn.closest(".feature-card");
      e.preventDefault();
      e.stopPropagation();
    } else if (name) {
      console.log("Clicked feature name");
      card = name.closest(".feature-card");
    } else {
      const maybeCard = e.target.closest(".feature-card");
      if (maybeCard && e.target.tagName !== "VIDEO") {
        console.log("Clicked elsewhere in card");
        card = maybeCard;
      }
    }
    if (!card) {
      console.log("No card found for click");
      return;
    }
    const endpoint = card.getAttribute("data-endpoint");
    console.log("Card endpoint:", endpoint);
    if (endpoint) showFeatureDetailPage(endpoint);
  });
}

// Load features
async function loadFeatures() {
  console.log("Loading features...");
  try {
    const response = await fetch("/api/features");
    console.log("Features response:", response);
    features = await response.json();
    console.log("Loaded features:", features);
    displayFeatures();
    updateStats();
  } catch (error) {
    console.error("Error loading features:", error);
  }
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
      featureGraphics[feature.endpoint] ||
      `https://res.cloudinary.com/do60wtwwc/video/upload/v1754319544/generated-videos/generated-videos/${feature.endpoint}.mp4#t=0.5`;
    const videoEl = document.getElementById("featureDetailVideo");
    console.log("Video element:", videoEl, "Video URL:", videoUrl);
    if (videoEl) videoEl.src = videoUrl;

    // --- Feature video generation logic ---
    let uploadedImageUrl = null;
    const uploadSection = document.getElementById("featureImageUploadSection");
    const input = document.getElementById("featureImageInput");
    const preview = document.getElementById("featureImagePreview");
    const uploadStatus = document.getElementById("featureUploadStatus");
    const genBtn = document.getElementById("featureGenerateVideoBtn");
    const genStatus = document.getElementById("featureGenStatus");

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
      uploadSection.onclick = (e) => {
        if (e.target.tagName !== "INPUT") input.click();
      };
    }
    if (input) {
      input.onchange = handleFeatureImageUpload;
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
          const response = await fetch(
            `/api/generate-video/${encodeURIComponent(feature.endpoint)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: uploadedImageUrl }),
            }
          );
          const data = await response.json();
          if (response.ok && data && data.video && data.video.url) {
            const vEl = document.getElementById("featureDetailVideo");
            if (vEl) vEl.src = data.video.url;
            if (genStatus) genStatus.textContent = "Video generated!";
            await loadFeatures();
          } else {
            throw new Error((data && data.error) || "Failed to generate video");
          }
        } catch (e) {
          if (genStatus) genStatus.textContent = `Error: ${e.message || e}`;
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

// Load persisted feature graphics from backend
async function loadFeatureGraphics() {
  try {
    const res = await fetch("/api/feature-graphic");
    const data = await res.json();
    featureGraphics = {};
    if (Array.isArray(data)) {
      data.forEach((g) => {
        featureGraphics[g.endpoint] = g.graphicUrl;
      });
    }
  } catch (e) {
    // Non-fatal: just proceed without persisted graphics
    featureGraphics = {};
  }
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

  // Show filters tab again
  const filtersTab = document.getElementById("tab-filters");
  if (filtersTab) {
    filtersTab.classList.remove("hidden");
    filtersTab.style.display = "";
    console.log("Filters tab shown");
  }
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
                  (subcat) =>
                    `<div class="mb-2">
                      <div class="font-semibold text-blue-700 mb-1">${
                        subcat.name
                      }</div>
                      ${(subcat.steps || [])
                        .map(
                          (step, index) => `
                            <div class="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-blue-50 cursor-pointer transition">
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
          showStepDetailPage(templateId, stepIndex);
          e.stopPropagation();
        });
      });
  }, 0);
  // Show step detail page for editing
  function showStepDetailPage(templateId, stepIndex) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const step = template.steps[stepIndex];
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
    document.getElementById("stepVideoPreview").style.display = "none";
    window._stepUploadedImageUrl = null;
    // Store for save
    window._currentStepTemplateId = templateId;
    window._currentStepIndex = stepIndex;

    // Attach image upload event listeners every time the page is shown
    const stepImageInput = document.getElementById("stepImageInput");
    const stepImagePreview = document.getElementById("stepImagePreview");
    const stepUploadStatus = document.getElementById("stepUploadStatus");
    const stepImageUploadSection = document.getElementById(
      "stepImageUploadSection"
    );
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
      newSection.onclick = (e) => {
        if (e.target.tagName !== "INPUT") newInput.click();
      };
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
  }

  // Step video generation logic
}

function closeStepDetailPage() {
  document.getElementById("stepDetailPage").classList.add("hidden");
  // Show templates tab again
  document.getElementById("tab-templates").classList.remove("hidden");
  window._currentStepTemplateId = null;
  window._currentStepIndex = null;
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
  } catch (error) {
    console.error("Error loading endpoints:", error);
  }
}

// Add a step to the template modal, optionally pre-filling endpoint and prompt
function addTemplateStep(selectedEndpoint = "", promptValue = "") {
  const stepsContainer = document.getElementById("templateSteps");
  const stepIndex = stepsContainer.children.length;
  const stepHtml = `
          <div class="step-item" style="display: flex; flex-direction: column; gap: 10px; background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: flex-start; gap: 15px; width: 100%;">
              <div class="step-order">${stepIndex + 1}</div>
              <div class="step-content" style="flex:1;">
                <div class="form-group">
                  <label>Endpoint:</label>
                  <select class="step-endpoint-select">
                    <option value="">Select endpoint...</option>
                    ${availableEndpoints
                      .map(
                        (endpoint) =>
                          `<option value="${endpoint.endpoint}" ${
                            selectedEndpoint === endpoint.endpoint
                              ? "selected"
                              : ""
                          }>${endpoint.endpoint}</option>`
                      )
                      .join("")}
                  </select>
                </div>
                <!-- Prompt field removed: backend uses feature prompt from features.ts -->
              </div>
              <button class="remove-step" onclick="removeStep(this)">Remove</button>
            </div>
            <div class="step-actions" style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
              <div class="image-upload-section step-image-upload-section">
                <label class="upload-label">
                  <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                  <div class="upload-text">Click or drag an image here to upload</div>
                  <input type="file" class="step-image-input" accept="image/*" style="display:none;">
                </label>
                <img class="step-image-preview" style="display:none;max-width:200px;margin:10px auto 0;">
                <div class="step-upload-status upload-status"></div>
              </div>
              <button class="btn btn-primary step-generate-btn" style="flex:1; min-width:120px;">
                <i class="fas fa-magic"></i> Generate Video
              </button>
            </div>
            <div class="step-status-message" style="font-size:13px; min-height:18px; margin-top:5px;"></div>
            <div class="step-video-preview" style="margin-top:10px; display:none;"></div>
            <div class="step-generated-videos" style="margin-top:8px;"></div>
          </div>
        `;
  stepsContainer.insertAdjacentHTML("beforeend", stepHtml);
  // Add event listener to new step
  const newStep = stepsContainer.lastElementChild;
  const endpointSelect = newStep.querySelector(".step-endpoint-select");
  const generateBtn = newStep.querySelector(".step-generate-btn");
  const statusDiv = newStep.querySelector(".step-status-message");
  const videoPreviewDiv = newStep.querySelector(".step-video-preview");
  const generatedListDiv = newStep.querySelector(".step-generated-videos");
  // Setup image upload for this step
  const getUploadedImageUrl = setupStepImageUpload(newStep);
  // Load and render existing generated videos for current endpoint
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
  // Initial render if preselected
  refreshGeneratedForSelect();
  generateBtn.onclick = async function () {
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

      // Persist step video to DB if editing a template
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
        } catch (e) {
          // Optionally show a warning
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
  containerEl.innerHTML =
    '<div style="font-weight:600;margin:6px 0;">Generated videos</div><div class="text-sm text-gray-500">Loading...</div>';
  fetch(`/api/videos/${encodeURIComponent(endpoint)}`)
    .then((r) => r.json())
    .then((videos) => {
      if (!Array.isArray(videos) || videos.length === 0) {
        containerEl.innerHTML =
          '<div class="text-sm text-gray-500">No videos yet for this endpoint.</div>';
        return;
      }
      containerEl.innerHTML =
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;">' +
        videos
          .map(
            (v) =>
              `<div class="rounded border border-gray-200 p-1 bg-white cursor-pointer step-gen-video-item" data-url="${v.url}">
                 <video src="${v.url}" style="width:100%;border-radius:6px;" preload="metadata"></video>
               </div>`
          )
          .join("") +
        "</div>";
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
  if (!confirm("Are you sure you want to delete this template?")) return;
  // Find the delete button and show loading state
  const deleteBtn =
    document.querySelector(
      `.btn-danger[onclick="deleteTemplate(${templateId})"]`
    ) ||
    document.querySelector(
      `.btn-outline-danger[onclick="deleteTemplate(${templateId})"]`
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
      alert("Error deleting template: " + error.error);
    }
  } catch (error) {
    console.error("Error deleting template:", error);
    alert("Error deleting template");
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
  statusDiv.textContent = "Generating video...";
  statusDiv.style.color = "#666";
  try {
    // Use the correct backend endpoint for video generation
    const response = await fetch(`/api/generate-video/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    const result = await response.json();
    if (result.video && result.video.url) {
      statusDiv.textContent = "Video generated successfully!";
      statusDiv.style.color = "green";
      // Show the video in a dialog or preview
      showVideoDialog(result.video.url);
    } else {
      throw new Error(result.error || "Unknown error");
    }
  } catch (error) {
    statusDiv.textContent = `Error: ${error.message || error}`;
    statusDiv.style.color = "red";
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = '<i class="fas fa-magic"></i> Generate Video';
  }
}

// Update stats
function updateStats() {
  // Example logic, replace with real values as needed
  document.getElementById("totalFeatures").textContent = features.length;
  document.getElementById("activeFeatures").textContent = features.filter(
    (f) => f.active !== false
  ).length;
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
  videoPlayer.src = `https://res.cloudinary.com/do60wtwwc/video/upload/v1754319544/generated-videos/generated-videos/${feature.endpoint}.mp4`;
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
    const endpoints = Array.isArray(window.featureEndpointsFull)
      ? window.featureEndpointsFull
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
          closeFeatureCrudModal();
          await loadFeatures(); // Reload the features list
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
