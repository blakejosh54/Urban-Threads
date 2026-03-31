import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const checkoutBtn = document.querySelector(".checkout-btn");
const cartContainer = document.getElementById("cart-container");
const cartTotal = document.getElementById("cart-total");
const cartStatus = document.getElementById("cart-status");

let checkingOut = false;
let updatingCart = false;

function formatPrice(price) {
  return "R" + Number(price).toFixed(2);
}

function showCartStatus(message, type = "info") {
  if (!cartStatus) return;
  cartStatus.textContent = message;
  cartStatus.className = `cart-status ${type}`;
}

function clearCartStatus() {
  if (!cartStatus) return;
  cartStatus.textContent = "";
  cartStatus.className = "cart-status";
}

function setCheckoutButton(disabled, text = "Proceed to Checkout →") {
  if (!checkoutBtn) return;
  checkoutBtn.disabled = disabled;
  checkoutBtn.textContent = text;
}

async function changeQuantity(itemId, change) {
  if (updatingCart) return;

  const user = auth.currentUser;
  if (!user) return;

  updatingCart = true;
  clearCartStatus();

  try {
    const itemRef = doc(db, "users", user.uid, "cart", itemId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      await loadCart();
      return;
    }

    const item = itemSnap.data();
    const currentQuantity = Number(item.quantity) || 0;
    const newQuantity = currentQuantity + change;

    if (newQuantity < 1) {
      showCartStatus(
        "Quantity cannot go below 1. Use Remove to delete the item.",
        "info",
      );
      await loadCart();
      return;
    }

    await updateDoc(itemRef, {
      quantity: newQuantity,
    });

    await loadCart();
  } catch (error) {
    console.error("Error updating quantity:", error);
    showCartStatus("Could not update quantity.", "error");
  } finally {
    updatingCart = false;
  }
}

async function removeItem(itemId) {
  if (updatingCart) return;

  const user = auth.currentUser;
  if (!user) return;

  updatingCart = true;
  clearCartStatus();

  try {
    const itemRef = doc(db, "users", user.uid, "cart", itemId);
    await deleteDoc(itemRef);
    await loadCart();
  } catch (error) {
    console.error("Error removing item:", error);
    showCartStatus("Could not remove item.", "error");
  } finally {
    updatingCart = false;
  }
}

async function loadCart() {
  const user = auth.currentUser;

  if (!user) {
    if (cartContainer) {
      cartContainer.innerHTML = "<p>Please log in to view your cart.</p>";
    }
    if (cartTotal) cartTotal.textContent = "";
    setCheckoutButton(true);
    return;
  }

  try {
    const cartRef = collection(db, "users", user.uid, "cart");
    const snapshot = await getDocs(cartRef);

    if (!cartContainer) return;

    if (snapshot.empty) {
      cartContainer.innerHTML = "<p>Your cart is empty.</p>";
      if (cartTotal) cartTotal.textContent = "";
      setCheckoutButton(true);
      return;
    }

    let total = 0;
    const fragment = document.createDocumentFragment();

    snapshot.forEach((itemDoc) => {
      const item = itemDoc.data();
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      const itemTotal = price * quantity;

      total += itemTotal;

      const wrapper = document.createElement("div");
      wrapper.className = "cart-item";

      const image = document.createElement("img");
      image.className = "cart-item-image";
      image.src = item.imageURL || "";
      image.alt = item.name || "Cart item";
      image.loading = "lazy";
      image.decoding = "async";

      const details = document.createElement("div");
      details.className = "cart-item-details";

      const title = document.createElement("h3");
      title.textContent = item.name || "Unnamed product";

      const controls = document.createElement("div");
      controls.className = "quantity-controls";

      const minusBtn = document.createElement("button");
      minusBtn.className = "quantity-btn decrease-btn";
      minusBtn.type = "button";
      minusBtn.textContent = "-";
      minusBtn.dataset.id = itemDoc.id;
      minusBtn.dataset.action = "decrease";

      const qtyText = document.createElement("span");
      qtyText.className = "quantity-number";
      qtyText.textContent = quantity;

      const plusBtn = document.createElement("button");
      plusBtn.className = "quantity-btn increase-btn";
      plusBtn.type = "button";
      plusBtn.textContent = "+";
      plusBtn.dataset.id = itemDoc.id;
      plusBtn.dataset.action = "increase";

      controls.append(minusBtn, qtyText, plusBtn);

      const priceText = document.createElement("p");
      priceText.textContent = `Price: ${formatPrice(price)}`;

      const totalText = document.createElement("p");
      totalText.textContent = `Total: ${formatPrice(itemTotal)}`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.dataset.id = itemDoc.id;
      removeBtn.dataset.action = "remove";

      details.append(title, controls, priceText, totalText, removeBtn);
      wrapper.append(image, details);
      fragment.appendChild(wrapper);
    });

    window.requestAnimationFrame(() => {
      cartContainer.innerHTML = "";
      cartContainer.appendChild(fragment);

      if (cartTotal) {
        cartTotal.textContent = `Cart Total: ${formatPrice(total)}`;
      }

      setCheckoutButton(false);
    });
  } catch (error) {
    console.error("Error loading cart:", error);
    if (cartContainer) {
      cartContainer.innerHTML = "<p>Failed to load cart items.</p>";
    }
    if (cartTotal) cartTotal.textContent = "";
    setCheckoutButton(true);
  }
}

if (cartContainer) {
  cartContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action][data-id]");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "decrease") {
      await changeQuantity(id, -1);
      return;
    }

    if (action === "increase") {
      await changeQuantity(id, 1);
      return;
    }

    if (action === "remove") {
      await removeItem(id);
    }
  });
}

async function handleCheckout() {
  if (checkingOut) return;

  const user = auth.currentUser;
  if (!user) {
    showCartStatus("Please log in before checking out.", "error");
    return;
  }

  checkingOut = true;
  clearCartStatus();
  setCheckoutButton(true, "Processing...");

  try {
    const cartRef = collection(db, "users", user.uid, "cart");
    const snapshot = await getDocs(cartRef);

    if (snapshot.empty) {
      showCartStatus("Your cart is empty.", "error");
      setCheckoutButton(true);
      return;
    }

    let total = 0;
    let itemCount = 0;
    const items = [];

    snapshot.forEach((itemDoc) => {
      const item = itemDoc.data();
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      const itemTotal = price * quantity;

      total += itemTotal;
      itemCount += quantity;

      items.push({
        id: itemDoc.id,
        name: item.name || "Unnamed product",
        price,
        quantity,
        itemTotal,
        imageURL: item.imageURL || "",
      });
    });

    const orderRef = await addDoc(collection(db, "orders"), {
      userId: user.uid,
      items,
      itemCount,
      total,
      createdAt: serverTimestamp(),
    });

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      ordersCount: increment(1),
    });

    for (const item of snapshot.docs) {
      await deleteDoc(item.ref);
    }

    window.location.href = `./confirmation.html?orderId=${orderRef.id}`;
  } catch (error) {
    console.error("Checkout error:", error);
    showCartStatus("Checkout failed. Please try again.", "error");
    setCheckoutButton(false);
  } finally {
    checkingOut = false;
    if (!checkoutBtn?.disabled) {
      setCheckoutButton(false);
    }
  }
}

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", handleCheckout);
}

onAuthStateChanged(auth, () => {
  loadCart();
});
