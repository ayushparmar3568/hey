import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [criticalPosts, setCriticalPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, criticalRes, postsRes] = await Promise.all([
          API.get('/dashboard/stats'),
          API.get('/posts/critical'),
          API.get('/posts'),
        ]);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (criticalRes.data.success) setCriticalPosts(criticalRes.data.data);
        if (postsRes.data.success) setAllPosts(postsRes.data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Generate real trend line from post timestamps (last 24h, 12 buckets of 2h each)
  const getTrendData = () => {
    const now = Date.now();
    const bucketCount = 12;
    const bucketMs = (24 * 60 * 60 * 1000) / bucketCount; // 2 hours each
    const buckets = new Array(bucketCount).fill(0);

    allPosts.forEach(post => {
      const created = new Date(post.createdAt).getTime();
      const age = now - created;
      if (age < 24 * 60 * 60 * 1000) {
        const idx = Math.min(bucketCount - 1, Math.floor(age / bucketMs));
        buckets[bucketCount - 1 - idx]++; // older on left, newer on right
      }
    });

    // If no posts in 24h, show all posts distributed evenly for demo
    const hasRecent = buckets.some(b => b > 0);
    if (!hasRecent && allPosts.length > 0) {
      // Distribute all posts across buckets by their relative timestamps
      const sorted = [...allPosts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const earliest = new Date(sorted[0].createdAt).getTime();
      const latest = new Date(sorted[sorted.length - 1].createdAt).getTime();
      const range = latest - earliest || 1;
      sorted.forEach(post => {
        const t = new Date(post.createdAt).getTime();
        const idx = Math.min(bucketCount - 1, Math.floor(((t - earliest) / range) * (bucketCount - 1)));
        buckets[idx]++;
      });
    }

    return buckets;
  };

  // Convert bucket counts to SVG polyline points (0-200 x, 0-80 y)
  const getTrendPoints = () => {
    const buckets = getTrendData();
    const max = Math.max(...buckets, 1);
    const svgW = 200;
    const svgH = 80;
    const padding = 5;
    const usableH = svgH - padding * 2;

    return buckets.map((count, i) => {
      const x = (i / (buckets.length - 1)) * svgW;
      const y = padding + usableH - (count / max) * usableH; // invert Y: higher count = higher on chart
      return `${x.toFixed(0)},${y.toFixed(0)}`;
    }).join(' ');
  };

  const getTrendAreaPath = () => {
    const points = getTrendPoints();
    return `M${points.split(' ').join(' L')} V80 H0 Z`;
  };

  // Format today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  // Compute severity percentages for bar chart
  const getSeverityPercent = (level) => {
    if (!stats) return 0;
    const total = stats.total || 1;
    const count = stats.bySeverity?.[level.toLowerCase()] || 0;
    return Math.round((count / total) * 100);
  };

  // Compute donut chart values
  const getDonutSegments = () => {
    if (!stats?.topicBreakdown?.length) {
      // No data — show empty placeholder ring
      return [
        { color: '#2e3148', dasharray: '175.9 175.9', offset: '0', label: 'No data yet' },
      ];
    }
    const total = stats.topicBreakdown.reduce((sum, t) => sum + t.count, 0) || 1;
    const circumference = 2 * Math.PI * 28; // ~175.93
    const colors = ['#4f46e5', '#22c55e', '#ef4444', '#f97316', '#eab308', '#a5b4fc'];
    let offset = 0;
    return stats.topicBreakdown.slice(0, 5).map((topic, i) => {
      const frac = topic.count / total;
      const arc = frac * circumference;
      const segment = {
        color: colors[i % colors.length],
        dasharray: `${arc.toFixed(1)} ${circumference.toFixed(1)}`,
        offset: `${-offset}`,
        label: topic._id || 'Unknown',
        count: topic.count,
      };
      offset += arc;
      return segment;
    });
  };

  if (loading) {
    return (
      <div className="db-loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  const total = stats?.total || 0;
  const critical = stats?.bySeverity?.critical || 0;
  const resolved = total - (stats?.unresolved || 0);
  const pending = stats?.unresolved || 0;
  const donutSegments = getDonutSegments();

  return (
    <>
      {/* Topbar */}
      <header className="db-topbar">
        <div className="db-topbar-title">Dashboard Overview</div>
        <div className="db-topbar-date">{today}</div>
      </header>

      <div className="db-content">
        {/* Critical Alert Banner */}
        {critical > 0 && (
          <div className="db-alert">
            <div className="pulse-dot"></div>
            <div className="db-alert-text">
              {critical} critical post{critical !== 1 ? 's' : ''} detected — immediate attention required
            </div>
            <div className="db-alert-badge">{critical} Critical</div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="db-stats">
          <div className="db-stat">
            <div className="db-stat-label">TOTAL ANALYSED</div>
            <div className="db-stat-value">{total.toLocaleString()}</div>
          </div>
          <div className="db-stat">
            <div className="db-stat-label">CRITICAL (UNRESOLVED)</div>
            <div className="db-stat-value critical">{critical}</div>
          </div>
          <div className="db-stat">
            <div className="db-stat-label">RESOLVED</div>
            <div className="db-stat-value success">{resolved.toLocaleString()}</div>
          </div>
          <div className="db-stat">
            <div className="db-stat-label">PENDING POSTS</div>
            <div className="db-stat-value warning">{pending}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="db-charts">
          {/* Severity Distribution Bar Chart */}
          <div className="db-chart-card">
            <div className="db-chart-title">Severity distribution</div>
            <div className="bar-group">
              <div className="bar-row">
                <div className="bar-label">Critical</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${getSeverityPercent('Critical')}%`, background: '#ef4444' }}></div>
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-label">High</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${getSeverityPercent('High')}%`, background: '#f97316' }}></div>
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-label">Medium</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${getSeverityPercent('Medium')}%`, background: '#eab308' }}></div>
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-label">Low</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${getSeverityPercent('Low')}%`, background: '#6b6f85' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Issue Categories Donut Chart */}
          <div className="db-chart-card">
            <div className="db-chart-title">Issue categories</div>
            <svg viewBox="0 0 100 80" className="donut-chart">
              {donutSegments.map((seg, i) => (
                <circle
                  key={i}
                  cx="50" cy="38" r="28"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.offset}
                />
              ))}
            </svg>
            <div className="donut-legend">
              {donutSegments.map((seg, i) => (
                <div key={i} className="donut-legend-item">
                  <div className="donut-legend-dot" style={{ background: seg.color }}></div>
                  <span>{seg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Line Chart — Real Data */}
          <div className="db-chart-card">
            <div className="db-chart-title">Trend ({allPosts.length > 0 ? 'post activity' : 'no data'})</div>
            <div className="trend-wrap">
              {allPosts.length > 0 ? (
                <svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline className="trend-line" points={getTrendPoints()} />
                  <path className="trend-area" d={getTrendAreaPath()} />
                </svg>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
                  No post data yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Priority Posts Section */}
        <div className="priority-section">
          <div className="priority-header">
            <div className="priority-title">RECENT HIGH-PRIORITY POSTS</div>
            <span className="priority-link" onClick={() => navigate('/records')}>
              View All Archive ➜
            </span>
          </div>
          {criticalPosts.length > 0 ? (
            criticalPosts.slice(0, 5).map((post) => (
              <div
                key={post._id}
                className="priority-item"
                onClick={() => navigate(`/records/${post._id}`)}
              >
                <p className="priority-text">
                  "{post.originalText?.length > 80 ? post.originalText.slice(0, 80) + '...' : post.originalText}"
                </p>
                <span className="priority-score">
                  {post.severityScore ? (post.severityScore * 25).toFixed(1) : '—'}
                </span>
              </div>
            ))
          ) : (
            <div className="priority-item" style={{ borderLeftColor: 'var(--border)', justifyContent: 'center' }}>
                <p className="priority-text" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                  No critical posts yet. Upload data to see results here.
                </p>
              </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
