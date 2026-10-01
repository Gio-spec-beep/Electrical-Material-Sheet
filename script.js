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
   MATERIAL OPTIONS
========================================================= */

function materialOptions(selected = "") {
  const groups = {};

  MATERIALS.forEach(material => {
    if (!groups[material.category]) {
      groups[material.category] = [];
    }

    groups[material.category].push(material);
  });

  // Completely blank default option
  let html = '<option value=""></option>';

  for (const category of Object.keys(groups)) {
    html += `
      <optgroup label="${esc(category)}">
    `;

    groups[category].forEach(material => {
      html += `
        <option
          value="${esc(material.name)}"
          ${material.name === selected ? "selected" : ""}
        >
          ${esc(material.name)}
        </option>
      `;
    });

    html += `
      </optgroup>
    `;
  }

  return html;
}

/* =========================================================
   TOOL OPTIONS
========================================================= */

function toolOptions(selected = "") {
  let html = '<option value=""></option>';

  TOOLS.forEach(tool => {
    html += `
      <option
        value="${esc(tool)}"
        ${tool === selected ? "selected" : ""}
      >
        ${esc(tool)}
      </option>
    `;
  });

  return html;
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

    const total =
      (Number(row.qty) || 0) * price;

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
          <select
            data-i="${index}"
            class="material-input"
          >
            ${materialOptions(row.material)}
          </select>
        </td>

        <td class="cost-each">
          ${money(price)}
        </td>

        <td class="cost-total">
          ${money(total)}
        </td>

        <td>
          <select
            data-i="${index}"
            class="tool-input"
          >
            ${toolOptions(row.tool)}
          </select>
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
  const body =
    $("priceBody");

  if (!body) return;

  const query =
    search.toLowerCase().trim();

  const filtered =
    MATERIALS.filter(material => {

      const searchable = `
        ${material.category || ""}
        ${material.name || ""}
        ${material.unit || ""}
        ${material.notes || ""}
      `.toLowerCase();

      return searchable.includes(query);
    });

  body.innerHTML =
    filtered.map(material => `
      <tr>

        <td>
          ${esc(material.category)}
        </td>

        <td>
          ${esc(material.name)}
        </td>

        <td>
          ${esc(material.unit)}
        </td>

        <td>
          ${money(material.price)}
        </td>

        <td>
          ${esc(material.notes)}
        </td>

      </tr>
    `).join("");
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
