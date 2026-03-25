import { db, auth } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const switchModeText = document.getElementById("switch-mode");
const authMessage = document.getElementById("auth-message");

const loginLink = document.getElementById("login-link");
const logoutLink = document.getElementById("logout-link");
const userDisplay = document.getElementById("user-display");

let isSignup = false;

function showAuthMessage(message, type = "error") {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function clearAuthMessage() {
  if (!authMessage) return;
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

function validUsername(name) {
  const regex = /^[a-zA-Z0-9_]{3,10}$/;
  return regex.test(name);
}

function getErrorMessage(code) {
  if (code === "auth/invalid-email") return "Please enter a valid email.";
  if (code === "auth/missing-password") return "Please enter your password.";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "Incorrect email or password.";
  }
  if (code === "auth/email-already-in-use") {
    return "That email is already being used.";
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many tries. Please try again later.";
  }

  return "Something went wrong. Please try again.";
}

function updateFormMode() {
  if (!authTitle || !nameInput || !submitBtn || !switchModeText) return;

  clearAuthMessage();

  if (isSignup) {
    authTitle.textContent = "Sign Up";
    nameInput.style.display = "block";
    nameInput.required = true;
    submitBtn.textContent = "Sign Up";
    switchModeText.innerHTML =
      'Already have an account? <button type="button" id="toggle-auth" class="toggle-auth-btn">Log In</button>';
  } else {
    authTitle.textContent = "Login";
    nameInput.style.display = "none";
    nameInput.required = false;
    nameInput.value = "";
    submitBtn.textContent = "Log In";
    switchModeText.innerHTML =
      'Don\'t have an account? <button type="button" id="toggle-auth" class="toggle-auth-btn">Sign Up</button>';
  }

  const toggleBtn = document.getElementById("toggle-auth");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isSignup = !isSignup;
      updateFormMode();
    });
  }
}

function setLoadingState(loading) {
  if (submitBtn) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading
      ? isSignup
        ? "Signing Up..."
        : "Logging In..."
      : isSignup
        ? "Sign Up"
        : "Log In";
  }

  if (emailInput) emailInput.disabled = loading;
  if (passwordInput) passwordInput.disabled = loading;
  if (nameInput) nameInput.disabled = loading;
}

function updateNavbar(user, username = "") {
  if (user) {
    if (loginLink) loginLink.style.display = "none";
    if (logoutLink) logoutLink.style.display = "inline-block";
    if (userDisplay) userDisplay.textContent = username || user.email || "";
  } else {
    if (loginLink) loginLink.style.display = "inline-block";
    if (logoutLink) logoutLink.style.display = "none";
    if (userDisplay) userDisplay.textContent = "";
  }
}

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    clearAuthMessage();

    if (!email || !password) {
      showAuthMessage("Please fill in your email and password.");
      return;
    }

    if (isSignup) {
      if (!username) {
        showAuthMessage("Please enter a username.");
        return;
      }

      if (!validUsername(username)) {
        showAuthMessage(
          "Username must be 3 to 10 characters and only use letters, numbers, or underscores.",
        );
        return;
      }
    }

    setLoadingState(true);

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          username: username,
          email: email,
          createdAt: new Date().toISOString(),
        });

        showAuthMessage("Account created successfully!", "success");
        window.location.href = "./shop.html";
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showAuthMessage("Logged in successfully!", "success");
        window.location.href = "./shop.html";
      }
    } catch (error) {
      console.error("Auth error:", error);
      showAuthMessage(getErrorMessage(error.code));
    } finally {
      setLoadingState(false);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    updateNavbar(null);
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      updateNavbar(user, userData.username || "");
    } else {
      updateNavbar(user);
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    updateNavbar(user);
  }
});

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      await signOut(auth);

      const inHtmlFolder = window.location.pathname.includes("/html/");
      window.location.href = inHtmlFolder
        ? "./login.html"
        : "./html/login.html";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Could not log out. Please try again.");
    }
  });
}

updateFormMode();
