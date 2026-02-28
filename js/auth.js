export function createAuthController({ t, boot, appBaseUrl, getSupabaseClient, getSession }) {
  let isVerified = false;
  let authMode = "login";

  const overlay = document.getElementById("overlay");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const tabUpdate = document.getElementById("tabUpdate");
  const submitAuthBtn = document.getElementById("submitAuthBtn");
  const authMsg = document.getElementById("authMsg");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authPassword2 = document.getElementById("authPassword2");

  const emailField = document.getElementById("emailField");
  const passwordField = document.getElementById("passwordField");
  const password2Field = document.getElementById("password2Field");
  const forgotWrap = document.getElementById("forgotWrap");
  const forgotBtn = document.getElementById("forgotBtn");

  function disableVoteButtons(disabled) {
    document.querySelectorAll("button[data-vote-btn='1']").forEach((b) => { b.disabled = disabled; });
  }

  function setModeUI() {
    tabLogin.classList.toggle("active", authMode === "login");
    tabRegister.classList.toggle("active", authMode === "register");
    tabUpdate.classList.toggle("active", authMode === "update");

    const canShowUpdateTab = authMode === "update";
    tabUpdate.classList.toggle("hidden", !canShowUpdateTab);

    if (authMode === "login") {
      submitAuthBtn.textContent = t("auth.submit.login");
      emailField.classList.remove("hidden");
      passwordField.classList.remove("hidden");
      password2Field.classList.add("hidden");
      forgotWrap.classList.remove("hidden");
      authPassword.setAttribute("autocomplete", "current-password");
    } else if (authMode === "register") {
      submitAuthBtn.textContent = t("auth.submit.register");
      emailField.classList.remove("hidden");
      passwordField.classList.remove("hidden");
      password2Field.classList.remove("hidden");
      forgotWrap.classList.add("hidden");
      authPassword.setAttribute("autocomplete", "new-password");
      authPassword2.setAttribute("autocomplete", "new-password");
    } else {
      submitAuthBtn.textContent = t("auth.submit.update");
      emailField.classList.add("hidden");
      passwordField.classList.remove("hidden");
      password2Field.classList.remove("hidden");
      forgotWrap.classList.add("hidden");
      authPassword.setAttribute("autocomplete", "new-password");
      authPassword2.setAttribute("autocomplete", "new-password");
    }
  }

  function openModal(mode) {
    authMode = mode;
    authMsg.textContent = "";
    authPassword.value = "";
    authPassword2.value = "";
    setModeUI();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      if (!emailField.classList.contains("hidden")) authEmail.focus();
      else authPassword.focus();
    }, 0);
  }

  function closeModal() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    authMsg.textContent = "";
  }

  function setAuthUI() {
    const navUser = document.getElementById("navUser");
    const navHint = document.getElementById("navHint");

    const loginBtn = document.getElementById("loginNavBtn");
    const registerBtn = document.getElementById("registerNavBtn");
    const changeBtn = document.getElementById("changePassNavBtn");
    const logoutBtn = document.getElementById("logoutNavBtn");

    const session = getSession();
    if (!session) {
      isVerified = false;
      navUser.textContent = t("auth.notLogged");
      navHint.textContent = t("auth.navHintLoggedOut");

      loginBtn.classList.remove("hidden");
      registerBtn.classList.remove("hidden");
      changeBtn.classList.add("hidden");
      logoutBtn.classList.add("hidden");

      disableVoteButtons(true);
      return;
    }

    isVerified = !!session.user?.email_confirmed_at;
    const email = session.user?.email || t("auth.userFallback");

    navUser.textContent = email + (isVerified ? ` (${t("auth.verified")})` : ` (${t("auth.unverified")})`);
    navHint.textContent = isVerified ? "" : t("auth.navHintUnverified");

    loginBtn.classList.add("hidden");
    registerBtn.classList.add("hidden");
    changeBtn.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");

    disableVoteButtons(!isVerified);
  }

  function canVote() {
    return !!getSession() && !!isVerified;
  }

  async function signOut() {
    boot("Auth: signing out…");
    await getSupabaseClient().auth.signOut();
    boot("Auth: signed out");
  }

  async function runAuth() {
    const email = (authEmail.value || "").trim();
    const p1 = authPassword.value || "";
    const p2 = authPassword2.value || "";

    if (authMode !== "update" && !email) {
      authMsg.textContent = "Zadej email.";
      return;
    }
    if (p1.length < 8) {
      authMsg.textContent = t("auth.passwordMin");
      return;
    }
    if (authMode !== "login" && p1 !== p2) {
      authMsg.textContent = t("auth.passwordMismatch");
      return;
    }

    submitAuthBtn.disabled = true;
    authMsg.textContent = authMode === "login" ? t("auth.working.login") : (authMode === "register" ? t("auth.working.register") : t("auth.working.update"));
    boot("Auth: working…");

    try {
      const supabaseClient = getSupabaseClient();
      if (authMode === "login") {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: p1 });
        if (error) throw error;
        closeModal();
        boot("Auth: signed in");
        return;
      }

      if (authMode === "register") {
        const { error } = await supabaseClient.auth.signUp({
          email,
          password: p1,
          options: { emailRedirectTo: appBaseUrl + "#auth" }
        });
        if (error) throw error;
        authMsg.textContent = t("auth.registerCreated");
        boot("Auth: signUp ok");
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({ password: p1 });
      if (error) throw error;
      authMsg.textContent = t("auth.passwordUpdated");
      boot("Auth: password updated");
      setTimeout(() => { try { closeModal(); } catch (e) {} }, 700);
    } catch (err) {
      console.error(err);
      authMsg.textContent = (err && err.message) ? err.message : t("auth.unknownError");
      boot("Auth: error");
    } finally {
      submitAuthBtn.disabled = false;
    }
  }

  async function forgotPasswordFlow() {
    const email = (authEmail.value || "").trim() || prompt(t("auth.resetPrompt"));
    if (!email) return;

    forgotBtn.disabled = true;
    authMsg.textContent = t("auth.resetSending");
    boot("Auth: reset email…");

    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: appBaseUrl + "#reset"
      });
      if (error) throw error;
      authMsg.textContent = t("auth.resetSent");
      boot("Auth: reset sent");
    } catch (err) {
      console.error(err);
      authMsg.textContent = (err && err.message) ? err.message : t("auth.unknownError");
      boot("Auth: reset error");
    } finally {
      forgotBtn.disabled = false;
    }
  }

  function setMessage(msg) {
    authMsg.textContent = msg;
  }

  function initBindings() {
    document.getElementById("closeModalBtn").onclick = closeModal;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) closeModal(); });

    tabLogin.onclick = () => { authMode = "login"; authMsg.textContent = ""; setModeUI(); };
    tabRegister.onclick = () => { authMode = "register"; authMsg.textContent = ""; setModeUI(); };

    submitAuthBtn.onclick = runAuth;
    authPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") runAuth(); });
    authPassword2.addEventListener("keydown", (e) => { if (e.key === "Enter") runAuth(); });
    forgotBtn.onclick = forgotPasswordFlow;
  }

  initBindings();

  return {
    openModal,
    closeModal,
    setModeUI,
    setAuthUI,
    canVote,
    signOut,
    setMessage,
  };
}
