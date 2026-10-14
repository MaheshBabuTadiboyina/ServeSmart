(() => {
  "use strict";

  const STORAGE_KEY = "servesmart_donations_v1";
  const THEME_KEY = "servesmart_theme_v1";

  const RECIPIENTS = [
    { name: "Community Kitchen A", foodTypes: ["Vegetarian", "Vegan"], capacity: 35, distance: 2, pickupBy: "14:00" },
    { name: "Community Shelter B", foodTypes: ["Vegetarian", "Vegan", "Non-vegetarian"], capacity: 60, distance: 4, pickupBy: "18:00" },
    { name: "Community Centre C", foodTypes: ["Vegetarian"], capacity: 20, distance: 1, pickupBy: "17:00" },
    { name: "Food Support Hub D", foodTypes: ["Vegetarian", "Vegan"], capacity: 100, distance: 6, pickupBy: "18:00" }
  ];

  let donations = loadDonations();
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function loadDonations() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveDonations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(donations));
    } catch {
      showToast("Browser storage is unavailable. Your changes may not persist.");
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function formatTime(value) {
    if (!value) return "—";
    const [hour, minute] = value.split(":").map(Number);
    const d = new Date();
    d.setHours(hour || 0, minute || 0, 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function nextId() {
    return donations.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  function setPage(page) {
    $$(".page-section").forEach(section => {
      section.classList.toggle("active", section.id === `page-${page}`);
    });
    $$(".nav-link").forEach(button => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    renderCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCurrentPage(page) {
    if (page === "Overview") renderOverview();
    if (page === "Find Matches") renderMatches();
    if (page === "Manage Donations") renderManage();
    if (page === "Impact Report") renderImpact();
  }

  function metricsMarkup(items) {
    return items.map(item => `
      <article class="metric-card">
        <div class="metric-top"><span class="metric-label">${esc(item.label)}</span><span class="metric-icon">${item.icon}</span></div>
        <div class="metric-value">${Number(item.value).toLocaleString()}</div>
        <div class="metric-note">${esc(item.note)}</div>
      </article>`).join("");
  }

  function getMetrics() {
    const portions = donations.reduce((sum, d) => sum + Number(d.portions || 0), 0);
    const collected = donations.filter(d => d.status === "Collected").reduce((sum, d) => sum + Number(d.portions || 0), 0);
    const active = donations.filter(d => ["Available", "Reserved"].includes(d.status)).length;
    return { total: donations.length, portions, collected, active };
  }

  function renderOverview() {
    const m = getMetrics();
    $("#overviewMetrics").innerHTML = metricsMarkup([
      { label: "Food listings", value: m.total, note: "Total donations created", icon: "🍱" },
      { label: "Portions listed", value: m.portions, note: "Estimated portions", icon: "🥗" },
      { label: "Portions collected", value: m.collected, note: "Marked collected in demo", icon: "🤝" },
      { label: "Active listings", value: m.active, note: "Available or reserved", icon: "🌱" }
    ]);

    const recent = [...donations].sort((a, b) => b.id - a.id).slice(0, 5);
    $("#recentDonations").innerHTML = recent.length ? `
      <div class="table-wrap"><table><thead><tr><th>Food listing</th><th>Portions</th><th>Status</th></tr></thead><tbody>
      ${recent.map(d => `<tr><td><strong>${esc(d.description)}</strong><br><span class="muted">${esc(d.donor)}</span></td><td>${Number(d.portions)}</td><td><span class="status-badge status-${esc(d.status)}">${esc(d.status)}</span></td></tr>`).join("")}
      </tbody></table></div>` : `
      <div class="empty-state"><div class="empty-icon">🥬</div><strong>No donations yet</strong><p class="muted">Create your first listing to get started.</p><br><button class="button button-primary" data-go="Donate Food" type="button">＋ Create donation</button></div>`;
  }

  function showFormMessage(message, kind) {
    const el = $("#formMessage");
    el.textContent = message;
    el.className = `form-message ${kind || ""}`;
  }

  function handleDonationSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const donor = String(data.get("donor") || "").trim();
    const description = String(data.get("description") || "").trim();
    const portions = Number(data.get("portions"));
    const preparedAt = new Date(`${data.get("preparedDate")}T${data.get("preparedTime")}`);
    const pickupDeadline = String(data.get("pickupDeadline") || "");
    const safetyConfirmed = data.get("safetyConfirmed") === "on";

    if (!donor || !description) return showFormMessage("Please complete the donor and food description fields.", "error");
    if (!Number.isFinite(portions) || portions < 1 || portions > 10000) return showFormMessage("Enter a valid portion count from 1 to 10,000.", "error");
    if (Number.isNaN(preparedAt.getTime()) || preparedAt > new Date()) return showFormMessage("Preparation date and time cannot be in the future.", "error");
    if (!safetyConfirmed) return showFormMessage("Please confirm that food safety details have been checked.", "error");

    donations.push({
      id: nextId(),
      donor,
      description,
      foodType: String(data.get("foodType")),
      portions: Math.floor(portions),
      preparedAt: preparedAt.toISOString(),
      pickupDeadline,
      storage: String(data.get("storage")),
      safetyConfirmed,
      status: "Available",
      recipient: "",
      createdAt: new Date().toISOString()
    });
    saveDonations();
    form.reset();
    const dateInput = form.elements.preparedDate;
    const timeInput = form.elements.preparedTime;
    const now = new Date();
    dateInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    timeInput.value = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    form.elements.portions.value = 20;
    form.elements.pickupDeadline.value = "18:00";
    showFormMessage("Donation added successfully. You can now explore recipient matches.", "success");
    showToast("Donation added to your browser.");
    renderOverview();
  }

  function getMatches(donation) {
    return RECIPIENTS.map(recipient => {
      let score = 0;
      let eligible = true;
      const reasons = [];
      if (recipient.foodTypes.includes(donation.foodType)) {
        score += 40; reasons.push("Food type compatible");
      } else { eligible = false; reasons.push("Food type not compatible"); }
      if (Number(donation.portions) <= recipient.capacity) {
        score += 25; reasons.push("Capacity sufficient");
      } else { eligible = false; reasons.push("Capacity too small"); }
      if (recipient.pickupBy >= donation.pickupDeadline) {
        score += 20; reasons.push("Pickup window compatible");
      } else { eligible = false; reasons.push("Pickup window needs checking"); }
      if (donation.safetyConfirmed) {
        score += 15; reasons.push("Safety declaration confirmed");
      } else { eligible = false; reasons.push("Safety declaration missing"); }
      return { ...recipient, score, eligible, reasons };
    }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.distance - b.distance);
  }

  function renderMatches() {
    const select = $("#matchDonation");
    const available = donations.filter(d => d.status === "Available");
    const previous = select.value;
    select.innerHTML = available.length
      ? available.map(d => `<option value="${d.id}">#${d.id} — ${esc(d.description)} (${d.portions} portions)</option>`).join("")
      : `<option value="">No available donations</option>`;
    if (available.some(d => String(d.id) === previous)) select.value = previous;

    const donation = available.find(d => String(d.id) === select.value) || available[0];
    if (!donation) {
      $("#matchDetails").innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><strong>No available donations to match</strong><p class="muted">Add a donation or make a reserved listing available.</p><br><button class="button button-primary" data-go="Donate Food" type="button">Go to Donate Food</button></div>`;
      $("#matchResults").innerHTML = "";
      return;
    }

    $("#matchDetails").innerHTML = `<div class="notice"><p><strong>${esc(donation.description)}</strong> · ${Number(donation.portions)} portions · ${esc(donation.foodType)} · pickup by ${formatTime(donation.pickupDeadline)}</p></div>`;
    $("#matchResults").innerHTML = getMatches(donation).map(match => `
      <article class="match-card ${match.eligible ? "eligible" : ""}">
        <div class="match-card-top"><div><h3>${esc(match.name)}</h3><p class="match-meta">Approx. ${match.distance} km away · capacity ${match.capacity}</p></div><span class="score">${match.score}/100</span></div>
        <span class="eligibility ${match.eligible ? "" : "no"}">${match.eligible ? "Eligible by demo rules" : "Needs review"}</span>
        <ul class="reason-list">${match.reasons.map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>
        ${match.eligible ? `<button class="button button-primary" data-reserve="${donation.id}" data-recipient="${esc(match.name)}" type="button">Reserve for this recipient</button>` : ""}
      </article>`).join("");
  }

  function statusBadge(status) {
    return `<span class="status-badge status-${esc(status)}">${esc(status)}</span>`;
  }

  function renderManage() {
    const filter = $("#statusFilter").value;
    const list = [...donations].sort((a, b) => b.id - a.id).filter(d => filter === "All" || d.status === filter);
    $("#listingCount").textContent = `${list.length} listing${list.length === 1 ? "" : "s"}`;
    $("#manageList").innerHTML = list.length ? list.map(d => `
      <article class="donation-row">
        <div class="donation-row-head">
          <div><h3>#${d.id} — ${esc(d.description)}</h3><p class="muted">Donated by ${esc(d.donor)}</p></div>
          ${statusBadge(d.status)}
        </div>
        <div class="donation-meta"><span>🍽 ${Number(d.portions)} portions</span><span>◉ ${esc(d.foodType)}</span><span>Pickup by ${formatTime(d.pickupDeadline)}</span><span>Storage: ${esc(d.storage)}</span></div>
        <p class="muted">Recipient: ${esc(d.recipient || "Not assigned")}</p>
        <div class="row-actions">
          ${d.status === "Available" ? `<button class="button button-danger" data-action="cancel" data-id="${d.id}" type="button">Cancel listing</button>` : ""}
          ${d.status === "Reserved" ? `<button class="button button-primary" data-action="collect" data-id="${d.id}" type="button">Mark collected</button><button class="button" data-action="unreserve" data-id="${d.id}" type="button">Cancel reservation</button>` : ""}
          ${d.status === "Cancelled" ? `<button class="button" data-action="restore" data-id="${d.id}" type="button">Restore listing</button>` : ""}
        </div>
      </article>`).join("") : `<div class="panel empty-state"><div class="empty-icon">📦</div><strong>No listings found</strong><p class="muted">Try another status filter or add a donation.</p></div>`;
  }

  function barMarkup(items, labelKey, valueKey) {
    const max = Math.max(1, ...items.map(item => Number(item[valueKey]) || 0));
    return items.map(item => {
      const value = Number(item[valueKey]) || 0;
      const width = value ? Math.max(3, (value / max) * 100) : 0;
      return `<div><div class="bar-label-row"><span>${esc(item[labelKey])}</span><strong>${value.toLocaleString()}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div></div>`;
    }).join("");
  }

  function renderTable() {
    if (!donations.length) return `<div class="empty-state"><p class="muted">No records to display yet.</p></div>`;
    return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Donor</th><th>Food</th><th>Category</th><th>Portions</th><th>Status</th><th>Recipient</th></tr></thead><tbody>${[...donations].sort((a,b)=>b.id-a.id).map(d=>`<tr><td>#${d.id}</td><td>${esc(d.donor)}</td><td>${esc(d.description)}</td><td>${esc(d.foodType)}</td><td>${Number(d.portions)}</td><td>${statusBadge(d.status)}</td><td>${esc(d.recipient || "Not assigned")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderImpact() {
    const m = getMetrics();
    $("#impactMetrics").innerHTML = metricsMarkup([
      { label: "Listings created", value: m.total, note: "Current browser records", icon: "📋" },
      { label: "Portions listed", value: m.portions, note: "Estimated portions", icon: "🥗" },
      { label: "Portions collected", value: m.collected, note: "Marked collected in demo", icon: "🤝" },
      { label: "Active listings", value: m.active, note: "Available or reserved", icon: "🌱" }
    ]);
    const statuses = ["Available", "Reserved", "Collected", "Cancelled"].map(status => ({
      label: status, value: donations.filter(d => d.status === status).length
    }));
    const categories = ["Vegetarian", "Vegan", "Non-vegetarian"].map(category => ({
      label: category,
      value: donations.filter(d => d.foodType === category).reduce((sum, d) => sum + Number(d.portions || 0), 0)
    }));
    $("#statusChart").innerHTML = barMarkup(statuses, "label", "value");
    $("#categoryChart").innerHTML = barMarkup(categories, "label", "value");
    $("#impactTable").innerHTML = renderTable();
  }

  function exportCsv() {
    if (!donations.length) {
      showToast("Add at least one donation before exporting.");
      return;
    }
    const headers = ["ID", "Donor", "Food", "Category", "Portions", "Prepared At", "Pickup Deadline", "Storage", "Status", "Recipient"];
    const rows = donations.map(d => [
      d.id, d.donor, d.description, d.foodType, d.portions,
      formatDateTime(d.preparedAt), d.pickupDeadline, d.storage, d.status, d.recipient || "Not assigned"
    ]);
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "servesmart_donations.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("CSV export downloaded.");
  }

  function handleDelegatedClick(event) {
    const go = event.target.closest("[data-go]");
    if (go) {
      setPage(go.dataset.go);
      return;
    }
    const reserve = event.target.closest("[data-reserve]");
    if (reserve) {
      const donation = donations.find(d => d.id === Number(reserve.dataset.reserve));
      if (!donation || donation.status !== "Available") return;
      donation.status = "Reserved";
      donation.recipient = reserve.dataset.recipient;
      saveDonations();
      renderMatches();
      renderManage();
      renderOverview();
      showToast(`Reserved for ${donation.recipient} in this demo.`);
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) {
      const donation = donations.find(d => d.id === Number(action.dataset.id));
      if (!donation) return;
      if (action.dataset.action === "cancel") donation.status = "Cancelled";
      if (action.dataset.action === "collect") donation.status = "Collected";
      if (action.dataset.action === "unreserve") {
        donation.status = "Available";
        donation.recipient = "";
      }
      if (action.dataset.action === "restore") donation.status = "Available";
      saveDonations();
      renderManage();
      renderOverview();
      renderMatches();
      renderImpact();
      showToast("Donation status updated.");
    }
  }

  function initialiseTheme() {
    let theme = "light";
    try { theme = localStorage.getItem(THEME_KEY) || "light"; } catch {}
    document.documentElement.dataset.theme = theme;
    $("#themeToggle").textContent = theme === "dark" ? "☾" : "☼";
    $("#themeToggle").title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    $("#themeToggle").textContent = next === "dark" ? "☾" : "☼";
    $("#themeToggle").title = next === "dark" ? "Switch to light theme" : "Switch to dark theme";
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

  function initialiseFormDefaults() {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const form = $("#donationForm");
    form.elements.preparedDate.value = date;
    form.elements.preparedTime.value = time;
  }

  document.addEventListener("click", handleDelegatedClick);
  $$(".nav-link").forEach(button => button.addEventListener("click", () => setPage(button.dataset.page)));
  $$("[data-page-link]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    setPage(link.dataset.pageLink);
  }));
  $("#donationForm").addEventListener("submit", handleDonationSubmit);
  $("#donationForm").addEventListener("reset", () => setTimeout(() => showFormMessage("", ""), 0));
  $("#matchDonation").addEventListener("change", renderMatches);
  $("#statusFilter").addEventListener("change", renderManage);
  $("#exportCsv").addEventListener("click", exportCsv);
  $("#themeToggle").addEventListener("click", toggleTheme);

  initialiseTheme();
  initialiseFormDefaults();
  renderOverview();
  renderMatches();
  renderManage();
  renderImpact();
})();