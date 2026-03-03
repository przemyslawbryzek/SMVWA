// ── Like ────────────────────────────────────────────────────────────────────

async function handleLike(postId, button) {
  const counter = button.querySelector('.count');
  const icon = button.querySelector('img');
  const currentCount = parseInt(counter.textContent) || 0;
  const isLiked = button.dataset.liked === 'true';

  // Optimistic update
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
    await window.API.post(`/api/posts/${postId}/like`);
  } catch (err) {
    console.error('Like error:', err);
    // Rollback
    counter.textContent = currentCount;
    if (isLiked) {
      button.classList.add('text-red-500');
      button.dataset.liked = 'true';
      icon.src = 'https://img.icons8.com/?size=100&id=85038&format=png&color=FF0000';
    } else {
      button.classList.remove('text-red-500');
      button.dataset.liked = 'false';
      icon.src = 'https://img.icons8.com/?size=100&id=85038&format=png&color=808080';
    }
    alert('Failed to like post');
  }
}

// ── Repost ───────────────────────────────────────────────────────────────────

async function handleRepost(postId, button) {
  const counter = button.querySelector('.count');
  const icon = button.querySelector('img');
  const currentCount = parseInt(counter.textContent) || 0;
  const isReposted = button.classList.contains('text-green-500');

  // Optimistic update
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
    await window.API.post(`/api/posts/${postId}/repost`);
  } catch (err) {
    console.error('Repost error:', err);
    // Rollback
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

// ── Follow ───────────────────────────────────────────────────────────────────

async function handleFollow(userId, button) {
  const isFollowing = button.dataset.following === 'true';
  const snapshot = {
    text: button.textContent,
    className: button.className,
    following: button.dataset.following,
  };

  // Optimistic update
  if (isFollowing) {
    button.textContent = 'Follow';
    button.dataset.following = 'false';
    button.classList.remove('bg-green-500', 'bg-green-600', 'text-white', 'hover:bg-green-600');
    button.classList.add('bg-white', 'text-black', 'hover:bg-gray-200');
  } else {
    button.textContent = 'Following';
    button.dataset.following = 'true';
    button.classList.remove('bg-white', 'text-black', 'hover:bg-gray-200');
    button.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
  }

  try {
    if (isFollowing) {
      await window.API.delete(`/api/users/${userId}/follow`);
    } else {
      await window.API.post(`/api/users/${userId}/follow`);
    }

    const followersCount = document.querySelector('.followers-count');
    if (followersCount) {
      const current = parseInt(followersCount.textContent) || 0;
      followersCount.textContent = isFollowing ? current - 1 : current + 1;
    }

    // Sync all other follow buttons for the same user
    document.querySelectorAll(`button[data-user-id="${userId}"]`).forEach(btn => {
      if (btn === button) {return;}
      if (isFollowing) {
        btn.textContent = 'Follow';
        btn.dataset.following = 'false';
        btn.classList.remove('bg-green-500', 'bg-green-600', 'text-white', 'hover:bg-green-600');
        btn.classList.add('bg-white', 'text-black', 'hover:bg-gray-200');
      } else {
        btn.textContent = 'Following';
        btn.dataset.following = 'true';
        btn.classList.remove('bg-white', 'text-black', 'hover:bg-gray-200');
        btn.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
      }
    });
  } catch (err) {
    console.error('Follow error:', err);
    // Rollback
    button.textContent = snapshot.text;
    button.className = snapshot.className;
    button.dataset.following = snapshot.following;
    alert('Failed to update follow status');
  }
}
