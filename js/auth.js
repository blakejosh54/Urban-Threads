import { db, auth } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
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
const cartCount = document.getElementById("cart-count");

const mobileLoginLink = document.getElementById("mobile-login-link");
const mobileLogoutLink = document.getElementById("mobile-logout-link");
const mobileUserDisplay = document.getElementById("mobile-user-display");

const adminLink = document.getElementById("admin-link");
const mobileAdminLink = document.getElementById("mobile-admin-link");

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
const mobileMenuClose = document.getElementById("mobile-menu-close");

const navbar = document.querySelector(".navbar");

const themeToggle = document.getElementById("theme-toggle");
const mobileThemeToggle = document.getElementById("mobile-theme-toggle");

const THEME_STORAGE_KEY = "urban-threads-theme";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";

const heroMemberLink = document.getElementById("hero-member-link");
const ctaLoginLink = document.getElementById("cta-login-link");

const ADMIN_EMAILS = ["admin@gmail.com"];

let isSignup = false;
let unsubscribeCartListener = null;

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
}

function updateHomePageAuthCtas(user) {
  const shouldHideGuestButtons = Boolean(user);

  if (heroMemberLink) {
    heroMemberLink.style.display = shouldHideGuestButtons
      ? "none"
      : "inline-flex";
  }

  if (ctaLoginLink) {
    ctaLoginLink.style.display = shouldHideGuestButtons
      ? "none"
      : "inline-flex";
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

function updateCartCountDisplay(total) {
  if (!cartCount) return;
  cartCount.textContent = String(total);
}

function watchCartCount(user) {
  if (!cartCount) return;

  if (unsubscribeCartListener) {
    unsubscribeCartListener();
    unsubscribeCartListener = null;
  }

  if (!user) {
    updateCartCountDisplay(0);
    return;
  }

  unsubscribeCartListener = onSnapshot(
    collection(db, "users", user.uid, "cart"),
    (snapshot) => {
      let totalItems = 0;

      snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        totalItems += Number(item.quantity) || 0;
      });

      updateCartCountDisplay(totalItems);
    },
    (error) => {
      console.error("Error watching cart count:", error);
      updateCartCountDisplay(0);
    },
  );
}

function openMobileMenu() {
  if (!mobileMenu || window.innerWidth > 1023) return;

  mobileMenu.classList.add("open");
  mobileMenu.setAttribute("aria-hidden", "false");
  document.body.classList.add("menu-open");
  document.body.classList.remove("nav-is-hidden");

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "true");
  }
}

function closeMobileMenu() {
  if (!mobileMenu) return;

  mobileMenu.classList.remove("open");
  mobileMenu.setAttribute("aria-hidden", "true");
  document.body.classList.remove("menu-open");

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
  }
}

function applyTheme(theme) {
  const nextTheme = theme === LIGHT_THEME ? LIGHT_THEME : DARK_THEME;
  document.body.classList.toggle("light-theme", nextTheme === LIGHT_THEME);

  const toggleText = nextTheme === LIGHT_THEME ? "Dark Mode" : "Light Mode";
  const isLightTheme = nextTheme === LIGHT_THEME;

  if (themeToggle) {
    themeToggle.textContent = toggleText;
    themeToggle.setAttribute("aria-pressed", String(isLightTheme));
  }

  if (mobileThemeToggle) {
    mobileThemeToggle.textContent = toggleText;
    mobileThemeToggle.setAttribute("aria-pressed", String(isLightTheme));
  }
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(savedTheme === LIGHT_THEME ? LIGHT_THEME : DARK_THEME);
}

function toggleTheme() {
  const isLightTheme = document.body.classList.contains("light-theme");
  const nextTheme = isLightTheme ? DARK_THEME : LIGHT_THEME;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

function setupThemeToggle() {
  loadSavedTheme();

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener("click", toggleTheme);
  }
}

function setupMobileMenu() {
  if (menuToggle) {
    menuToggle.addEventListener("click", openMobileMenu);
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener("click", closeMobileMenu);
  }

  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener("click", closeMobileMenu);
  }

  document.addEventListener("click", (event) => {
    if (!mobileMenu || !mobileMenu.classList.contains("open")) return;
    if (window.innerWidth > 1023) return;

    const clickedInsidePanel = event.target.closest(".mobile-menu-panel");
    const clickedMenuToggle = event.target.closest("#menu-toggle");

    if (!clickedInsidePanel && !clickedMenuToggle) {
      closeMobileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1023) {
      closeMobileMenu();
    }
  });

  if (mobileMenu) {
    const mobileLinks = mobileMenu.querySelectorAll("a");
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        closeMobileMenu();
      });
    });
  }
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isAdminUser(user, userData = {}) {
  if (!user) return false;

  const email = normalizeEmail(user.email);
  const allowedEmails = ADMIN_EMAILS.map(normalizeEmail).filter(Boolean);

  return userData.isAdmin === true || allowedEmails.includes(email);
}

function updateAdminLinks(canAccessAdmin) {
  if (adminLink) {
    adminLink.style.display = canAccessAdmin ? "inline-flex" : "none";
  }

  if (mobileAdminLink) {
    mobileAdminLink.style.display = canAccessAdmin ? "block" : "none";
  }
}

function updateNavbar(user, username = "", canAccessAdmin = false) {
  const displayName = username || user?.email || "";

  if (user) {
    if (loginLink) loginLink.style.display = "none";
    if (logoutLink) logoutLink.style.display = "inline-block";
    if (userDisplay) userDisplay.textContent = displayName;

    if (mobileLoginLink) mobileLoginLink.style.display = "none";
    if (mobileLogoutLink) mobileLogoutLink.style.display = "block";
    if (mobileUserDisplay) mobileUserDisplay.textContent = displayName;
    updateAdminLinks(canAccessAdmin);
  } else {
    if (loginLink) loginLink.style.display = "inline-block";
    if (logoutLink) logoutLink.style.display = "none";
    if (userDisplay) userDisplay.textContent = "";

    if (mobileLoginLink) mobileLoginLink.style.display = "block";
    if (mobileLogoutLink) mobileLogoutLink.style.display = "none";
    if (mobileUserDisplay) mobileUserDisplay.textContent = "Guest";
    updateAdminLinks(false);
  }

  updateHomePageAuthCtas(user);
}

function setupNavbarScroll() {
  if (!navbar) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateNavbarOnScroll = () => {
    const currentScrollY = window.scrollY;
    const diff = currentScrollY - lastScrollY;
    const menuIsOpen = document.body.classList.contains("menu-open");

    if (menuIsOpen || currentScrollY <= 16) {
      document.body.classList.remove("nav-is-hidden");
      lastScrollY = currentScrollY;
      ticking = false;
      return;
    }

    if (diff > 6 && currentScrollY > 90) {
      document.body.classList.add("nav-is-hidden");
    } else if (diff < -6) {
      document.body.classList.remove("nav-is-hidden");
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNavbarOnScroll);
        ticking = true;
      }
    },
    { passive: true },
  );
}

function markAuthReady() {
  window.requestAnimationFrame(() => {
    document.body.classList.remove("auth-checking");
    document.body.classList.add("auth-ready");
  });
}

if (switchModeText) {
  switchModeText.addEventListener("click", (event) => {
    const toggleBtn = event.target.closest("#toggle-auth");
    if (!toggleBtn) return;

    isSignup = !isSignup;
    updateFormMode();
  });
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
          username,
          email,
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
    watchCartCount(null);
    markAuthReady();
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      updateNavbar(user, userData.username || "", isAdminUser(user, userData));
    } else {
      updateNavbar(user, "", isAdminUser(user));
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    updateNavbar(user);
  }

  watchCartCount(user);
  markAuthReady();
});

async function handleLogout(e) {
  e.preventDefault();

  try {
    await signOut(auth);
    closeMobileMenu();

    const inHtmlFolder = window.location.pathname.includes("/html/");
    window.location.href = inHtmlFolder ? "./login.html" : "./html/login.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Could not log out. Please try again.");
  }
}

if (logoutLink) {
  logoutLink.addEventListener("click", handleLogout);
}

if (mobileLogoutLink) {
  mobileLogoutLink.addEventListener("click", handleLogout);
}

function setActiveMobileMenuLink() {
  const normalizePath = (path) => {
    if (!path) return "/";

    let cleanPath = path;

    if (cleanPath.endsWith("index.html")) {
      cleanPath = cleanPath.replace(/index\.html$/, "");
    }

    if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
      cleanPath = cleanPath.slice(0, -1);
    }

    return cleanPath || "/";
  };

  const currentPath = normalizePath(window.location.pathname);

  const allNavLinks = document.querySelectorAll(
    ".nav-links a, .mobile-menu-link",
  );

  allNavLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || href === "#") {
      link.classList.remove("active-page");
      link.removeAttribute("aria-current");
      return;
    }

    const linkUrl = new URL(
      href,
      window.location.origin + window.location.pathname,
    );
    const linkPath = normalizePath(linkUrl.pathname);

    if (linkPath === currentPath) {
      link.classList.add("active-page");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active-page");
      link.removeAttribute("aria-current");
    }
  });
}

setupThemeToggle();
setupMobileMenu();
setActiveMobileMenuLink();
setupNavbarScroll();
updateFormMode();
