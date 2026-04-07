// ── CONFIG — Railway backend URL ──────────────────────────────────────────
const API_BASE = "https://billing-system-production-6f7b.up.railway.app";

// ── STATE ─────────────────────────────────────────────────────────────────
let products = [];
let bills = [];
let billItems = [];

// ── LOGIN ─────────────────────────────────────────────────────────────────
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.status === "success") {
      document.getElementById("loginSection").classList.add("hidden");
      document.getElementById("appSection").classList.remove("hidden");
      showPage("dashboardPage");
      await refreshAll();
    } else {
      alert("Invalid Login!");
    }
  } catch (e) {
    alert("Cannot reach server. Check your connection.");
  }
}

function logout() {
  document.getElementById("loginSection").classList.remove("hidden");
  document.getElementById("appSection").classList.add("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
async function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(pageId).classList.remove("hidden");

  if (pageId === "productsPage") { await loadProducts(); renderProducts(); }
  if (pageId === "billingPage")  { await loadProducts(); renderProductDropdown(); renderBillTable(); }
  if (pageId === "billsPage")    { await loadBills(); renderBills(); }
  if (pageId === "dashboardPage") updateDashboard();
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────
async function loadProducts() {
  const res = await fetch(`${API_BASE}/api/products`);
  products = await res.json();
}

async function addProduct() {
  const name  = document.getElementById("product_name").value.trim();
  const price = parseFloat(document.getElementById("product_price").value);
  const stock = parseInt(document.getElementById("product_stock").value);

  if (!name || isNaN(price) || isNaN(stock) || price <= 0 || stock < 0) {
    alert("Please enter valid product details.");
    return;
  }

  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName: name, price, stock })
  });
  const data = await res.json();

  if (data.status === "success") {
    document.getElementById("product_name").value = "";
    document.getElementById("product_price").value = "";
    document.getElementById("product_stock").value = "";
    await loadProducts();
    renderProducts();
    renderProductDropdown();
    updateDashboard();
    alert("Product added!");
  } else {
    alert("Error adding product.");
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  await fetch(`${API_BASE}/api/products/${id}`, { method: "DELETE" });
  await loadProducts();
  renderProducts();
  renderProductDropdown();
  updateDashboard();
}

function renderProducts() {
  const tbody = document.getElementById("productsTableBody");
  if (!products || products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No products added yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.productName}</td>
      <td>₹ ${p.price}</td>
      <td>${p.stock}</td>
      <td><button class="danger" onclick="deleteProduct(${p.id})">Delete</button></td>
    </tr>`).join("");
}

function renderProductDropdown() {
  const dd = document.getElementById("productDropdown");
  dd.innerHTML = `<option value="">Select Product</option>` +
    products.map(p =>
      `<option value="${p.id}">${p.productName} — ₹${p.price} (Stock: ${p.stock})</option>`
    ).join("");
}

// ── BILLING ───────────────────────────────────────────────────────────────
function addItemFromProduct() {
  const pid = parseInt(document.getElementById("productDropdown").value);
  const qty = parseInt(document.getElementById("itemQty").value);

  if (!pid || isNaN(qty) || qty <= 0) { alert("Select a product and enter valid quantity."); return; }

  const product = products.find(p => p.id === pid);
  if (!product) { alert("Product not found."); return; }
  if (qty > product.stock) { alert("Not enough stock!"); return; }

  billItems.push({
    productId: product.id,
    name: product.productName,
    price: product.price,
    qty,
    total: product.price * qty
  });
  renderBillTable();
  document.getElementById("itemQty").value = "";
}

function renderBillTable() {
  const tbody = document.getElementById("billTableBody");
  let total = 0;

  if (billItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No items added to bill.</td></tr>`;
    document.getElementById("grandTotal").textContent = "0";
    return;
  }

  tbody.innerHTML = billItems.map((item, i) => {
    total += item.total;
    return `<tr>
      <td>${item.name}</td>
      <td>₹ ${item.price}</td>
      <td>${item.qty}</td>
      <td>₹ ${item.total}</td>
      <td><button class="danger" onclick="deleteBillItem(${i})">Delete</button></td>
    </tr>`;
  }).join("");

  document.getElementById("grandTotal").textContent = total.toFixed(2);
}

function deleteBillItem(index) {
  billItems.splice(index, 1);
  renderBillTable();
}

async function saveBill() {
  const customerName  = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  const totalAmount   = parseFloat(document.getElementById("grandTotal").textContent);

  if (!customerName) { alert("Enter customer name."); return; }
  if (billItems.length === 0) { alert("Add at least one item."); return; }

  const res = await fetch(`${API_BASE}/api/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName, customerPhone, totalAmount, items: billItems })
  });
  const data = await res.json();

  if (data.status === "success") {
    alert("Bill saved successfully!");
    billItems = [];
    document.getElementById("customerName").value = "";
    document.getElementById("customerPhone").value = "";
    renderBillTable();
    await loadProducts();
    renderProductDropdown();
    await loadBills();
    updateDashboard();
  } else {
    alert("Error: " + (data.message || "Could not save bill."));
  }
}

// ── BILLS ─────────────────────────────────────────────────────────────────
async function loadBills() {
  const res = await fetch(`${API_BASE}/api/bills`);
  bills = await res.json();
}

function renderBills() {
  const tbody = document.getElementById("billsTableBody");
  if (!bills || bills.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No bills saved yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = bills.map(b => `
    <tr>
      <td>${b.id}</td>
      <td>${b.customerName}</td>
      <td>${b.customerPhone || "—"}</td>
      <td>₹ ${b.totalAmount}</td>
      <td>${b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</td>
    </tr>`).join("");
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function updateDashboard() {
  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalBills").textContent = bills.length;
  const rev = bills.reduce((s, b) => s + b.totalAmount, 0);
  document.getElementById("totalRevenue").textContent = rev.toFixed(2);
}

async function refreshAll() {
  await loadProducts();
  await loadBills();
  renderProducts();
  renderProductDropdown();
  renderBillTable();
  renderBills();
  updateDashboard();
}

// Init
renderBillTable();
