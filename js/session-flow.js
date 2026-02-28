export async function initSessionFlow({
  getSupabaseClient,
  setSession,
  setAuthUI,
  openModal,
  authController,
  t,
  getCurrentCountry,
  loadEventsForCountry,
}) {
  const supabaseClient = getSupabaseClient();

  const { data: sessData } = await supabaseClient.auth.getSession();
  setSession(sessData?.session || null);
  setAuthUI();

  supabaseClient.auth.onAuthStateChange(async (event, newSession) => {
    setSession(newSession);
    setAuthUI();

    if (event === "PASSWORD_RECOVERY") {
      openModal("update");
      authController.setMessage(t("auth.resetMode"));
    }

    const currentCountry = getCurrentCountry();
    if (currentCountry) {
      await loadEventsForCountry(currentCountry);
    }
  });
}
