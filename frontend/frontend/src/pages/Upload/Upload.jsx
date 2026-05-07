import { useState, useRef, useEffect } from 'react';
import API from '../../api';
import './Upload.css';

const Upload = () => {
  // CSV Batch state
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  // Manual analysis state
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [platform, setPlatform] = useState('twitter');
  const [analyzing, setAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');

  // Upload history (real data from backend)
  const [recentPosts, setRecentPosts] = useState([]);

  // Fetch recent posts from backend on mount
  const fetchRecentPosts = async () => {
    try {
      const res = await API.get('/posts');
      if (res.data.success) {
        setRecentPosts(res.data.data);
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
    }
  };

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  // Group posts by source for the history table
  const getHistoryRows = () => {
    if (recentPosts.length === 0) return [];
    const groups = {};
    recentPosts.forEach(post => {
      const src = post.source || 'manual_upload';
      if (!groups[src]) {
        groups[src] = { posts: [], criticalCount: 0, latestDate: null };
      }
      groups[src].posts.push(post);
      if (post.severityLevel === 'Critical' || post.severityLevel === 'High') {
        groups[src].criticalCount++;
      }
      const d = new Date(post.createdAt);
      if (!groups[src].latestDate || d > groups[src].latestDate) {
        groups[src].latestDate = d;
      }
    });
    return Object.entries(groups).map(([source, data]) => ({
      name: getSourceLabel(source),
      timestamp: data.latestDate.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      volume: `${data.posts.length} records`,
      hits: data.criticalCount,
      status: 'PROCESSED',
    }));
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'twitter': return 'Twitter / X Feed';
      case 'facebook': return 'Facebook Ingest';
      case 'reddit': return 'Reddit Ingest';
      case 'instagram': return 'Instagram Feed';
      case 'manual_upload': return 'Manual / CSV Upload';
      default: return 'Other';
    }
  };

  // ── CSV Upload Handlers ──────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleCSVUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setError('');

    try {
      // Parse CSV client-side
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const header = lines[0].toLowerCase();
      
      // Try to find a "text" column, fallback to first column
      const headers = header.split(',').map(h => h.trim().replace(/"/g, ''));
      const textIndex = headers.findIndex(h => h === 'text' || h === 'content' || h === 'post');
      const idx = textIndex >= 0 ? textIndex : 0;

      const dataset = lines.slice(1).map(line => {
        const cols = line.split(',');
        return { text: cols[idx]?.replace(/"/g, '').trim(), source: 'manual_upload' };
      }).filter(item => item.text && item.text.length > 5);

      if (dataset.length === 0) {
        setError('No valid text entries found in CSV.');
        setUploading(false);
        return;
      }

      // Send max 50 at a time per backend limit
      const batch = dataset.slice(0, 50);
      const res = await API.post('/upload/dataset', { dataset: batch });
      
      setUploadResult(res.data.message);
      setFile(null);
      // Refresh history from backend
      fetchRecentPosts();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // ── Manual Analysis Handler ──────────────────────────────
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setVerdict(null);
    setError('');

    try {
      const res = await API.post('/posts/analyze', {
        text: text.trim(),
        source: platform,
      });
      if (res.data.success) {
        setVerdict(res.data.data);
        // Refresh history from backend
        fetchRecentPosts();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityClass = (level) => {
    switch (level) {
      case 'Critical': return '';
      case 'High': return 'high';
      case 'Medium': return 'medium';
      case 'Low': return 'low';
      default: return '';
    }
  };

  const getSeverityColor = (level) => {
    switch (level) {
      case 'Critical': return 'var(--critical)';
      case 'High': return 'var(--warning)';
      case 'Medium': return 'var(--yellow)';
      case 'Low': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <>
      {/* Topbar */}
      <header className="ua-topbar">
        <div className="ua-topbar-title">Ingest & Analysis Center</div>
      </header>

      <div className="ua-content">
        <div className="ua-grid">
          {/* Batch CSV Ingestion */}
          <div className="ua-card">
            <div className="ua-card-title">Batch CSV Ingestion</div>
            <div
              className={`ua-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="ua-dropzone-icon">📁</div>
              <div className="ua-dropzone-title">Drop your dataset here</div>
              <div className="ua-dropzone-sub">Supports .csv up to 100MB</div>
              <button
                className="ua-dropzone-btn"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Browse Computer
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
            {file && <div className="ua-file-name">✅ {file.name}</div>}
            {file && (
              <button className="ua-upload-btn" onClick={handleCSVUpload} disabled={uploading}>
                {uploading ? <><span className="spinner"></span> Processing...</> : '🚀 Upload & Process'}
              </button>
            )}
            {uploadResult && <div className="ua-success">{uploadResult}</div>}
          </div>

          {/* Manual Text Analysis */}
          <div className="ua-card">
            <div className="ua-card-title">Diagnostic Text Analysis</div>
            <div className="ua-field">
              <label className="ua-label">📝 Post Content</label>
              <textarea
                className="ua-textarea"
                style={{ height: '100px' }}
                placeholder="Paste social media content here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="ua-form-row">
              <div>
                <label className="ua-label">📍 Location</label>
                <input
                  type="text"
                  className="ua-input"
                  placeholder="e.g. Delhi"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label className="ua-label">🐦 Platform</label>
                <select
                  className="ua-select"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="facebook">Facebook</option>
                  <option value="reddit">Reddit</option>
                  <option value="instagram">Instagram</option>
                  <option value="manual_upload">Manual</option>
                </select>
              </div>
            </div>
            <button className="ua-analyze-btn" onClick={handleAnalyze} disabled={analyzing || !text.trim()}>
              {analyzing ? <><span className="spinner"></span> Analyzing...</> : '✨ Run AI Diagnostics'}
            </button>

            {/* Verdict Display */}
            {verdict && (
              <div className={`ua-verdict ${getSeverityClass(verdict.severityLevel)}`}>
                <div>
                  <div className="ua-verdict-label">Categorized As</div>
                  <div className="ua-verdict-value">{verdict.primaryTopic || 'Unknown'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ua-verdict-label">Severity</div>
                  <div className="ua-verdict-severity" style={{ color: getSeverityColor(verdict.severityLevel) }}>
                    {verdict.severityLevel?.toUpperCase()} ({verdict.severityScore ? verdict.severityScore * 25 : 0}/100)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload History Table — Real Backend Data */}
          <div className="ua-card ua-card-full" style={{ marginTop: '0' }}>
            <div className="ua-card-title">Post Upload History</div>
            <table className="ua-history-table">
              <thead>
                <tr>
                  <th>Source Channel</th>
                  <th>Latest Activity</th>
                  <th>Volume</th>
                  <th>AI Hits</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {getHistoryRows().length > 0 ? (
                  getHistoryRows().map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.timestamp}</td>
                      <td>{item.volume}</td>
                      <td style={{ color: item.hits > 0 ? 'var(--critical)' : 'var(--success)', fontWeight: 700 }}>
                        {item.hits} Detects
                      </td>
                      <td><span className="ua-status-badge">{item.status}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No upload history yet. Analyze some posts to see data here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && <div className="ua-error">{error}</div>}
      </div>
    </>
  );
};

export default Upload;
