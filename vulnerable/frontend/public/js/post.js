
async function loadThread(postId) {
  try {
    const response = await axios.get(`${API_URL}/posts/${postId}/thread`, {
      withCredentials: true
    });
    
    const thread = response.data.thread || [];
    const threadContainer = document.getElementById('thread-container');
    threadContainer.innerHTML = '';
    
    if (thread.length > 0) {
      thread.forEach(post => {
        const postDiv = renderPost(post, { isClickable: true, maxImageWidth: 'max-h-60 max-w-2/3' });
        threadContainer.appendChild(postDiv);
      });
    }
  } catch (error) {
    console.error('Failed to load thread:', error);
  }
}

async function loadPost(postId) {
    try {
        const response = await axios.get(`${API_URL}/posts/${postId}`, {
            withCredentials: true
        });
        
        const post = response.data.post;
        
        const postContainer = document.getElementById('post-container');
        postContainer.innerHTML = renderPostHTML(post, { isClickable: false, maxImageWidth: 'max-h-60 max-w-2/3' });
    } catch (error) {
        console.error('Failed to load post:', error);
    }
}

async function loadComments(postId) {
  try {
    const response = await axios.get(`${API_URL}/posts/${postId}/comments`, {
      withCredentials: true
    });
    
    const comments = response.data.comments || [];
    
    const commentsContainer = document.getElementById('comments-container');
    commentsContainer.innerHTML = '';
    
    if (comments.length > 0) {
      comments.forEach(comment => {
        const commentDiv = renderPost(comment, { isClickable: false, maxImageWidth: 'max-h-60 max-w-2/3' });
        commentsContainer.appendChild(commentDiv);
      });
    } else {
      commentsContainer.innerHTML = '<div class="p-4 text-center text-gray-500">No comments yet</div>';
    }
  } catch (error) {
    console.error('Failed to load comments:', error);
  }
}

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

async function likePost(postId) {
  try {
    await axios.get(`${API_URL}/posts/${postId}/like`, {
      withCredentials: true
    });
    loadPost(postId);
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to like post');
  }
}

async function repostPost(postId) {
  try {
    await axios.get(`${API_URL}/posts/${postId}/repost`, {
      withCredentials: true
    });
    loadPost(postId);
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to repost post');
  }
}

// Event delegation for post actions
document.getElementById('post-container').addEventListener('click', (e) => {
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
    console.log('Comment on post', postId);
  } else if (action === 'more') {
    showMoreOptions(postId, actionBtn);
  }
});

// Event delegation for thread actions
document.getElementById('thread-container').addEventListener('click', (e) => {
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

const pathParts = window.location.pathname.split('/');
const postId = pathParts[pathParts.length - 1];

if (postId && postId !== 'post') {
    initializeAttachmentHandlers('add-attachment-btn', 'attachment-input', 'attachments-preview');

    handlePostSubmit('post-form', 'attachments-preview', {
      parent_id: postId,
      root_id: postId
    }, () => {
      loadComments(postId);
    });

    loadProfileIcon();
    loadThread(postId);
    loadPost(postId);
    loadComments(postId);
} else {
    console.error('No post ID specified in URL');
}