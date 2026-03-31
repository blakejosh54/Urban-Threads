import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMIN_EMAILS = ["admin@gmail.com"];

const adminLoader = document.getElementById("admin-loader");
const refreshDashboardBtn = document.getElementById("refresh-dashboard-btn");

const metricProducts = document.getElementById("metric-products");
const metricOrders = document.getElementById("metric-orders");
const metricUsers = document.getElementById("metric-users");
const metricRevenue = document.getElementById("metric-revenue");

const adminProductsList = document.getElementById("admin-products-list");
const adminProductsCount = document.getElementById("admin-products-count");

const adminProductForm = document.getElementById("admin-product-form");
const productFormMode = document.getElementById("product-form-mode");
const productIdInput = document.getElementById("product-id");
const productNameInput = document.getElementById("product-name");
const productPriceInput = document.getElementById("product-price");
const productDescriptionInput = document.getElementById("product-description");
const saveProductBtn = document.getElementById("save-product-btn");
const resetProductBtn = document.getElementById("reset-product-btn");
const adminProductStatus = document.getElementById("admin-product-status");

let dashboardState = {
  products: [],
  orders: [],
  users: [],
};

function formatCurrency(value) {
  return `R${Number(value || 0).toFixed(2)}`;
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

function redirectToShop() {
  window.location.replace("./shop.html");
}

function showAdminPage() {
  document.body.classList.remove("auth-checking");
  document.body.classList.add("auth-ready");

  if (adminLoader) {
    adminLoader.style.display = "none";
  }
}

function showProductStatus(message, type = "info") {
  if (!adminProductStatus) return;

  adminProductStatus.textContent = message;
  adminProductStatus.className = `admin-inline-status ${type}`;
}

function clearProductStatus() {
  if (!adminProductStatus) return;

  adminProductStatus.textContent = "";
  adminProductStatus.className = "admin-inline-status";
}

function resetProductForm() {
  if (!adminProductForm) return;

  adminProductForm.reset();
  productIdInput.value = "";
  productFormMode.textContent = "Select a product";
  saveProductBtn.textContent = "Update Product";
  clearProductStatus();
}

function fillProductForm(product, keepStatus = false) {
  if (!product) return;

  productIdInput.value = product.id || "";
  productNameInput.value = product.name || "";
  productPriceInput.value = Number(product.price) || 0;
  productDescriptionInput.value = product.description || "";

  productFormMode.textContent = product.name || "Selected product";

  saveProductBtn.textContent = "Update Product";

  if (!keepStatus) {
    clearProductStatus();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMetrics(products, orders, users) {
  const revenue = orders.reduce((total, order) => {
    return total + (Number(order.total) || 0);
  }, 0);

  if (metricProducts) metricProducts.textContent = String(products.length);
  if (metricOrders) metricOrders.textContent = String(orders.length);
  if (metricUsers) metricUsers.textContent = String(users.length);
  if (metricRevenue) metricRevenue.textContent = formatCurrency(revenue);
}

function renderProducts(products) {
  if (!adminProductsList) return;

  if (adminProductsCount) {
    adminProductsCount.textContent = `${products.length} item${products.length === 1 ? "" : "s"}`;
  }

  if (!products.length) {
    adminProductsList.innerHTML =
      '<p class="admin-empty-inline">No products available yet.</p>';
    return;
  }

  adminProductsList.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "admin-product-card";


    // product card
    card.innerHTML = `
  <div class="admin-product-image-wrap">
    <img
      src="${product.imageURL || ""}"
      alt="${product.name || "Product"}"
      class="admin-product-image"
    />
  </div>
  <h4 class="admin-product-name">
    ${product.name || "Unnamed product"}
  </h4>

  <div class="admin-product-card-body">
    <div class="admin-product-card-top">
      <strong>${formatCurrency(product.price)}</strong>
    </div>

    <p class="admin-product-description">
      ${product.description || "No description available."}
    </p>

    <div class="admin-product-card-actions">
      <button type="button" class="admin-edit-btn" data-id="${product.id}">
        Edit Product
      </button>
    </div>
  </div>
`;

    adminProductsList.appendChild(card);
  });

  const editButtons = adminProductsList.querySelectorAll(".admin-edit-btn");

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedProduct = dashboardState.products.find((product) => {
        return product.id === button.dataset.id;
      });

      fillProductForm(selectedProduct);
    });
  });
}

// admin metrics
async function loadDashboard() {
  if (refreshDashboardBtn) {
    refreshDashboardBtn.disabled = true;
    refreshDashboardBtn.textContent = "Refreshing...";
  }

  try {
    const [productsSnap, ordersSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "users")),
    ]);

    const products = productsSnap.docs.map((docSnap) => {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    });

    const orders = ordersSnap.docs.map((docSnap) => {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    });

    const users = usersSnap.docs.map((docSnap) => {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    });

    dashboardState = {
      products,
      orders,
      users,
    };

    renderMetrics(products, orders, users);
    renderProducts(products);
  } catch (error) {
    console.error("Error loading admin dashboard:", error);

    if (adminProductsList) {
      adminProductsList.innerHTML =
        '<p class="admin-empty-inline">Failed to load products.</p>';
    }
  } finally {
    if (refreshDashboardBtn) {
      refreshDashboardBtn.disabled = false;
      refreshDashboardBtn.textContent = "Refresh Dashboard";
    }

    showAdminPage();
  }
}

if (refreshDashboardBtn) {
  refreshDashboardBtn.addEventListener("click", async () => {
    await loadDashboard();
  });
}

if (resetProductBtn) {
  resetProductBtn.addEventListener("click", resetProductForm);
}

if (adminProductForm) {
  adminProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const productId = productIdInput.value.trim();
    const productName = productNameInput.value.trim();
    const productPrice = Number(productPriceInput.value);
    const productDescription = productDescriptionInput.value.trim();

    clearProductStatus();

    if (!productId) {
      showProductStatus("Please choose a product to edit first.", "error");
      return;
    }

    if (!productName || !productDescription || Number.isNaN(productPrice)) {
      showProductStatus("Please complete all fields.", "error");
      return;
    }

    saveProductBtn.disabled = true;
    saveProductBtn.textContent = "Updating...";

    try {
      await updateDoc(doc(db, "products", productId), {
        name: productName,
        price: productPrice,
        description: productDescription,
      });

      await loadDashboard();

      const updatedProduct = dashboardState.products.find((product) => {
        return product.id === productId;
      });

      fillProductForm(updatedProduct, true);

      const updatedProductName = updatedProduct?.name || productName;
      showProductStatus(
        `${updatedProductName} was updated successfully.`,
        "success",
      );
    } catch (error) {
      console.error("Error updating product:", error);
      showProductStatus("Could not update product.", "error");
    } finally {
      saveProductBtn.disabled = false;
      saveProductBtn.textContent = "Update Product";
    }
  });
}

// checking for auth
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    redirectToShop();
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    if (!isAdminUser(user, userData)) {
      redirectToShop();
      return;
    }

    await loadDashboard();
  } catch (error) {
    console.error("Error checking admin access:", error);
    redirectToShop();
  }
});
