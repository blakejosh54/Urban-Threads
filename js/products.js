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

function formatPrice(price) {
  return "R" + Number(price).toFixed(2);
}

async function addToCart(product) {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in to add items to your cart.");
    window.location.href = "./login.html";
    return;
  }

  if (productStatus) {
    productStatus.textContent = "";
    productStatus.className = "product-status";
  }

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

    if (productStatus) {
      productStatus.textContent = `${product.name} added to cart.`;
      productStatus.className = "product-status success";
    }
  } catch (error) {
    console.error("Error adding to cart:", error);

    if (productStatus) {
      productStatus.textContent = "Could not add item to cart.";
      productStatus.className = "product-status error";
    }
  }
}

async function loadProducts() {
  if (!productsContainer) return;

  try {
    const snapshot = await getDocs(collection(db, "products"));

    productsContainer.innerHTML = "";

    if (snapshot.empty) {
      productsContainer.innerHTML = "<p>No products found.</p>";
      return;
    }

    snapshot.forEach((productDoc) => {
      const product = productDoc.data();

      const card = document.createElement("div");
      card.className = "product-card";

      const image = document.createElement("img");
      image.className = "product-image";
      image.src = product.imageURL || "";
      image.alt = product.name || "Product image";

      const info = document.createElement("div");
      info.className = "product-info";

      const title = document.createElement("h3");
      title.textContent = product.name || "Unnamed product";

      const category = document.createElement("p");
      category.className = "category";
      category.textContent = `Category: ${product.category || "Uncategorized"}`;

      const description = document.createElement("p");
      description.className = "description";
      description.textContent =
        product.description || "No description available.";

      const price = document.createElement("p");
      price.className = "price";
      price.textContent = formatPrice(product.price || 0);

      const button = document.createElement("button");
      button.className = "add-to-cart-btn";
      button.type = "button";
      button.textContent = "Add to Cart";

      button.addEventListener("click", async () => {
        await addToCart({
          id: productDoc.id,
          name: product.name || "Unnamed product",
          price: Number(product.price) || 0,
          imageURL: product.imageURL || "",
        });
      });

      info.appendChild(title);
      info.appendChild(category);
      info.appendChild(description);
      info.appendChild(price);
      info.appendChild(button);
      
      card.appendChild(image);
      card.appendChild(info);

      productsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = "<p>Failed to load products.</p>";
  }
}

loadProducts();
