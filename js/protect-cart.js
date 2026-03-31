import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// check for user authentication before going to cart
const authLoader = document.getElementById("auth-loader");

let pageShown = false;
let authResolved = false;

function showPage() {
  if (pageShown) return;
  pageShown = true;

  window.requestAnimationFrame(() => {
    document.body.classList.remove("auth-checking");
    document.body.classList.add("auth-ready");

    if (authLoader) {
      authLoader.style.display = "none";
    }
  });
}

onAuthStateChanged(auth, (user) => {
  authResolved = true;

  if (!user) {
    window.location.replace("./login.html");
    return;
  }

  showPage();
});

setTimeout(() => {
  if (authResolved && auth.currentUser) {
    showPage();
  }
}, 5000);
