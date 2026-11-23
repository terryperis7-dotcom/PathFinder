/* /signup.html - account creation with role, county and DPA consent. */
/* Only learners and tutors can register. Admins are made by hand in the database. */
let suRole = new URLSearchParams(location.search).get("role") === "tutor" ? "tutor" : "student";
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
    /* new accounts always start with the safety check */
    if (typeof onbDone === "function" && !onbDone() && suRole !== "admin") {
      location.assign(onbWelcomeURL());
      return;
    }
    go(suRole === "tutor" ? "tspace" : "dashboard");
  } catch (e) {
    err.style.display = "none";
    /* One project setting can still stand in the way: Supabase asks for an email
       confirmation before the first sign-in. We say exactly that, name the switch
       that turns it off, and give a way forward instead of a dead end. */
    if (e && e.code === "confirm_email") {
      const panel = $("#suPanel");
      panel.style.display = "block";
      panel.innerHTML = `<b>${ic("i-info", "sm")} Email confirmation is switched on in this Supabase project</b>
        <p class="tiny" style="margin:6px 0 0">Your account exists. Two ways past this:</p>
        <ol class="tiny" style="margin:6px 0 0;padding-left:18px">
          <li>Open the email Supabase just sent you, then <a href="signin.html">sign in</a>.</li>
          <li>Or, as the project owner, turn it off: <b>Supabase → Authentication → Sign In / Providers → Email → Confirm email</b>. Then create the account again.</li>
        </ol>`;
      toast("Account created — email confirmation is required by the project", "i-info", true);
    } else {
      err.textContent = e.message;
      err.style.display = "block";
    }
  }
  $("#suBtn").disabled = false;
});
