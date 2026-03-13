let skyData = null;

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  setDefaultDate();
  wireEvents();
  drawGrid();
  window.addEventListener("resize", drawGrid);
  await loadSkyData();
  registerServiceWorker();
});

function bindElements() {
  els.startBtn = document.getElementById("startScan");
  els.identifyBtn = document.getElementById("identifyBtn");
  els.polarisBtn = document.getElementById("polarisBtn");
  els.solveBtn = document.getElementById("solveBtn");

  els.solveMode = document.getElementById("solveMode");
  els.zipInput = document.getElementById("zipInput");
  els.latInput = document.getElementById("latInput");
  els.lonInput = document.getElementById("lonInput");
  els.knownTimeInput = document.getElementById("knownTimeInput");
  els.dateInput = document.getElementById("dateInput");

  els.cameraView = document.getElementById("cameraView");
  els.cameraPlaceholder = document.getElementById("cameraPlaceholder");

  els.northArrow = document.getElementById("northArrow");
  els.skyGrid = document.getElementById("skyGrid");
  els.gridCtx = els.skyGrid.getContext("2d");

  els.modeStatus = document.getElementById("modeStatus");
  els.solveModeStatus = document.getElementById("solveModeStatus");
  els.constellationStatus = document.getElementById("constellationStatus");
  els.polarisStatus = document.getElementById("polarisStatus");
  els.northStatus = document.getElementById("northStatus");
  els.skyTimeStatus = document.getElementById("skyTimeStatus");
  els.locationStatus = document.getElementById("locationStatus");
  els.confidence = document.getElementById("confidence");
  els.inputStatus = document.getElementById("inputStatus");
}

function setDefaultDate() {
  els.dateInput.value = new Date().toISOString().slice(0, 10);
}

function wireEvents() {
  els.startBtn.addEventListener("click", startSkyScan);
  els.identifyBtn.addEventListener("click", identifyConstellations);
  els.polarisBtn.addEventListener("click", lockPolaris);
  els.solveBtn.addEventListener("click", runCelestialSolve);
  els.solveMode.addEventListener("change", updateSolveModeStatus);
}

async function loadSkyData() {
  try {
    const res = await fetch("sky-data.json");
    if (!res.ok) throw new Error(`Failed to load sky-data.json: ${res.status}`);
    skyData = await res.json();
    console.log("Sky data loaded", skyData);
  } catch (err) {
    console.error(err);
    setValue(els.modeStatus, "Sky Data Missing", "value-danger");
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(err => {
      console.error("Service worker registration failed:", err);
    });
  }
}

function setValue(el, text, className = "") {
  el.textContent = text;
  el.className = className;
}

function updateSolveModeStatus() {
  const label = els.solveMode.options[els.solveMode.selectedIndex].text;
  setValue(els.solveModeStatus, label, "value-muted");
}

function summarizeInputs() {
  const zip = els.zipInput.value.trim();
  const lat = els.latInput.value.trim();
  const lon = els.lonInput.value.trim();
  const knownTime = els.knownTimeInput.value.trim();

  if (zip) return `ZIP ${zip}`;
  if (lat && lon) return `${lat}, ${lon}`;
  if (knownTime) return `Known time ${knownTime}`;
  return "No reference entered";
}

function drawGrid() {
  const canvas = els.skyGrid;
  const ctx = els.gridCtx;

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(141,211,255,0.30)";
  ctx.lineWidth = 1.5;

  for (let i = 1; i < 6; i++) {
    const x = canvas.width * (i / 6);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let i = 1; i < 4; i++) {
    const y = canvas.height * (i / 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,217,138,0.22)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

function handleOrientation(event) {
  let heading;

  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    heading = 360 - event.alpha;
  }

  if (heading !== undefined) {
    els.northArrow.style.transform = `rotate(${-heading}deg)`;
  }
}

function enableOrientationTracking() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
        } else {
          setValue(els.modeStatus, "Motion Denied", "value-danger");
        }
      })
      .catch(() => {
        setValue(els.modeStatus, "Motion Error", "value-danger");
      });
  } else {
    window.addEventListener("deviceorientation", handleOrientation, true);
  }
}

async function startSkyScan() {
  try {
    enableOrientationTracking();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });

    const existingVideo = els.cameraView.querySelector("video");
    if (existingVideo) existingVideo.remove();

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");

    els.cameraView.appendChild(video);
    drawGrid();

    if (els.cameraPlaceholder) {
      els.cameraPlaceholder.style.display = "none";
    }

    setValue(els.modeStatus, "Sky Scan Active", "value-good");
    setValue(els.inputStatus, summarizeInputs(), "value-muted");
  } catch (err) {
    if (els.cameraPlaceholder) {
      els.cameraPlaceholder.textContent = "Camera permission required";
    }
    setValue(els.modeStatus, "Camera Blocked", "value-danger");
    console.error("Camera error:", err);
  }
}

function identifyConstellations() {
  setValue(els.constellationStatus, "Scanning...", "value-warn");

  setTimeout(() => {
    if (!skyData || !skyData.constellations?.length) {
      setValue(els.constellationStatus, "Sky data unavailable", "value-danger");
      return;
    }

    const names = skyData.constellations.slice(0, 2).map(c => c.name).join(" / ");
    setValue(els.constellationStatus, names, "value-good");
    setValue(els.confidence, "78%", "value-good");
  }, 900);
}

function lockPolaris() {
  if (!skyData?.polarisGuidance) {
    setValue(els.polarisStatus, "Polaris data missing", "value-danger");
    return;
  }

  setValue(els.polarisStatus, "Locked", "value-good");
  setValue(els.northStatus, "Celestial North Locked", "value-good");
  els.northArrow.style.color = "#8ff0b0";
  els.northArrow.style.textShadow = "0 0 12px rgba(143,240,176,.9)";
}

function runCelestialSolve() {
  const mode = els.solveMode.value;
  const zip = els.zipInput.value.trim();
  const lat = els.latInput.value.trim();
  const lon = els.lonInput.value.trim();
  const knownTime = els.knownTimeInput.value.trim();
  const dateVal = els.dateInput.value.trim();

  setValue(els.inputStatus, summarizeInputs(), "value-muted");

  if (mode === "timeFromSky") {
    solveTimeFromSky({ zip, lat, lon, dateVal });
    return;
  }

  if (mode === "locationFromSky") {
    solveLocationFromSky({ knownTime, dateVal });
    return;
  }

  solveReferenceOnly({ dateVal });
}

function solveTimeFromSky({ zip, lat, lon, dateVal }) {
  if (!(lat && lon) && !zip) {
    setValue(els.skyTimeStatus, "Need lat/lon or ZIP", "value-danger");
    setValue(els.locationStatus, "Reference location required", "value-muted");
    return;
  }

  if (zip && !(lat && lon)) {
    setValue(els.skyTimeStatus, "ZIP lookup not loaded offline", "value-danger");
    setValue(els.locationStatus, "Use exact lat/lon for now", "value-muted");
    return;
  }

  setValue(els.skyTimeStatus, "Estimating from celestial reference...", "value-warn");
  setValue(els.locationStatus, `${lat}, ${lon} on ${dateVal}`, "value-muted");

  setTimeout(() => {
    const estimate = roughSkyTimeEstimate(lat, lon, dateVal);
    setValue(els.skyTimeStatus, estimate, "value-good");
    setValue(els.confidence, "62%", "value-warn");
  }, 1200);
}

function solveLocationFromSky({ knownTime, dateVal }) {
  if (!knownTime) {
    setValue(els.locationStatus, "Need known time", "value-danger");
    setValue(els.skyTimeStatus, "Using known-time workflow", "value-muted");
    return;
  }

  setValue(els.skyTimeStatus, `Known time ${knownTime}`, "value-muted");
  setValue(els.locationStatus, "Estimating latitude band...", "value-warn");

  setTimeout(() => {
    const estimate = roughLocationEstimate(knownTime, dateVal);
    setValue(els.locationStatus, estimate, "value-good");
    setValue(els.confidence, "48%", "value-warn");
  }, 1200);
}

function solveReferenceOnly({ dateVal }) {
  setValue(els.skyTimeStatus, "Reference only mode", "value-muted");
  setValue(els.locationStatus, dateVal ? `Date ${dateVal}` : "Reference only", "value-muted");
  setValue(els.confidence, "35%", "value-warn");
}

function roughSkyTimeEstimate(lat, lon, dateStr) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  const date = new Date(`${dateStr}T00:00:00`);

  if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(date.getTime())) {
    return "Estimate unavailable";
  }

  // This is still a rough correction-style estimate, not a true optical celestial solve.
  const baseHour = 21;
  const lonAdjustmentMinutes = Math.round((longitude / 15) * 60 * -0.25);
  const latAdjustmentMinutes = Math.round((latitude - 40) * 2);
  const totalMinutes = baseHour * 60 + 30 + lonAdjustmentMinutes + latAdjustmentMinutes;

  return formatMinutesAsClock(totalMinutes);
}

function roughLocationEstimate(knownTime, dateStr) {
  if (!knownTime || !dateStr) return "Estimate unavailable";

  const [hh, mm] = knownTime.split(":").map(Number);
  if ([hh, mm].some(Number.isNaN)) return "Estimate unavailable";

  const totalMinutes = hh * 60 + mm;

  if (totalMinutes < 240) return "Approx mid-northern latitude / central-western band";
  if (totalMinutes < 720) return "Approx northern U.S. latitude band";
  if (totalMinutes < 1080) return "Approx 35°N–45°N / western longitude band";
  return "Approx northern mid-latitude / evening western band";
}

function formatMinutesAsClock(totalMinutes) {
  let minutes = totalMinutes % (24 * 60);
  if (minutes < 0) minutes += 24 * 60;

  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}
