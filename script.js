let MATERIALS = [];
let TOOLS = [];

const state = {
  rows: Array.from({ length: 50 }, () => ({
    qty: "",
    material: "",
    tool: ""
  })),
  laborHours: 0,
  laborRate: 75
};

const $ = id => document.getElementById(id);

const money = n =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(n) || 0);

const materialByName = name =>
  MATERIALS.find(m => m.name === name);

const esc = v =>
  String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

/* =========================================================
   LOAD DATABASE.JSON
========================================================= */

async function loadDatabase() {
  try {
    const response = await fetch("./database.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Could not load database.json (${response.status})`
      );
    }

    const database = await response.json();

    if (!database || typeof database !== "object") {
      throw new Error("Invalid database.json format.");
    }

    if (!Array.isArray(database.materials)) {
      throw new Error(
        "database.json is missing the materials array."
      );
    }

    if (!Array.isArray(database.tools)) {
      throw new Error(
        "database.json is missing the tools array."
      );
    }

    MATERIALS = database.materials;
    TOOLS = database.tools;

    const versionElement = $("appVersion");
    if (versionElement) {
      versionElement.textContent = "Version " + (database.version || "1.0.0");
    }

    console.log(
      `Database loaded successfully: ${MATERIALS.length} materials, ${TOOLS.length} tools`
    );

    renderRows();
    renderTools();
    renderPrices();

  } catch (error) {
    console.error("Database loading error:", error);

    alert(
      "Could not load database.json.\n\n" +
      "Make sure database.json is in the same folder as index.html and script.js."
    );
  }
}

/* =========================================================
   AUTOCOMPLETE OPTIONS
========================================================= */

function materialValues() {
  return MATERIALS.map(material => material.name);
}

function toolValues() {
  return TOOLS;
}

function autocompleteInput(value, values) {
  const typed = String(value || "").trim();
  if (!typed) return "";

  const exact = values.find(item =>
    item.toLowerCase() === typed.toLowerCase()
  );

  if (exact) return exact;

  const startsWith = values.find(item =>
    item.toLowerCase().startsWith(typed.toLowerCase())
  );

  if (startsWith) return startsWith;

  const contains = values.find(item =>
    item.toLowerCase().includes(typed.toLowerCase())
  );

  return contains || typed;
}

function materialInput(selected = "", index = 0) {
  return `
    <input
      type="text"
      class="material-input"
      data-i="${index}"
      value="${esc(selected)}"
      list="material-options-${index}"
      placeholder="Type material..."
      autocomplete="on"
    >
    <datalist id="material-options-${index}">
      ${MATERIALS.map(material => `
        <option value="${esc(material.name)}" label="${esc(material.category)}"></option>
      `).join("")}
    </datalist>
  `;
}

function toolInput(selected = "", index = 0) {
  return `
    <input
      type="text"
      class="tool-input"
      data-i="${index}"
      value="${esc(selected)}"
      list="tool-options-${index}"
      placeholder="Type tool..."
      autocomplete="on"
    >
    <datalist id="tool-options-${index}">
      ${TOOLS.map(tool => `
        <option value="${esc(tool)}"></option>
      `).join("")}
    </datalist>
  `;
}

function completeInput(input, values) {
  const completed = autocompleteInput(input.value, values);
  input.value = completed;
  return completed;
}

/* =========================================================
   MATERIAL TABLE
========================================================= */

function renderRows() {
  const body = $("materialBody");

  if (!body) return;

  body.innerHTML = state.rows.map((row, index) => {
    const material = materialByName(row.material);
    const price = material?.price || 0;
    const total = (Number(row.qty) || 0) * price;

    return `
      <tr>
        <td>
          <input
            type="number"
            min="0"
            step="1"
            value="${esc(row.qty)}"
            data-i="${index}"
            class="qty-input"
          >
        </td>

        <td>
          ${materialInput(row.material, index)}
        </td>

        <td class="cost-each">
          ${money(price)}
        </td>

        <td class="cost-total">
          ${money(total)}
        </td>

        <td>
          ${toolInput(row.tool, index)}
        </td>
      </tr>
    `;
  }).join("");

  updateTotals();
}
/* =========================================================
   TOTALS
========================================================= */

function updateTotals() {
  let materialTotal = 0;

  state.rows.forEach((row, index) => {
    const material = materialByName(row.material);

    const price = material?.price || 0;

    const total =
      (Number(row.qty) || 0) * price;

    materialTotal += total;

    const tableRow =
      $("materialBody")?.rows[index];

    if (tableRow) {
      const eachCell =
        tableRow.querySelector(".cost-each");

      const totalCell =
        tableRow.querySelector(".cost-total");

      if (eachCell) {
        eachCell.textContent =
          money(price);
      }

      if (totalCell) {
        totalCell.textContent =
          money(total);
      }
    }
  });

  const tax =
    materialTotal * 0.0625;

  const labor =
    (Number(state.laborHours) || 0) *
    (Number(state.laborRate) || 0);

  if ($("materialTotal")) {
    $("materialTotal").textContent =
      money(materialTotal);
  }

  if ($("taxTotal")) {
    $("taxTotal").textContent =
      money(tax);
  }

  if ($("materialsWithTax")) {
    $("materialsWithTax").textContent =
      money(materialTotal + tax);
  }

  if ($("laborTotal")) {
    $("laborTotal").textContent =
      money(labor);
  }

  if ($("grandTotal")) {
    $("grandTotal").textContent =
      money(materialTotal + tax + labor);
  }
}

/* =========================================================
   MATERIAL TABLE EVENTS
========================================================= */

function setupMaterialEvents() {
  const body = $("materialBody");

  if (!body) return;

  body.addEventListener("input", event => {
    const index =
      Number(event.target.dataset.i);

    if (Number.isNaN(index)) return;

    if (
      event.target.classList.contains(
        "qty-input"
      )
    ) {
      state.rows[index].qty =
        event.target.value;
    }

    updateTotals();
  });

  body.addEventListener("change", event => {
    const index =
      Number(event.target.dataset.i);

    if (Number.isNaN(index)) return;

    if (
      event.target.classList.contains(
        "material-input"
      )
    ) {
      state.rows[index].material =
        event.target.value;
    }

    if (
      event.target.classList.contains(
        "tool-input"
      )
    ) {
      state.rows[index].tool =
        event.target.value;
    }

    updateTotals();
  });
}

/* =========================================================
   LABOR
========================================================= */

function setupLaborEvents() {
  const laborHours =
    $("laborHours");

  const laborRate =
    $("laborRate");

  if (laborHours) {
    laborHours.addEventListener(
      "input",
      event => {
        state.laborHours =
          event.target.value;

        updateTotals();
      }
    );
  }

  if (laborRate) {
    laborRate.addEventListener(
      "input",
      event => {
        state.laborRate =
          event.target.value;

        updateTotals();
      }
    );
  }
}

/* =========================================================
   PRINT
========================================================= */

function setupPrintButton() {
  const printButton =
    $("printBtn");

  if (!printButton) return;

  printButton.onclick = () => {
    window.print();
  };
}

/* =========================================================
   CLEAR PROJECT
========================================================= */

function setupClearButton() {
  const clearButton =
    $("clearBtn");

  if (!clearButton) return;

  clearButton.onclick = () => {
    if (!confirm("Clear this project?")) {
      return;
    }

    state.rows =
      Array.from(
        { length: 50 },
        () => ({
          qty: "",
          material: "",
          tool: ""
        })
      );

    state.laborHours = 0;
    state.laborRate = 75;

    if ($("jobName")) {
      $("jobName").value = "";
    }

    if ($("projectType")) {
      $("projectType").value = "";
    }

    if ($("laborHours")) {
      $("laborHours").value = 0;
    }

    if ($("laborRate")) {
      $("laborRate").value = 75;
    }

    renderRows();
  };
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {
  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.onclick = () => {

        document
          .querySelectorAll(".nav-btn")
          .forEach(item => {
            item.classList.remove(
              "active"
            );
          });

        document
          .querySelectorAll(".page-section")
          .forEach(section => {
            section.classList.remove(
              "active"
            );
          });

        button.classList.add("active");

        const section =
          $(button.dataset.section);

        if (section) {
          section.classList.add(
            "active"
          );
        }
      };
    });
}

/* =========================================================
   TOOL LIST
========================================================= */

function renderTools() {
  const grid =
    $("toolListGrid");

  if (!grid) return;

  grid.innerHTML =
    TOOLS.map(tool => `
      <div class="tool-item">

        <span>
          ${esc(tool)}
        </span>

        <select>
          <option>Status</option>
          <option>Have</option>
          <option>Need</option>
        </select>

        <input
          type="number"
          min="1"
          value="1"
        >

      </div>
    `).join("");
}

/* =========================================================
   PRICE LIST
========================================================= */

function renderPrices(search = "") {
  const body = $("priceBody");

  if (!body) return;

  const query = search.toLowerCase().trim();

  const filtered = MATERIALS.filter(material => {
    const searchable = `
      ${material.category || ""}
      ${material.name || ""}
      ${material.unit || ""}
      ${material.notes || ""}
    `.toLowerCase();

    return searchable.includes(query);
  });

  body.innerHTML = filtered.map(material => {
    const productUrl = material.url || "";

    const materialName = productUrl
      ? `
        <a
          class="material-link"
          href="${esc(productUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          title="Buy at Home Depot"
        >
          ${esc(material.name)}
        </a>
      `
      : esc(material.name);

    return `
      <tr>
        <td>${esc(material.category)}</td>
        <td>${materialName}</td>
        <td>${esc(material.unit)}</td>
        <td>${money(material.price)}</td>
        <td>${esc(material.notes)}</td>
      </tr>
    `;
  }).join("");
}

/* =========================================================
   PRICE SEARCH
========================================================= */

function setupPriceSearch() {
  const search =
    $("priceSearch");

  if (!search) return;

  search.addEventListener(
    "input",
    event => {
      renderPrices(
        event.target.value
      );
    }
  );
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function init() {

  if ($("jobDate")) {
    $("jobDate").valueAsDate =
      new Date();
  }

  setupMaterialEvents();
  setupLaborEvents();
  setupPrintButton();
  setupClearButton();
  setupNavigation();
  setupPriceSearch();

  // Load database FIRST
  await loadDatabase();
}

/* =========================================================
   START APP
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init
  );
} else {
  init();
}
