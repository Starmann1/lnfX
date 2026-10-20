// ==========================================
// Lost & Found Notice Board - JavaScript Logic
// Simple beginner-friendly script for Web Programming
// ==========================================

// Initial sample data for the notice board
const defaultItems = [
  {
    id: "L-0128",
    status: "lost",
    name: "Matte black wired earphones",
    category: "Electronics",
    location: "Mess Hall, Block C",
    date: "2026-10-13",
    description: "Left near the tray return counter around dinner time. Has a small red thread tied on one earbud.",
    contact: "Room 302, Block C"
  },
  {
    id: "F-0127",
    status: "found",
    name: "College ID card — S. Ramesh",
    category: "ID & Documents",
    location: "Warden's Office, Ground Floor",
    date: "2026-10-12",
    description: "Handed in at the warden's office. Owner can collect after verifying room number.",
    contact: "Warden Office (Ext 204)"
  },
  {
    id: "L-0126",
    status: "lost",
    name: "Grey hoodie, size M",
    category: "Clothing",
    location: "Common Room, Block A",
    date: "2026-10-11",
    description: "Left on the back of a chair during movie night. University logo on the left chest.",
    contact: "rahul.a@hostel.edu"
  },
  {
    id: "F-0125",
    status: "found",
    name: "Steel water bottle, dented cap",
    category: "Other",
    location: "Reading Room, 2nd Floor",
    date: "2026-10-10",
    description: "Sitting by the window seat closest to the noticeboard. Name scratched off the label.",
    contact: "Room 114, Block B"
  },
  {
    id: "L-0124",
    status: "lost",
    name: "USB-C charging cable",
    category: "Electronics",
    location: "Study Hall, Block B",
    date: "2026-10-09",
    description: "Was plugged into socket near desk 12. White cable, slightly frayed near connector.",
    contact: "Room 214, Block B"
  },
  {
    id: "F-0123",
    status: "found",
    name: "Set of two room keys",
    category: "Other",
    location: "Laundry Room, Block C",
    date: "2026-10-08",
    description: "Found on top of a washing machine. Keychain has a small yellow tag, no name.",
    contact: "Caretaker Office"
  }
];

// Load items from localStorage if available, or use default items
let items = [];
const savedItems = localStorage.getItem("hostel_lnf_items");
if (savedItems) {
  try {
    items = JSON.parse(savedItems);
  } catch (e) {
    items = [...defaultItems];
  }
} else {
  items = [...defaultItems];
}

// Global filter variables
let currentCategory = "All";
let currentStatus = "all";
let currentSearch = "";

// DOM Elements
const itemsContainer = document.getElementById("itemsContainer");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const categoryButtons = document.querySelectorAll(".filter-btn");
const reportForm = document.getElementById("reportForm");
const totalCountSpan = document.getElementById("totalCount");
const lostCountSpan = document.getElementById("lostCount");
const foundCountSpan = document.getElementById("foundCount");

// Save items to localStorage
function saveItems() {
  localStorage.setItem("hostel_lnf_items", JSON.stringify(items));
}

// Function to update the summary counts
function updateStats() {
  const total = items.length;
  const lost = items.filter(item => item.status === "lost").length;
  const found = items.filter(item => item.status === "found").length;

  if (totalCountSpan) totalCountSpan.textContent = total;
  if (lostCountSpan) lostCountSpan.textContent = lost;
  if (foundCountSpan) foundCountSpan.textContent = found;
}

// Function to render items on the page
function displayItems(itemList) {
  itemsContainer.innerHTML = "";

  if (itemList.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-message">
        <p><strong>No items found!</strong></p>
        <p>Try searching for something else or clear the filters.</p>
      </div>
    `;
    return;
  }

  for (let i = 0; i < itemList.length; i++) {
    const item = itemList[i];

    // Create item card element
    const card = document.createElement("div");
    card.className = "item-card";

    // Tag class based on lost or found
    const tagClass = item.status === "lost" ? "tag-lost" : "tag-found";
    const statusLabel = item.status === "lost" ? "LOST" : "FOUND";

    card.innerHTML = `
      <div class="card-header">
        <span class="badge ${tagClass}">${statusLabel}</span>
        <span class="card-id">#${item.id}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.name)}</h3>
      <div class="card-details">
        <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
        <p><strong>Location:</strong> ${escapeHtml(item.location)}</p>
        <p><strong>Date:</strong> ${escapeHtml(item.date)}</p>
      </div>
      <p class="card-desc">${escapeHtml(item.description)}</p>
      <div class="card-footer">
        <button class="btn btn-outline claim-btn" onclick="claimItem('${item.id}')">
          ${item.status === "lost" ? "I Found This" : "This Is Mine"}
        </button>
        <button class="btn btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
      </div>
    `;

    itemsContainer.appendChild(card);
  }
}

// Simple HTML escaping helper to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

// Filter and display items based on search and filters
function applyFilters() {
  const query = currentSearch.toLowerCase().trim();

  const filtered = items.filter(item => {
    // Check status filter
    const matchesStatus = currentStatus === "all" || item.status === currentStatus;

    // Check category filter
    const matchesCategory = currentCategory === "All" || item.category.toLowerCase() === currentCategory.toLowerCase();

    // Check search term
    const matchesSearch = query === "" ||
      item.name.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  displayItems(filtered);
}

// Claim Item alert handler
window.claimItem = function(id) {
  const item = items.find(it => it.id === id);
  if (!item) return;

  if (item.status === "lost") {
    alert("Owner Contact Details:\n" +
          "------------------------\n" +
          "Item: " + item.name + "\n" +
          "Contact: " + item.contact + "\n" +
          "Please reach out to the owner to return the item!");
  } else {
    alert("Finder Contact Details:\n" +
          "------------------------\n" +
          "Item: " + item.name + "\n" +
          "Held at: " + item.location + "\n" +
          "Contact: " + item.contact + "\n" +
          "Please verify ownership details when collecting!");
  }
};

// Delete item handler
window.deleteItem = function(id) {
  const confirmDelete = confirm("Are you sure you want to remove this item?");
  if (confirmDelete) {
    items = items.filter(it => it.id !== id);
    saveItems();
    updateStats();
    applyFilters();
    alert("Item removed successfully!");
  }
};

// Search input event
if (searchInput) {
  searchInput.addEventListener("input", function(e) {
    currentSearch = e.target.value;
    applyFilters();
  });
}

// Status dropdown event
if (statusFilter) {
  statusFilter.addEventListener("change", function(e) {
    currentStatus = e.target.value;
    applyFilters();
  });
}

// Category filter buttons
categoryButtons.forEach(button => {
  button.addEventListener("click", function() {
    // Remove active class from all buttons
    categoryButtons.forEach(btn => btn.classList.remove("active"));
    // Add active to clicked button
    this.classList.add("active");
    currentCategory = this.getAttribute("data-category");
    applyFilters();
  });
});

// Form submission handler
if (reportForm) {
  reportForm.addEventListener("submit", function(e) {
    e.preventDefault();

    // Get input values
    const statusRadio = document.querySelector('input[name="itemType"]:checked');
    const nameInput = document.getElementById("itemName");
    const categorySelect = document.getElementById("itemCategory");
    const locationInput = document.getElementById("itemLocation");
    const dateInput = document.getElementById("itemDate");
    const descTextarea = document.getElementById("itemDescription");
    const contactInput = document.getElementById("itemContact");

    // Simple validation
    if (!nameInput.value.trim() || !categorySelect.value || !locationInput.value.trim() || !contactInput.value.trim()) {
      alert("Please fill in all the required fields!");
      return;
    }

    const itemType = statusRadio ? statusRadio.value : "lost";
    const prefix = itemType === "lost" ? "L" : "F";
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `${prefix}-${randomNum}`;

    const newItem = {
      id: newId,
      status: itemType,
      name: nameInput.value.trim(),
      category: categorySelect.value,
      location: locationInput.value.trim(),
      date: dateInput.value || new Date().toISOString().split("T")[0],
      description: descTextarea.value.trim() || "No extra description provided.",
      contact: contactInput.value.trim()
    };

    // Add new item to the beginning of the list
    items.unshift(newItem);
    saveItems();
    updateStats();

    // Reset filters so the new item is visible
    currentCategory = "All";
    currentStatus = "all";
    currentSearch = "";

    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    categoryButtons.forEach(btn => {
      if (btn.getAttribute("data-category") === "All") {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    applyFilters();

    // Reset form
    reportForm.reset();

    // Show confirmation message
    alert("Success! Your item #" + newId + " has been posted to the notice board.");

    // Scroll to the items board
    const boardSection = document.getElementById("boardSection");
    if (boardSection) {
      boardSection.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// Reset data button (handy for testing)
const resetDataBtn = document.getElementById("resetDataBtn");
if (resetDataBtn) {
  resetDataBtn.addEventListener("click", function() {
    if (confirm("Reset all items back to default sample items?")) {
      items = [...defaultItems];
      saveItems();
      updateStats();
      applyFilters();
      alert("Notice board reset to default items!");
    }
  });
}

// Initial setup on page load
document.addEventListener("DOMContentLoaded", function() {
  // Set default date input to today
  const dateInput = document.getElementById("itemDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  updateStats();
  applyFilters();
});
