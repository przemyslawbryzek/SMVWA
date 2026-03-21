const ICONS = {
  LIKE_INACTIVE:    'https://img.icons8.com/?size=100&id=85038&format=png&color=808080',
  LIKE_ACTIVE:      'https://img.icons8.com/?size=100&id=85038&format=png&color=FF0000',
  REPOST_INACTIVE:  'https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=808080',
  REPOST_ACTIVE:    'https://img.icons8.com/?size=100&id=GZmx08TD7nCw&format=png&color=00FF00',
};

async function togglePostAction(isActive, button, apiPath, { activeClass, activeIcon, inactiveIcon }, errorMessage) {
  const counter = button.querySelector('.count');
  const icon = button.querySelector('img');
  const currentCount = parseInt(counter.textContent) || 0;

  if (isActive) {
    counter.textContent = Math.max(0, currentCount - 1);
    button.classList.remove(activeClass);
    icon.src = inactiveIcon;
  } else {
    counter.textContent = currentCount + 1;
    button.classList.add(activeClass);
    icon.src = activeIcon;
  }

  try {
    await window.API.post(apiPath);
  } catch (err) {
    console.error(errorMessage, err);
    counter.textContent = currentCount;
    if (isActive) {
      button.classList.add(activeClass);
      icon.src = activeIcon;
    } else {
      button.classList.remove(activeClass);
      icon.src = inactiveIcon;
    }
    alert(errorMessage);
  }
}

async function handleLike(postId, button) {
  const isActive = button.dataset.liked === 'true';
  await togglePostAction(isActive, button, `/api/posts/${postId}/like`, {
    activeClass: 'text-red-500',
    activeIcon: ICONS.LIKE_ACTIVE,
    inactiveIcon: ICONS.LIKE_INACTIVE,
  }, 'Failed to like post');
  button.dataset.liked = button.classList.contains('text-red-500') ? 'true' : 'false';
}

async function handleRepost(postId, button) {
  const isActive = button.dataset.reposted === 'true';
  await togglePostAction(isActive, button, `/api/posts/${postId}/repost`, {
    activeClass: 'text-green-500',
    activeIcon: ICONS.REPOST_ACTIVE,
    inactiveIcon: ICONS.REPOST_INACTIVE,
  }, 'Failed to repost');
  button.dataset.reposted = button.classList.contains('text-green-500') ? 'true' : 'false';
}

function setFollowButtonState(btn, isFollowing) {
  if (isFollowing) {
    btn.textContent = 'Following';
    btn.dataset.following = 'true';
    btn.classList.remove('bg-white', 'text-black', 'hover:bg-gray-200');
    btn.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
  } else {
    btn.textContent = 'Follow';
    btn.dataset.following = 'false';
    btn.classList.remove('bg-green-500', 'bg-green-600', 'text-white', 'hover:bg-green-600');
    btn.classList.add('bg-white', 'text-black', 'hover:bg-gray-200');
  }
}

async function handleFollow(userId, button) {
  const isFollowing = button.dataset.following === 'true';
  const snapshot = {
    text: button.textContent,
    className: button.className,
    following: button.dataset.following,
  };

  setFollowButtonState(button, !isFollowing);

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

    document.querySelectorAll(`button[data-user-id="${userId}"]`).forEach(btn => {
      if (btn === button) {return;}
      setFollowButtonState(btn, !isFollowing);
    });
  } catch (err) {
    console.error('Follow error:', err);
    button.textContent = snapshot.text;
    button.className = snapshot.className;
    button.dataset.following = snapshot.following;
    alert('Failed to update follow status');
  }
}

