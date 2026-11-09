(function () {
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('admin-login-form');
  const loginMessage = document.getElementById('login-message');
  const contentForm = document.getElementById('content-form');
  const formMessage = document.getElementById('form-message');
  const list = document.getElementById('content-list');
  const imageInput = document.getElementById('content-image');
  const imagePreview = document.getElementById('image-preview');
  const imageHelp = document.getElementById('image-help');
  let activeType = 'events';
  let items = [];
  let editingId = '';
  let currentImage = null;
  let selectedFile = null;

  async function request(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Permintaan gagal. Silakan coba kembali.');
    return result;
  }

  function showMessage(element, message, isError) {
    element.textContent = message;
    element.classList.toggle('is-error', Boolean(isError));
    element.hidden = !message;
  }

  function setAuthenticated(username) {
    loginScreen.hidden = true;
    dashboard.hidden = false;
    document.getElementById('admin-username').textContent = username;
  }

  function setFormMode(item) {
    editingId = item ? item.id : '';
    document.getElementById('form-title').textContent = item ? 'Edit konten' : 'Tambah konten';
    document.getElementById('save-button').textContent = item ? 'Simpan perubahan' : 'Terbitkan konten';
    document.getElementById('cancel-edit').hidden = !item;
    document.getElementById('content-title').value = item ? item.title : '';
    document.getElementById('content-subtitle').value = item ? item.subtitle : '';
    document.getElementById('content-description').value = item ? item.description : '';
    document.getElementById('content-year').value = item ? item.year : new Date().getFullYear();
    currentImage = item ? { imageUrl: item.imageUrl, cloudinaryPublicId: item.cloudinaryPublicId } : null;
    selectedFile = null;
    imageInput.value = '';
    imagePreview.src = item ? item.imageUrl : '';
    imagePreview.hidden = !item;
    imageHelp.textContent = item ? 'Pilih foto baru jika ingin mengganti gambar.' : 'Pilih gambar dari perangkat Anda (maksimal 10 MB).';
    showMessage(formMessage, '', false);
  }

  async function loadItems() {
    list.innerHTML = '<div class="admin-empty">Memuat konten…</div>';
    const result = await request(`/api/admin/content?type=${activeType}`, { method: 'GET', headers: {} });
    items = result.items;
    renderItems();
  }

  function renderItems() {
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'Belum ada konten. Gunakan formulir untuk mulai menambahkan.';
      list.append(empty);
      return;
    }

    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'admin-content-card';
      const image = document.createElement('img');
      image.src = item.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      const details = document.createElement('div');
      details.className = 'admin-content-details';
      const title = document.createElement('h3');
      title.textContent = item.title;
      const caption = document.createElement('p');
      caption.textContent = [item.subtitle, item.year].filter(Boolean).join(' · ') || item.description || 'Tanpa keterangan';
      const actions = document.createElement('div');
      actions.className = 'admin-card-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'admin-button admin-button-secondary';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => {
        setFormMode(item);
        document.getElementById('content-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'admin-button admin-button-danger';
      remove.textContent = 'Hapus';
      remove.addEventListener('click', () => removeItem(item));
      actions.append(edit, remove);
      details.append(title, caption, actions);
      card.append(image, details);
      list.append(card);
    });
  }

  async function uploadImage(file) {
    const signature = await request('/api/cloudinary-signature', { method: 'POST', body: '{}' });
    const data = new FormData();
    data.append('file', file);
    data.append('api_key', signature.apiKey);
    data.append('timestamp', String(signature.timestamp));
    data.append('folder', signature.folder);
    data.append('public_id', signature.publicId);
    data.append('signature', signature.signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: 'POST',
      body: data
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || 'Gambar gagal diunggah ke Cloudinary.');
    }
    return { imageUrl: result.secure_url, cloudinaryPublicId: result.public_id };
  }

  async function removeItem(item) {
    const confirmed = window.confirm(`Hapus "${item.title}" dari daftar?`);
    if (!confirmed) return;
    try {
      await request('/api/admin/content', {
        method: 'DELETE',
        body: JSON.stringify({ type: activeType, id: item.id })
      });
      await loadItems();
      showMessage(formMessage, 'Konten berhasil dihapus.', false);
    } catch (error) {
      showMessage(formMessage, error.message, true);
    }
  }

  document.querySelectorAll('[data-content-type]').forEach(button => {
    button.addEventListener('click', async () => {
      activeType = button.dataset.contentType;
      document.querySelectorAll('[data-content-type]').forEach(tab => {
        tab.classList.toggle('is-active', tab === button);
        tab.setAttribute('aria-selected', String(tab === button));
      });
      document.getElementById('list-heading').textContent = activeType === 'events' ? 'Daftar kegiatan' : 'Daftar anggota';
      document.getElementById('content-title-label').textContent = activeType === 'events' ? 'Judul kegiatan' : 'Nama anggota';
      document.getElementById('content-subtitle-label').textContent = activeType === 'events' ? 'Kategori / subjudul (opsional)' : 'Jabatan / peran (opsional)';
      setFormMode(null);
      try {
        await loadItems();
      } catch (error) {
        list.textContent = error.message;
      }
    });
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    showMessage(loginMessage, '', false);
    try {
      const result = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('login-username').value,
          password: document.getElementById('login-password').value
        })
      });
      setAuthenticated(result.user.username);
      await loadItems();
    } catch (error) {
      showMessage(loginMessage, error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  contentForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = document.getElementById('save-button');
    submit.disabled = true;
    showMessage(formMessage, 'Menyimpan konten…', false);
    try {
      let image = currentImage;
      if (selectedFile) image = await uploadImage(selectedFile);
      if (!image) throw new Error('Pilih file gambar sebelum menyimpan konten.');
      const item = {
        title: document.getElementById('content-title').value,
        subtitle: document.getElementById('content-subtitle').value,
        description: document.getElementById('content-description').value,
        year: document.getElementById('content-year').value,
        ...image
      };
      await request('/api/admin/content', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({ type: activeType, id: editingId, item })
      });
      setFormMode(null);
      await loadItems();
      showMessage(formMessage, 'Konten berhasil disimpan dan akan tampil di website.', false);
    } catch (error) {
      showMessage(formMessage, error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0];
    selectedFile = file || null;
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      selectedFile = null;
      imageInput.value = '';
      showMessage(formMessage, 'File harus berupa gambar dengan ukuran maksimal 10 MB.', true);
      return;
    }
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
  });

  document.getElementById('cancel-edit').addEventListener('click', () => setFormMode(null));
  document.getElementById('logout-button').addEventListener('click', async () => {
    await request('/api/auth/logout', { method: 'POST', body: '{}' }).catch(error => {
      console.error('Gagal mengakhiri sesi admin:', error);
    });
    window.location.reload();
  });

  request('/api/auth/me', { method: 'GET', headers: {} })
    .then(async result => {
      setAuthenticated(result.user.username);
      await loadItems();
    })
    .catch(() => {
      loginScreen.hidden = false;
      dashboard.hidden = true;
    });
})();
