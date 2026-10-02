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
function calcBF(){const vol=cnum("bfVolume"),c=Math.floor(cnum("bfConductors")),g=Math.floor(cnum("bfGrounds")),d=Math.floor(cnum("bfDevices")),s=$("bfAWG").value;if(!pos(vol)||c<0||g<0||d<0){cres("bfResult","Check inputs",["Enter a positive box volume and valid counts."]);return;}const allowance=WIRE_AREA_MM2[s]*.002*2.036,needed=(c+(g>0?1:0)+d*2)*allowance;cres("bfResult",needed<=vol?"Fits simplified estimate":"Does not fit simplified estimate",[`Approx. allowance per #${s} conductor = ${cf(allowance,2)} cu in`,`Estimated required = ${cf(needed,2)} cu in`,`Box volume = ${cf(vol,2)} cu in`,"Simplified exercise; use the exact NEC box-fill rules for classwork."]);} 
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
