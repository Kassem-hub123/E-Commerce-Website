// Login screen shared by the two admin pages. Calls onReady() once the stored
// token is confirmed by the server.

function setupAdminPage(onReady) {
  const login = document.querySelector("#login");
  const dashboard = document.querySelector("#dashboard");
  const loginForm = document.querySelector("#login-form");
  const loginNote = document.querySelector("#login-note");
  const logoutButton = document.querySelector("#logout");

  function showDashboard(loggedIn) {
    login.hidden = loggedIn;
    dashboard.hidden = !loggedIn;
    logoutButton.hidden = !loggedIn;
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    setNote(loginNote, "Checking…");

    const form = new FormData(loginForm);

    try {
      const { token } = await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password")
        })
      });

      localStorage.setItem("admin_token", token);
      loginForm.reset();
      setNote(loginNote, "");
      showDashboard(true);
      await onReady();
    } catch (error) {
      setNote(loginNote, error.message, true);
    }
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("admin_token");
    location.reload();
  });

  return (async () => {
    if (!localStorage.getItem("admin_token")) {
      showDashboard(false);
      return;
    }

    try {
      await api("/api/auth/me");
      showDashboard(true);
      await onReady();
    } catch {
      localStorage.removeItem("admin_token");
      showDashboard(false);
    }
  })();
}
