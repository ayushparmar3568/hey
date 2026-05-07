import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import './AllRecords.css';

const AllRecords = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (severityFilter) params.severity = severityFilter;
      if (categoryFilter) params.topic = categoryFilter;
      const res = await API.get('/posts', { params });
      if (res.data.success) setPosts(res.data.data);
    } catch (err) {
      console.error('Fetch posts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSearch = () => {
    fetchPosts();
  };

  // Filter by search text client-side
  const filteredPosts = posts.filter(post => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      post.originalText?.toLowerCase().includes(q) ||
      post._id?.toLowerCase().includes(q) ||
      post.primaryTopic?.toLowerCase().includes(q)
    );
  });

  const getBadgeClass = (level) => {
    switch (level) {
      case 'Critical': return 'ar-badge ar-badge-critical';
      case 'High': return 'ar-badge ar-badge-high';
      case 'Medium': return 'ar-badge ar-badge-medium';
      case 'Low': return 'ar-badge-low';
      default: return '';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) +
      ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Topbar */}
      <header className="ar-topbar">
        <div className="ar-topbar-title">Central Record Archive</div>
        <div className="ar-topbar-meta">{posts.length.toLocaleString()} Total Records</div>
      </header>

      <div className="ar-content">
        {/* Filter Bar */}
        <div className="ar-filter-bar">
          <input
            type="text"
            className="ar-filter-input"
            placeholder="Search content or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select
            className="ar-filter-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            className="ar-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Civic Issue">Civic Issue</option>
            <option value="Crime / Violence">Crime / Violence</option>
            <option value="Self-Harm / Depression">Self-Harm / Depression</option>
            <option value="Cyberbullying / Harassment">Cyberbullying / Harassment</option>
            <option value="Emergency / Disaster">Emergency / Disaster</option>
            <option value="General Complaint">General Complaint</option>
          </select>
          <button className="ar-filter-btn" onClick={handleSearch}>Run Search</button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="ar-loading"><div className="spinner"></div>Loading records...</div>
        ) : (
          <div className="ar-table-container">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Incident Content</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>AI Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <tr key={post._id}>
                      <td>{formatDate(post.createdAt)}</td>
                      <td>
                        "{post.originalText?.length > 60
                          ? post.originalText.slice(0, 60) + '...'
                          : post.originalText}"
                      </td>
                      <td>{post.primaryTopic || '—'}</td>
                      <td>
                        <span className={getBadgeClass(post.severityLevel)}>
                          {post.severityLevel?.toUpperCase() || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {post.severityScore ? (post.severityScore * 25).toFixed(1) : '—'}
                      </td>
                      <td>
                        <span
                          className="ar-table-link"
                          onClick={() => navigate(`/records/${post._id}`)}
                        >
                          View Details
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="ar-empty">
                      No records found. Upload some data to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AllRecords;
