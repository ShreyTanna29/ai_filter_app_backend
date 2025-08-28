// Ensure the add feature modal is hidden on page load
window.addEventListener("DOMContentLoaded", function () {
  var modal = document.getElementById("featureCrudModal");
  if (modal) modal.classList.add("hidden");

  // Tab switching logic
  const sidebarLinks = document.querySelectorAll("aside nav ul li a");
  const tabIds = [
    "tab-dashboard",
    "tab-filters",
    "tab-templates",
  ];
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
          <div class="text-gray-600 text-sm mt-1">${feature.prompt}</div>
        </div>
          `;
    })
    .join("");
  // Add click event to feature cards to show details page
  grid.querySelectorAll(".feature-card").forEach((card) => {
    card.onclick = () => {
      const endpoint = card.getAttribute("data-endpoint");
      showFeatureDetailPage(endpoint);
    };
  });
}

// Load features
async function loadFeatures() {
  try {
    const response = await fetch("/api/features");
    features = await response.json();
    displayFeatures();
    updateStats();
  } catch (error) {
    console.error("Error loading features:", error);
  }
}

// Show feature detail as a full page (hides all tab content, shows detail page)
function showFeatureDetailPage(endpoint) {
  const feature = features.find((f) => f.endpoint === endpoint);
  if (!feature) return;
  // Hide all tab content
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.add("hidden"));
  // Show detail page
  const page = document.getElementById("featureDetailPage");
  if (!page) return;
  page.classList.remove("hidden");
  // Fill content
  const titleEl = document.getElementById("featureDetailTitle");
  const promptEl = document.getElementById("featureDetailPrompt");
  titleEl.textContent = feature.endpoint;
  promptEl.textContent = feature.prompt;
  const videoUrl =
    featureGraphics[feature.endpoint] ||
    `https://res.cloudinary.com/do60wtwwc/video/upload/v1754319544/generated-videos/generated-videos/${feature.endpoint}.mp4#t=0.5`;
  document.getElementById("featureDetailVideo").src = videoUrl;

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

  // Drag & drop
  // Generated Videos Section
  const generatedVideosSectionId = "featureDetailGeneratedVideos";
  let generatedVideosSection = document.getElementById(
    generatedVideosSectionId
  );
  if (!generatedVideosSection) {
    generatedVideosSection = document.createElement("div");
    generatedVideosSection.id = generatedVideosSectionId;
    generatedVideosSection.className = "mb-6";
    // Insert after the main video
    const detailPage = document.getElementById("featureDetailPage");
    const mainVideo = document.getElementById("featureDetailVideo");
    if (detailPage && mainVideo && mainVideo.parentElement) {
      mainVideo.parentElement.insertBefore(
        generatedVideosSection,
        mainVideo.nextSibling
      );
    } else if (detailPage) {
      detailPage.appendChild(generatedVideosSection);
    }
  }
  generatedVideosSection.innerHTML = `<div class="font-semibold mb-2">Generated Videos</div><div id="featureDetailGeneratedVideosList">Loading...</div>`;
  // Fetch and render all generated videos for this feature
  fetch(`/api/videos/${endpoint}`)
    .then((res) => res.json())
    .then((videos) => {
      const listDiv = document.getElementById(
        "featureDetailGeneratedVideosList"
      );
      if (Array.isArray(videos) && videos.length > 0) {
        listDiv.innerHTML = videos
          .map(
            (v) => `
                    <div class="mb-4">
                      <video src="${
                        v.url
                      }" controls style="width:100%;max-width:400px;"></video>
                      <div class="text-xs text-gray-500 mt-1">${new Date(
                        v.createdAt
                      ).toLocaleString()}</div>
                      <button class="set-graphic-btn px-2 py-1 bg-blue-500 text-white rounded mt-2" data-url="${
                        v.url
                      }">Set as Graphic</button>
                    </div>
                  `
          )
          .join("");
      } else {
        listDiv.innerHTML =
          '<div class="text-gray-500">No videos generated yet.</div>';
      }

      listDiv.querySelectorAll(".set-graphic-btn").forEach((btn) => {
        btn.onclick = async function () {
          const videoUrl = btn.getAttribute("data-url");
          await fetch(`/api/feature-graphic/${encodeURIComponent(endpoint)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: videoUrl }),
          });
          // Update the main video preview
          document.getElementById("featureDetailVideo").src = videoUrl;
          // Optionally update featureGraphics and reload features for card update
          featureGraphics[endpoint] = videoUrl;
          await loadFeatures();
        };
      });
    });
  // Add event listeners for set-graphic buttons

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
        if (genStatus) genStatus.textContent = "Please upload an image first.";
        return;
      }
      genBtn.disabled = true;
      if (genStatus) genStatus.textContent = "Generating video...";
      try {
        // Call backend to generate video (Alibaba model)
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
          // Update video preview
          document.getElementById("featureDetailVideo").src = data.video.url;
          if (genStatus) genStatus.textContent = "Video generated!";
          // Optionally reload features to update video in grid
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

  // Inline edit for feature name
  document.getElementById("editFeatureNameBtn").onclick = function () {
    // Replace title with input and save/cancel buttons
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
    parent.insertBefore(saveBtn, parent.querySelector("#editFeatureNameBtn"));
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
      // Call backend to update name
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

  // Inline edit for prompt
  document.getElementById("editFeaturePromptBtn").onclick = function () {
    // Replace prompt with textarea and save/cancel buttons
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
    document.getElementById("editFeaturePromptBtn").style.display = "none";
    textarea.focus();
    saveBtn.onclick = async function (e) {
      e.preventDefault();
      const newPrompt = textarea.value.trim();
      if (!newPrompt || newPrompt === feature.prompt) {
        cancelBtn.onclick();
        return;
      }
      // Call backend to update prompt
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
        document.getElementById("editFeaturePromptBtn").style.display =
          "inline-block";
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
      document.getElementById("editFeaturePromptBtn").style.display =
        "inline-block";
      saveBtn.remove();
      cancelBtn.remove();
    };
  };

  // Delete button
  document.getElementById("featureDetailDeleteBtn").onclick =
    async function () {
      if (confirm("Delete this feature?")) {
        await fetch(`/api/features/${encodeURIComponent(feature.endpoint)}`, {
          method: "DELETE",
        });
        page.classList.add("hidden");
        loadFeatures();
        // Show filters tab again
        document.getElementById("tab-filters").classList.remove("hidden");
      }
    };
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
    featureGraphics = {};
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });

    // Remove active class from all tab buttons
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.remove("active");
    });

    // Show selected tab content
    document.getElementById(tabName + "-tab").classList.add("active");

    // Add active class to clicked button
    event.target.classList.add("active");
  }
}

// Close feature detail page and show filters tab
function closeFeatureDetailPage() {
  const page = document.getElementById("featureDetailPage");
  if (page) page.classList.add("hidden");
  // Show filters tab again
  document.getElementById("tab-filters").classList.remove("hidden");
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
    .map(
      (template) => `
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
              <i class="fas fa-list-ol"></i> ${template.steps.length} ${
        template.steps.length === 1 ? "step" : "steps"
      }
            </div>
            <div class="space-y-2">
              ${template.steps
                .map(
                  (step, index) => `
                    <div class="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-blue-50 cursor-pointer transition" data-template-id="${
                      template.id
                    }" data-step-index="${index}">
                      <div class="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">${
                        index + 1
                      }</div>
                      <div class="flex-1">
                        <div class="font-medium text-gray-800">${
                          step.endpoint
                        }</div>
                        <div class="text-xs text-gray-500 truncate" title="${
                          step.prompt || ""
                        }">${step.prompt || "(uses default prompt)"}</div>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      `
    )
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
  if (!endpoint) {
    document.getElementById("stepDetailStatus").textContent =
      "Endpoint is required.";
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
  document.getElementById("templateSteps").innerHTML = "";
  loadAvailableEndpoints();
  // Change modal title
  document.querySelector("#createTemplateModal h2").textContent =
    "Create New Template";
  // Change save button text
  document.querySelector("#createTemplateModal .btn-primary").textContent =
    "Save Template";
}

// Open modal for editing an existing template
async function editTemplate(templateId) {
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;
  editingTemplateId = templateId;
  document.getElementById("createTemplateModal").style.display = "block";
  document.getElementById("templateName").value = template.name;
  document.getElementById("templateDescription").value =
    template.description || "";
  document.getElementById("templateSteps").innerHTML = "";
  await loadAvailableEndpoints();
  // Fetch persisted step videos
  let stepVideos = [];
  try {
    const res = await fetch(`/api/templates/${templateId}/step-videos`);
    if (res.ok) stepVideos = await res.json();
  } catch {}
  template.steps.forEach((step, idx) => {
    addTemplateStep(step.endpoint, step.prompt);
    // After adding, show video if exists
    const videoObj = stepVideos.find((v) => v.stepIndex === idx);
    if (videoObj && videoObj.videoUrl) {
      const stepsContainer = document.getElementById("templateSteps");
      const stepItem = stepsContainer.children[idx];
      if (stepItem) {
        const videoPreviewDiv = stepItem.querySelector(".step-video-preview");
        if (videoPreviewDiv) {
          videoPreviewDiv.style.display = "block";
          videoPreviewDiv.innerHTML = `<video src="${videoObj.videoUrl}" controls style="width:100%;max-width:400px;"></video>`;
        }
      }
    }
  });
  // Change modal title
  document.querySelector("#createTemplateModal h2").textContent =
    "Edit Template";
  // Change save button text
  document.querySelector("#createTemplateModal .btn-primary").textContent =
    "Update Template";
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
                <div class="form-group">
                  <label>Custom Prompt (optional):</label>
                  <textarea class="step-prompt-input" placeholder="Leave empty to use default prompt">${
                    promptValue || ""
                  }</textarea>
                </div>
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
          </div>
        `;
  stepsContainer.insertAdjacentHTML("beforeend", stepHtml);
  // Add event listener for generate button
  const newStep = stepsContainer.lastElementChild;
  const generateBtn = newStep.querySelector(".step-generate-btn");
  const imageUrlInput = newStep.querySelector(".step-image-url");
  const endpointSelect = newStep.querySelector(".step-endpoint-select");
  const promptInput = newStep.querySelector(".step-prompt-input");
  const statusDiv = newStep.querySelector(".step-status-message");
  const videoPreviewDiv = newStep.querySelector(".step-video-preview");
  // Setup image upload for this step
  const getUploadedImageUrl = setupStepImageUpload(newStep);
  generateBtn.onclick = async function () {
    const endpoint = endpointSelect.value;
    const prompt = promptInput.value;
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

// Save or update template
async function saveTemplate() {
  const name = document.getElementById("templateName").value;
  const description = document.getElementById("templateDescription").value;
  if (!name) {
    alert("Template name is required");
    return;
  }
  const steps = [];
  const stepItems = document.querySelectorAll(".step-item");
  stepItems.forEach((item, index) => {
    const endpointSelect = item.querySelector(".step-endpoint-select");
    const promptInput = item.querySelector(".step-prompt-input");
    if (!endpointSelect || !promptInput) {
      // Skip this step if fields are missing
      return;
    }
    const endpoint = endpointSelect.value;
    const prompt = promptInput.value;
    if (endpoint) {
      steps.push({ endpoint, prompt });
    }
  });
  if (steps.length === 0) {
    alert("At least one step is required");
    return;
  }
  const saveBtn = document.querySelector("#createTemplateModal .btn-primary");
  saveBtn.disabled = true;
  const originalText = saveBtn.textContent;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  try {
    let response;
    if (editingTemplateId) {
      // Update existing template
      response = await fetch(`/api/templates/${editingTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps }),
      });
    } else {
      // Create new template
      response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps }),
      });
    }
    if (response.ok) {
      closeCreateTemplateModal();
      loadTemplates();
    } else {
      const error = await response.json();
      alert(
        (editingTemplateId
          ? "Error updating template: "
          : "Error creating template: ") + error.error
      );
    }
  } catch (error) {
    console.error("Error saving template:", error);
    alert("Error saving template");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// Template actions
async function executeTemplate(templateId) {
  const imageUrl = prompt("Enter image URL:");
  if (!imageUrl) return;

  try {
    const response = await fetch(`/api/templates/${templateId}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      alert(
        "Template executed successfully! Final video: " + result.final_video.url
      );
    } else {
      const error = await response.json();
      alert("Error executing template: " + error.error);
    }
  } catch (error) {
    console.error("Error executing template:", error);
    alert("Error executing template");
  }
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
const renameBtn = document.getElementById("featureModalRename");
if (renameBtn) {
  renameBtn.onclick = async function () {
    const input = document.getElementById("featureModalEndpointName");
    const newEndpoint = input ? input.value.trim() : "";
    if (!newEndpoint || newEndpoint === endpoint) return;
    // Call backend to rename
    const btn = renameBtn;
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    try {
      const res = await fetch(
        `/api/features/${encodeURIComponent(endpoint)}/rename`,
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
      // Update in-memory features and templates
      const idx = features.findIndex((f) => f.endpoint === endpoint);
      if (idx >= 0) features[idx].endpoint = newEndpoint;
      templates = templates.map((t) => ({
        ...t,
        steps: t.steps.map((s) => ({
          endpoint: s.endpoint === endpoint ? newEndpoint : s.endpoint,
          prompt: s.prompt || "",
        })),
      }));
      // Update modal title and video src
      document.getElementById("featureModalTitle").textContent = newEndpoint;
      const vid = document.getElementById("featureModalVideo");
      vid.src = `https://res.cloudinary.com/do60wtwwc/video/upload/v1754319544/generated-videos/generated-videos/${newEndpoint}.mp4`;
      currentOpenEndpoint = newEndpoint;
      displayFeatures();
      displayTemplates();
      alert("Endpoint renamed");
    } catch (e) {
      alert("Error renaming endpoint");
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  };
}
document.getElementById("featureCrudModalTitle").textContent = document
  .getElementById("featureCrudForm")
  .reset();
document.getElementById("featureCrudModal").classList.remove("hidden");

function openFeatureCrudModal(mode, endpoint = null) {
  featureCrudMode = mode;
  editingFeatureEndpoint = endpoint;
  document.getElementById("featureCrudModalTitle").textContent =
    mode === "edit" ? "Edit Feature" : "Create Feature";
  document.getElementById("featureCrudForm").reset();
  if (mode === "edit" && endpoint) {
    const feature = features.find((f) => f.endpoint === endpoint);
    if (feature) {
      document.getElementById("featureCrudEndpoint").value = feature.endpoint;
      document.getElementById("featureCrudPrompt").value = feature.prompt;
      document.getElementById("featureCrudEndpoint").disabled = true;
    }
  } else {
    document.getElementById("featureCrudEndpoint").disabled = false;
  }
  document.getElementById("featureCrudModal").classList.remove("hidden");
}

function closeFeatureCrudModal() {
  document.getElementById("featureCrudModal").classList.add("hidden");
  editingFeatureEndpoint = null;
}
document.getElementById("addFeatureBtn").onclick = () =>
  openFeatureCrudModal("create");
document.getElementById("featureCrudForm").onsubmit = async function (e) {
  e.preventDefault();
  const endpoint = document.getElementById("featureCrudEndpoint").value.trim();
  const prompt = document.getElementById("featureCrudPrompt").value.trim();
  if (!endpoint || !prompt) return;
  if (featureCrudMode === "edit" && editingFeatureEndpoint) {
    // Update feature
    await fetch(`/api/features/${encodeURIComponent(editingFeatureEndpoint)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  } else {
    // Create feature
    await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, prompt }),
    });
  }
  closeFeatureCrudModal();
  loadFeatures();
};

function handleEndpointImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("image", file);
  document.getElementById("endpointUploadStatus").textContent = "Uploading...";
  fetch("/api/cloudinary/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        endpointUploadedImageUrl = result.url;
        document.getElementById("endpointImagePreview").src = result.url;
        document.getElementById("endpointImagePreview").style.display = "block";
        document.getElementById("endpointUploadStatus").textContent =
          "Image uploaded!";
      } else {
        document.getElementById("endpointUploadStatus").textContent =
          "Upload failed.";
      }
    })
    .catch(() => {
      document.getElementById("endpointUploadStatus").textContent =
        "Upload failed.";
    });
}

// --- End of Endpoint Modal Image Upload & Video Generation Logic ---

// Step detail modal state
let currentStepTemplateId = null;
let currentStepIndex = null;

async function openStepDetailModal(templateId, stepIndex) {
  currentStepTemplateId = templateId;
  currentStepIndex = stepIndex;

  // Ensure available endpoints are loaded
  if (!Array.isArray(availableEndpoints) || availableEndpoints.length === 0) {
    try {
      await loadAvailableEndpoints();
    } catch {}
  }

  const template = templates.find((t) => t.id === templateId);
  if (!template) return;
  const step = template.steps[stepIndex];
  if (!step) return;

  // Populate endpoint select
  const select = document.getElementById("stepEndpointSelect");
  if (select) {
    select.innerHTML =
      `<option value="">Select endpoint...</option>` +
      availableEndpoints
        .map((e) => `<option value="${e.endpoint}">${e.endpoint}</option>`)
        .join("");
    select.value = step.endpoint || "";
  }

  // Populate prompt textarea
  const ta = document.getElementById("stepPromptTextarea");
  if (ta) ta.value = step.prompt || "";

  // Clear status
  const status = document.getElementById("stepDetailStatus");
  if (status) status.textContent = "";

  // Show modal
  const modal = document.getElementById("stepDetailModal");
  if (modal) modal.style.display = "block";
}

function closeStepDetailModal() {
  const modal = document.getElementById("stepDetailModal");
  if (modal) modal.style.display = "none";
  currentStepTemplateId = null;
  currentStepIndex = null;
}

// Step detail modal image upload/generate
let stepDetailUploadedImageUrl = null;

function handleStepDetailImageUpload(event) {
  const file = event.target.files && event.target.files[0];
  const status = document.getElementById("stepDetailUploadStatus");
  const preview = document.getElementById("stepDetailImagePreview");
  if (!file) return;
  const formData = new FormData();
  formData.append("image", file);
  if (status) status.textContent = "Uploading...";
  fetch("/api/cloudinary/upload", { method: "POST", body: formData })
    .then((res) => res.json())
    .then((result) => {
      if (result && result.success && result.url) {
        stepDetailUploadedImageUrl = result.url;
        if (preview) {
          preview.src = result.url;
          preview.style.display = "block";
        }
        if (status) status.textContent = "Image uploaded!";
      } else {
        if (status) status.textContent = "Upload failed.";
      }
    })
    .catch(() => {
      if (status) status.textContent = "Upload failed.";
    });
}

async function generateStepDetailVideo() {
  const endpointSelect = document.getElementById("stepEndpointSelect");
  const promptTextarea = document.getElementById("stepPromptTextarea");
  const status = document.getElementById("stepDetailStatus");
  const videoPreviewDiv = document.getElementById("stepDetailVideoPreview");
  const generateBtn = document.getElementById("stepDetailGenerateBtn");
  const endpoint = endpointSelect ? endpointSelect.value : "";
  const prompt = promptTextarea ? promptTextarea.value : "";
  if (!endpoint) {
    if (status) {
      status.textContent = "Please select an endpoint.";
      status.className = "status-message status-error";
    }
    return;
  }
  if (!stepDetailUploadedImageUrl) {
    if (status) {
      status.textContent = "Please upload an image first.";
      status.className = "status-message status-error";
    }
    return;
  }
  if (status) {
    status.textContent = "Generating video...";
    status.className = "status-message status-info";
  }
  if (generateBtn) generateBtn.disabled = true;
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: stepDetailUploadedImageUrl,
        prompt,
      }),
    });
    const data = await response.json();
    if (response.ok && data && data.video && data.video.url) {
      if (videoPreviewDiv) {
        videoPreviewDiv.style.display = "block";
        videoPreviewDiv.innerHTML = `<video src="${data.video.url}" controls style="width:100%;max-width:400px;"></video>`;
      }
      if (status) {
        status.textContent = "Video generated!";
        status.className = "status-message status-success";
      }
    } else {
      throw new Error((data && data.error) || "Failed to generate video");
    }
  } catch (e) {
    if (status) {
      status.textContent = `Error: ${e.message || e}`;
      status.className = "status-message status-error";
    }
    if (videoPreviewDiv) {
      videoPreviewDiv.style.display = "none";
      videoPreviewDiv.innerHTML = "";
    }
  } finally {
    if (generateBtn) generateBtn.disabled = false;
  }
}

async function saveStepDetail() {
  if (currentStepTemplateId == null || currentStepIndex == null) return;
  const template = templates.find((t) => t.id === currentStepTemplateId);
  if (!template) return;

  const endpoint = document.getElementById("stepEndpointSelect")?.value || "";
  const prompt = document.getElementById("stepPromptTextarea")?.value || "";
  const status = document.getElementById("stepDetailStatus");

  if (!endpoint) {
    if (status) {
      status.textContent = "Please select an endpoint.";
      status.className = "status-message status-error";
    }
    return;
  }

  const updatedSteps = template.steps.map((s, idx) =>
    idx === currentStepIndex
      ? { endpoint, prompt }
      : { endpoint: s.endpoint, prompt: s.prompt || "" }
  );

  // Disable save button during request
  const btns = document.querySelectorAll("#stepDetailModal .btn.btn-primary");
  btns.forEach(function (b) {
    if (b instanceof HTMLButtonElement) b.disabled = true;
  });
  if (status) {
    status.textContent = "Saving...";
    status.className = "status-message status-info";
  }

  try {
    const res = await fetch(`/api/templates/${currentStepTemplateId}`, {
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
      throw new Error(err.error || "Failed to save step");
    }
    // Refresh templates list
    await loadTemplates();
    if (status) {
      status.textContent = "Saved!";
      status.className = "status-message status-success";
    }
    setTimeout(() => closeStepDetailModal(), 600);
  } catch (e) {
    if (status) {
      status.textContent = `Error: ${e.message || e}`;
      status.className = "status-message status-error";
    }
  } finally {
    btns.forEach(function (b) {
      if (b instanceof HTMLButtonElement) b.disabled = false;
    });
  }
}

// Initialize
async function loadFeaturesAndGraphics() {
  await loadFeatureGraphics();
  await loadFeatures();
  loadTemplates();
}
loadFeaturesAndGraphics();

// --- Replace image URL input in endpoint modal with beautified upload ---
// Remove the <input type="text" id="featureModalImageUrl" ...> and its parent .input-group
// Replace with:
var featureModalImageInput = document.getElementById("featureModalImageUrl");
if (featureModalImageInput && featureModalImageInput.parentElement) {
  featureModalImageInput.parentElement.remove();
}
const imageUploadSection = document.createElement("div");
imageUploadSection.className = "image-upload-section";
imageUploadSection.id = "endpointImageUploadSection";
imageUploadSection.innerHTML = `
        <label for="endpointImageInput" class="upload-label">
          <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
          <div class="upload-text">Click or drag an image here to upload</div>
          <input type="file" id="endpointImageInput" accept="image/*" style="display:none;" onchange="handleEndpointImageUpload(event)">
        </label>
        <img id="endpointImagePreview" style="display:none;max-width:200px;margin:10px auto 0;">
        <div id="endpointUploadStatus" class="upload-status"></div>
      `;
var generationSection = document.querySelector(".generation-section");
var featureModalGenerate = document.getElementById("featureModalGenerate");
if (generationSection && featureModalGenerate) {
  generationSection.insertBefore(imageUploadSection, featureModalGenerate);
}

// --- Replace image URL input in template step card with beautified upload ---
// Remove the <input type="text" class="step-image-url form-control" ...> in .step-actions
// Replace with:
const stepImageUploadHtml = `
        <div class="image-upload-section step-image-upload-section">
          <label class="upload-label">
            <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
            <div class="upload-text">Click or drag an image here to upload</div>
            <input type="file" class="step-image-input" accept="image/*" style="display:none;">
          </label>
          <img class="step-image-preview" style="display:none;max-width:200px;margin:10px auto 0;">
          <div class="step-upload-status upload-status"></div>
        </div>
      `;
document.querySelectorAll(".step-actions").forEach((actionsDiv) => {
  actionsDiv.insertAdjacentHTML("afterbegin", stepImageUploadHtml);
});

// --- JS for template step image upload ---
function setupStepImageUpload(stepDiv) {
  const section = stepDiv.querySelector(".step-image-upload-section");
  const input = stepDiv.querySelector(".step-image-input");
  const preview = stepDiv.querySelector(".step-image-preview");
  const status = stepDiv.querySelector(".step-upload-status");
  let uploadedUrl = null;
  if (!section || !input) return;
  section.addEventListener("click", () => input.click());
  section.addEventListener("dragover", (e) => {
    e.preventDefault();
    section.classList.add("dragover");
  });
  section.addEventListener("dragleave", () =>
    section.classList.remove("dragover")
  );
  section.addEventListener("drop", (e) => {
    e.preventDefault();
    section.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      input.files = files;
      handleStepImageUpload({ target: input }, preview, status, (url) => {
        uploadedUrl = url;
      });
    }
  });
  input.addEventListener("change", (e) =>
    handleStepImageUpload(e, preview, status, (url) => {
      uploadedUrl = url;
    })
  );
  return () => uploadedUrl;
}
function handleStepImageUpload(event, preview, status, setUrl) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("image", file);
  status.textContent = "Uploading...";
  fetch("/api/cloudinary/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        preview.src = result.url;
        preview.style.display = "block";
        status.textContent = "Image uploaded!";
        setUrl(result.url);
      } else {
        status.textContent = "Upload failed.";
      }
    })
    .catch(() => {
      status.textContent = "Upload failed.";
    });
}
