/* /signin.html - password sign-in plus the one-click demo accounts. */
const siSyncNote = $("#siSyncNote");
if (siSyncNote)
  siSyncNote.innerHTML = sb.enabled()
    ? "<b>Supabase connected.</b> Credentials are checked against your project."
    : "<b>Local demo mode.</b> Accounts are stored in this browser with PBKDF2-hashed passwords. Add Supabase keys to go live.";
$("#siBtn").addEventListener("click", async () => {
  const err = $("#siErr");
  err.style.display = "none";
  const email = $("#siEmail").value.trim(),
    pw = $("#siPw").value;
  if (!email || !pw) {
    err.textContent = "Enter email and password.";
    err.style.display = "block";
    return;
  }
  $("#siBtn").disabled = true;
  try {
    await doSignIn(email, pw);
    toast("Karibu tena, " + SESSION.name.split(" ")[0] + "!", "i-check");
    go(SESSION.role === "tutor" ? "tspace" : SESSION.role === "admin" ? "admin" : "dashboard");
  } catch (e) {
    err.textContent = e.message;
    err.style.display = "block";
  }
  $("#siBtn").disabled = false;
});
