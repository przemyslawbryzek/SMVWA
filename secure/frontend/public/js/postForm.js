document.addEventListener('DOMContentLoaded', () => {
  const postForm = document.getElementById('post-form');
  if (!postForm) {return;}

  const attachmentInput = document.getElementById('attachment-input');
  const addAttachmentBtn = document.getElementById('add-attachment-btn');
  const attachmentsPreview = document.getElementById('attachments-preview');

  let selectedFiles = [];
  let objectURLs = [];

  addAttachmentBtn?.addEventListener('click', () => attachmentInput.click());

  attachmentInput?.addEventListener('change', e => {
    selectedFiles = [...selectedFiles, ...Array.from(e.target.files)];
    renderPreviews();
  });

  function renderPreviews() {
    objectURLs.forEach(url => URL.revokeObjectURL(url));
    objectURLs = [];
    attachmentsPreview.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      objectURLs.push(url);

      const wrapper = document.createElement('div');
      wrapper.className = 'relative';
      wrapper.innerHTML = `
        <img src="${url}" class="h-20 w-20 object-cover rounded" />
        <button type="button"
          class="absolute top-0 right-0 bg-red-500 text-white rounded-full size-5 flex items-center justify-center text-xs"
          data-remove-index="${index}">×</button>
      `;
      attachmentsPreview.appendChild(wrapper);
    });

    attachmentsPreview.querySelectorAll('[data-remove-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles.splice(parseInt(btn.dataset.removeIndex), 1);
        renderPreviews();
      });
    });
  }

  function cleanup() {
    objectURLs.forEach(url => URL.revokeObjectURL(url));
    objectURLs = [];
  }

  postForm.addEventListener('submit', async e => {
    e.preventDefault();

    const content = postForm.querySelector('textarea[name="content"]').value;
    const rootId = postForm.dataset.rootId;
    const parentId = postForm.dataset.parentId;

    try {
      let attachmentUrls = [];

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('attachments', file));
        const uploadData = await window.API.upload(formData);
        attachmentUrls = uploadData.attachment_urls;
      }

      const data = await window.API.post('/api/posts', {
        content,
        attachment_urls: attachmentUrls,
        root_id: rootId !== 'null' ? parseInt(rootId) : null,
        parent_id: parentId !== 'null' ? parseInt(parentId) : null,
      });

      cleanup();
      selectedFiles = [];
      window.location.href = `/post/${data.post.id}`;
    } catch (err) {
      console.error('Post creation error:', err);
      cleanup();
      alert('Failed to create post. Please try again.');
    }
  });
});
