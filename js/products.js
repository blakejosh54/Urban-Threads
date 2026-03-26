import { db, auth } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productsContainer = document.getElementById("products-container");
const productStatus = document.getElementById("product-status");
const searchInput = document.getElementById("search-input");
const categoryFilters = document.getElementById("category-filters");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
const resultsCount = document.getElementById("results-count");
const priceFilterBtn = document.getElementById("price-filter-btn");
const priceFilterMenu = document.getElementById("price-filter-menu");

let allProducts = [];
let selectedCategory = "All";
let searchTerm = "";
let selectedPriceRange = "all";

function formatPrice(price) {
  return "R" + Number(price).toFixed(2);
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function showProductStatus(message, type = "info") {
  if (!productStatus) return;
  productStatus.textContent = message;
  productStatus.className = `product-status ${type}`;
}

function clearProductStatus() {
  if (!productStatus) return;
  productStatus.textContent = "";
  productStatus.className = "product-status";
}

function updateResultsCount(count, total) {
  if (!resultsCount) return;

  if (!total) {
    resultsCount.textContent = "0 products available";
    return;
  }

  if (count === total) {
    resultsCount.textContent = `${total} product${total === 1 ? "" : "s"} available`;
    return;
  }

  resultsCount.textContent = `${count} of ${total} product${total === 1 ? "" : "s"} shown`;
}

function getPriceFilterLabel(priceRange) {
  const labels = {
    all: "Price Filter",
    "under-500": "Under R500",
    "500-999": "R500 - R999",
    "1000-1499": "R1000 - R1499",
    "1500-plus": "R1500+",
  };

  return labels[priceRange] || "Price Filter";
}

function updatePriceFilterButtonLabel() {
  if (!priceFilterBtn) return;

  const icon = `<span class="material-icons">expand_more</span>`;
  priceFilterBtn.innerHTML = `${getPriceFilterLabel(selectedPriceRange)} ${icon}`;
}

function updateActivePriceOption() {
  if (!priceFilterMenu) return;

  const options = priceFilterMenu.querySelectorAll(".price-option");

  options.forEach((option) => {
    const isActive = option.dataset.price === selectedPriceRange;
    option.classList.toggle("active", isActive);
  });
}

function isPriceMatch(price) {
  const productPrice = Number(price) || 0;

  switch (selectedPriceRange) {
    case "under-500":
      return productPrice < 500;
    case "500-999":
      return productPrice >= 500 && productPrice <= 999;
    case "1000-1499":
      return productPrice >= 1000 && productPrice <= 1499;
    case "1500-plus":
      return productPrice >= 1500;
    case "all":
    default:
      return true;
  }
}

async function addToCart(product, button) {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in to add items to your cart.");
    window.location.href = "./login.html";
    return;
  }

  clearProductStatus();

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Adding...";

  try {
    const cartRef = doc(db, "users", user.uid, "cart", product.id);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      const oldData = cartSnap.data();

      await setDoc(cartRef, {
        ...oldData,
        quantity: (Number(oldData.quantity) || 0) + 1,
      });
    } else {
      await setDoc(cartRef, {
        name: product.name,
        price: Number(product.price) || 0,
        imageURL: product.imageURL || "",
        quantity: 1,
      });
    }

    button.textContent = "Added to Cart ✓";
    showProductStatus(`${product.name} added to cart.`, "success");

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1200);
  } catch (error) {
    console.error("Error adding to cart:", error);

    button.textContent = originalText;
    button.disabled = false;
    showProductStatus("Could not add item to cart.", "error");
  }
}

function createCategoryButtons(products) {
  if (!categoryFilters) return;

  const categories = [
    "All",
    ...new Set(
      products
        .map((product) => String(product.category || "").trim())
        .filter(Boolean),
    ),
  ];

  categoryFilters.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      category === selectedCategory ? "category-btn active" : "category-btn";
    button.dataset.category = category;
    button.textContent = category;

    button.addEventListener("click", () => {
      selectedCategory = category;
      updateActiveCategoryButton();
      renderProducts();
    });

    categoryFilters.appendChild(button);
  });
}

function updateActiveCategoryButton() {
  if (!categoryFilters) return;

  const buttons = categoryFilters.querySelectorAll(".category-btn");

  buttons.forEach((button) => {
    const isActive = button.dataset.category === selectedCategory;
    button.classList.toggle("active", isActive);
  });
}

function filterProducts() {
  const normalizedSearch = normalizeText(searchTerm);

  return allProducts.filter((product) => {
    const productCategory = String(product.category || "").trim();

    const matchesCategory =
      selectedCategory === "All" || productCategory === selectedCategory;

    const searchableText = [product.name, product.category, product.description]
      .map((value) => normalizeText(value))
      .join(" ");

    const matchesSearch =
      !normalizedSearch || searchableText.includes(normalizedSearch);

    const matchesPrice = isPriceMatch(product.price);

    return matchesCategory && matchesSearch && matchesPrice;
  });
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const image = document.createElement("img");
  image.className = "product-image";
  image.src = product.imageURL || "";
  image.alt = product.name || "Product image";

  const info = document.createElement("div");
  info.className = "product-info";

  const title = document.createElement("h3");
  title.textContent = product.name || "Unnamed product";

  const description = document.createElement("p");
  description.className = "description";
  description.textContent = product.description || "No description available.";

  const bottom = document.createElement("div");
  bottom.className = "product-footer";

  const price = document.createElement("p");
  price.className = "price";
  price.textContent = formatPrice(product.price || 0);

  const button = document.createElement("button");
  button.className = "add-to-cart-btn";
  button.type = "button";
  button.textContent = "Add to Cart";

  button.addEventListener("click", async () => {
    await addToCart(
      {
        id: product.id,
        name: product.name || "Unnamed product",
        price: Number(product.price) || 0,
        imageURL: product.imageURL || "",
      },
      button,
    );
  });

  bottom.appendChild(price);
  bottom.appendChild(button);

  info.appendChild(title);
  info.appendChild(description);
  info.appendChild(bottom);

  card.appendChild(image);
  card.appendChild(info);

  return card;
}

function renderEmptyState() {
  if (!productsContainer) return;

  productsContainer.innerHTML = `
    <div class="empty-products-state">
      <span class="material-icons empty-products-icon">inventory_2</span>
      <h3>No matching products found</h3>
      <p>Try a different search word or choose another category or price range.</p>
    </div>
  `;
}

function renderProducts() {
  if (!productsContainer) return;

  const filteredProducts = filterProducts();

  productsContainer.innerHTML = "";
  updateResultsCount(filteredProducts.length, allProducts.length);

  if (!filteredProducts.length) {
    renderEmptyState();
    return;
  }

  filteredProducts.forEach((product) => {
    productsContainer.appendChild(createProductCard(product));
  });
}

function closePriceMenu() {
  if (!priceFilterMenu || !priceFilterBtn) return;

  priceFilterMenu.classList.remove("show");
  priceFilterBtn.setAttribute("aria-expanded", "false");
}

function openPriceMenu() {
  if (!priceFilterMenu || !priceFilterBtn) return;

  priceFilterMenu.classList.add("show");
  priceFilterBtn.setAttribute("aria-expanded", "true");
}

function togglePriceMenu() {
  if (!priceFilterMenu) return;

  const isOpen = priceFilterMenu.classList.contains("show");

  if (isOpen) {
    closePriceMenu();
  } else {
    openPriceMenu();
  }
}

async function loadProducts() {
  if (!productsContainer) return;

  try {
    const snapshot = await getDocs(collection(db, "products"));

    if (snapshot.empty) {
      allProducts = [];
      productsContainer.innerHTML = `
        <div class="empty-products-state">
          <span class="material-icons empty-products-icon">inventory_2</span>
          <h3>No products found</h3>
          <p>Add products to your Firestore collection to display them here.</p>
        </div>
      `;
      updateResultsCount(0, 0);
      return;
    }

    allProducts = snapshot.docs.map((productDoc) => {
      const product = productDoc.data();

      return {
        id: productDoc.id,
        name: product.name || "Unnamed product",
        price: Number(product.price) || 0,
        category: product.category || "Uncategorized",
        description: product.description || "No description available.",
        imageURL: product.imageURL || "",
      };
    });

    createCategoryButtons(allProducts);
    updateActiveCategoryButton();
    updateActivePriceOption();
    updatePriceFilterButtonLabel();
    renderProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `
      <div class="empty-products-state">
        <span class="material-icons empty-products-icon">error_outline</span>
        <h3>Failed to load products</h3>
        <p>Please check your Firestore data and try again.</p>
      </div>
    `;
    updateResultsCount(0, 0);
  }
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    searchTerm = event.target.value || "";
    renderProducts();
  });
}

if (priceFilterBtn) {
  priceFilterBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePriceMenu();
  });
}

if (priceFilterMenu) {
  const priceOptions = priceFilterMenu.querySelectorAll(".price-option");

  priceOptions.forEach((option) => {
    option.addEventListener("click", () => {
      selectedPriceRange = option.dataset.price || "all";
      updateActivePriceOption();
      updatePriceFilterButtonLabel();
      closePriceMenu();
      renderProducts();
    });
  });
}

document.addEventListener("click", (event) => {
  if (!priceFilterMenu || !priceFilterBtn) return;

  const clickedInsideMenu = priceFilterMenu.contains(event.target);
  const clickedButton = priceFilterBtn.contains(event.target);

  if (!clickedInsideMenu && !clickedButton) {
    closePriceMenu();
  }
});

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    selectedCategory = "All";
    searchTerm = "";
    selectedPriceRange = "all";

    if (searchInput) {
      searchInput.value = "";
    }

    updateActiveCategoryButton();
    updateActivePriceOption();
    updatePriceFilterButtonLabel();
    closePriceMenu();
    renderProducts();
    clearProductStatus();
  });
}

loadProducts();
