async function loadPosts() {
  const token = document.cookie.split('; ').find(row => row.startsWith('auth='));
  
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/posts`, {
      withCredentials: true
    });
    const posts = response.data.posts || [];
    
    const postsContainer = document.getElementById("posts-container");
    postsContainer.innerHTML = "";
    
    if (posts.length > 0) {
      posts.forEach(post => {
        const postDiv = renderPost(post, { isClickable: true, maxImageWidth: 'max-h-60 max-w-2/3' });
        postsContainer.appendChild(postDiv);
      });
    } else {
      postsContainer.innerHTML = "<div class=\"p-4 text-center text-gray-500\">No posts yet</div>";
    }
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}
async function likePost(postId) {
  try {
    await axios.get(`${API_URL}/posts/${postId}/like`, {
      withCredentials: true
    });
    loadPosts();
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to like post');
  }
}
async function repostPost(postId) {
  try {
    await axios.get(`${API_URL}/posts/${postId}/repost`, {
      withCredentials: true
    });
    loadPosts();
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to repost post');
  }
}

document.getElementById('posts-container').addEventListener('click', (e) => {
  const actionBtn = e.target.closest('[data-action]');
  if (!actionBtn) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const action = actionBtn.dataset.action;
  const postId = actionBtn.dataset.postId;
  
  if (action === 'like') {
    likePost(postId);
  } else if (action === 'repost') {
    repostPost(postId);
  } else if (action === 'comment') {
    window.location.href = `/post/${postId}`;
  } else if (action === 'more') {
    showMoreOptions(postId, actionBtn);
  }
});

async function loadProfileIcon() {
  try {
    const response = await axios.get(`${API_URL}/users/profile`, {
      withCredentials: true
    });
    
    const user = response.data.user;
    
  const profileImg = document.querySelector('#profile-img');
  if (profileImg) {
    profileImg.src = user.profile_image || 'https://via.placeholder.com/40';
  }
  } catch (error) {
    console.error('Failed to load profile icon:', error);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initializeAttachmentHandlers('add-attachment-btn', 'attachment-input', 'attachments-preview');

  handlePostSubmit('post-form', 'attachments-preview', {}, () => {
    loadPosts();
  });

  loadProfileIcon();
  loadPosts();
});