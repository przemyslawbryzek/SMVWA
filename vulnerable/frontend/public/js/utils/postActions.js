function showMoreOptions(postId, buttonElement) {
  const existingDropdown = document.querySelector('.post-options-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
    return;
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'post-options-dropdown absolute bg-black border border-stone-700 rounded-lg shadow-lg z-50 min-w-48';
  dropdown.style.top = '100%';
  dropdown.style.right = '0';
  
  const options = [
    { label: 'Edit', action: 'edit' },
    { label: 'Delete', action: 'delete', danger: true },
    { label: 'Report', action: 'report' },
    { label: 'Share', action: 'share' }
  ];
  
  options.forEach(option => {
    const optionDiv = document.createElement('div');
    optionDiv.className = `px-4 py-3 cursor-pointer hover:bg-stone-800 flex items-center gap-3 ${option.danger ? 'text-red-500 hover:text-red-400' : 'text-white'}`;
    optionDiv.innerHTML = `<span>${option.label}</span>`;
    optionDiv.onclick = (e) => {
      e.stopPropagation();
      handleMoreAction(option.action, postId);
      dropdown.remove();
    };
    dropdown.appendChild(optionDiv);
  });
  
  buttonElement.style.position = 'relative';
  buttonElement.appendChild(dropdown);
  
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  }, 0);
}

function handleMoreAction(action, postId) {
  switch(action) {
    case 'edit':
      console.log('Edit post', postId);
      alert('Edit functionality - TODO');
      break;
    case 'delete':
      if (confirm('Are you sure you want to delete this post?')) {
        deletePost(postId);
      }
      break;
    case 'report':
      console.log('Report post', postId);
      alert('Report functionality - TODO');
      break;
    case 'share':
      navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
      alert('Link copied to clipboard!');
      break;
  }
}

async function deletePost(postId) {
  try {
    await axios.delete(`${API_URL}/posts/${postId}`, {
      withCredentials: true
    });
    
    if (window.location.pathname.includes('/post/')) {
      window.location.href = '/';
    } else {
      if (typeof loadPosts === 'function') {
        loadPosts();
      }
    }
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to delete post');
  }
}
