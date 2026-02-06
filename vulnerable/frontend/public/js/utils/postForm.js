let selectedFiles = [];

function initializeAttachmentHandlers(addButtonId, inputId, previewId) {
  const addButton = document.getElementById(addButtonId);
  const input = document.getElementById(inputId);
  
  if (addButton) {
    addButton.addEventListener('click', () => {
      input?.click();
    });
  }
  
  if (input) {
    input.addEventListener('change', (e) => {
      selectedFiles = Array.from(e.target.files);
      displayAttachmentsPreviews(previewId);
    });
  }
}

function displayAttachmentsPreviews(previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  
  preview.innerHTML = '';
  
  selectedFiles.forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'relative';
    
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className = 'w-20 h-20 object-cover rounded';
      fileDiv.appendChild(img);
    } else {
      fileDiv.innerHTML = `<div class="w-20 h-20 bg-gray-700 rounded flex items-center justify-center text-xs">${file.name}</div>`;
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center';
    removeBtn.onclick = () => {
      selectedFiles.splice(index, 1);
      displayAttachmentsPreviews(previewId);
    };
    
    fileDiv.appendChild(removeBtn);
    preview.appendChild(fileDiv);
  });
}

async function uploadAttachments() {
  if (selectedFiles.length === 0) {
    return [];
  }

  const formData = new FormData();
  selectedFiles.forEach(file => formData.append('attachments', file));

  try {
    const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return uploadResponse.data.attachment_urls || [];
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to upload attachments');
    throw error;
  }
}

function clearAttachments(previewId) {
  selectedFiles = [];
  displayAttachmentsPreviews(previewId);
}

async function handlePostSubmit(formId, previewId, postData, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = e.target.elements.content.value;
    
    try {
      const attachment_urls = await uploadAttachments();
      
      const payload = {
        content,
        attachment_urls,
        ...postData
      };

      await axios.post(`${API_URL}/posts`, payload, {
        withCredentials: true
      });
      
      e.target.reset();
      clearAttachments(previewId);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (error.message !== 'Failed to upload attachments') {
        alert(error.response?.data?.error || 'Failed to create post');
      }
    }
  });
}
