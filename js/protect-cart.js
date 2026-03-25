import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const authLoader = document.getElementById("auth-loader");

function showPage() {
  document.body.classList.remove("auth-checking");
  document.body.classList.add("auth-ready");

  if (authLoader) {
    authLoader.style.display = "none";
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  showPage();
});

setTimeout(() => {
  showPage();
}, 5000);
