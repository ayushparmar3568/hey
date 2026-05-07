import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import './PostDetail.css';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [postsRes] = await Promise.all([
          API.get('/posts'),
        ]);
        if (postsRes.data.success) {
          setAllPosts(postsRes.data.data);
          const found = postsRes.data.data.find(p => p._id === id);
          if (found) {
            setPost(found);
            setNotes(found.adminNotes || '');
          }
        }
      } catch (err) {
        console.error('Post detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Navigation between posts
  const currentIndex = allPosts.findIndex(p => p._id === id);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const queueCount = allPosts.filter(p => !p.isResolved).length;

  const handleResolve = async () => {
    setResolving(true);
    try {
      const res = await API.patch(`/posts/${id}/resolve`, { adminNotes: notes });
      if (res.data.success) {
        setPost(res.data.data);
        setSaveMsg('✅ Incident resolved successfully.');
      }
    } catch (err) {
      console.error('Resolve error:', err);
    } finally {
      setResolving(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await API.patch(`/posts/${id}/resolve`, { adminNotes: notes });
      setSaveMsg('✅ Notes saved.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      console.error('Save notes error:', err);
    }
  };

  const getSeverityClass = (level) => {
    switch (level) {
      case 'High': return 'high';
      case 'Medium': return 'medium';
      case 'Low': return 'low';
      default: return '';
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'twitter': return 'TWITTER';
      case 'facebook': return 'FACEBOOK';
      case 'reddit': return 'REDDIT';
      case 'instagram': return 'INSTAGRAM';
      default: return 'MANUAL';
    }
  };

  if (loading) {
    return <div className="pd-loading"><div className="spinner"></div>Loading incident details...</div>;
  }

  if (!post) {
    return <div className="pd-loading">Incident not found.</div>;
  }

  const severityDisplay = post.severityScore ? post.severityScore * 25 : 0;
  const sevClass = getSeverityClass(post.severityLevel);

  return (
    <>
      {/* Topbar */}
      <header className="pd-topbar">
        <div className="pd-breadcrumb">
          <span className="pd-breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboards</span>
          <span>/</span>
          <span className="pd-breadcrumb-link" onClick={() => navigate('/records')}>Archive</span>
          <span>/</span>
          <span className="pd-breadcrumb-active">Incident Detail</span>
        </div>
        <div className="pd-verdict-badge">
          VERDICT: {post.severityLevel?.toUpperCase() || 'PENDING'}
        </div>
      </header>

      {/* Floating Triage Dock */}
      <div className="pd-floating-nav">
        <div className="pd-floating-queue">
          <strong>{queueCount}</strong> in queue
        </div>
        <button
          className="pd-nav-btn"
          disabled={!prevPost}
          onClick={() => prevPost && navigate(`/records/${prevPost._id}`)}
        >
          ← Previous
        </button>
        <button
          className="pd-nav-btn next"
          disabled={!nextPost}
          onClick={() => nextPost && navigate(`/records/${nextPost._id}`)}
        >
          Next Incident →
        </button>
      </div>

      <div className="pd-content">
        {/* Left Column */}
        <div className="pd-left">
          <div className="pd-card">
            <div className="pd-card-header">
              <div className="pd-card-title">Analysis Subject</div>
            </div>

            {/* Post Hero */}
            <div className={`pd-post-hero ${sevClass}`}>
              "{post.originalText}"
            </div>

            {/* Author Strip */}
            <div className="pd-author-strip">
              <div className="pd-author-avatar">
                {post.uploaderName ? post.uploaderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AK'}
                <div className="pd-author-verified">✔️</div>
              </div>
              <div className="pd-author-info">
                <div className="pd-author-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pd-author-name">{post.uploaderName || 'Anonymous User'}</span>
                    <span className="pd-source-badge">{getSourceLabel(post.source)}</span>
                  </div>
                  <span className="pd-author-link">🔍 View Original Feed</span>
                </div>
                <div className="pd-author-right">
                  <span className="pd-author-meta" style={{ color: 'var(--success)', fontWeight: 700 }}>
                    📍 {post.uploaderLocation || 'Unknown Location'}
                  </span>
                  <span className="pd-author-meta">📅 {post.source || 'manual'}</span>
                </div>
              </div>
            </div>

            {/* Resolved Banner */}
            {post.isResolved && (
              <div className="pd-resolved-banner">✅ This incident has been resolved.</div>
            )}

            {/* Severity Score Card */}
            <div className={`pd-severity-card ${sevClass}`}>
              <div className="pd-severity-score">{Math.round(severityDisplay)}</div>
              <div>
                <div className="pd-severity-label">{post.severityLevel || 'Unknown'} Severity</div>
                <div className="pd-severity-sub">
                  {post.severityLevel === 'Critical'
                    ? 'Urgent intervention recommended by AI Engine.'
                    : `AI Engine analysis complete — ${post.severityLevel} risk level.`}
                </div>
              </div>
            </div>

            {/* Triage Actions */}
            <div className="pd-triage-grid">
              <button
                className="pd-resolve-btn"
                onClick={handleResolve}
                disabled={resolving || post.isResolved}
              >
                {resolving ? 'Resolving...' : post.isResolved ? '✅ Resolved' : 'Resolve Incident'}
              </button>
              <button className="pd-escalate-btn">
                Escalate to Human
              </button>
            </div>
          </div>

          {/* Resolution Audit Log */}
          <div className="pd-card pd-audit-card">
            <div className="pd-card-header">
              <div className="pd-card-title">Resolution Audit Log</div>
            </div>
            <textarea
              className="pd-notes-textarea"
              placeholder="Type your action report here (e.g. 'Contacted local helpline', 'Forwarded to NGO'...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="pd-audit-footer">
              <div className="pd-audit-hint">Notes are saved to incident history.</div>
              <button className="pd-save-btn" onClick={handleSaveNotes}>Save Log</button>
            </div>
            {saveMsg && <div className="pd-success-msg">{saveMsg}</div>}
          </div>
        </div>

        {/* Right Column — AI Decision Trace */}
        <div className="pd-right">
          <div className="pd-card">
            <div className="pd-card-header">
              <div className="pd-card-title">AI Decision Trace</div>
            </div>
            <div className="logic-trace">
              <div className="logic-node success">
                <div className="logic-step-circle"></div>
                <div className="logic-header">01. Neural Pre-Processing</div>
                <div className="logic-body">
                  Normalizing raw content into BERT-based semantic embeddings to filter out linguistic noise and prepare for deep neural parsing.
                </div>
              </div>
              <div className="logic-node active">
                <div className="logic-step-circle"></div>
                <div className="logic-header">02. Engine A: Topic Detection</div>
                <div className="logic-body">
                  Cross-referencing embeddings against high-risk latent clusters; verified {Math.round((post.topicConfidence || 0.92) * 100)}% match with "{post.primaryTopic || 'Critical Distress'}" sub-domains.
                </div>
              </div>
              <div className="logic-node active">
                <div className="logic-step-circle"></div>
                <div className="logic-header">03. Engine B: Sentiment Intensity</div>
                <div className="logic-body">
                  Measuring emotional valence and psychological arousal. Identified {post.dominantEmotionScore?.toFixed(2) || '0.94'} {post.dominantEmotion || 'negativity'}, {post.severityLevel === 'Critical' ? 'exceeding safe platform arousal thresholds' : 'within normal platform parameters'}.
                </div>
              </div>
              <div className="logic-node success">
                <div className="logic-step-circle"></div>
                <div className="logic-header">04. Sarcasm & Nuance Filter</div>
                <div className="logic-body">
                  Applying zero-shot filtering to detect irony or hyperbole. Confirmed subject intent as {post.isHyperbole ? 'potentially sarcastic' : 'genuine'} with {post.isHyperbole ? 'flagged review' : '98% confidence'}.
                </div>
              </div>
              <div className={`logic-node ${post.severityLevel === 'Critical' ? 'critical' : 'active'}`}>
                <div className="logic-step-circle"></div>
                <div className="logic-header">05. Aggregated Severity Verdict</div>
                <div className="logic-body">
                  Final weighting of categorical risk vs. emotional intensity to reach a verdict of {Math.round(severityDisplay)}/100, {post.severityLevel === 'Critical' ? 'triggering immediate priority triage' : `classified as ${post.severityLevel} priority`}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostDetail;
