// ========================================================
// Hostel Lost & Found Portal - React Application Component
// ========================================================

const { useState, useEffect, useMemo } = React;

// Determine API base path dynamically
const API_BASE = (function() {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:8000/api';
  }
  return 'api';
})();

function App() {
  // State
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, claimed: 0 });
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState({ connected: false, message: 'Connecting to MySQL...' });
  const [toast, setToast] = useState(null);
  const [activeModalItem, setActiveModalItem] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    type: 'lost',
    name: '',
    category: '',
    location: '',
    date: todayStr,
    description: '',
    contact: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Categories list
  const categories = ['All', 'Electronics', 'ID & Documents', 'Clothing', 'Stationery', 'Other'];

  // Show temporary toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Check Database connection & fetch items
  const checkDbAndFetch = async () => {
    try {
      // Test DB
      const testRes = await fetch(`${API_BASE}/test_db.php`);
      if (testRes.ok) {
        const testData = await testRes.json();
        if (testData.success) {
          setDbStatus({
            connected: true,
            message: `MySQL Connected (${testData.database})`
          });
        }
      }
    } catch (e) {
      setDbStatus({
        connected: false,
        message: 'Backend server not detected (Run start-server.bat)'
      });
    }

    // Fetch items
    await fetchItems();
    await fetchStats();
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/items.php`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.warn('Could not load from PHP API:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats.php`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats({
            total: data.total,
            lost: data.lost,
            found: data.found,
            claimed: data.claimed
          });
        }
      }
    } catch (err) {
      console.warn('Could not load stats:', err);
    }
  };

  useEffect(() => {
    checkDbAndFetch();
  }, []);

  // Filter items in memory for instant responsiveness
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Status filter
      if (statusFilter === 'lost' && item.status !== 'lost') return false;
      if (statusFilter === 'found' && item.status !== 'found') return false;
      if (statusFilter === 'claimed' && item.claim_status !== 'claimed') return false;

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesLoc  = (item.location || '').toLowerCase().includes(q);
        const matchesCode = (item.id || '').toLowerCase().includes(q);
        const matchesContact = (item.contact || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLoc && !matchesCode && !matchesContact) {
          return false;
        }
      }

      return true;
    });
  }, [items, search, statusFilter, selectedCategory]);

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Notice to PHP -> MySQL
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.location || !formData.contact) {
      showToast('Please fill in all required fields.', 'info');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/items.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.success) {
        showToast(`Notice ${result.item.id} posted to MySQL!`, 'success');
        // Reset form
        setFormData({
          type: 'lost',
          name: '',
          category: '',
          location: '',
          date: todayStr,
          description: '',
          contact: ''
        });
        // Refresh list and stats from MySQL
        await fetchItems();
        await fetchStats();

        // Scroll to board section
        const boardElem = document.getElementById('boardSection');
        if (boardElem) {
          boardElem.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        showToast(result.error || 'Failed to post notice.', 'info');
      }
    } catch (err) {
      showToast('Network error: Unable to reach PHP backend.', 'info');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Claimed status in MySQL
  const handleToggleClaim = async (item) => {
    try {
      const res = await fetch(`${API_BASE}/items.php?action=claim&id=${encodeURIComponent(item.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        if (activeModalItem && activeModalItem.id === item.id) {
          setActiveModalItem({ ...activeModalItem, claim_status: data.claim_status });
        }
        await fetchItems();
        await fetchStats();
      }
    } catch (err) {
      showToast('Could not update status.', 'info');
    }
  };

  // Delete Notice from MySQL
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm(`Are you sure you want to delete notice #${itemId}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/items.php?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Notice ${itemId} removed from database.`, 'success');
        if (activeModalItem && activeModalItem.id === itemId) {
          setActiveModalItem(null);
        }
        await fetchItems();
        await fetchStats();
      } else {
        showToast(data.error || 'Delete failed.', 'info');
      }
    } catch (err) {
      showToast('Error deleting item.', 'info');
    }
  };

  // Reset demo data in MySQL
  const handleResetData = async () => {
    if (!window.confirm('Reset database notices back to sample records?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reset.php`);
      const data = await res.json();
      if (data.success) {
        showToast('Database reset to sample demo notices!', 'success');
        setSearch('');
        setStatusFilter('all');
        setSelectedCategory('All');
        await fetchItems();
        await fetchStats();
      }
    } catch (err) {
      showToast('Error resetting database.', 'info');
    }
  };

  return (
    <div>
      {/* Toast Notification Container */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>✓</span> {toast.message}
          </div>
        </div>
      )}

      {/* Header and Navigation */}
      <header>
        <div className="container header-content">
          <div className="logo">
            <h1>Hostel Lost &amp; Found</h1>
          </div>
          <nav>
            <ul>
              <li><a href="#boardSection">Notice Board</a></li>
              <li><a href="#reportSection">Post an Item</a></li>
              <li><a href="#howSection">How it Works</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="container">

        {/* Hero / Introduction Section */}
        <section className="hero-section">
          <h2>Lost Something or Found an Item?</h2>
          <p>
            Welcome to the hostel lost and found portal. Check recent items posted by residents
            or fill out the simple form below to report an item.
          </p>

          {/* Live Statistics (React-driven from MySQL) */}
          <div className="stats-box">
            <div className="stat-item">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total Items</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.lost}</span>
              <span className="stat-label">Lost Items</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.found}</span>
              <span className="stat-label">Found Items</span>
            </div>
            {stats.claimed > 0 && (
              <div className="stat-item">
                <span className="stat-number" style={{ color: '#28a745' }}>{stats.claimed}</span>
                <span className="stat-label">Claimed / Resolved</span>
              </div>
            )}
          </div>
        </section>

        {/* Search and Filter Controls */}
        <section className="search-section">
          <div className="search-bar-row">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by keyword, item name, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select 
              className="search-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Items (Lost &amp; Found)</option>
              <option value="lost">Lost Items Only</option>
              <option value="found">Found Items Only</option>
              <option value="claimed">Claimed / Resolved</option>
            </select>
            <button 
              type="button" 
              className="btn btn-reset"
              onClick={handleResetData}
              title="Reseed database with original demo records"
            >
              Reset Demo Data
            </button>
          </div>

          <div className="category-filter-row">
            <span className="filter-label">Filter Category:</span>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Notice Board Items Grid */}
        <section id="boardSection">
          <div className="board-header">
            <h2>Pinned Notices ({filteredItems.length})</h2>
            {search && (
              <small style={{ color: '#666' }}>Showing results for "{search}"</small>
            )}
          </div>

          {loading ? (
            <div className="loading-spinner">
              <p>Loading notices from MySQL database...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-message">
              <h3>No matching notices found</h3>
              <p style={{ marginTop: '8px' }}>
                Try adjusting your search query, selecting another category, or{' '}
                <a href="#reportSection" style={{ fontWeight: 'bold' }}>post a new item</a>.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {filteredItems.map(item => {
                const isLost = item.status === 'lost';
                const isClaimed = item.claim_status === 'claimed';
                return (
                  <div 
                    key={item.id} 
                    className={`item-card ${isClaimed ? 'is-claimed' : ''}`}
                  >
                    <div className="card-header">
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`badge ${isLost ? 'tag-lost' : 'tag-found'}`}>
                          {isLost ? 'LOST' : 'FOUND'}
                        </span>
                        {isClaimed && (
                          <span className="badge tag-claimed">CLAIMED</span>
                        )}
                      </div>
                      <span className="card-id">#{item.id}</span>
                    </div>

                    <h3 className="card-title">{item.name}</h3>

                    <div className="card-details">
                      <p><strong>Category:</strong> {item.category}</p>
                      <p><strong>Location:</strong> {item.location}</p>
                      <p><strong>Date:</strong> {item.date}</p>
                    </div>

                    <p className="card-desc">
                      {item.description || 'No additional details provided.'}
                    </p>

                    <div className="card-footer">
                      <button 
                        type="button" 
                        className="btn btn-outline"
                        onClick={() => setActiveModalItem(item)}
                      >
                        Contact / Claim
                      </button>
                      <button 
                        type="button" 
                        className={`btn ${isClaimed ? 'btn-reset' : 'btn-primary'}`}
                        style={{ fontSize: '11px', padding: '6px 8px' }}
                        onClick={() => handleToggleClaim(item)}
                        title={isClaimed ? 'Mark back as open notice' : 'Mark as claimed/resolved'}
                      >
                        {isClaimed ? 'Reopen' : '✓ Claimed'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-delete"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Delete notice from MySQL"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Report Form Section */}
        <section id="reportSection" className="form-section">
          <h2>Report a Lost or Found Item</h2>
          <p className="section-sub">
            Please fill out this form with clear details. Notices are saved directly to MySQL database via PHP.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Type of Report *</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input 
                    type="radio" 
                    name="type" 
                    value="lost" 
                    checked={formData.type === 'lost'}
                    onChange={handleInputChange}
                  />
                  Lost Item (I lost something)
                </label>
                <label className="radio-option">
                  <input 
                    type="radio" 
                    name="type" 
                    value="found" 
                    checked={formData.type === 'found'}
                    onChange={handleInputChange}
                  />
                  Found Item (I found something)
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemName">Item Name *</label>
                <input 
                  type="text" 
                  id="itemName" 
                  name="name"
                  className="form-control" 
                  placeholder="e.g. Black umbrella, Casio calculator" 
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="itemCategory">Category *</label>
                <select 
                  id="itemCategory" 
                  name="category"
                  className="form-control" 
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">-- Select Category --</option>
                  <option value="Electronics">Electronics</option>
                  <option value="ID & Documents">ID &amp; Documents</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemLocation">Location / Where seen *</label>
                <input 
                  type="text" 
                  id="itemLocation" 
                  name="location"
                  className="form-control" 
                  placeholder="e.g. Mess Hall, Block C 2nd Floor" 
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="itemDate">Date *</label>
                <input 
                  type="date" 
                  id="itemDate" 
                  name="date"
                  className="form-control" 
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="itemDescription">Description &amp; Identifying Details</label>
              <textarea 
                id="itemDescription" 
                name="description"
                className="form-control" 
                rows="3" 
                placeholder="Color, brand name, any stickers, scratches or unique marks..."
                value={formData.description}
                onChange={handleInputChange}
              ></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="itemContact">Your Contact Information *</label>
              <input 
                type="text" 
                id="itemContact" 
                name="contact"
                className="form-control" 
                placeholder="e.g. Room 302 Block B or Phone: 9876543210" 
                required
                value={formData.contact}
                onChange={handleInputChange}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-submit"
              disabled={submitting}
            >
              {submitting ? 'Posting notice to MySQL...' : '+ Submit & Post Notice'}
            </button>
          </form>
        </section>

        {/* How It Works Section */}
        <section id="howSection" className="how-section">
          <h2>How the System Works</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-num">1</div>
              <h3>1. Post a Notice</h3>
              <p>Lost or found an object? Submit the form. React immediately transmits the notice to the PHP MySQL database.</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <h3>2. Search &amp; Filter</h3>
              <p>Browse by status or category in real-time, or search keywords directly to find matching belongings.</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <h3>3. Claim &amp; Return</h3>
              <p>Click "Contact / Claim" to view contact details, reach out, and click "Claimed" to resolve the notice.</p>
            </div>
          </div>
        </section>

      </main>

      {/* Contact & Claim Details Modal */}
      {activeModalItem && (
        <div className="modal-overlay" onClick={() => setActiveModalItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Notice Details ({activeModalItem.id})</h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setActiveModalItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Item:</strong> {activeModalItem.name}</p>
              <p><strong>Status:</strong> {activeModalItem.status.toUpperCase()} {activeModalItem.claim_status === 'claimed' ? '(Claimed / Resolved)' : '(Open Notice)'}</p>
              <p><strong>Category:</strong> {activeModalItem.category}</p>
              <p><strong>Location:</strong> {activeModalItem.location}</p>
              <p><strong>Date Reported:</strong> {activeModalItem.date}</p>
              
              {activeModalItem.description && (
                <p style={{ marginTop: '10px' }}>
                  <strong>Description:</strong> {activeModalItem.description}
                </p>
              )}

              <div className="contact-highlight-box">
                <strong style={{ color: '#0056b3' }}>Contact Information:</strong>
                <p style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '4px', color: '#111' }}>
                  {activeModalItem.contact}
                </p>
                <small style={{ color: '#555' }}>
                  Please get in touch with the student or office above to coordinate handover.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => handleToggleClaim(activeModalItem)}
              >
                {activeModalItem.claim_status === 'claimed' ? 'Mark Back as Open' : 'Mark as Claimed / Resolved'}
              </button>
              <button 
                type="button" 
                className="btn btn-reset" 
                onClick={() => setActiveModalItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        <div className="container">
          <p>&copy; 2026 Hostel Lost &amp; Found Portal | Web Programming Project</p>
        </div>
      </footer>
    </div>
  );
}

// Mount React Root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
