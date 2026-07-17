// ─── File Upload Component ────────────────────────────────────────────────────

/**
 * Initialize the file upload drop zone and file input.
 * @param {Function} onFilesLoaded - callback(yamlString)
 */
export function initFileUpload(onFilesLoaded) {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileList = document.getElementById('file-list');

  if (!dropZone || !fileInput) return;

  let loadedFiles = [];

  // Click to open file dialog
  dropZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files));
    fileInput.value = ''; // Reset to allow re-upload of same file
  });

  // Drag events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.yaml') || f.name.endsWith('.yml')
    );

    if (files.length === 0) {
      showDropError('Please drop .yaml or .yml files');
      return;
    }

    handleFiles(files);
  });

  async function handleFiles(files) {
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showDropError(`File "${file.name}" is too large (max 5MB)`);
        continue;
      }

      try {
        const content = await readFileAsText(file);
        loadedFiles.push({ name: file.name, size: file.size, content });
      } catch (err) {
        showDropError(`Failed to read "${file.name}"`);
      }
    }

    renderFileList();

    // Combine all file contents
    const combined = loadedFiles.map(f => f.content).join('\n---\n');
    onFilesLoaded(combined);
  }

  function renderFileList() {
    if (!fileList) return;

    if (loadedFiles.length === 0) {
      fileList.innerHTML = '';
      return;
    }

    fileList.innerHTML = loadedFiles.map((f, i) => `
      <li class="file-list-item animate-fade-in-up">
        <span>
          <span class="file-name">📄 ${f.name}</span>
          <span class="file-size">(${formatFileSize(f.size)})</span>
        </span>
        <button class="remove-btn" data-index="${i}" title="Remove file">✕</button>
      </li>
    `).join('');

    // Bind remove buttons
    fileList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        loadedFiles.splice(idx, 1);
        renderFileList();
        const combined = loadedFiles.map(f => f.content).join('\n---\n');
        onFilesLoaded(combined || '');
      });
    });
  }

  function showDropError(msg) {
    const errorEl = dropZone.querySelector('.drop-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
    }
  }

  // Public method to clear files
  return {
    clear() {
      loadedFiles = [];
      renderFileList();
    },
    getFileCount() {
      return loadedFiles.length;
    },
  };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
