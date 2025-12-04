import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, postsAPI, getImageUrl } from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, updateUser, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    bio: '',
  });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile picture state
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState('');

  // User posts state
  const [userPosts, setUserPosts] = useState([]);
  const [postsPagination, setPostsPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Edit post state
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPost, setEditPost] = useState({ title: '', content: '', image: null });
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [postEditError, setPostEditError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchStats();
    fetchUserPosts(1);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userAPI.getProfile();
      setProfile(data);
      setEditForm({
        username: data.username || '',
        email: data.email || '',
        bio: data.bio || '',
      });
      updateUser(data);
    } catch (err) {
      let errorMessage = err.message || 'Failed to fetch profile';
      
      // Check if it's a 404 - endpoint might not exist
      if (err.status === 404 || errorMessage.includes('404')) {
        // If endpoint doesn't exist, try to use user data from context as fallback
        if (user) {
          setProfile({
            ...user,
            bio: user.bio || null,
            profile_picture_url: user.profile_picture_url || null,
            post_count: user.post_count || 0,
          });
          setEditForm({
            username: user.username || '',
            email: user.email || '',
            bio: user.bio || '',
          });
          setError('Note: Profile endpoint not available. Showing basic profile information.');
        } else {
          errorMessage = `Profile endpoint not found (404). The backend server might not have the /api/user/profile endpoint. Please check your backend API routes.`;
          setError(errorMessage);
        }
      } else if (err.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
        setError(errorMessage);
        logout();
        navigate('/login');
        return;
      } else {
        setError(errorMessage);
      }
      
      if (errorMessage.includes('token') || errorMessage.includes('Unauthorized')) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await userAPI.getUserStats();
      setStats(data);
    } catch (err) {
      // Don't show error for stats, just log it
      console.error('Failed to fetch stats:', err);
      // Set default stats if endpoint doesn't exist
      if (err.status === 404) {
        // Use post_count from profile if available, otherwise 0
        setStats({ 
          total_posts: profile?.post_count ?? 0, 
          latest_post_date: null 
        });
      }
    }
  };

  const fetchUserPosts = async (page) => {
    setLoadingPosts(true);
    try {
      const data = await userAPI.getUserPosts(page, 10);
      setUserPosts(data.posts || []);
      setPostsPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
      // If endpoint doesn't exist, show empty state
      if (err.status === 404) {
        setUserPosts([]);
        setPostsPagination(null);
      }
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values
      setEditForm({
        username: profile?.username || '',
        email: profile?.email || '',
        bio: profile?.bio || '',
      });
      setEditError('');
    }
    setIsEditing(!isEditing);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setSaving(true);

    try {
      const updates = {};
      if (editForm.username !== profile.username) {
        updates.username = editForm.username;
      }
      if (editForm.email !== profile.email) {
        updates.email = editForm.email;
      }
      if (editForm.bio !== (profile.bio || '')) {
        updates.bio = editForm.bio;
      }

      if (Object.keys(updates).length === 0) {
        setEditError('No changes to save');
        setSaving(false);
        return;
      }

      const data = await userAPI.updateProfile(updates);
      setProfile(data.user);
      updateUser(data.user);
      setIsEditing(false);
      await refreshProfile();
    } catch (err) {
      setEditError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      await userAPI.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
      alert('Password changed successfully');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPictureError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPictureError('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    setPictureError('');
    setProfilePictureFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePictureFile) {
      return;
    }

    setUploadingPicture(true);
    setPictureError('');

    try {
      const data = await userAPI.uploadProfilePicture(profilePictureFile);
      setProfile(data.user);
      updateUser(data.user);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      const fileInput = document.getElementById('profile-picture-input');
      if (fileInput) fileInput.value = '';
      await refreshProfile();
    } catch (err) {
      setPictureError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setUploadingPicture(true);
    setPictureError('');

    try {
      const data = await userAPI.removeProfilePicture();
      setProfile(data.user);
      updateUser(data.user);
      await refreshProfile();
    } catch (err) {
      setPictureError(err.message || 'Failed to remove profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= postsPagination?.totalPages) {
      setCurrentPage(newPage);
      fetchUserPosts(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditPost({
      title: post.title,
      content: post.content,
      image: null,
    });
    setEditImagePreview(null);
    setPostEditError('');
    // Scroll to the edit form
    setTimeout(() => {
      document.getElementById(`edit-form-${post.id}`)?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditPost({ title: '', content: '', image: null });
    setEditImagePreview(null);
    setPostEditError('');
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setEditPost({ ...editPost, image: null });
      setEditImagePreview(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPostEditError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPostEditError('File too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    setPostEditError('');
    setEditPost({ ...editPost, image: file });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePost = async (postId, e) => {
    e.preventDefault();
    setPostEditError('');
    setUpdating(true);

    try {
      const updates = {};
      const originalPost = userPosts.find(p => p.id === postId);
      
      if (editPost.title !== originalPost.title) {
        updates.title = editPost.title;
      }
      if (editPost.content !== originalPost.content) {
        updates.content = editPost.content;
      }
      if (editPost.image) {
        updates.image = editPost.image;
      }

      if (Object.keys(updates).length === 0 && !editPost.image) {
        setPostEditError('No changes to save');
        setUpdating(false);
        return;
      }

      await postsAPI.updatePost(postId, updates);
      setEditingPostId(null);
      setEditPost({ title: '', content: '', image: null });
      setEditImagePreview(null);
      // Refresh posts to show updated data
      fetchUserPosts(currentPage);
    } catch (err) {
      const message = err.message || 'Failed to update post';
      setPostEditError(message);
      if (message.includes('token') || message.includes('Unauthorized') || message.includes('403')) {
        if (message.includes('403')) {
          setPostEditError('You can only edit your own posts');
        } else {
          logout();
          navigate('/login');
        }
      }
    } finally {
      setUpdating(false);
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

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-container">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <button onClick={() => navigate('/posts')} className="back-button">
          Back to Posts
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-content">
        {/* Profile Info Section */}
        <div className="profile-section">
          <div className="profile-picture-section">
            <div className="profile-picture-container">
              {profilePicturePreview ? (
                <div className="profile-picture-preview">
                  <img src={profilePicturePreview} alt="Preview" />
                </div>
              ) : profile?.profile_picture_url ? (
                <img
                  src={getImageUrl(profile.profile_picture_url)}
                  alt={profile.username}
                  className="profile-picture"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="profile-picture-actions">
              <input
                id="profile-picture-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleProfilePictureChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="profile-picture-input" className="file-input-label">
                {profilePicturePreview ? 'Change Image' : 'Upload Picture'}
              </label>
              {profilePicturePreview && (
                <>
                  <button
                    onClick={handleProfilePictureUpload}
                    className="primary-button small"
                    disabled={uploadingPicture}
                  >
                    {uploadingPicture ? 'Uploading...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setProfilePictureFile(null);
                      setProfilePicturePreview(null);
                      const fileInput = document.getElementById('profile-picture-input');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="secondary-button small"
                    disabled={uploadingPicture}
                  >
                    Cancel
                  </button>
                </>
              )}
              {profile?.profile_picture_url && !profilePicturePreview && (
                <button
                  onClick={handleRemoveProfilePicture}
                  className="danger-button small"
                  disabled={uploadingPicture}
                >
                  Remove
                </button>
              )}
            </div>
            {pictureError && <div className="error-message small">{pictureError}</div>}
          </div>

          <div className="profile-info-section">
            {!isEditing ? (
              <div className="profile-display">
                <div className="profile-field">
                  <label>Username</label>
                  <p>{profile?.username || 'N/A'}</p>
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <p>{profile?.email || 'N/A'}</p>
                </div>
                <div className="profile-field">
                  <label>Bio</label>
                  <p>{profile?.bio || 'No bio yet'}</p>
                </div>
                <div className="profile-field">
                  <label>Member Since</label>
                  <p>{profile?.created_at ? formatDate(profile.created_at) : 'N/A'}</p>
                </div>
                <div className="profile-field">
                  <label>Total Posts</label>
                  <p>{profile?.post_count ?? stats?.total_posts ?? 0}</p>
                </div>
                <div className="profile-actions">
                  <button onClick={handleEditToggle} className="primary-button">
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="secondary-button"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="profile-edit-form">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    disabled={saving}
                  />
                </div>
                {editError && <div className="error-message">{editError}</div>}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="secondary-button"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Password Change Form */}
        {showPasswordForm && (
          <div className="profile-section">
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                  disabled={changingPassword}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                  disabled={changingPassword}
                />
                <small>Minimum 6 characters</small>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  disabled={changingPassword}
                />
              </div>
              {passwordError && <div className="error-message">{passwordError}</div>}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordError('');
                  }}
                  className="secondary-button"
                  disabled={changingPassword}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={changingPassword}>
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Posts Section */}
        <div className="profile-section">
          <h3>My Posts ({profile?.post_count ?? stats?.total_posts ?? 0})</h3>
          {loadingPosts ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading posts...</p>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any posts yet.</p>
            </div>
          ) : (
            <>
              <div className="user-posts-grid">
                {userPosts.map((post) => (
                  <div key={post.id}>
                    {editingPostId === post.id ? (
                      <div className="edit-post-card" id={`edit-form-${post.id}`}>
                        <h4>Edit Post</h4>
                        {postEditError && <div className="error-message small">{postEditError}</div>}
                        <form onSubmit={(e) => handleUpdatePost(post.id, e)} className="edit-post-form">
                          <div className="form-group">
                            <label htmlFor={`edit-title-${post.id}`}>Title</label>
                            <input
                              id={`edit-title-${post.id}`}
                              type="text"
                              value={editPost.title}
                              onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
                              placeholder="Enter a descriptive title"
                              required
                              disabled={updating}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`edit-content-${post.id}`}>Content</label>
                            <textarea
                              id={`edit-content-${post.id}`}
                              rows={6}
                              value={editPost.content}
                              onChange={(e) => setEditPost({ ...editPost, content: e.target.value })}
                              placeholder="Share your thoughts..."
                              required
                              disabled={updating}
                            ></textarea>
                          </div>
                          <div className="form-group">
                            <label htmlFor={`edit-image-${post.id}`}>Image (Optional)</label>
                            {post.image_url && !editImagePreview && (
                              <div className="current-image-preview">
                                <p>Current image:</p>
                                <img src={getImageUrl(post.image_url)} alt="Current" />
                              </div>
                            )}
                            <input
                              id={`edit-image-${post.id}`}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={handleEditImageChange}
                              disabled={updating}
                            />
                            <small className="file-hint">
                              JPEG, PNG, GIF, or WebP. Maximum 5MB. Leave empty to keep current image.
                            </small>
                            {editImagePreview && (
                              <div className="image-preview">
                                <img src={editImagePreview} alt="Preview" />
                                <button
                                  type="button"
                                  className="remove-image-button"
                                  onClick={() => {
                                    setEditPost({ ...editPost, image: null });
                                    setEditImagePreview(null);
                                    document.getElementById(`edit-image-${post.id}`).value = '';
                                  }}
                                  disabled={updating}
                                >
                                  Remove New Image
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="form-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={handleCancelEdit}
                              disabled={updating}
                            >
                              Cancel
                            </button>
                            <button type="submit" className="primary-button" disabled={updating}>
                              {updating ? 'Updating...' : 'Update Post'}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <article className="user-post-card">
                        {post.image_url && (
                          <div className="post-image">
                            <img src={getImageUrl(post.image_url)} alt={post.title} />
                          </div>
                        )}
                        <div className="post-header">
                          <h4 className="post-title">{post.title}</h4>
                        </div>
                        <div className="post-content">
                          <p>{post.content}</p>
                        </div>
                        <div className="post-footer">
                          <span className="post-date">{formatDate(post.created_at)}</span>
                          <button
                            onClick={() => handleStartEdit(post)}
                            className="edit-post-button"
                            title="Edit post"
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    )}
                  </div>
                ))}
              </div>

              {postsPagination && postsPagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!postsPagination.hasPreviousPage || loadingPosts}
                    className="pagination-button"
                  >
                    Previous
                  </button>
                  <div className="pagination-info">
                    <span>
                      Page {postsPagination.currentPage} of {postsPagination.totalPages}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!postsPagination.hasNextPage || loadingPosts}
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
    </div>
  );
};

export default Profile;

