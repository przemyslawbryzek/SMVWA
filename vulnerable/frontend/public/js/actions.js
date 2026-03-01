// ── Post action buttons (like / repost / comment / more) ──────────────────────

document.addEventListener('click', async (e) => {
  const button = e.target.closest('.action-btn');
  if (!button) return;

  e.preventDefault();

  const { action, postId } = button.dataset;

  switch (action) {
    case 'like':    await handleLike(postId, button);           break;
    case 'repost':  await handleRepost(postId, button);         break;
    case 'comment': window.location.href = `/post/${postId}`;   break;
    case 'more':    showMoreMenu(postId, button);                break;
  }
});

// ── Inline follow buttons (suggestions list etc.) ────────────────────────────

document.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-user-id]');
  if (!button || button.id === 'follow-btn') return;

  e.preventDefault();
  e.stopPropagation();

  await handleFollow(button.dataset.userId, button);
});

// ── Dedicated follow button on profile page ───────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const followBtn = document.getElementById('follow-btn');
  if (!followBtn) return;

  followBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleFollow(followBtn.dataset.userId, followBtn);
  });
});

