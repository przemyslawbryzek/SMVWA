const API_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  const postForm = document.getElementById('post-form');
  const attachmentInput = document.getElementById('attachment-input');
  const addAttachmentBtn = document.getElementById('add-attachment-btn');
  const attachmentsPreview = document.getElementById('attachments-preview');
  
  if (!postForm) return;
  
  let selectedFiles = [];
  
  addAttachmentBtn?.addEventListener('click', () => {
    attachmentInput.click();
  });
  
  attachmentInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    selectedFiles = [...selectedFiles, ...files];
    renderAttachmentsPreviews();
  });
  
  function renderAttachmentsPreviews() {
    attachmentsPreview.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const preview = document.createElement('div');
      preview.className = 'relative';
      preview.innerHTML = `
        <img src="${URL.createObjectURL(file)}" class="h-20 w-20 object-cover rounded" />
        <button type="button" class="absolute top-0 right-0 bg-red-500 text-white rounded-full size-5 flex items-center justify-center text-xs" data-remove-index="${index}">×</button>
      `;
      attachmentsPreview.appendChild(preview);
    });
    
    attachmentsPreview.querySelectorAll('[data-remove-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.removeIndex);
        selectedFiles.splice(index, 1);
        renderAttachmentsPreviews();
      });
    });
  }
  
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = postForm.querySelector('textarea[name="content"]').value;
    const rootId = postForm.getAttribute('rootid');
    const parentId = postForm.getAttribute('parentid');
    
    try {
      let attachmentUrls = [];
      
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('attachments', file);
        });
        
        const uploadResponse = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to upload attachments');
        
        const uploadData = await uploadResponse.json();
        attachmentUrls = uploadData.attachment_urls;
      }
      
      const postData = {
        content,
        attachment_urls: attachmentUrls,
        root_id: rootId !== 'null' ? parseInt(rootId) : null,
        parent_id: parentId !== 'null' ? parseInt(parentId) : null
      };
      
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) throw new Error('Failed to create post');
      
      const data = await response.json();
      
      
      window.location.href = `/post/${data.post.id}`;
      
      
    } catch (error) {
      console.error('Post creation error:', error);
      alert('Failed to create post. Please try again.');
    }
  });
});

document.addEventListener('click', async (e) => {
  const button = e.target.closest('.action-btn');
  if (!button) return;
  
  e.preventDefault();
  
  const action = button.dataset.action;
  const postId = button.dataset.postId;
  switch(action) {
    case 'like':
      await handleLike(postId, button);
      break;
    case 'repost':
      await handleRepost(postId, button);
      break;
    case 'comment':
      window.location.href = `/post/${postId}`;
      break;
    case 'more':
      showMoreMenu(postId, button);
      break;
  }
});
async function handleLike(postId, button) {
  const counter = button.querySelector('.count');
  const icon = button.querySelector('img');
  const currentCount = parseInt(counter.textContent) || 0;
  const isLiked = button.dataset.liked === 'true';

  if (isLiked) {
    counter.textContent = Math.max(0, currentCount - 1);
    button.classList.remove('text-red-500');
    button.dataset.liked = 'false';
    icon.src = 'https://img.icons8.com/?size=100&id=85038&format=png&color=808080';
  } else {
    counter.textContent = currentCount + 1;
    button.classList.add('text-red-500');
    button.dataset.liked = 'true';
    icon.src = 'https://img.icons8.com/?size=100&id=85038&format=png&color=FF0000';
  }
  
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed');
    
  } catch (error) {
    console.error('Like error:', error);
    if (isLiked) {
      counter.textContent = currentCount;
      button.classList.add('text-red-500');
      button.dataset.liked = 'true';
      icon.src = 'https://img.icons8.com/?size=100&id=85038&format=png&color=FF0000';
    } else {
      counter.textContent = currentCount;
      button.classList.remove('text-red-500');
      button.dataset.liked = 'false';
      icon.src = 'https://img.icons8.com/?size=100&id=85038&format=png&color=808080';
    }
    
    alert('Failed to like post');
  }
}

async function handleRepost(postId, button) {
  const counter = button.querySelector('.count');
  const icon = button.querySelector('img');
  const currentCount = parseInt(counter.textContent) || 0;
  const isReposted = button.classList.contains('text-green-500');
  
  if (isReposted) {
    counter.textContent = Math.max(0, currentCount - 1);
    button.classList.remove('text-green-500');
    icon.src = 'https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=808080';
  } else {
    counter.textContent = currentCount + 1;
    button.classList.add('text-green-500');
    icon.src = 'https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=00FF00';
  }
  
  try {
    const response = await fetch(`${API_URL}/api/posts/${postId}/repost`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed');
    
  } catch (error) {
    console.error('Repost error:', error);
    
    counter.textContent = currentCount;
    if (isReposted) {
      button.classList.add('text-green-500');
      icon.src = 'https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=00FF00';
    } else {
      button.classList.remove('text-green-500');
      icon.src = 'https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=808080';
    }
    
    alert('Failed to repost');
  }
}

function showMoreMenu(postId, button) {
  const existing = document.querySelector('.more-menu');
  if (existing) {
    existing.remove();
    return;
  }
  
  const menu = document.createElement('div');
  menu.className = 'more-menu absolute bg-stone-800 border border-stone-700 rounded-lg shadow-lg z-50 min-w-48';
  menu.style.top = '100%';
  menu.style.right = '0';
  
  menu.innerHTML = `
    <div class="py-2">
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700 text-red-500" 
              data-menu-action="delete" 
              data-post-id="${postId}">
        Delete Post
      </button>
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700" 
              data-menu-action="share" 
              data-post-id="${postId}">
        Copy Link
      </button>
    </div>
  `;
  
  button.style.position = 'relative';
  button.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}
document.addEventListener('click', async (e) => {
  const item = e.target.closest('.menu-item');
  if (!item) return;
  
  e.stopPropagation();
  
  const action = item.dataset.menuAction;
  const postId = item.dataset.postId;
  
  if (action === 'delete') {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      if (window.location.pathname.includes('/post/')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post');
    }
    
  } else if (action === 'share') {
    const link = `${window.location.origin}/post/${postId}`;
    
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    } catch (error) {
      prompt('Copy this link:', link);
    }
    
    document.querySelector('.more-menu')?.remove();
  }
});
