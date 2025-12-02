import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import './Posts.css';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage]);

  const fetchPosts = async (page) => {
    setLoading(true);
    setError('');

    try {
      const data = await postsAPI.getPosts(page, limit);
      setPosts(data.posts || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch posts');
      if (err.message.includes('token') || err.message.includes('Unauthorized')) {
        // Token expired or invalid, logout and redirect to login
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination?.totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleForm = () => {
    setShowCreateForm((prev) => !prev);
    setFormError('');
  };

  const handleCreatePost = async (event) => {
    event.preventDefault();
    const title = newPost.title.trim();
    const content = newPost.content.trim();

    if (!title || !content) {
      setFormError('Title and content are required');
      return;
    }

    setCreating(true);
    setFormError('');

    try {
      await postsAPI.createPost({ title, content });
      setNewPost({ title: '', content: '' });
      setShowCreateForm(false);
      setCurrentPage(1);
      fetchPosts(1);
    } catch (err) {
      const message = err.message || 'Failed to create post';
      setFormError(message);
      if (message.includes('token') || message.includes('Unauthorized')) {
        logout();
        navigate('/login');
      }
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && posts.length === 0) {
    return (
      <div className="posts-container">
        <div className="posts-header">
          <h1>WordNest</h1>
          <div className="header-actions">
            {user && <span className="user-info">Welcome, {user.username}</span>}
            <button onClick={handleToggleForm} className="primary-button">
              {showCreateForm ? 'Close' : 'New Post'}
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="posts-container">
      <div className="posts-header">
        <h1>WordNest</h1>
        <div className="header-actions">
          {user && <span className="user-info">Welcome, {user.username}</span>}
          <button onClick={handleToggleForm} className="primary-button">
            {showCreateForm ? 'Close' : 'New Post'}
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showCreateForm && (
        <div className="create-post-card">
          <h3>Create a new post</h3>
          {formError && <div className="error-banner compact">{formError}</div>}
          <form onSubmit={handleCreatePost} className="create-post-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Enter a descriptive title"
                disabled={creating}
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                rows={6}
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="Share your thoughts..."
                disabled={creating}
              ></textarea>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleToggleForm}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={creating}>
                {creating ? 'Publishing...' : 'Publish Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="posts-content">
        <h2>All Posts</h2>

        {posts.length === 0 && !loading ? (
          <div className="empty-state">
            <p>No posts available yet.</p>
          </div>
        ) : (
          <>
            <div className="posts-grid">
              {posts.map((post) => (
                <article key={post.id} className="post-card">
                  <div className="post-header">
                    <h3 className="post-title">{post.title}</h3>
                    <span className="post-author">by {post.author_name}</span>
                  </div>
                  <div className="post-content">
                    <p>{post.content}</p>
                  </div>
                  <div className="post-footer">
                    <span className="post-date">
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage || loading}
                  className="pagination-button"
                >
                  Previous
                </button>

                <div className="pagination-info">
                  <span>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <span className="posts-count">
                    ({pagination.totalPosts} total posts)
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Posts;

