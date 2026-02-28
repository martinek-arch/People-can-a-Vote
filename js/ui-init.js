export function bindNavbarActions({
  goHome,
  getCurrentCountry,
  navigateCountry,
  navigateHome,
  openModal,
  signOut,
}) {
  document.getElementById("backToHomeBtn").onclick = goHome;
  document.getElementById("backToCountryBtn").onclick = () => {
    const currentCountry = getCurrentCountry();
    if (currentCountry) {
      navigateCountry(currentCountry);
    } else {
      navigateHome();
    }
  };
  document.getElementById("loginNavBtn").onclick = () => openModal("login");
  document.getElementById("registerNavBtn").onclick = () => openModal("register");
  document.getElementById("changePassNavBtn").onclick = () => openModal("update");
  document.getElementById("logoutNavBtn").onclick = signOut;
}

export function bindGlobalUIActions({ loadTop3, searchFlow }) {
  document.getElementById("refreshTop3Btn").onclick = loadTop3;
  searchFlow.bindSearchUI();
  document.addEventListener("click", (event) => {
    const popover = document.getElementById("countryPopover");
    const tabs = document.getElementById("continentTabs");
    if (!popover || !tabs) return;
    if (!popover.classList.contains("open")) return;
    const clickedInside = popover.contains(event.target) || tabs.contains(event.target);
    if (!clickedInside) {
      popover.classList.remove("open");
    }
  });
}
