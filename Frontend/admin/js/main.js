const API_BASE = "http://localhost:5000/api";

function authHeaders(json = false) {
    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
    if (json) headers["Content-Type"] = "application/json";
    return headers;
}

function handleUnauthorized(response) {
    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
        return true;
    }
    return false;
}

function searchItems() {
    const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
    const c = (document.getElementById("categoryInput")?.value || "all").toLowerCase();
    document.querySelectorAll("#itemsContainer .item-card").forEach(card => {
        const text = card.innerText.toLowerCase();
        const category = (card.dataset.category || "").toLowerCase();
        card.style.display = text.includes(q) && (c === "all" || category === c) ? "" : "none";
    });
}

function submitDemo(event, form, message = "Submitted successfully!") {
    event.preventDefault();
    alert(message);
    form.reset();
}

async function studentRegister(event, form) {
    event.preventDefault();
    const inputs = form.querySelectorAll("input");
    const [nameInput, studentIdInput, emailInput, passwordInput, confirmInput] = inputs;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (password !== confirmInput.value) return alert("Passwords do not match!");

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST", headers: authHeaders(true),
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Registration failed");
        alert("Registration successful! Please login.");
        form.reset();
        window.location.href = "login.html";
    } catch (error) {
        console.error("Registration error:", error);
        alert("Registration failed: " + error.message);
    }
}

async function submitItem(event, form, type) {
    event.preventDefault();
    const itemData = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value,
        type,
        location: document.getElementById("location").value.trim(),
        date: document.getElementById("date").value,
        contact: document.getElementById("contact").value.trim()
    };
    if (!localStorage.getItem("token")) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/items`, {
            method: "POST", headers: authHeaders(true), body: JSON.stringify(itemData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to submit item");
        alert(`${type} item report submitted successfully! It is waiting for admin approval.`);
        form.reset();
    } catch (error) {
        console.error("Item submission error:", error);
        alert(`Failed to submit ${type.toLowerCase()} item: ${error.message}`);
    }
}

function submitLostItem(event, form) { return submitItem(event, form, "Lost"); }
function submitFoundItem(event, form) { return submitItem(event, form, "Found"); }

async function studentLogin(event, form) {
    event.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST", headers: authHeaders(true), body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) return alert(data.message || "Login failed");
        if (data.user.role !== "student") return alert("Please use the admin login page for an admin account.");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "deshboard.html";
    } catch (error) {
        console.error("Login error:", error);
        alert("Unable to connect to the server. Make sure the backend is running.");
    }
}

async function adminLogin(event, form) {
    event.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST", headers: authHeaders(true), body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) return alert(data.message || "Admin login failed");
        if (!data.user || data.user.role !== "admin") return alert("Access denied. Admin account required.");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "deshboard.html";
    } catch (error) {
        console.error("Admin login error:", error);
        alert("Unable to connect to the server. Make sure the backend is running.");
    }
}

function protectStudentPage() {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) { alert("Please login first."); window.location.href = "login.html"; return false; }
    if (user.role !== "student") { alert("Access denied. Student account required."); window.location.href = "login.html"; return false; }
    return true;
}

function protectAdminPage() {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) { alert("Please login first."); window.location.href = "admin-login.html"; return false; }
    if (user.role !== "admin") { alert("Access denied. Admin account required."); window.location.href = "admin-login.html"; return false; }
    return true;
}

function logout() { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "login.html"; }
function adminLogout() { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "admin-login.html"; }

async function loadItems() {
    const container = document.getElementById("itemsContainer");
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE}/items`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items = await response.json();
        container.innerHTML = items.length ? "" : '<div class="col-12"><p class="text-center text-muted">No approved items found.</p></div>';
        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "col-md-4 item-card";
            card.dataset.category = (item.category || "").toLowerCase();
            const badgeClass = item.type === "Lost" ? "bg-danger" : "bg-success";
            card.innerHTML = `<div class="card h-100"><div class="item-image">📦</div><div class="card-body"><span class="badge ${badgeClass}">${item.type.toUpperCase()}</span><h5 class="mt-2"></h5><p class="description"></p><small class="location"></small><br><a href="item-details.html?id=${encodeURIComponent(item._id)}" class="btn btn-primary btn-sm mt-3">View Details</a></div></div>`;
            card.querySelector("h5").textContent = item.title || "Untitled";
            card.querySelector(".description").textContent = item.description || "";
            card.querySelector(".location").textContent = `📍 ${item.location || "Unknown"}`;
            container.appendChild(card);
        });
    } catch (error) { console.error("Error loading items:", error); }
}

async function loadStudentDashboardStats() {
    const reportsEl = document.getElementById("myReportsCount");
    const claimsEl = document.getElementById("myClaimsCount");
    const notificationsEl = document.getElementById("notificationCount");
    if (!reportsEl && !claimsEl && !notificationsEl) return;

    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.name && document.getElementById("studentName")) {
        document.getElementById("studentName").textContent = user.name;
    }

    try {
        const [reportsResponse, claimsResponse] = await Promise.all([
            fetch(`${API_BASE}/items/mine/count`, { headers: authHeaders() }),
            fetch(`${API_BASE}/claims/mine/count`, { headers: authHeaders() })
        ]);

        if (reportsResponse.status === 401 || claimsResponse.status === 401) {
            handleUnauthorized(reportsResponse.status === 401 ? reportsResponse : claimsResponse);
            return;
        }
        if (!reportsResponse.ok || !claimsResponse.ok) {
            throw new Error("Failed to load your dashboard statistics");
        }

        const reports = await reportsResponse.json();
        const claims = await claimsResponse.json();

        if (reportsEl) reportsEl.textContent = Number(reports.count) || 0;
        if (claimsEl) claimsEl.textContent = Number(claims.count) || 0;
        // The current Notifications page is generated from the user's claims,
        // so each claim currently corresponds to one notification.
        if (notificationsEl) notificationsEl.textContent = Number(claims.count) || 0;
    } catch (error) {
        console.error("Error loading student dashboard statistics:", error);
        if (reportsEl) reportsEl.textContent = "0";
        if (claimsEl) claimsEl.textContent = "0";
        if (notificationsEl) notificationsEl.textContent = "0";
    }
}

async function loadAdminStats() {
    if (!document.getElementById("lostCount") && !document.getElementById("userCount")) return;
    try {
        const [itemsResponse, usersResponse, claimsResponse] = await Promise.all([
            fetch(`${API_BASE}/items/admin/all`, { headers: authHeaders() }),
            fetch(`${API_BASE}/users/count`, { headers: authHeaders() }),
            fetch(`${API_BASE}/claims/count`, { headers: authHeaders() })
        ]);
        if ([itemsResponse, usersResponse, claimsResponse].some(r => !r.ok)) throw new Error("Failed to load dashboard statistics");
        const items = await itemsResponse.json(), users = await usersResponse.json(), claims = await claimsResponse.json();

        // Dashboard totals
        const lost = items.filter(i => i.type === "Lost").length;
        const found = items.filter(i => i.type === "Found").length;

        // Pending Actions counts
        // Only reports/posts with status "Pending" should appear here.
        const pendingPosts = items.filter(
            i => String(i.status || "").toLowerCase() === "pending"
        ).length;

        // /api/claims/count already returns only Pending claims.
        const pendingClaims = Number(claims.count) || 0;

        if (document.getElementById("lostCount")) document.getElementById("lostCount").textContent = lost;
        if (document.getElementById("foundCount")) document.getElementById("foundCount").textContent = found;
        if (document.getElementById("userCount")) document.getElementById("userCount").textContent = Number(users.count) || 0;
        if (document.getElementById("claimCount")) document.getElementById("claimCount").textContent = pendingClaims;

        // These are the numbers shown in the Admin Dashboard "Pending Actions" section.
        if (document.getElementById("pendingPostsCount")) {
            document.getElementById("pendingPostsCount").textContent = pendingPosts;
        }
        if (document.getElementById("pendingClaimsCount")) {
            document.getElementById("pendingClaimsCount").textContent = pendingClaims;
        }
    } catch (error) { console.error("Error loading admin statistics:", error); }
}

async function loadAdminUsers() {
    const container = document.getElementById("usersContainer");
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
        if (!response.ok) throw new Error("Failed to load users");
        const users = await response.json();
        container.innerHTML = users.length ? "" : '<tr><td colspan="5" class="text-center">No users found.</td></tr>';
        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.email)}</td><td><span class="badge ${user.role === "admin" ? "bg-primary" : "bg-secondary"}">${user.role}</span></td><td><span class="badge ${user.status === "active" ? "bg-success" : "bg-danger"}">${user.status}</span></td><td>${user.role === "admin" ? '<span class="text-muted">Admin</span>' : `<button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}')">Suspend</button>`}</td>`;
            container.appendChild(row);
        });
    } catch (error) { console.error(error); container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load users.</td></tr>'; }
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to suspend this user?")) return;
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, { method: "DELETE", headers: authHeaders() });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to suspend user");
        alert(data.message); loadAdminUsers();
    } catch (error) { alert(error.message); }
}

async function updateClaimStatus(id, status) {
    try {
        const response = await fetch(`${API_BASE}/claims/${id}/status`, { method: "PUT", headers: authHeaders(true), body: JSON.stringify({ status }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to update claim");
        alert(data.message); loadAdminClaims();
    } catch (error) { alert("Failed to update claim: " + error.message); }
}

async function loadAdminClaims() {
    const container = document.getElementById("claimsContainer");
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE}/claims`, { headers: authHeaders() });
        if (!response.ok) throw new Error("Failed to load claims");
        const claims = await response.json();
        container.innerHTML = claims.length ? "" : '<tr><td colspan="4" class="text-center">No pending claims found.</td></tr>';
        claims.forEach(claim => {
            container.innerHTML += `<tr data-claim-id="${claim._id}"><td>${escapeHtml(claim.item?.title || "Unknown Item")}</td><td>${escapeHtml(claim.claimantName)}<br><small>${escapeHtml(claim.claimantEmail)}</small></td><td class="status-cell"><span class="badge bg-warning">Pending</span></td><td><button class="btn btn-success btn-sm" onclick="updateClaimStatus('${claim._id}','Approved')">Verify</button> <button class="btn btn-danger btn-sm" onclick="updateClaimStatus('${claim._id}','Rejected')">Reject</button></td></tr>`;
        });
    } catch (error) { console.error(error); container.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load claims.</td></tr>'; }
}

async function loadMyReports() {
    const container = document.getElementById("myReportsContainer");
    if (!container) return;
    if (!protectStudentPage()) return;
    try {
        const response = await fetch(`${API_BASE}/items/mine`, { headers: authHeaders() });
        if (!response.ok) throw new Error("Failed to load reports");
        const items = await response.json();
        container.innerHTML = items.length ? "" : '<div class="col-12"><div class="panel text-center"><h4>No reports found</h4><p class="text-muted">You have not submitted any reports yet.</p></div></div>';
        items.forEach(item => {
            const badge = item.type === "Lost" ? "bg-danger" : "bg-success";
            container.innerHTML += `<div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm"><div class="card-body"><span class="badge ${badge}">${item.type}</span><span class="badge bg-secondary ms-1">${item.status}</span><h5 class="mt-3">${escapeHtml(item.title)}</h5><p>${escapeHtml(item.description || "")}</p><p class="mb-1"><strong>Category:</strong> ${escapeHtml(item.category || "")}</p><p class="mb-1"><strong>Location:</strong> ${escapeHtml(item.location || "")}</p><p class="mb-3"><strong>Contact:</strong> ${escapeHtml(item.contact || "")}</p>${item.status === "Approved" ? `<a href="item-details.html?id=${encodeURIComponent(item._id)}" class="btn btn-primary btn-sm">View Details</a>` : ""}</div></div></div>`;
        });
    } catch (error) { console.error(error); container.innerHTML = '<div class="col-12 text-danger text-center">Failed to load your reports.</div>'; }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

document.addEventListener("DOMContentLoaded", () => {
    loadItems();
    loadAdminStats();
    loadAdminUsers();
    loadAdminClaims();
    loadStudentDashboardStats();
});
