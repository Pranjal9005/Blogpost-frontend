import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI, getImageUrl } from '../services/api';
import './Posts.css';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
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

  const handleProfileClick = (e) => {
    e.preventDefault();
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleProfileLinkClick = () => {
    setShowProfileDropdown(false);
    navigate('/profile');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const handleToggleForm = () => {
    setShowCreateForm((prev) => !prev);
    setFormError('');
    setNewPost({ title: '', content: '', image: null });
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setNewPost({ ...newPost, image: null });
      setImagePreview(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFormError('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    setFormError('');
    setNewPost({ ...newPost, image: file });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
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
      await postsAPI.createPost({ 
        title, 
        content, 
        image: newPost.image 
      });
      setNewPost({ title: '', content: '', image: null });
      setImagePreview(null);
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
          <Link to="/posts" className="logo-link">
            <h1>WordNest</h1>
          </Link>
          <div className="header-actions">
            {user && (
              <div className="user-greeting">
                <span className="greeting-text">Welcome,</span>
                <span className="username-text">{user.username}</span>
              </div>
            )}
            <button onClick={handleToggleForm} className="primary-button">
              {showCreateForm ? 'Close' : 'New Post'}
            </button>
            <div className="profile-dropdown-container">
              <button 
                onClick={handleProfileClick} 
                className="profile-dropdown-button"
                aria-expanded={showProfileDropdown}
              >
                {user?.username || 'Profile'}
                <span className="dropdown-arrow">▼</span>
              </button>
              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <Link 
                    to="/profile" 
                    className="dropdown-item"
                    onClick={handleProfileLinkClick}
                  >
                    View Profile
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="dropdown-item logout-item"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
        <Link to="/posts" className="logo-link">
          <h1>WordNest</h1>
        </Link>
        <div className="header-actions">
          {user && (
            <div className="user-greeting">
              <span className="greeting-text">Welcome,</span>
              <span className="username-text">{user.username}</span>
            </div>
          )}
          <button onClick={handleToggleForm} className="primary-button">
            {showCreateForm ? 'Close' : 'New Post'}
          </button>
          <div className="profile-dropdown-container">
            <button 
              onClick={handleProfileClick} 
              className="profile-dropdown-button"
              aria-expanded={showProfileDropdown}
            >
              {user?.username || 'Profile'}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showProfileDropdown && (
              <div className="profile-dropdown-menu">
                <Link 
                  to="/profile" 
                  className="dropdown-item"
                  onClick={handleProfileLinkClick}
                >
                  View Profile
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="dropdown-item logout-item"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className={`error-banner ${error.includes('Cannot connect to server') ? 'connection-error' : ''}`}>
          {error}
        </div>
      )}

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
            <div className="form-group">
              <label htmlFor="image">Image (Optional)</label>
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                disabled={creating}
              />
              <small className="file-hint">
                JPEG, PNG, GIF, or WebP. Maximum 5MB.
              </small>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    className="remove-image-button"
                    onClick={() => {
                      setNewPost({ ...newPost, image: null });
                      setImagePreview(null);
                      document.getElementById('image').value = '';
                    }}
                    disabled={creating}
                  >
                    Remove Image
                  </button>
                </div>
              )}
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
                  {post.image_url && (
                    <div className="post-image">
                      <img 
                        src={getImageUrl(post.image_url)} 
                        alt={post.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
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

