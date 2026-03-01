// ── More menu ────────────────────────────────────────────────────────────────

function showMoreMenu(postId, button) {
  const existing = document.querySelector('.more-menu');
  if (existing) {
    existing.remove();
    return;
  }

  const currentUser = window.CURRENT_USER;
  const authorId = Number(button.dataset.postAuthorId);
  const canModify = currentUser && (currentUser.id === authorId || currentUser.role === 'admin');
  const postAuthor  = button.dataset.postAuthor || '';
  const postEmail   = button.dataset.postAuthorEmail || '';
  const postAvatar  = button.dataset.postAuthorAvatar || '';
  const postContent = button.dataset.postContent || '';

  const menu = document.createElement('div');
  menu.className = 'more-menu absolute bg-stone-800 border border-stone-700 rounded-lg shadow-lg z-50 min-w-48';
  menu.innerHTML = `
    <div class="py-2">
      ${canModify ? `
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700"
              data-menu-action="edit" data-post-id="${postId}">
        Edit Post
      </button>
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700 text-red-500"
              data-menu-action="delete" data-post-id="${postId}">
        Delete Post
      </button>` : ''}
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700"
              data-menu-action="quote"
              data-post-id="${postId}"
              data-post-author="${postAuthor.replace(/"/g, '&quot;')}"
              data-post-author-email="${postEmail.replace(/"/g, '&quot;')}"
              data-post-author-avatar="${postAvatar.replace(/"/g, '&quot;')}"
              data-post-content="${postContent.replace(/"/g, '&quot;')}">
        Quote
      </button>
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700"
              data-menu-action="share" data-post-id="${postId}">
        Copy Link
      </button>
      ${currentUser && currentUser.id !== authorId ? `
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700 text-orange-400"
              data-menu-action="report-post" data-post-id="${postId}"
              data-user-name="${postAuthor.replace(/"/g, '&quot;')}">
        Report Post
      </button>
      <button class="menu-item w-full px-4 py-2 text-left hover:bg-stone-700 text-orange-400"
              data-menu-action="report-user"
              data-user-id="${authorId}"
              data-user-name="${postAuthor.replace(/"/g, '&quot;')}">
        Report User
      </button>` : ''}
    </div>
  `;

  const postCard = button.closest('[class*="border-b"]') || document.body;
  postCard.appendChild(menu);

  const btnRect = button.getBoundingClientRect();
  const cardRect = postCard.getBoundingClientRect();
  menu.style.top = `${btnRect.bottom - cardRect.top + 4}px`;
  menu.style.right = `${cardRect.right - btnRect.right}px`;

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}

// ── Quote modal ──────────────────────────────────────────────────────────────

let _quoteCurrentPostId = null;

function showQuoteModal(postId, author, email, avatar, content) {
  const modal   = document.getElementById('quote-modal');
  const textarea = document.getElementById('quote-content');
  if (!modal) return;

  _quoteCurrentPostId = postId;

  document.getElementById('quote-cited-post').href       = `/post/${postId}`;
  document.getElementById('quote-cited-author').textContent = author;
  document.getElementById('quote-cited-email').textContent  = email ? `@${email}` : '';
  document.getElementById('quote-cited-content').textContent = content;
  const avatar_el = document.getElementById('quote-cited-avatar');
  avatar_el.src = avatar || 'https://via.placeholder.com/20';
  avatar_el.classList.toggle('hidden', !avatar && !author);

  textarea.value = '';

  modal.classList.remove('hidden');
  textarea.focus();
}

function hideQuoteModal() {
  document.getElementById('quote-modal')?.classList.add('hidden');
  _quoteCurrentPostId = null;
}

document.addEventListener('DOMContentLoaded', () => {
  const modal  = document.getElementById('quote-modal');
  const submitBtn = document.getElementById('quote-submit-btn');
  if (!modal) return;

  document.getElementById('quote-modal-close').addEventListener('click', hideQuoteModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) hideQuoteModal(); });

  submitBtn.addEventListener('click', async () => {
    const textarea = document.getElementById('quote-content');
    const content  = textarea.value.trim();
    if (!content) { textarea.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      const data = await window.API.post('/api/posts', {
        content,
        citation_id: parseInt(_quoteCurrentPostId),
        attachment_urls: [],
      });
      hideQuoteModal();
      window.location.href = `/post/${data.post.id}`;
    } catch (err) {
      console.error('Quote error:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
      alert('Failed to create quote. Please try again.');
    }
  });
});

// ── Menu item actions ────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  const item = e.target.closest('.menu-item');
  if (!item) return;

  e.stopPropagation();

  const action = item.dataset.menuAction;
  const postId = item.dataset.postId;

  if (action === 'edit') {
    document.querySelector('.more-menu')?.remove();
    const postCard = document.querySelector(`a[href="/post/${postId}"].absolute`)?.parentElement;
    const contentP = postCard?.querySelector('p.mt-2');
    if (!contentP) return;

    const textarea = document.createElement('textarea');
    textarea.className = 'w-full bg-stone-800 text-white p-2 rounded-lg border border-stone-600 focus:outline-none focus:border-blue-500 resize-none';
    textarea.value = contentP.textContent;
    textarea.rows = 3;

    const controls = document.createElement('div');
    controls.className = 'flex gap-2 mt-2';
    controls.innerHTML = `
      <button class="save-edit-btn px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold">Save</button>
      <button class="cancel-edit-btn px-4 py-1 bg-stone-700 hover:bg-stone-600 text-white rounded-full text-sm">Cancel</button>
    `;

    contentP.style.display = 'none';
    contentP.insertAdjacentElement('afterend', controls);
    contentP.insertAdjacentElement('afterend', textarea);
    textarea.focus();

    controls.querySelector('.cancel-edit-btn').addEventListener('click', () => {
      textarea.remove();
      controls.remove();
      contentP.style.display = '';
    });

    controls.querySelector('.save-edit-btn').addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      if (!newContent) return;

      try {
        await window.API.put(`/api/posts/${postId}`, { content: newContent });
        contentP.textContent = newContent;
        textarea.remove();
        controls.remove();
        contentP.style.display = '';
      } catch (err) {
        console.error('Edit error:', err);
        alert('Failed to update post');
      }
    });

  } else if (action === 'delete') {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await window.API.delete(`/api/posts/${postId}`);
      if (window.location.pathname.includes('/post/')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete post');
    }

  } else if (action === 'quote') {
    document.querySelector('.more-menu')?.remove();
    showQuoteModal(
      postId,
      item.dataset.postAuthor || '',
      item.dataset.postAuthorEmail || '',
      item.dataset.postAuthorAvatar || '',
      item.dataset.postContent || ''
    );

  } else if (action === 'share') {
    document.querySelector('.more-menu')?.remove();
    const link = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    } catch {
      prompt('Copy this link:', link);
    }

  } else if (action === 'report-post') {
    document.querySelector('.more-menu')?.remove();
    showReportModal('post', postId, `Post by ${item.dataset.userName || ''}`);

  } else if (action === 'report-user') {
    document.querySelector('.more-menu')?.remove();
    showReportModal('user', item.dataset.userId, `@${item.dataset.userName || item.dataset.userId}`);
  }
});

// ── Report modal ─────────────────────────────────────────────────────────────

let _reportType = null;
let _reportEntityId = null;

function showReportModal(type, entityId, displayName) {
  const modal = document.getElementById('report-modal');
  if (!modal) return;

  _reportType = type;
  _reportEntityId = entityId;

  document.getElementById('report-modal-title').textContent =
    type === 'post' ? 'Report Post' : 'Report User';
  document.getElementById('report-modal-subtitle').textContent = displayName || '';
  document.getElementById('report-reason').value = '';

  modal.classList.remove('hidden');
  document.getElementById('report-reason').focus();
}

function hideReportModal() {
  document.getElementById('report-modal')?.classList.add('hidden');
  _reportType = null;
  _reportEntityId = null;
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('report-modal');
  const submitBtn = document.getElementById('report-submit-btn');
  if (!modal) return;

  document.getElementById('report-modal-close').addEventListener('click', hideReportModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) hideReportModal(); });

  submitBtn.addEventListener('click', async () => {
    const reason = document.getElementById('report-reason').value.trim();
    if (!reason) { document.getElementById('report-reason').focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Reporting...';

    try {
      const path = _reportType === 'post'
        ? `/api/posts/${_reportEntityId}/report`
        : `/api/users/${_reportEntityId}/report`;
      await window.API.post(path, { reason });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Report';
      hideReportModal();
      alert('Report submitted successfully.');
    } catch (err) {
      console.error('Report error:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Report';
      alert('Failed to submit report. Please try again.');
    }
  });
});
