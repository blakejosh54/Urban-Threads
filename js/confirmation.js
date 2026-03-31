import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const confirmationDetails = document.getElementById("confirmation-details");

function getOrderIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("orderId");
}

function formatCurrency(value) {
  return `R${Number(value).toFixed(2)}`;
}

function createTextElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderOrderSummary(orderId, order) {
  if (!confirmationDetails) return;

  const summary = document.createElement("div");
  summary.className = "confirmation-summary";

  summary.appendChild(createTextElement("p", `Order ID: ${orderId}`));

  summary.appendChild(
    createTextElement("p", `Total Items: ${Number(order.itemCount) || 0}`),
  );

  summary.appendChild(
    createTextElement(
      "p",
      `Order Total: ${formatCurrency(order.total || 0)}`,
      "confirmation-total",
    ),
  );

  const itemsWrapper = document.createElement("div");
  itemsWrapper.className = "confirmation-items-list";

  const heading = createTextElement("h3", "Your Order Summary");
  itemsWrapper.appendChild(heading);

  const items = Array.isArray(order.items) ? order.items : [];
  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const itemCard = document.createElement("div");
    itemCard.className = "confirmation-item";

    const image = document.createElement("img");
    image.className = "confirmation-item-image";
    image.src = item.imageURL || "";
    image.alt = item.name || "Order item";
    image.loading = "lazy";
    image.decoding = "async";

    const info = document.createElement("div");
    info.className = "confirmation-item-info";

    info.appendChild(createTextElement("h4", item.name || "Unnamed product"));
    info.appendChild(
      createTextElement("p", `Quantity: ${Number(item.quantity) || 0}`),
    );
    info.appendChild(
      createTextElement("p", `Price: ${formatCurrency(item.price || 0)}`),
    );
    info.appendChild(
      createTextElement(
        "p",
        `Item Total: ${formatCurrency(item.itemTotal || 0)}`,
      ),
    );

    itemCard.append(image, info);
    fragment.appendChild(itemCard);
  });

  itemsWrapper.appendChild(fragment);

  window.requestAnimationFrame(() => {
    confirmationDetails.innerHTML = "";
    confirmationDetails.append(summary, itemsWrapper);
  });
}

async function loadOrderSummary(user) {
  const orderId = getOrderIdFromURL();

  if (!orderId) {
    confirmationDetails.innerHTML = "<p>Order not found.</p>";
    return;
  }

  try {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      confirmationDetails.innerHTML = "<p>Order not found.</p>";
      return;
    }

    const order = orderSnap.data();

    if (order.userId !== user.uid) {
      confirmationDetails.innerHTML =
        "<p>You are not allowed to view this order.</p>";
      return;
    }

    renderOrderSummary(orderId, order);
  } catch (error) {
    console.error("Error loading order:", error);
    confirmationDetails.innerHTML = "<p>Failed to load order summary.</p>";
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  loadOrderSummary(user);
});
