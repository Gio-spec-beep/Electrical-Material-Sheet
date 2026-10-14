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
  const categories = [...new Set(MATERIALS.map(m => m.category))];
  const grouped = categories.map(category => {
    const items = MATERIALS.filter(m => m.category === category);
    return `
      <div class="material-option-group">
        <div class="material-option-category">${esc(category)}</div>
        ${items.map(material => `
          <button type="button" class="material-option" data-value="${esc(material.name)}">
            ${esc(material.name)}
          </button>
        `).join("")}
      </div>
    `;
  }).join("");

  return `
    <div class="material-picker">
      <input
        type="text"
        class="material-input"
        data-i="${index}"
        value="${esc(selected)}"
        placeholder=""
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded="false"
      >
      <div class="material-dropdown" data-i="${index}" hidden>
        ${grouped}
      </div>
    </div>
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
      placeholder=""
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

function showMaterialDropdown(input) {
  const picker = input.closest(".material-picker");
  const dropdown = picker?.querySelector(".material-dropdown");
  if (!dropdown) return;
  dropdown.hidden = false;
  input.setAttribute("aria-expanded", "true");
  filterMaterialDropdown(input);
}

function hideMaterialDropdown(input) {
  const picker = input.closest(".material-picker");
  const dropdown = picker?.querySelector(".material-dropdown");
  if (!dropdown) return;
  dropdown.hidden = true;
  input.setAttribute("aria-expanded", "false");
}

function filterMaterialDropdown(input) {
  const picker = input.closest(".material-picker");
  const dropdown = picker?.querySelector(".material-dropdown");
  if (!dropdown) return;

  const query = input.value.trim().toLowerCase();
  dropdown.querySelectorAll(".material-option-group").forEach(group => {
    let visible = 0;
    group.querySelectorAll(".material-option").forEach(option => {
      const match = !query || option.textContent.toLowerCase().includes(query);
      option.hidden = !match;
      if (match) visible++;
    });
    group.hidden = visible === 0;
  });
}

function chooseMaterial(input, value) {
  const index = Number(input.dataset.i);
  input.value = value;
  if (!Number.isNaN(index)) {
    state.rows[index].material = value;
  }
  hideMaterialDropdown(input);
  updateTotals();
}

function setupMaterialEvents() {
  const body = $("materialBody");
  if (!body) return;

  body.addEventListener("input", event => {
    const index = Number(event.target.dataset.i);
    if (Number.isNaN(index)) return;

    if (event.target.classList.contains("qty-input")) {
      state.rows[index].qty = event.target.value;
      updateTotals();
    }

    if (event.target.classList.contains("material-input")) {
      state.rows[index].material = event.target.value;
      showMaterialDropdown(event.target);
      filterMaterialDropdown(event.target);
      updateTotals();
    }

    if (event.target.classList.contains("tool-input")) {
      state.rows[index].tool = event.target.value;
      updateTotals();
    }
  });

  body.addEventListener("focusin", event => {
    if (event.target.classList.contains("material-input")) {
      showMaterialDropdown(event.target);
      filterMaterialDropdown(event.target);
    }
  });

  body.addEventListener("focusout", event => {
    if (!event.target.classList.contains("material-input")) return;
    setTimeout(() => {
      if (!event.target.closest(".material-picker")?.contains(document.activeElement)) {
        hideMaterialDropdown(event.target);
      }
    }, 120);
  });

  body.addEventListener("mousedown", event => {
    const option = event.target.closest(".material-option");
    if (!option) return;
    event.preventDefault();
    const input = option.closest(".material-picker")?.querySelector(".material-input");
    if (input) chooseMaterial(input, option.dataset.value);
  });

  body.addEventListener("change", event => {
    const index = Number(event.target.dataset.i);
    if (Number.isNaN(index)) return;

    if (event.target.classList.contains("tool-input")) {
      state.rows[index].tool = completeInput(event.target, toolValues());
      updateTotals();
    }
  });

  body.addEventListener("keydown", event => {
    if (
      !event.target.classList.contains("material-input") &&
      !event.target.classList.contains("tool-input")
    ) return;

    if (event.target.classList.contains("material-input")) {
      const dropdown = event.target.closest(".material-picker")?.querySelector(".material-dropdown");
      if (event.key === "Enter" || event.key === "Tab") {
        const first = dropdown?.querySelector(".material-option:not([hidden])");
        if (first) {
          chooseMaterial(event.target, first.dataset.value);
          if (event.key === "Enter") event.preventDefault();
        }
      } else if (event.key === "Escape") {
        hideMaterialDropdown(event.target);
      }
      return;
    }

    if (event.key !== "Tab" && event.key !== "Enter") return;

    const completed = completeInput(event.target, toolValues());
    const index = Number(event.target.dataset.i);
    if (!Number.isNaN(index)) {
      state.rows[index].tool = completed;
      updateTotals();
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.target.dispatchEvent(new Event("change", { bubbles: true }));
    }
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
   ELECTRICAL SCHOOL CALCULATORS
========================================================= */
const CALC_WIRE_SIZES=["14","12","10","8","6","4","3","2","1","1/0","2/0","3/0","4/0"];
const WIRE_AREA_MM2={"14":2.08,"12":3.31,"10":5.26,"8":8.37,"6":13.3,"4":21.2,"3":26.7,"2":33.6,"1":42.4,"1/0":53.5,"2/0":67.4,"3/0":85,"4/0":107.2};
const AWG_DIAM_MM={"14":1.628,"12":2.053,"10":2.588,"8":3.264,"6":4.115,"4":5.189,"3":5.827,"2":6.544,"1":7.348,"1/0":8.251,"2/0":9.266,"3/0":10.404,"4/0":11.684};
const AMPACITY={cu:{60:{"14":15,"12":20,"10":30,"8":40,"6":55,"4":70,"3":85,"2":95,"1":110,"1/0":125,"2/0":145,"3/0":165,"4/0":195},75:{"14":20,"12":25,"10":35,"8":50,"6":65,"4":85,"3":100,"2":115,"1":130,"1/0":150,"2/0":175,"3/0":195,"4/0":230},90:{"14":25,"12":30,"10":40,"8":55,"6":75,"4":95,"3":115,"2":130,"1":150,"1/0":170,"2/0":195,"3/0":225,"4/0":260}},al:{60:{"12":15,"10":25,"8":35,"6":40,"4":55,"3":65,"2":75,"1":85,"1/0":100,"2/0":115,"3/0":130,"4/0":150},75:{"12":20,"10":30,"8":40,"6":50,"4":65,"3":75,"2":90,"1":100,"1/0":120,"2/0":135,"3/0":155,"4/0":180},90:{"12":25,"10":35,"8":45,"6":55,"4":75,"3":85,"2":100,"1":115,"1/0":135,"2/0":150,"3/0":175,"4/0":205}}};
const BOX_ALLOWANCE={"14":2,"12":2.25,"10":2.5,"8":3,"6":5,"4":7,"3":8,"2":9,"1":10,"1/0":11,"2/0":12,"3/0":13,"4/0":14};
const CONDUIT_AREA={emt:{"1/2":.122,"3/4":.213,"1":.346,"1-1/4":.598,"1-1/2":.814,"2":1.342},pvc40:{"1/2":.159,"3/4":.275,"1":.449,"1-1/4":.780,"1-1/2":1.041,"2":1.677},pvc80:{"1/2":.135,"3/4":.225,"1":.384,"1-1/4":.644,"1-1/2":.845,"2":1.326}};
const CALC_K={cu:12.9,al:21.2};
const cnum=id=>Number($(id)?.value);
const cf=(n,d=3)=>Number.isFinite(n)?Number(n).toFixed(d).replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1"):"—";
const pos=n=>Number.isFinite(n)&&n>0;
function cres(id,title,lines){const e=$(id);if(e)e.innerHTML="<strong>"+esc(title)+"</strong><br>"+lines.join("<br>");}
function fillCalcSelects(){["ampAWG","cfAWG","bfAWG","vdAWG","unitAWG"].forEach(id=>{const e=$(id);if(e)e.innerHTML=CALC_WIRE_SIZES.map(s=>`<option value="${s}">#${s}</option>`).join("");});const c=$("cfConduit");if(c)c.innerHTML=Object.keys(CONDUIT_AREA.emt).map(s=>`<option value="${s}">${s}"</option>`).join("");}
function calcOhm(){let V=cnum("ohmV"),I=cnum("ohmI"),R=cnum("ohmR"),P=cnum("ohmP");if([V,I,R,P].filter(Number.isFinite).length<2){cres("ohmResult","Need two values",["Enter any two of V, I, R, or W."]);return;}if(!pos(V)&&pos(I)&&pos(R))V=I*R;if(!pos(I)&&pos(V)&&pos(R))I=V/R;if(!pos(R)&&pos(V)&&pos(I))R=V/I;if(!pos(P)&&pos(V)&&pos(I))P=V*I;if(!pos(P)&&pos(I)&&pos(R))P=I*I*R;if(!pos(P)&&pos(V)&&pos(R))P=V*V/R;if([V,I,R,P].some(x=>!pos(x))){cres("ohmResult","Check inputs",["Use positive values and compatible values."]);return;}[["ohmV",V],["ohmI",I],["ohmR",R],["ohmP",P]].forEach(([id,x])=>{if(!Number.isFinite(cnum(id)))$(id).value=cf(x);});cres("ohmResult","Result",[`V = ${cf(V)} V`,`I = ${cf(I)} A`,`R = ${cf(R)} Ω`,`P = ${cf(P)} W`]);}
function calcPower(){let V=cnum("powerV"),I=cnum("powerI"),P=cnum("powerP");if([V,I,P].filter(Number.isFinite).length<2){cres("powerResult","Need two values",["Enter any two values."]);return;}if(!pos(P)&&pos(V)&&pos(I))P=V*I;if(!pos(I)&&pos(P)&&pos(V))I=P/V;if(!pos(V)&&pos(P)&&pos(I))V=P/I;if([V,I,P].some(x=>!pos(x))){cres("powerResult","Check inputs",["Values must be greater than zero."]);return;}[["powerV",V],["powerI",I],["powerP",P]].forEach(([id,x])=>{if(!Number.isFinite(cnum(id)))$(id).value=cf(x);});cres("powerResult","Result",[`Power = ${cf(P)} W`,`Voltage = ${cf(V)} V`,`Current = ${cf(I)} A`,"Formula: P = V × I"]);} 
function calcVD(){const I=cnum("vdI"),D=cnum("vdD"),V=cnum("vdV"),s=$("vdAWG").value,m=$("vdMaterial").value;if(!pos(I)||!pos(D)||!pos(V)||!WIRE_AREA_MM2[s]){cres("vdResult","Missing information",["Enter current, length, voltage, and wire size."]);return;}const cm=WIRE_AREA_MM2[s]*1973.525,drop=2*CALC_K[m]*I*D/cm,pct=drop/V*100;cres("vdResult","Voltage Drop",[`Drop = ${cf(drop)} V`,`Percentage = ${cf(pct,2)}%`,`Load-end voltage ≈ ${cf(V-drop)} V`,`#${s} ${m==="cu"?"copper":"aluminum"}`,"Educational approximation."]);} 
function calcAmp(){const s=$("ampAWG").value,m=$("ampMaterial").value,t=$("ampTemp").value,a=AMPACITY[m]?.[t]?.[s];if(!a){cres("ampResult","No table value",["That combination is not in this reference table."]);return;}cres("ampResult","Reference Ampacity",[`#${s} ${m==="cu"?"copper":"aluminum"} at ${t}°C = ${a} A`,"Check applicable adjustment/correction rules in your course."]);} 
function calcCF(){const type=$("cfType").value,size=$("cfConduit").value,n=Math.floor(cnum("cfCount")),s=$("cfAWG").value,area=CONDUIT_AREA[type]?.[size],wire=WIRE_AREA_MM2[s];if(!area||!pos(n)||!wire){cres("cfResult","Check inputs",["Choose conduit, wire size, and positive wire count."]);return;}const allowed=area*.4,total=wire*.001973525*n,pct=total/allowed*100;cres("cfResult",pct<=100?"Within 40% fill":"Over 40% fill",[`40% usable area = ${cf(allowed)} in²`,`Approx. conductor area = ${cf(total)} in²`,`Fill = ${cf(pct,1)}%`,"Simplified school calculation."]);} 
function calcBF(){const vol=cnum("bfVolume"),c=Math.floor(cnum("bfConductors")),g=Math.floor(cnum("bfGrounds")),d=Math.floor(cnum("bfDevices")),s=$("bfAWG").value;if(!pos(vol)||c<0||g<0||d<0){cres("bfResult","Check inputs",["Enter a positive box volume and valid counts."]);return;}const allowance=BOX_ALLOWANCE[s],needed=(c+(g>0?1:0)+d*2)*allowance;cres("bfResult",needed<=vol?"Fits simplified estimate":"Does not fit simplified estimate",[`Approx. allowance per #${s} conductor = ${cf(allowance,2)} cu in`,`Estimated required = ${cf(needed,2)} cu in`,`Box volume = ${cf(vol,2)} cu in`,"Simplified exercise; use the exact NEC box-fill rules for classwork."]);} 
function calcSeries(){const V=cnum("seriesV"),rs=[cnum("seriesR1"),cnum("seriesR2"),cnum("seriesR3")].filter(pos);if(!pos(V)||!rs.length){cres("seriesResult","Check inputs",["Enter source voltage and at least one resistor."]);return;}const R=rs.reduce((a,b)=>a+b,0),I=V/R;cres("seriesResult","Series Result",[`Total resistance = ${cf(R)} Ω`,`Current = ${cf(I)} A`,...rs.map((r,k)=>`R${k+1} drop = ${cf(I*r)} V`),"Rtotal = R1 + R2 + R3"]);} 
function calcParallel(){const V=cnum("parallelV"),rs=[cnum("parallelR1"),cnum("parallelR2"),cnum("parallelR3")].filter(pos);if(!pos(V)||!rs.length){cres("parallelResult","Check inputs",["Enter source voltage and at least one resistor."]);return;}const R=1/rs.reduce((a,b)=>a+1/b,0),I=V/R;cres("parallelResult","Parallel Result",[`Equivalent resistance = ${cf(R)} Ω`,`Total current = ${cf(I)} A`,...rs.map((r,k)=>`R${k+1} current = ${cf(V/r)} A`),"1/Rt = 1/R1 + 1/R2 + 1/R3"]);} 
function calcMotor(){const hp=cnum("motorHP"),V=cnum("motorV"),pf=cnum("motorPF"),eff=cnum("motorEff");if(!pos(hp)||!pos(V)||!pos(pf)||!pos(eff)||pf>1||eff>1){cres("motorResult","Check inputs",["PF and efficiency must be between 0 and 1."]);return;}const P=hp*746,I=P/(V*pf*eff);cres("motorResult","Motor Result",[`Mechanical output ≈ ${cf(P)} W`,`Estimated current ≈ ${cf(I)} A`,"I = P / (V × PF × efficiency)","Use nameplate/code values for actual motor sizing."]);} 
function calcLoad(){const a=["loadLighting","loadReceptacles","loadOther"].map(cnum),V=cnum("loadV");if(a.some(x=>!Number.isFinite(x)||x<0)||!pos(V)){cres("loadResult","Check inputs",["Use non-negative loads and positive voltage."]);return;}const W=a.reduce((x,y)=>x+y,0);cres("loadResult","Load Summary",[`Total load = ${cf(W)} W`,`Current at ${cf(V)} V = ${cf(W/V)} A`,"Simple school exercise, not a complete NEC service calculation."]);} 
function nearestAWG(mm){return CALC_WIRE_SIZES.reduce((b,s)=>Math.abs(AWG_DIAM_MM[s]-mm)<Math.abs(AWG_DIAM_MM[b]-mm)?s:b,CALC_WIRE_SIZES[0]);}
function calcUnits(){const t=$("unitType").value,v=cnum("unitValue");if(!Number.isFinite(v)){cres("unitResult","Enter a value",["Enter a number."]);return;}let out,label;if(t==="inmm"){out=v*25.4;label="mm";}else if(t==="mmin"){out=v/25.4;label="in";}else if(t==="ftm"){out=v*.3048;label="m";}else if(t==="mft"){out=v/.3048;label="ft";}else if(t==="awgmm"){out=AWG_DIAM_MM[$("unitAWG").value];label="mm";}else{out=nearestAWG(v);label="AWG";}cres("unitResult","Conversion",[`${t==="awgmm"?"Selected AWG diameter":fmtUnit(v)} → ${cf(out)} ${label}`]);}
function fmtUnit(v){return cf(v);}
function parseFrac(s){const p=String(s).trim().split(/\s+/);if(!p[0])return null;let w=0,f=p[0];if(p.length===2){w=Number(p[0]);f=p[1];}if(f.includes("/")){const [a,b]=f.split("/").map(Number);if(!Number.isFinite(a)||!Number.isFinite(b)||b===0)return null;return w>=0?w+a/b:w-a/b;}const n=Number(f);return Number.isFinite(n)?n:null;}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;}
function fracString(x){const sign=x<0?"-":"",den=10000,n=Math.round(Math.abs(x)*den),g=gcd(n,den),a=n/g,d=den/g,w=Math.floor(a/d),r=a%d;if(!r)return sign+w;if(!w)return sign+`${r}/${d}`;return sign+`${w} ${r}/${d}`;}
function calcFrac(){const a=parseFrac($("frac1").value),b=parseFrac($("frac2").value),op=$("fracOp").value;if(a===null||b===null||(op==="/"&&b===0)){cres("fracResult","Check fractions",["Use 3/4 or 1 1/2. Division by zero is not allowed."]);return;}const x=op==="+"?a+b:op==="-"?a-b:op==="*"?a*b:a/b;cres("fracResult","Fraction Result",[`${fracString(x)}`,`Decimal = ${cf(x,4)}`]);}
function setupCalculators(){fillCalcSelects();const a={ohm:calcOhm,power:calcPower,voltageDrop:calcVD,ampacity:calcAmp,conduitFill:calcCF,boxFill:calcBF,series:calcSeries,parallel:calcParallel,motor:calcMotor,load:calcLoad,units:calcUnits,fraction:calcFrac};document.querySelectorAll(".calc-btn").forEach(b=>b.addEventListener("click",()=>a[b.dataset.calc]?.()));document.querySelectorAll("#calculations input").forEach(i=>i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();i.closest(".calculator-card")?.querySelector(".calc-btn")?.click();}}));}


/* NEC CODEBOOK STUDY GUIDE — summaries are paraphrased, not code text */
const NEC_GUIDE=[
{a:"90",t:"Introduction",c:"general",d:"Explains the purpose, scope, arrangement, and enforcement context of the NEC. Article 90 is useful for understanding what the Code is intended to cover and what it does not cover.",k:"scope purpose arrangement authority"},
{a:"100",t:"Definitions",c:"general",d:"Defines terms used throughout the NEC. Check this article when a word has a specific code meaning or when an assignment asks what a term means.",k:"definitions terms service feeder branch circuit accessible readily accessible"},
{a:"110",t:"Requirements for Electrical Installations",c:"general",d:"General installation rules, including equipment examination, ratings, working space, access, markings, and connections. Use the specific section and any applicable exceptions.",k:"working space clearances labels terminals ratings installation"},
{a:"200",t:"Use and Identification of Grounded Conductors",c:"wiring",d:"Covers identification and use of grounded conductors, commonly the neutral in many AC systems. Look here for conductor identification rules.",k:"neutral grounded conductor white gray identification"},
{a:"210",t:"Branch Circuits",c:"wiring",d:"Rules for branch circuits, including ratings, required circuits, receptacle placement, and branch-circuit protection. Commonly used in residential wiring assignments.",k:"branch circuit receptacle outlets kitchen bathroom dwelling gfci afci"},
{a:"215",t:"Feeders",c:"wiring",d:"Covers feeder conductors and feeder overcurrent protection. Use it when tracing power from service equipment toward downstream distribution equipment.",k:"feeder ampacity overcurrent conductor"},
{a:"220",t:"Branch-Circuit, Feeder, and Service Load Calculations",c:"tables",d:"Provides methods for calculating electrical loads. Different occupancies and load types can have specific calculation rules, demand factors, and exceptions.",k:"load calculation demand factor dwelling service feeder"},
{a:"225",t:"Outside Branch Circuits and Feeders",c:"special",d:"Addresses outside branch circuits and feeders, including certain building-to-building and outdoor wiring situations.",k:"outside overhead outdoor building feeder"},
{a:"230",t:"Services",c:"equipment",d:"Covers service conductors and service equipment from the service point into the premises wiring system. Useful for service entrance and service disconnect study.",k:"service entrance service disconnect conductors"},
{a:"240",t:"Overcurrent Protection",c:"equipment",d:"Covers fuses, circuit breakers, conductor protection, and overcurrent device rules. Coordinate conductor sizing with the applicable ampacity and equipment rules.",k:"breaker fuse overcurrent protection"},
{a:"250",t:"Grounding and Bonding",c:"equipment",d:"Explains system grounding, equipment grounding, bonding, grounding electrodes, and related connections. Distinguish the grounded conductor from the equipment grounding conductor.",k:"grounding bonding ground rod equipment grounding conductor neutral"},
{a:"300",t:"General Requirements for Wiring Methods and Materials",c:"wiring",d:"General rules applying to wiring methods and materials, including protection from physical damage, securing, supporting, and installation conditions.",k:"wiring methods support protection physical damage"},
{a:"310",t:"Conductors for General Wiring",c:"tables",d:"Covers conductor requirements and ampacity information. Conductor selection can depend on insulation rating, terminal temperature, ambient temperature, and the number of current-carrying conductors.",k:"wire ampacity conductor insulation temperature correction adjustment"},
{a:"312",t:"Cabinets, Cutout Boxes, and Meter Socket Enclosures",c:"equipment",d:"Rules for cabinets and enclosures such as certain panel and meter equipment. Check the equipment type and installation conditions.",k:"cabinet panel enclosure meter socket"},
{a:"314",t:"Outlet, Device, Pull, and Junction Boxes; Conduit Bodies; Fittings",c:"equipment",d:"Covers boxes and conduit bodies, including box fill, installation, support, and accessible-cover rules. Section 314.16 is commonly assigned for box-fill calculations.",k:"box fill outlet box junction box device box cubic inch 314.16"},
{a:"320",t:"Armored Cable (Type AC)",c:"wiring",d:"Requirements for Type AC cable. Compare cable types carefully; similar-looking cable products can have different rules.",k:"armored cable AC"},
{a:"330",t:"Metal-Clad Cable (Type MC)",c:"wiring",d:"Requirements for Type MC cable, including installation and use conditions. Do not assume MC and AC cable rules are interchangeable.",k:"metal clad cable MC"},
{a:"334",t:"Nonmetallic-Sheathed Cable (Type NM)",c:"wiring",d:"Rules for nonmetallic-sheathed cable such as common NM-B cable, including permitted uses, protection, support, and installation.",k:"Romex NM NM-B nonmetallic sheathed cable staples"},
{a:"338",t:"Service-Entrance Cable (Types SE and USE)",c:"wiring",d:"Covers service-entrance cable types and their permitted applications. Check the exact cable type and location before applying a rule.",k:"SE USE service entrance cable"},
{a:"342",t:"Intermediate Metal Conduit (Type IMC)",c:"wiring",d:"Covers IMC conduit systems, fittings, and installation requirements.",k:"IMC conduit fittings"},
{a:"344",t:"Rigid Metal Conduit (Type RMC)",c:"wiring",d:"Covers rigid metal conduit and associated fittings and installation requirements.",k:"RMC rigid metal conduit"},
{a:"348",t:"Flexible Metal Conduit (Type FMC)",c:"wiring",d:"Covers flexible metal conduit, including use limitations and installation methods.",k:"FMC flexible metal conduit"},
{a:"350",t:"Liquidtight Flexible Nonmetallic Conduit (Type LFNC)",c:"wiring",d:"Covers liquidtight flexible nonmetallic conduit and fittings, including where and how the raceway may be used.",k:"LFNC liquidtight flexible nonmetallic conduit"},
{a:"352",t:"Rigid Polyvinyl Chloride Conduit (Type PVC)",c:"wiring",d:"Covers PVC conduit, fittings, support, and installation conditions. Check the schedule/type and environment.",k:"PVC conduit schedule 40 80"},
{a:"358",t:"Electrical Metallic Tubing (EMT)",c:"wiring",d:"Covers EMT, fittings, and installation requirements. Frequently referenced for conduit runs, supports, and fittings in shop class.",k:"EMT electrical metallic tubing connectors couplings straps"},
{a:"404",t:"Switches",c:"equipment",d:"Covers switches and switch installations, including certain enclosure, rating, and connection requirements.",k:"switch single pole three way 3-way disconnect"},
{a:"406",t:"Receptacles, Cord Connectors, and Attachment Plugs",c:"equipment",d:"Covers receptacle and plug-related requirements, including ratings, grounding, tamper resistance, weather resistance, and placement in applicable situations.",k:"receptacle outlet duplex GFCI tamper resistant weather resistant"},
{a:"408",t:"Switchboards, Switchgear, and Panelboards",c:"equipment",d:"Covers panelboards and related distribution equipment, including circuit identification and installation rules.",k:"panelboard panel schedule breaker directory switchboard"},
{a:"410",t:"Luminaires, Lampholders, and Lamps",c:"equipment",d:"Covers lighting equipment such as luminaires, lampholders, and lamps, including mounting and installation conditions.",k:"lighting fixture luminaire lampholder keyless"},
{a:"422",t:"Appliances",c:"equipment",d:"Covers electrical appliances and their branch circuits, connections, disconnecting means, and installation conditions.",k:"appliance dishwasher range water heater"},
{a:"430",t:"Motors, Motor Circuits, and Controllers",c:"equipment",d:"A major motor article covering motor circuit conductors, overloads, short-circuit and ground-fault protection, controllers, and disconnecting means. Follow the correct motor table and calculation steps.",k:"motor horsepower FLA overload conductor starter controller disconnect"},
{a:"440",t:"Air-Conditioning and Refrigerating Equipment",c:"equipment",d:"Covers air-conditioning and refrigeration equipment, including nameplate-based circuit and overcurrent requirements.",k:"HVAC compressor air conditioning refrigerant"},
{a:"450",t:"Transformers and Transformer Vaults",c:"equipment",d:"Covers transformer installations and related overcurrent protection and installation conditions.",k:"transformer primary secondary kVA overcurrent"},
{a:"500",t:"Hazardous (Classified) Locations",c:"special",d:"Introduces requirements for locations where flammable gases, vapors, dusts, or fibers may create special electrical hazards. Classification must be established correctly.",k:"hazardous classified class division zone"},
{a:"590",t:"Temporary Installations",c:"special",d:"Covers temporary electrical installations for construction, remodeling, events, and similar situations, including limits and protection.",k:"temporary construction jobsite"},
{a:"600",t:"Electric Signs and Outline Lighting",c:"special",d:"Covers electric signs and outline lighting systems and their installation requirements.",k:"sign lighting"},
{a:"625",t:"Electric Vehicle Power Transfer System",c:"special",d:"Covers EV charging and power-transfer equipment. Check the edition and equipment configuration for current requirements.",k:"EV charger electric vehicle"},
{a:"680",t:"Swimming Pools, Fountains, and Similar Installations",c:"special",d:"Covers electrical installations around pools, fountains, and similar bodies of water, where shock protection and bonding are especially important.",k:"pool fountain spa bonding GFCI"},
{a:"690",t:"Solar Photovoltaic (PV) Systems",c:"special",d:"Covers photovoltaic systems, including PV circuit conductors, disconnects, and related equipment. Follow the applicable system diagrams and edition.",k:"solar photovoltaic PV inverter"},
{a:"700",t:"Emergency Systems",c:"special",d:"Covers electrical systems intended to supply designated emergency loads. Distinguish emergency systems from other standby systems.",k:"emergency generator life safety"},
{a:"702",t:"Optional Standby Systems",c:"special",d:"Covers optional standby systems that provide alternate power for selected loads. Compare requirements with Article 700 and other standby articles.",k:"standby generator backup power"},
{a:"725",t:"Class 1, Class 2, and Class 3 Remote-Control, Signaling, and Power-Limited Circuits",c:"special",d:"Covers certain control, signaling, and power-limited circuits. Circuit classification affects wiring methods and separation rules.",k:"low voltage control signaling class 2"},
{a:"760",t:"Fire Alarm Systems",c:"special",d:"Covers fire alarm system wiring and equipment. Coordinate with applicable fire alarm standards and local requirements taught in class.",k:"fire alarm notification initiating"},
{a:"800",t:"Communications Circuits",c:"special",d:"Covers communications circuit wiring, cable, and installation conditions. Check the applicable rules for the specific communications system.",k:"communications data telephone"},
{a:"Chapter 9",t:"Tables",c:"tables",d:"Contains important wiring tables, including conduit and tubing dimensions/areas and raceway fill information. Always confirm the correct table, notes, conductor insulation, and number of conductors.",k:"conduit fill table raceway dimensions conductor area Chapter 9"},
{a:"Annex C",t:"Conduit and Tubing Fill Tables",c:"tables",d:"Annex C contains fill tables for specified raceways and conductor combinations in many editions. Confirm the exact annex/table in your assigned edition and the conditions under which it applies.",k:"Annex C conduit fill table EMT PVC"}
];
function renderCodebook(){
 const list=$("codeArticleList"),detail=$("codeArticleDetail");if(!list||!detail)return;
 const query=($("codeSearch").value||"").toLowerCase().trim(),cat=$("codeCategory").value;
 const filtered=NEC_GUIDE.filter(x=>(cat==="all"||x.c===cat)&&[x.a,x.t,x.d,x.k].join(" ").toLowerCase().includes(query));
 if(!filtered.length){list.innerHTML='<p class="muted">No matching articles. Try another keyword.</p>';return;}
 if(!list.dataset.selected||!filtered.some(x=>x.a===list.dataset.selected))list.dataset.selected=filtered[0].a;
 list.innerHTML=filtered.map(x=>'<button type="button" class="code-article-item '+(x.a===list.dataset.selected?'active':'')+'" data-article="'+esc(x.a)+'"><span class="code-article-number">Article '+esc(x.a)+'</span><span class="code-article-title">'+esc(x.t)+'</span></button>').join("");
 const chosen=filtered.find(x=>x.a===list.dataset.selected)||filtered[0];
 detail.innerHTML='<p class="eyebrow">NEC STUDY GUIDE</p><h3>Article '+esc(chosen.a)+'</h3><h4>'+esc(chosen.t)+'</h4><p>'+esc(chosen.d)+'</p><div class="codebook-keywords"><strong>Search keywords</strong><p>'+esc(chosen.k.split(" ").join(" · "))+'</p></div><div class="codebook-prompt"><strong>When studying this article</strong><ol><li>Find the article in your assigned NEC edition.</li><li>Read the applicable section and any exceptions or table notes.</li><li>Write down the rule in your own words and cite the section number.</li></ol></div>';
 list.querySelectorAll("[data-article]").forEach(b=>b.addEventListener("click",()=>{list.dataset.selected=b.dataset.article;renderCodebook();}));
}
function setupCodebook(){if(!$("codeArticleList"))return;$("codeSearch").addEventListener("input",renderCodebook);$("codeCategory").addEventListener("change",renderCodebook);renderCodebook();}

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
  setupCalculators();
  setupCodebook();

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
