const catalog = [
  {
    id: "furniture",
    label: "ריהוט",
    children: [
      {
        id: "wardrobes",
        label: "ארונות",
        children: [
          { id: "wardrobe-2", label: "ארון 2 דלתות", ratePerKm: 12 },
          { id: "wardrobe-3", label: "ארון 3 דלתות", ratePerKm: 16 },
          { id: "wardrobe-4", label: "ארון 4 דלתות", ratePerKm: 20 },
        ],
      },
      {
        id: "beds",
        label: "מיטות",
        children: [
          { id: "bed-single", label: "מיטה יחיד", ratePerKm: 10 },
          { id: "bed-double", label: "מיטה זוגית", ratePerKm: 14 },
        ],
      },
    ],
  },
  {
    id: "appliances",
    label: "מוצרי חשמל",
    children: [
      {
        id: "fridges",
        label: "מקררים",
        children: [
          { id: "fridge-small", label: "מקרר קטן", ratePerKm: 18 },
          { id: "fridge-large", label: "מקרר גדול", ratePerKm: 26 },
        ],
      },
      {
        id: "washers",
        label: "מכונות כביסה",
        children: [{ id: "washer", label: "מכונת כביסה", ratePerKm: 15 }],
      },
    ],
  },
  {
    id: "boxes",
    label: "קרטונים",
    children: [
      { id: "box-small", label: "קרטון קטן", ratePerKm: 3 },
      { id: "box-large", label: "קרטון גדול", ratePerKm: 5 },
    ],
  },
];

const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const itemTree = document.getElementById("item-tree");
const rateTable = document.getElementById("rate-table");
const quoteSummary = document.getElementById("quote-summary");
const submitQuote = document.getElementById("submit-quote");
const clientMessage = document.getElementById("client-message");
const clientShipments = document.getElementById("client-shipments");
const pendingShipments = document.getElementById("pending-shipments");
const approvedCalendar = document.getElementById("approved-calendar");
const statApproved = document.getElementById("stat-approved");
const statRejected = document.getElementById("stat-rejected");
const statPending = document.getElementById("stat-pending");
const clientForm = document.getElementById("client-form");
const rateForm = document.getElementById("rate-form");

const STORAGE_KEYS = {
  rates: "moving_rates",
  shipments: "moving_shipments",
};

const state = {
  selectedItems: new Map(),
};

const flattenCatalog = (nodes, path = []) => {
  return nodes.flatMap((node) => {
    if (node.children) {
      return flattenCatalog(node.children, [...path, node.label]);
    }
    return [{ ...node, path }];
  });
};

const defaultRates = () => {
  const rateMap = {};
  flattenCatalog(catalog).forEach((item) => {
    rateMap[item.id] = item.ratePerKm;
  });
  return rateMap;
};

const loadRates = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.rates);
  if (!stored) {
    return defaultRates();
  }
  try {
    return { ...defaultRates(), ...JSON.parse(stored) };
  } catch (error) {
    return defaultRates();
  }
};

const saveRates = (rates) => {
  localStorage.setItem(STORAGE_KEYS.rates, JSON.stringify(rates));
};

const loadShipments = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.shipments);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
};

const saveShipments = (shipments) => {
  localStorage.setItem(STORAGE_KEYS.shipments, JSON.stringify(shipments));
};

const buildTree = (nodes, container) => {
  const list = document.createElement("ul");
  nodes.forEach((node) => {
    const item = document.createElement("li");
    if (node.children) {
      const label = document.createElement("div");
      label.textContent = node.label;
      label.className = "tree-item";
      item.appendChild(label);
      buildTree(node.children, item);
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "tree-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.itemId = node.id;

      const name = document.createElement("span");
      name.textContent = node.label;

      const quantity = document.createElement("input");
      quantity.type = "number";
      quantity.min = "1";
      quantity.value = "1";
      quantity.disabled = true;
      quantity.dataset.quantityFor = node.id;

      checkbox.addEventListener("change", () => {
        quantity.disabled = !checkbox.checked;
        if (checkbox.checked) {
          state.selectedItems.set(node.id, {
            id: node.id,
            label: node.label,
            quantity: Number(quantity.value) || 1,
          });
        } else {
          state.selectedItems.delete(node.id);
        }
        renderQuoteSummary();
      });

      quantity.addEventListener("input", () => {
        if (state.selectedItems.has(node.id)) {
          state.selectedItems.get(node.id).quantity = Number(quantity.value) || 1;
          renderQuoteSummary();
        }
      });

      wrapper.append(checkbox, name, quantity);
      item.appendChild(wrapper);
    }
    list.appendChild(item);
  });
  container.appendChild(list);
};

const buildRateTable = () => {
  const items = flattenCatalog(catalog);
  const rates = loadRates();

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>פריט</th>
        <th>נתיב קטגוריה</th>
        <th>עלות לק"מ</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.label}</td>
      <td>${item.path.join(" › ")}</td>
      <td>
        <input type="number" min="1" step="1" value="${
          rates[item.id] ?? item.ratePerKm
        }" data-rate-id="${item.id}" />
      </td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  rateTable.innerHTML = "";
  rateTable.appendChild(table);
};

const getFormData = () => {
  const formData = new FormData(clientForm);
  return {
    customerName: formData.get("customerName").trim(),
    customerPhone: formData.get("customerPhone").trim(),
    startPoint: formData.get("startPoint").trim(),
    endPoint: formData.get("endPoint").trim(),
    moveDate: formData.get("moveDate"),
    distanceKm: Number(formData.get("distanceKm")),
  };
};

const renderQuoteSummary = () => {
  const rates = loadRates();
  const { distanceKm } = getFormData();
  const items = Array.from(state.selectedItems.values());

  if (!items.length) {
    quoteSummary.innerHTML = "<p class=\"hint\">לא נבחרו פריטים להצעת מחיר.</p>";
    return;
  }

  let total = 0;
  const rows = items
    .map((item) => {
      const rate = rates[item.id] ?? 0;
      const subtotal = rate * (distanceKm || 0) * item.quantity;
      total += subtotal;
      return `
        <tr>
          <td>${item.label}</td>
          <td>${item.quantity}</td>
          <td>${rate} ₪</td>
          <td>${distanceKm || 0}</td>
          <td>${subtotal.toFixed(2)} ₪</td>
        </tr>
      `;
    })
    .join("");

  quoteSummary.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>פריט</th>
          <th>כמות</th>
          <th>תעריף לק"מ</th>
          <th>מרחק (ק"מ)</th>
          <th>סה"כ לפריט</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <strong>סה"כ להצעה: ${total.toFixed(2)} ₪</strong>
  `;
};

const createShipment = () => {
  const details = getFormData();
  const items = Array.from(state.selectedItems.values());
  const rates = loadRates();

  const calculatedItems = items.map((item) => ({
    ...item,
    ratePerKm: rates[item.id] ?? 0,
    subtotal: (rates[item.id] ?? 0) * details.distanceKm * item.quantity,
  }));

  const total = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
    ...details,
    items: calculatedItems,
    total,
  };
};

const renderClientShipments = () => {
  const { customerPhone } = getFormData();
  if (!customerPhone) {
    clientShipments.innerHTML = "<p class=\"hint\">נא להזין טלפון כדי לצפות בהובלות.</p>";
    return;
  }
  const shipments = loadShipments().filter(
    (shipment) => shipment.customerPhone === customerPhone
  );

  if (!shipments.length) {
    clientShipments.innerHTML = "<p class=\"hint\">אין הובלות עבור מספר זה.</p>";
    return;
  }

  clientShipments.innerHTML = shipments
    .map((shipment) => {
      return `
        <div class="shipment-card">
          <div>
            <strong>${shipment.startPoint}</strong> → <strong>${shipment.endPoint}</strong>
          </div>
          <div>תאריך: ${shipment.moveDate}</div>
          <div>סה"כ: ${shipment.total.toFixed(2)} ₪</div>
          <span class="badge ${shipment.status}">${formatStatus(shipment.status)}</span>
          ${
            shipment.status === "approved"
              ? `<div class="message">ההובלה אושרה! פרטי ההובלה: ${shipment.startPoint} → ${shipment.endPoint} בתאריך ${shipment.moveDate}.</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
};

const formatStatus = (status) => {
  switch (status) {
    case "approved":
      return "אושרה";
    case "rejected":
      return "לא אושרה";
    default:
      return "בהמתנה";
  }
};

const renderBusinessDashboard = () => {
  const shipments = loadShipments();
  const approved = shipments.filter((shipment) => shipment.status === "approved");
  const rejected = shipments.filter((shipment) => shipment.status === "rejected");
  const pending = shipments.filter((shipment) => shipment.status === "pending");

  statApproved.textContent = approved.length;
  statRejected.textContent = rejected.length;
  statPending.textContent = pending.length;

  pendingShipments.innerHTML = pending.length
    ? pending
        .map((shipment) => {
          const itemList = shipment.items
            .map(
              (item) =>
                `<li>${item.label} (${item.quantity}) - ${item.subtotal.toFixed(2)} ₪</li>`
            )
            .join("");
          return `
            <div class="shipment-card">
              <div><strong>${shipment.customerName}</strong> (${shipment.customerPhone})</div>
              <div>${shipment.startPoint} → ${shipment.endPoint}</div>
              <div>תאריך: ${shipment.moveDate} | מרחק: ${shipment.distanceKm} ק"מ</div>
              <ul>${itemList}</ul>
              <div><strong>סה"כ: ${shipment.total.toFixed(2)} ₪</strong></div>
              <div class="actions">
                <button class="secondary" data-action="approve" data-id="${shipment.id}">אשר</button>
                <button class="primary" data-action="reject" data-id="${shipment.id}">דחה</button>
              </div>
            </div>
          `;
        })
        .join("")
    : "<p class=\"hint\">אין הובלות שממתינות לאישור.</p>";

  const grouped = approved.reduce((acc, shipment) => {
    acc[shipment.moveDate] = acc[shipment.moveDate] || [];
    acc[shipment.moveDate].push(shipment);
    return acc;
  }, {});

  const calendarMarkup = Object.keys(grouped)
    .sort()
    .map((date) => {
      const list = grouped[date]
        .map(
          (shipment) =>
            `<li>${shipment.customerName} - ${shipment.startPoint} → ${shipment.endPoint}</li>`
        )
        .join("");
      return `
        <div class="calendar-day">
          <strong>${date}</strong>
          <ul>${list}</ul>
        </div>
      `;
    })
    .join("");

  approvedCalendar.innerHTML = calendarMarkup || "<p class=\"hint\">אין הובלות מאושרות להצגה.</p>";
};

const updateShipmentStatus = (id, status) => {
  const shipments = loadShipments();
  const updated = shipments.map((shipment) =>
    shipment.id === id ? { ...shipment, status } : shipment
  );
  saveShipments(updated);
  renderBusinessDashboard();
  renderClientShipments();
};

const initTabs = () => {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((button) => button.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
};

const init = () => {
  buildTree(catalog, itemTree);
  buildRateTable();
  renderQuoteSummary();
  renderBusinessDashboard();
  renderClientShipments();
  initTabs();
};

rateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const inputs = rateForm.querySelectorAll("input[data-rate-id]");
  const rates = loadRates();
  inputs.forEach((input) => {
    rates[input.dataset.rateId] = Number(input.value) || 0;
  });
  saveRates(rates);
  renderQuoteSummary();
  buildRateTable();
});

submitQuote.addEventListener("click", () => {
  const items = Array.from(state.selectedItems.values());
  if (!items.length) {
    clientMessage.textContent = "נא לבחור לפחות פריט אחד.";
    return;
  }

  if (!clientForm.reportValidity()) {
    clientMessage.textContent = "נא למלא את כל הפרטים לפני אישור.";
    return;
  }

  const shipment = createShipment();
  const shipments = loadShipments();
  shipments.push(shipment);
  saveShipments(shipments);

  clientMessage.textContent = "ההובלה עברה לאישור החברה!";
  clientForm.reset();
  state.selectedItems.clear();
  itemTree.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
    checkbox.checked = false;
  });
  itemTree.querySelectorAll("input[type=number]").forEach((input) => {
    input.value = "1";
    input.disabled = true;
  });
  renderQuoteSummary();
  renderBusinessDashboard();
  renderClientShipments();
});

pendingShipments.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  updateShipmentStatus(button.dataset.id, button.dataset.action === "approve" ? "approved" : "rejected");
});

clientForm.addEventListener("input", (event) => {
  if (event.target.name === "distanceKm") {
    renderQuoteSummary();
  }
  if (event.target.name === "customerPhone") {
    renderClientShipments();
  }
});

init();
