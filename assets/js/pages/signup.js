/* /signup.html - account creation with role, county and DPA consent. */
let suRole = new URLSearchParams(location.search).get("role") || "student";
if ($("#suCounty"))
  $("#suCounty").innerHTML = COUNTIES.map((c) => `<option${c === "Nairobi" ? " selected" : ""}>${c}</option>`).join("");
$$("#suRoles .role-card").forEach((b) => {
  b.classList.toggle("sel", b.dataset.role === suRole);
  b.addEventListener("click", () => {
    suRole = b.dataset.role;
    $$("#suRoles .role-card").forEach((x) => x.classList.toggle("sel", x === b));
  });
});
$("#suBtn").addEventListener("click", async () => {
  const err = $("#suErr");
  err.style.display = "none";
  const name = $("#suName").value.trim(),
    email = $("#suEmail").value.trim(),
    pw = $("#suPw").value,
    county = $("#suCounty").value;
  if (!name) {
    err.textContent = "Enter your full name.";
    err.style.display = "block";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    err.textContent = "That email doesn't look right.";
    err.style.display = "block";
    return;
  }
  if (pw.length < 6) {
    err.textContent = "Password needs 6+ characters.";
    err.style.display = "block";
    return;
  }
  if (!$("#suConsent").checked) {
    err.textContent = "Accept the Terms & Data Protection consent.";
    err.style.display = "block";
    return;
  }
  $("#suBtn").disabled = true;
  try {
    await doSignUp({ name, email, pw, role: suRole, county });
    toast("Account created — karibu!", "i-check");
    go(suRole === "tutor" ? "tspace" : suRole === "admin" ? "admin" : "dashboard");
  } catch (e) {
    err.textContent = e.message;
    err.style.display = "block";
  }
  $("#suBtn").disabled = false;
});
