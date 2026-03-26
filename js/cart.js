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

    cartContainer.innerHTML = "";

    if (snapshot.empty) {
      cartContainer.innerHTML = "<p>Your cart is empty.</p>";
      if (cartTotal) cartTotal.textContent = "";
      setCheckoutButton(true);
      return;
    }

    let total = 0;

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

      const qtyText = document.createElement("span");
      qtyText.className = "quantity-number";
      qtyText.textContent = String(quantity || 1);

      const plusBtn = document.createElement("button");
      plusBtn.className = "quantity-btn increase-btn";
      plusBtn.type = "button";
      plusBtn.textContent = "+";
      plusBtn.dataset.id = itemDoc.id;

      controls.appendChild(minusBtn);
      controls.appendChild(qtyText);
      controls.appendChild(plusBtn);

      const totalText = document.createElement("p");
      totalText.textContent = `Total: ${formatPrice(itemTotal)}`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.dataset.id = itemDoc.id;

      removeBtn.addEventListener("click", async () => {
        await removeItem(itemDoc.id);
      });

      plusBtn.addEventListener("click", async () => {
        await changeQuantity(itemDoc.id, 1);
      });

      minusBtn.addEventListener("click", async () => {
        await changeQuantity(itemDoc.id, -1);
      });

      details.appendChild(title);
      details.appendChild(controls);
      details.appendChild(totalText);
      details.appendChild(removeBtn);

      wrapper.appendChild(image);
      wrapper.appendChild(details);

      cartContainer.appendChild(wrapper);
    });

    if (cartTotal) {
      cartTotal.textContent = `Grand Total: ${formatPrice(total)}`;
    }

    if (!checkingOut) {
      setCheckoutButton(false, "Proceed to Checkout →");
    }
  } catch (error) {
    console.error("Error loading cart:", error);

    if (cartContainer) {
      cartContainer.innerHTML = "<p>Failed to load cart.</p>";
    }

    showCartStatus("Failed to load cart.", "error");
  }
}

async function changeQuantity(productId, change) {
  const user = auth.currentUser;

  if (!user || !productId || updatingCart) return;

  updatingCart = true;
  clearCartStatus();

  try {
    const itemRef = doc(db, "users", user.uid, "cart", productId);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      return;
    }

    const currentQty = Number(itemSnap.data().quantity) || 1;

    if (change < 0 && currentQty <= 1) {
      showCartStatus(
        "Use the Remove button to remove this item from your cart.",
        "info",
      );
      return;
    }

    await updateDoc(itemRef, {
      quantity: increment(change),
    });

    await loadCart();
  } catch (error) {
    console.error("Error changing quantity:", error);
    showCartStatus("Could not update quantity.", "error");
  } finally {
    updatingCart = false;
  }
}

async function removeItem(productId) {
  const user = auth.currentUser;

  if (!user || !productId || updatingCart) return;

  updatingCart = true;
  clearCartStatus();

  try {
    const itemRef = doc(db, "users", user.uid, "cart", productId);
    await deleteDoc(itemRef);
    await loadCart();
    showCartStatus("Item removed from cart.", "success");
  } catch (error) {
    console.error("Error removing item:", error);
    showCartStatus("Could not remove item.", "error");
  } finally {
    updatingCart = false;
  }
}

async function checkout() {
  if (checkingOut) return;

  const user = auth.currentUser;

  if (!user) {
    alert("Please log in before checking out.");
    window.location.href = "./login.html";
    return;
  }

  checkingOut = true;
  setCheckoutButton(true, "Processing...");
  clearCartStatus();

  try {
    const cartRef = collection(db, "users", user.uid, "cart");
    const snapshot = await getDocs(cartRef);

    if (snapshot.empty) {
      alert("Your cart is empty.");
      setCheckoutButton(true, "Proceed to Checkout →");
      checkingOut = false;
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
        productId: itemDoc.id,
        name: item.name || "Unnamed product",
        imageURL: item.imageURL || "",
        price: price,
        quantity: quantity,
        itemTotal: itemTotal,
      });
    });

    const orderRef = await addDoc(collection(db, "orders"), {
      userId: user.uid,
      items: items,
      total: total,
      itemCount: itemCount,
      createdAt: serverTimestamp(),
      status: "confirmed",
    });

    const deleteJobs = snapshot.docs.map((cartDoc) => {
      return deleteDoc(doc(db, "users", user.uid, "cart", cartDoc.id));
    });

    await Promise.all(deleteJobs);

    window.location.href = `./confirmation.html?orderId=${orderRef.id}`;
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Checkout failed. Please try again.");
    setCheckoutButton(false, "Proceed to Checkout →");
    checkingOut = false;
  }
}

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", checkout);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadCart();
  } else {
    if (cartContainer) {
      cartContainer.innerHTML = "<p>Please log in to view your cart.</p>";
    }
    if (cartTotal) cartTotal.textContent = "";
    setCheckoutButton(true);
  }
});
