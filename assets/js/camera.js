/* ============================================================
   Camera capture.

   A real camera, not a file picker that pretends to be one. The avatar picker
   and the tutor's paper upload both open a live viewfinder, take the frame the
   person lines up, and hand back a JPEG data URL.

   Three honest outcomes, and the caller decides what to do about each:

     pfCameraSupported()          false → the caller opens the file input instead
     pfOpenCamera(...) → false    supported, but permission was refused or there
                                  is no camera on this device — same fallback,
                                  with a toast that says what happened
     onShot(photo)                a still frame, already squared or resized

   The stream is always stopped again — on capture, on cancel, on Escape, on a
   click outside the sheet — because a camera light that stays on is a privacy
   bug, not a cosmetic one.
   ============================================================ */

let _pfStream = null;

function pfCameraSupported() {
  return !!(typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function pfStopCamera() {
  if (_pfStream) {
    try {
      _pfStream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    _pfStream = null;
  }
  const v = document.getElementById("pfCamVideo");
  if (v) {
    try {
      v.srcObject = null;
    } catch (e) {}
  }
}

/* Resize a data URL and hand back a JPEG. `square` crops from the centre — the
   avatar wants a circle, a photographed document does not. */
function pfShrinkImage(dataUrl, maxSide, quality, square, done) {
  const img = new Image();
  img.onload = () => {
    try {
      const side = square ? Math.min(img.width, img.height) : 1;
      const sx = square ? (img.width - side) / 2 : 0;
      const sy = square ? (img.height - side) / 2 : 0;
      const sw = square ? side : img.width;
      const sh = square ? side : img.height;
      const scale = Math.min(1, maxSide / Math.max(sw, sh));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(sw * scale));
      c.height = Math.max(1, Math.round(sh * scale));
      c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      done(c.toDataURL("image/jpeg", quality || 0.82));
    } catch (e) {
      done(dataUrl);
    }
  };
  img.onerror = () => done(dataUrl);
  img.src = dataUrl;
}

/* Open the viewfinder.
     { facing: "user" | "environment", title, hint, square: true }
   Returns a promise of true when the sheet is up, false when the caller should
   fall back to the file input. */
async function pfOpenCamera(opts) {
  const o = Object.assign({ facing: "user", title: "Take a photo", hint: "", square: true }, opts || {});
  if (!pfCameraSupported()) return false;

  openModal(`
    <div class="step-head">
      <div><h3 style="font-size:18px">${esc(o.title)}</h3>
        ${o.hint ? `<p class="tiny muted">${esc(o.hint)}</p>` : ""}</div>
      <button class="modal-x" id="pfCamClose" aria-label="Close camera">${ic("i-x")}</button>
    </div>
    <div class="cam-wrap">
      <video id="pfCamVideo" class="cam-video" autoplay playsinline muted aria-label="Camera preview"></video>
      <div class="cam-frame" aria-hidden="true"></div>
      <p class="cam-msg" id="pfCamMsg" hidden></p>
    </div>
    <div class="cam-acts">
      <button class="btn btn-line btn-sm" id="pfCamFlip">${ic("i-refresh", "sm")} Flip</button>
      <button class="btn btn-lime" id="pfCamShot" disabled>${ic("i-camera", "sm")} Capture</button>
      <button class="btn btn-ghost btn-sm" id="pfCamCancel">Cancel</button>
    </div>
    <p class="tiny muted" style="margin-top:10px">${ic("i-shield", "sm")} The picture is taken on this device. Nothing is uploaded until you save it.</p>`);

  const video = $("#pfCamVideo");
  const shot = $("#pfCamShot");
  const msg = $("#pfCamMsg");
  const fail = (text) => {
    pfStopCamera();
    closeModal();
    toast(text, "i-camera", true);
  };

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: o.facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false
    });
  } catch (e) {
    const why = e && e.name === "NotAllowedError" ? "Camera permission was refused" : "No camera answered";
    fail(why + " — choose a file instead");
    return false;
  }
  _pfStream = stream;
  video.srcObject = stream;
  await video.play().catch(() => {});
  shot.disabled = false;

  $("#pfCamClose").addEventListener("click", () => {
    pfStopCamera();
    closeModal();
  });
  $("#pfCamCancel").addEventListener("click", () => {
    pfStopCamera();
    closeModal();
  });
  $("#pfCamFlip").addEventListener("click", async () => {
    o.facing = o.facing === "user" ? "environment" : "user";
    pfStopCamera();
    try {
      _pfStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: o.facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      video.srcObject = _pfStream;
      await video.play().catch(() => {});
    } catch (e) {
      if (msg) {
        msg.hidden = false;
        msg.textContent = "This device has only one camera.";
      }
    }
  });
  shot.addEventListener("click", () => {
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    /* the front camera behaves like a mirror: un-mirror it before saving, or
       every photograph of writing comes out backwards */
    if (o.facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    const raw = c.toDataURL("image/jpeg", 0.9);
    pfStopCamera();
    closeModal();
    const finish = (url) => {
      if (typeof o.onShot === "function") o.onShot(url);
    };
    if (o.square) pfShrinkImage(raw, o.maxSide || 320, 0.85, true, finish);
    else pfShrinkImage(raw, o.maxSide || 1200, 0.8, false, finish);
  });
  return true;
}
