const API_URL = `${window.location.origin}/api/siswa`;
const PAGE_SIZE = 10;
const avatarColors = [
  ['#edf1ff', '#5771dc'], ['#f3edff', '#8e70d0'], ['#e9f7f1', '#4e9d7c'],
  ['#fff3e5', '#d59342'], ['#ffedf0', '#d26e7b'], ['#e9f5fb', '#4c91b3']
];

const rowsElement = document.querySelector('#studentRows');
const searchInput = document.querySelector('#searchInput');
const dialog = document.querySelector('#studentDialog');
const form = document.querySelector('#studentForm');
const formError = document.querySelector('#formError');
const saveButton = document.querySelector('#saveStudentButton');
let currentPage = 1;
let currentTotalPages = 1;
let searchTimer;
let toastTimer;
let previewObjectUrl;

function setPhotoPreview(url, name = '') {
  const preview = document.querySelector('#photoPreview');
  const image = document.querySelector('#photoPreviewImage');
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = undefined;
  }
  if (!url) {
    preview.hidden = true;
    image.removeAttribute('src');
    document.querySelector('#photoPreviewName').textContent = '';
    return;
  }
  if (url.startsWith('blob:')) previewObjectUrl = url;
  image.src = url;
  document.querySelector('#photoPreviewName').textContent = name;
  preview.hidden = false;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '—';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(date);
}

async function request(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  let result;
  try { result = await response.json(); } catch { result = {}; }
  if (!response.ok) {
    const detail = result.errors?.join(', ');
    throw new Error(detail || result.message || 'Permintaan ke server gagal.');
  }
  return result;
}

function showToast(message, isError = false) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function showTableMessage(message, error = false) {
  rowsElement.innerHTML = `<tr><td colspan="6" class="table-state${error ? ' error' : ''}">${escapeHtml(message)}</td></tr>`;
}

function renderStudents(students) {
  if (!students.length) {
    showTableMessage(searchInput.value.trim() ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Belum ada data siswa. Tambahkan siswa pertama.');
    return;
  }

  rowsElement.innerHTML = students.map((student, index) => {
    const [background, foreground] = avatarColors[index % avatarColors.length];
    return `<tr>
      <td><div class="student-cell"><span class="student-avatar" style="background:${background};color:${foreground}">${student.foto_url ? `<img src="${escapeHtml(student.foto_url)}" alt="" loading="lazy">` : escapeHtml(initials(student.nama))}</span><span class="student-info"><strong>${escapeHtml(student.nama)}</strong><small>${escapeHtml(student.alamat || 'Alamat belum diisi')}</small></span></div></td>
      <td>${escapeHtml(student.nis)}</td>
      <td><span class="class-badge">${escapeHtml(student.kelas)}</span></td>
      <td>${escapeHtml(student.jurusan)}</td>
      <td>${escapeHtml(formatDate(student.tanggal_lahir))}</td>
      <td><div class="row-actions"><button class="icon-button" data-action="edit" data-id="${Number(student.id)}" aria-label="Edit ${escapeHtml(student.nama)}" title="Edit">✎</button><button class="icon-button delete" data-action="delete" data-id="${Number(student.id)}" aria-label="Hapus ${escapeHtml(student.nama)}" title="Hapus">⌫</button></div></td>
    </tr>`;
  }).join('');
}

function updateStats(students, total) {
  document.querySelector('#totalStudents').textContent = Number(total).toLocaleString('id-ID');
  document.querySelector('#totalClasses').textContent = new Set(students.map((student) => student.kelas).filter(Boolean)).size.toLocaleString('id-ID');
  document.querySelector('#totalMajors').textContent = new Set(students.map((student) => student.jurusan).filter(Boolean)).size.toLocaleString('id-ID');
}

async function loadStudents() {
  showTableMessage('Memuat data siswa…');
  try {
    const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
    const search = searchInput.value.trim();
    if (search) params.set('search', search);
    const result = await request(`${API_URL}?${params}`);
    const students = result.data || [];
    const pagination = result.pagination || {};
    currentTotalPages = Math.max(pagination.totalPages || 1, 1);
    renderStudents(students);
    updateStats(students, pagination.total || 0);
    document.querySelector('#recordCount').textContent = `${Number(pagination.total || 0).toLocaleString('id-ID')} data siswa`;
    document.querySelector('#pageInfo').textContent = students.length
      ? `Menampilkan ${((currentPage - 1) * PAGE_SIZE) + 1}–${((currentPage - 1) * PAGE_SIZE) + students.length} dari ${Number(pagination.total).toLocaleString('id-ID')} siswa`
      : 'Tidak ada data untuk ditampilkan';
    document.querySelector('#pageNumber').textContent = String(currentPage);
    document.querySelector('#previousPage').disabled = currentPage <= 1;
    document.querySelector('#nextPage').disabled = currentPage >= currentTotalPages;
  } catch (error) {
    updateStats([], 0);
    document.querySelector('#recordCount').textContent = 'Data belum tersedia';
    document.querySelector('#pageInfo').textContent = 'Tidak dapat memuat data';
    showTableMessage(`${error.message} Pastikan server API aktif.`, true);
  }
}

function openCreateDialog() {
  form.reset();
  setPhotoPreview('');
  document.querySelector('#studentId').value = '';
  document.querySelector('#dialogTitle').textContent = 'Tambah siswa';
  saveButton.textContent = 'Simpan siswa';
  formError.hidden = true;
  dialog.showModal();
  form.elements.nis.focus();
}

async function openEditDialog(id) {
  try {
    const result = await request(`${API_URL}/${id}`);
    const student = result.data;
    form.reset();
    document.querySelector('#studentId').value = student.id;
    for (const field of ['nis', 'nama', 'kelas', 'jurusan', 'alamat']) form.elements[field].value = student[field] || '';
    form.elements.tanggal_lahir.value = student.tanggal_lahir ? String(student.tanggal_lahir).slice(0, 10) : '';
    setPhotoPreview(student.foto_url || '', student.foto_url ? 'Foto saat ini' : '');
    document.querySelector('#dialogTitle').textContent = 'Edit data siswa';
    saveButton.textContent = 'Simpan perubahan';
    formError.hidden = true;
    dialog.showModal();
    form.elements.nis.focus();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteStudent(id) {
  const row = rowsElement.querySelector(`[data-action="edit"][data-id="${id}"]`)?.closest('tr');
  const name = row?.querySelector('.student-info strong')?.textContent || 'siswa ini';
  if (!window.confirm(`Hapus data ${name}? Tindakan ini tidak dapat dibatalkan.`)) return;
  try {
    await request(`${API_URL}/${id}`, { method: 'DELETE' });
    showToast('Data siswa berhasil dihapus.');
    await loadStudents();
  } catch (error) {
    showToast(error.message, true);
  }
}

document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
}).format(new Date());
document.querySelector('#addStudentButton').addEventListener('click', openCreateDialog);
document.querySelector('#refreshButton').addEventListener('click', loadStudents);
document.querySelector('#previousPage').addEventListener('click', () => {
  if (currentPage > 1) { currentPage -= 1; loadStudents(); }
});
document.querySelector('#nextPage').addEventListener('click', () => {
  if (currentPage < currentTotalPages) { currentPage += 1; loadStudents(); }
});
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; loadStudents(); }, 300);
});
rowsElement.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit') openEditDialog(button.dataset.id);
  if (button.dataset.action === 'delete') deleteStudent(button.dataset.id);
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const payload = new FormData(form);
  for (const key of ['nis', 'nama', 'kelas', 'jurusan', 'alamat', 'tanggal_lahir']) {
    payload.set(key, payload.get(key).trim());
  }
  const id = document.querySelector('#studentId').value;
  saveButton.disabled = true;
  saveButton.textContent = 'Menyimpan…';
  formError.hidden = true;
  try {
    await request(id ? `${API_URL}/${id}` : API_URL, {
      method: id ? 'PUT' : 'POST', body: payload
    });
    dialog.close();
    showToast(id ? 'Data siswa berhasil diperbarui.' : 'Siswa baru berhasil ditambahkan.');
    currentPage = 1;
    await loadStudents();
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? 'Simpan perubahan' : 'Simpan siswa';
  }
});
document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancelDialog').addEventListener('click', () => dialog.close());
document.querySelector('#studentPhoto').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
    formError.textContent = file.size > 5 * 1024 * 1024
      ? 'Ukuran foto maksimal 5 MB.'
      : 'Pilih foto berformat JPG, PNG, atau WebP.';
    formError.hidden = false;
    event.target.value = '';
    return;
  }
  formError.hidden = true;
  setPhotoPreview(URL.createObjectURL(file), file.name);
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

loadStudents();
