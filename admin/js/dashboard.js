import { supabase, requireAuth, logout } from './auth.js';
import { uploadFile } from './upload.js';
import { getDefault } from '../../assets/js/content.js';

/* ---------------------------------------------------------------------------
   공통 유틸
--------------------------------------------------------------------------- */
function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let toastTimer;
function toast(msg, isError = false) {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function setStatus(id, msg, ok = true) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.toggle('ok', ok);
}

/* ---------------------------------------------------------------------------
   업로드 드롭존 — 파일을 드래그해서 놓으면 안의 <input type="file">에 그대로
   전달하고 change 이벤트를 발생시켜, 기존 change 핸들러(업로드 로직)를 그대로
   재사용합니다. document에 위임해두면 나중에 동적으로 추가되는 드롭존(반복
   리스트 등)에도 별도 재바인딩 없이 항상 적용됩니다.
--------------------------------------------------------------------------- */
function initDropzones() {
  const zoneOf = (e) => e.target.closest('.upload-dropzone');

  document.addEventListener('dragover', (e) => {
    const zone = zoneOf(e);
    if (!zone) return;
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  document.addEventListener('dragleave', (e) => {
    const zone = zoneOf(e);
    if (!zone) return;
    zone.classList.remove('drag-over');
  });

  document.addEventListener('drop', (e) => {
    const zone = zoneOf(e);
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('drag-over');

    const input = zone.querySelector('input[type="file"]');
    const dropped = e.dataTransfer && e.dataTransfer.files;
    if (!input || !dropped || !dropped.length) return;

    if (input.multiple) {
      input.files = dropped;
    } else {
      const dt = new DataTransfer();
      dt.items.add(dropped[0]);
      input.files = dt.files;
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/* ---------------------------------------------------------------------------
   반복 리스트 에디터 (강점, 통계, 연혁, 장비, 공정 단계 공용)
--------------------------------------------------------------------------- */
function fieldHtml(f, value) {
  if (f.type === 'textarea') {
    return `<div class="field"><label>${f.label}</label><textarea data-key="${f.key}">${escapeHtml(value)}</textarea></div>`;
  }
  if (f.type === 'tags') {
    const v = Array.isArray(value) ? value.join(', ') : (value || '');
    return `<div class="field"><label>${f.label} (쉼표로 구분)</label><input type="text" data-key="${f.key}" value="${escapeAttr(v)}"></div>`;
  }
  if (f.type === 'specs') {
    const v = Array.isArray(value) ? value.map(s => `${s.key}: ${s.value}`).join('\n') : '';
    return `<div class="field"><label>${f.label}</label><textarea data-key="${f.key}" placeholder="항목: 값 (한 줄에 하나씩)">${escapeHtml(v)}</textarea></div>`;
  }
  if (f.type === 'image') {
    return `<div class="field"><label>${f.label}</label>
      <input type="text" data-key="${f.key}" value="${escapeAttr(value)}" placeholder="이미지 URL">
      <label class="upload-dropzone" style="margin-top:8px; width:110px;">업로드<input type="file" accept="image/*" class="ri-image-upload" data-target="${f.key}"></label>
    </div>`;
  }
  return `<div class="field"><label>${f.label}</label><input type="text" data-key="${f.key}" value="${escapeAttr(value)}"></div>`;
}

function readItemFromEl(el, fields) {
  const obj = {};
  fields.forEach(f => {
    const input = el.querySelector(`[data-key="${f.key}"]`);
    if (!input) return;
    if (f.type === 'tags') {
      obj[f.key] = input.value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (f.type === 'specs') {
      obj[f.key] = input.value.split('\n').map(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return null;
        return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      }).filter(Boolean);
    } else {
      obj[f.key] = input.value;
    }
  });
  return obj;
}

function syncList(container, fields) {
  return Array.from(container.querySelectorAll('.repeat-item')).map(el => readItemFromEl(el, fields));
}

function renderRepeatList(container, items, fields) {
  if (!items.length) {
    container.innerHTML = `<p class="text-muted" style="font-size:.85rem;">아직 항목이 없습니다. 아래 버튼으로 추가하세요.</p>`;
  } else {
    container.innerHTML = items.map((item, i) => `
      <div class="repeat-item" data-index="${i}">
        <div class="repeat-item-head"><span>#${i + 1}</span><button type="button" class="btn-remove" data-remove="${i}">삭제</button></div>
        ${fields.map(f => fieldHtml(f, item[f.key])).join('')}
      </div>
    `).join('');
  }

  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = syncList(container, fields);
      current.splice(Number(btn.dataset.remove), 1);
      renderRepeatList(container, current, fields);
    });
  });

  container.querySelectorAll('.ri-image-upload').forEach(fileInput => {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      toast('이미지 업로드 중...');
      try {
        const url = await uploadFile('site', file);
        const key = fileInput.dataset.target;
        const textInput = fileInput.closest('.field').querySelector(`input[data-key="${key}"]`);
        if (textInput) textInput.value = url;
        toast('이미지 업로드 완료');
      } catch (err) {
        toast('업로드 실패: ' + err.message, true);
      }
    });
  });
}

function addItem(container, fields, emptyItem) {
  const current = syncList(container, fields);
  current.push(emptyItem);
  renderRepeatList(container, current, fields);
}

/* ---------------------------------------------------------------------------
   page_content 저장/조회
--------------------------------------------------------------------------- */
async function loadContent(page) {
  const { data } = await supabase.from('page_content').select('data').eq('page', page).maybeSingle();
  return { ...getDefault(page), ...(data ? data.data : {}) };
}

async function saveContent(page, data) {
  const { error } = await supabase.from('page_content').upsert({ page, data }, { onConflict: 'page' });
  if (error) throw error;
}

/* ---------------------------------------------------------------------------
   HOME 패널
--------------------------------------------------------------------------- */
const STRENGTH_FIELDS = [
  { key: 'num', label: '번호 (예: 01)' },
  { key: 'title', label: '제목' },
  { key: 'desc', label: '설명', type: 'textarea' },
];

async function initHomePanel() {
  const home = await loadContent('home');

  document.getElementById('h_eyebrow').value = home.eyebrow || '';
  document.getElementById('h_title1').value = home.title_line1 || '';
  document.getElementById('h_title2').value = home.title_line2 || '';
  document.getElementById('h_subtitle').value = home.subtitle || '';
  document.getElementById('h_cta1').value = home.cta_primary || '';
  document.getElementById('h_cta2').value = home.cta_secondary || '';
  document.getElementById('h_video').value = home.hero_video_url || '';
  document.getElementById('h_poster').value = home.hero_poster_url || '';

  const strengthsList = document.getElementById('strengthsList');
  renderRepeatList(strengthsList, home.strengths || [], STRENGTH_FIELDS);

  document.getElementById('addStrength').addEventListener('click', () => {
    addItem(strengthsList, STRENGTH_FIELDS, { num: '', title: '', desc: '' });
  });

  document.getElementById('h_video_file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('영상 업로드 중...');
    try {
      const url = await uploadFile('site', file);
      document.getElementById('h_video').value = url;
      toast('영상 업로드 완료');
    } catch (err) { toast('업로드 실패: ' + err.message, true); }
  });

  document.getElementById('h_poster_file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('이미지 업로드 중...');
    try {
      const url = await uploadFile('site', file);
      document.getElementById('h_poster').value = url;
      toast('이미지 업로드 완료');
    } catch (err) { toast('업로드 실패: ' + err.message, true); }
  });

  document.getElementById('saveHome').addEventListener('click', async () => {
    const data = {
      eyebrow: document.getElementById('h_eyebrow').value,
      title_line1: document.getElementById('h_title1').value,
      title_line2: document.getElementById('h_title2').value,
      subtitle: document.getElementById('h_subtitle').value,
      cta_primary: document.getElementById('h_cta1').value,
      cta_secondary: document.getElementById('h_cta2').value,
      hero_video_url: document.getElementById('h_video').value,
      hero_poster_url: document.getElementById('h_poster').value,
      strengths: syncList(strengthsList, STRENGTH_FIELDS),
    };
    try {
      await saveContent('home', data);
      setStatus('homeSaveStatus', '저장되었습니다.', true);
      toast('Home 페이지가 저장되었습니다.');
    } catch (err) {
      setStatus('homeSaveStatus', '저장 실패: ' + err.message, false);
      toast('저장 실패', true);
    }
  });
}

/* ---------------------------------------------------------------------------
   ABOUT 패널
--------------------------------------------------------------------------- */
const STAT_FIELDS = [
  { key: 'value', label: '수치 (예: 450+)' },
  { key: 'label', label: '설명' },
];
const TIMELINE_FIELDS = [
  { key: 'year', label: '연도' },
  { key: 'title', label: '제목' },
  { key: 'desc', label: '설명', type: 'textarea' },
];
const EQUIP_FIELDS = [
  { key: 'title', label: '장비명' },
  { key: 'specs', label: '스펙', type: 'specs' },
];

async function initAboutPanel() {
  const about = await loadContent('about');

  document.getElementById('a_eyebrow').value = about.intro_eyebrow || '';
  document.getElementById('a_title1').value = about.intro_title_1 || '';
  document.getElementById('a_title2').value = about.intro_title_2 || '';
  document.getElementById('a_body').value = about.intro_body || '';
  document.getElementById('a_image').value = about.intro_image_url || '';
  document.getElementById('a_partners_note').value = about.partners_note || '';

  const statsList = document.getElementById('statsList');
  const timelineList = document.getElementById('timelineList');
  const equipList = document.getElementById('equipList');

  renderRepeatList(statsList, about.stats || [], STAT_FIELDS);
  renderRepeatList(timelineList, about.timeline || [], TIMELINE_FIELDS);
  renderRepeatList(equipList, about.equipment || [], EQUIP_FIELDS);

  document.getElementById('addStat').addEventListener('click', () => addItem(statsList, STAT_FIELDS, { value: '', label: '' }));
  document.getElementById('addTimeline').addEventListener('click', () => addItem(timelineList, TIMELINE_FIELDS, { year: '', title: '', desc: '' }));
  document.getElementById('addEquip').addEventListener('click', () => addItem(equipList, EQUIP_FIELDS, { title: '', specs: [] }));

  document.getElementById('a_image_file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('이미지 업로드 중...');
    try {
      const url = await uploadFile('site', file);
      document.getElementById('a_image').value = url;
      toast('이미지 업로드 완료');
    } catch (err) { toast('업로드 실패: ' + err.message, true); }
  });

  document.getElementById('saveAbout').addEventListener('click', async () => {
    const data = {
      intro_eyebrow: document.getElementById('a_eyebrow').value,
      intro_title_1: document.getElementById('a_title1').value,
      intro_title_2: document.getElementById('a_title2').value,
      intro_body: document.getElementById('a_body').value,
      intro_image_url: document.getElementById('a_image').value,
      partners_note: document.getElementById('a_partners_note').value,
      stats: syncList(statsList, STAT_FIELDS),
      timeline: syncList(timelineList, TIMELINE_FIELDS),
      equipment: syncList(equipList, EQUIP_FIELDS),
    };
    try {
      await saveContent('about', data);
      setStatus('aboutSaveStatus', '저장되었습니다.', true);
      toast('About 페이지가 저장되었습니다.');
    } catch (err) {
      setStatus('aboutSaveStatus', '저장 실패: ' + err.message, false);
      toast('저장 실패', true);
    }
  });
}

/* ---------------------------------------------------------------------------
   PROCESS 패널
--------------------------------------------------------------------------- */
const STEP_FIELDS = [
  { key: 'num', label: '단계 번호 (예: 01)' },
  { key: 'title', label: '제목' },
  { key: 'desc', label: '설명', type: 'textarea' },
  { key: 'tags', label: '태그', type: 'tags' },
  { key: 'image_url', label: '이미지', type: 'image' },
];
const VIDEO_FIELDS = [
  { key: 'title', label: '제목' },
  { key: 'youtube_url', label: '유튜브 URL (일반 영상 또는 /shorts/ 링크)' },
];

async function initProcessPanel() {
  const process = await loadContent('process');
  const stepsList = document.getElementById('stepsList');
  const videosList = document.getElementById('videosList');
  renderRepeatList(stepsList, process.steps || [], STEP_FIELDS);
  renderRepeatList(videosList, process.showcase_videos || [], VIDEO_FIELDS);

  document.getElementById('addStep').addEventListener('click', () => {
    addItem(stepsList, STEP_FIELDS, { num: '', title: '', desc: '', tags: [], image_url: '' });
  });
  document.getElementById('addVideo').addEventListener('click', () => {
    addItem(videosList, VIDEO_FIELDS, { title: '', youtube_url: '' });
  });

  document.getElementById('saveProcess').addEventListener('click', async () => {
    const data = {
      steps: syncList(stepsList, STEP_FIELDS),
      showcase_videos: syncList(videosList, VIDEO_FIELDS),
    };
    try {
      await saveContent('process', data);
      setStatus('processSaveStatus', '저장되었습니다.', true);
      toast('Process 페이지가 저장되었습니다.');
    } catch (err) {
      setStatus('processSaveStatus', '저장 실패: ' + err.message, false);
      toast('저장 실패', true);
    }
  });
}

/* ---------------------------------------------------------------------------
   CONTACT 패널
--------------------------------------------------------------------------- */
async function initContactPanel() {
  const contact = await loadContent('contact');
  document.getElementById('c_address').value = contact.address || '';
  document.getElementById('c_address_note').value = contact.address_note || '';
  document.getElementById('c_phone').value = contact.phone || '';
  document.getElementById('c_email').value = contact.email || '';
  document.getElementById('c_hours').value = contact.hours || '';
  document.getElementById('c_hours_note').value = contact.hours_note || '';
  document.getElementById('c_biz').value = contact.business_number || '';
  document.getElementById('c_ceo').value = contact.ceo_name || '';
  document.getElementById('c_map_note').value = contact.map_note || '';
  document.getElementById('c_privacy_policy').value = contact.privacy_policy || '';

  document.getElementById('saveContact').addEventListener('click', async () => {
    const data = {
      address: document.getElementById('c_address').value,
      address_note: document.getElementById('c_address_note').value,
      phone: document.getElementById('c_phone').value,
      email: document.getElementById('c_email').value,
      hours: document.getElementById('c_hours').value,
      hours_note: document.getElementById('c_hours_note').value,
      business_number: document.getElementById('c_biz').value,
      ceo_name: document.getElementById('c_ceo').value,
      map_note: document.getElementById('c_map_note').value,
      privacy_policy: document.getElementById('c_privacy_policy').value,
    };
    try {
      await saveContent('contact', data);
      setStatus('contactSaveStatus', '저장되었습니다.', true);
      toast('Contact 페이지가 저장되었습니다.');
    } catch (err) {
      setStatus('contactSaveStatus', '저장 실패: ' + err.message, false);
      toast('저장 실패', true);
    }
  });
}

/* ---------------------------------------------------------------------------
   카테고리(메뉴) 관리
--------------------------------------------------------------------------- */
let categoriesCache = [];

function categoryLabel(key) {
  const c = categoriesCache.find(c => c.key === key);
  return c ? c.label : key;
}

function genCategoryKey() {
  return 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
  if (error) { toast('카테고리 불러오기 실패: ' + error.message, true); return; }
  categoriesCache = data || [];
  renderCategoryList();
  populateCategorySelects();
}

function renderCategoryList() {
  const container = document.getElementById('categoryList');
  if (!container) return;
  if (!categoriesCache.length) {
    container.innerHTML = `<p class="text-muted" style="font-size:.85rem;">등록된 카테고리가 없습니다.</p>`;
    return;
  }
  container.innerHTML = categoriesCache.map((c, i) => `
    <div class="category-row" data-key="${escapeAttr(c.key)}">
      <input type="number" class="cat-order" value="${c.sort_order}" style="width:64px;">
      <input type="text" class="cat-label" value="${escapeAttr(c.label)}" style="flex:1;">
      <button type="button" class="btn-remove" data-remove-cat="${escapeAttr(c.key)}">삭제</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-remove-cat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 카테고리를 삭제하시겠습니까? 이 카테고리로 등록된 프로젝트는 "전체"에서는 계속 보이지만 해당 메뉴 필터에서는 더 이상 노출되지 않습니다.')) return;
      const { error } = await supabase.from('categories').delete().eq('key', btn.dataset.removeCat);
      if (error) { toast('삭제 실패: ' + error.message, true); return; }
      toast('카테고리가 삭제되었습니다.');
      loadCategories();
    });
  });
}

function populateCategorySelects() {
  const options = categoriesCache.map(c => `<option value="${escapeAttr(c.key)}">${escapeHtml(c.label)}</option>`).join('');

  const itemSelect = document.getElementById('i_category');
  if (itemSelect) {
    const current = itemSelect.value;
    itemSelect.innerHTML = options;
    if (current && categoriesCache.some(c => c.key === current)) itemSelect.value = current;
  }

  const filterSelect = document.getElementById('pfFilterCategory');
  if (filterSelect) {
    const current = filterSelect.value || 'all';
    filterSelect.innerHTML = `<option value="all">전체 카테고리</option>` + options;
    filterSelect.value = current;
  }
}

function initCategoryManager() {
  document.getElementById('addCategory').addEventListener('click', () => {
    categoriesCache.push({ key: genCategoryKey(), label: '새 카테고리', sort_order: categoriesCache.length + 1 });
    renderCategoryList();
  });

  document.getElementById('saveCategories').addEventListener('click', async () => {
    const rows = Array.from(document.querySelectorAll('#categoryList .category-row')).map(row => ({
      key: row.dataset.key,
      label: row.querySelector('.cat-label').value.trim(),
      sort_order: Number(row.querySelector('.cat-order').value) || 0,
    })).filter(r => r.label);

    if (!rows.length) { toast('카테고리를 1개 이상 입력해주세요.', true); return; }

    try {
      const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      toast('카테고리가 저장되었습니다.');
      await loadCategories();
    } catch (err) {
      toast('저장 실패: ' + err.message, true);
    }
  });
}

/* ---------------------------------------------------------------------------
   필드 라벨 관리 (지역/발주처/축척/연도/제작기간)
--------------------------------------------------------------------------- */
let fieldLabels = {};

function applyFieldLabels() {
  document.getElementById('i_region_label').textContent = fieldLabels.region || '지역';
  document.getElementById('i_client_label').textContent = fieldLabels.client || '발주처 / 고객';
  document.getElementById('i_scale_label').textContent = fieldLabels.scale || '축척';
  document.getElementById('i_year_label').textContent = fieldLabels.year || '연도';
  document.getElementById('i_duration_label').textContent = fieldLabels.duration || '제작 기간';
}

async function initFieldLabelsPanel() {
  const portfolio = await loadContent('portfolio');
  fieldLabels = portfolio.field_labels || {};
  applyFieldLabels();

  document.getElementById('fl_region').value = fieldLabels.region || '';
  document.getElementById('fl_client').value = fieldLabels.client || '';
  document.getElementById('fl_scale').value = fieldLabels.scale || '';
  document.getElementById('fl_year').value = fieldLabels.year || '';
  document.getElementById('fl_duration').value = fieldLabels.duration || '';

  document.getElementById('saveFieldLabels').addEventListener('click', async () => {
    fieldLabels = {
      region: document.getElementById('fl_region').value.trim() || '지역',
      client: document.getElementById('fl_client').value.trim() || '발주처 / 고객',
      scale: document.getElementById('fl_scale').value.trim() || '축척',
      year: document.getElementById('fl_year').value.trim() || '연도',
      duration: document.getElementById('fl_duration').value.trim() || '제작 기간',
    };
    try {
      await saveContent('portfolio', { field_labels: fieldLabels });
      applyFieldLabels();
      toast('필드 라벨이 저장되었습니다.');
    } catch (err) {
      toast('저장 실패: ' + err.message, true);
    }
  });
}

/* ---------------------------------------------------------------------------
   PORTFOLIO 패널
--------------------------------------------------------------------------- */
let pfCurrentCategory = 'all';
let editingItem = null;
let coverImageUrl = '';
let detailImages = [];

let pfListCache = [];

async function loadPortfolioList() {
  setStatus('pfListStatus', '불러오는 중...', true);
  let query = supabase.from('portfolio_items').select('*').order('sort_order', { ascending: false }).order('created_at', { ascending: false });
  if (pfCurrentCategory !== 'all') query = query.eq('category', pfCurrentCategory);
  const { data, error } = await query;
  if (error) {
    setStatus('pfListStatus', '불러오기 실패: ' + error.message, false);
    return;
  }
  setStatus('pfListStatus', `총 ${data.length}건`, true);
  pfListCache = data;
  renderPortfolioTable(data);
}

async function nextSortOrder() {
  const { data } = await supabase.from('portfolio_items').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  return data && data.length ? (data[0].sort_order || 0) + 1 : 1;
}

function renderPortfolioTable(items) {
  const tbody = document.getElementById('pfTableBody');
  const dragEnabled = pfCurrentCategory === 'all';
  document.getElementById('pfDragHint').style.display = dragEnabled ? '' : 'none';

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px;">등록된 프로젝트가 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(p => `
    <tr data-id="${p.id}" class="${dragEnabled ? '' : 'row-drag-disabled'}" draggable="${dragEnabled}">
      <td class="drag-handle">⠿</td>
      <td>${p.sort_order ?? 0}</td>
      <td><img class="thumb" src="${p.cover_image_url || ''}" alt=""></td>
      <td class="t-title">${escapeHtml(p.title)}${p.featured ? ' <span class="status-pill published">대표</span>' : ''}</td>
      <td>${escapeHtml(categoryLabel(p.category))}</td>
      <td>${escapeHtml(p.year || '')}</td>
      <td><span class="status-pill ${p.published ? 'published' : ''}">${p.published ? '공개' : '비공개'}</span></td>
      <td class="row-actions">
        <button data-edit="${p.id}">수정</button>
        <button data-delete="${p.id}" class="danger">삭제</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openItemModal(items.find(i => i.id === btn.dataset.edit)));
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.delete));
  });

  if (dragEnabled) bindPortfolioRowDrag(tbody);
}

let dragSourceRow = null;

function bindPortfolioRowDrag(tbody) {
  const rows = () => Array.from(tbody.querySelectorAll('tr[draggable="true"]'));

  tbody.querySelectorAll('tr[draggable="true"]').forEach(row => {
    row.addEventListener('dragstart', () => {
      dragSourceRow = row;
      row.classList.add('row-dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('row-dragging');
      rows().forEach(r => r.classList.remove('row-drag-over'));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (row === dragSourceRow) return;
      row.classList.add('row-drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('row-drag-over'));
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('row-drag-over');
      if (!dragSourceRow || row === dragSourceRow) return;

      const all = rows();
      const fromIdx = all.indexOf(dragSourceRow);
      const toIdx = all.indexOf(row);
      if (fromIdx === -1 || toIdx === -1) return;

      if (fromIdx < toIdx) row.after(dragSourceRow);
      else row.before(dragSourceRow);

      await persistPortfolioOrder(tbody);
    });
  });
}

async function persistPortfolioOrder(tbody) {
  const ids = Array.from(tbody.querySelectorAll('tr[data-id]')).map(r => r.dataset.id);
  const total = ids.length;
  setStatus('pfListStatus', '순서 저장 중...', true);
  try {
    const results = await Promise.all(ids.map((id, i) =>
      supabase.from('portfolio_items').update({ sort_order: total - i }).eq('id', id)
    ));
    const failed = results.find(r => r.error);
    if (failed) throw failed.error;
    toast('순서가 저장되었습니다.');
    loadPortfolioList();
  } catch (err) {
    toast('순서 저장 실패: ' + err.message, true);
    setStatus('pfListStatus', '순서 저장 실패', false);
  }
}

function renderImagePreview(containerId, urls, { single = false } = {}) {
  const el = document.getElementById(containerId);
  el.innerHTML = urls.map((url, i) => `
    <div class="image-thumb"><img src="${url}" alt=""><button type="button" data-remove-img="${i}">&times;</button></div>
  `).join('');
  el.querySelectorAll('[data-remove-img]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeImg);
      if (single) { coverImageUrl = ''; renderImagePreview(containerId, []); }
      else { detailImages.splice(idx, 1); renderImagePreview(containerId, detailImages); }
    });
  });
}

function openItemModal(item) {
  editingItem = item || null;
  coverImageUrl = item?.cover_image_url || '';
  detailImages = item?.images ? [...item.images] : [];

  document.getElementById('itemModalTitle').textContent = item ? '프로젝트 수정' : '새 프로젝트';
  document.getElementById('i_title').value = item?.title || '';
  document.getElementById('i_category').value = item?.category || 'residential';
  document.getElementById('i_region').value = item?.region || '';
  document.getElementById('i_client').value = item?.client || '';
  document.getElementById('i_scale').value = item?.scale || '';
  document.getElementById('i_year').value = item?.year || '';
  document.getElementById('i_duration').value = item?.duration || '';
  document.getElementById('i_description').value = item?.description || '';
  document.getElementById('i_youtube').value = item?.youtube_url || '';
  document.getElementById('i_published').checked = item ? !!item.published : true;
  document.getElementById('i_featured').checked = item ? !!item.featured : false;
  document.getElementById('deleteItemBtn').style.display = item ? 'inline-flex' : 'none';

  renderImagePreview('i_cover_preview', coverImageUrl ? [coverImageUrl] : [], { single: true });
  renderImagePreview('i_images_preview', detailImages);

  document.getElementById('itemModal').classList.add('is-open');
}

function closeItemModal() {
  document.getElementById('itemModal').classList.remove('is-open');
  document.getElementById('itemForm').reset();
  editingItem = null;
}

async function deleteItem(id) {
  if (!confirm('이 프로젝트를 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
  const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
  if (error) { toast('삭제 실패: ' + error.message, true); return; }
  toast('삭제되었습니다.');
  loadPortfolioList();
}

async function initPortfolioPanel() {
  initCategoryManager();
  await loadCategories();
  await initFieldLabelsPanel();
  loadPortfolioList();

  document.getElementById('pfFilterCategory').addEventListener('change', (e) => {
    pfCurrentCategory = e.target.value;
    loadPortfolioList();
  });

  document.getElementById('addProjectBtn').addEventListener('click', () => openItemModal(null));
  document.getElementById('itemModalClose').addEventListener('click', closeItemModal);
  document.getElementById('cancelItemBtn').addEventListener('click', closeItemModal);
  document.getElementById('itemModal').addEventListener('click', (e) => { if (e.target.id === 'itemModal') closeItemModal(); });

  document.getElementById('i_cover_file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('업로드 중...');
    try {
      coverImageUrl = await uploadFile('portfolio', file);
      renderImagePreview('i_cover_preview', [coverImageUrl], { single: true });
      toast('커버 이미지 업로드 완료');
    } catch (err) { toast('업로드 실패: ' + err.message, true); }
  });

  document.getElementById('i_images_file').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    toast('업로드 중...');
    try {
      for (const file of files) {
        const url = await uploadFile('portfolio', file);
        detailImages.push(url);
      }
      renderImagePreview('i_images_preview', detailImages);
      toast('이미지 업로드 완료');
    } catch (err) { toast('업로드 실패: ' + err.message, true); }
  });

  document.getElementById('deleteItemBtn').addEventListener('click', async () => {
    if (!editingItem) return;
    await deleteItem(editingItem.id);
    closeItemModal();
  });

  document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('i_title').value.trim(),
      category: document.getElementById('i_category').value,
      region: document.getElementById('i_region').value.trim(),
      client: document.getElementById('i_client').value.trim(),
      scale: document.getElementById('i_scale').value.trim(),
      year: document.getElementById('i_year').value.trim(),
      duration: document.getElementById('i_duration').value.trim(),
      description: document.getElementById('i_description').value.trim(),
      cover_image_url: coverImageUrl,
      images: detailImages,
      youtube_url: document.getElementById('i_youtube').value.trim(),
      published: document.getElementById('i_published').checked,
      featured: document.getElementById('i_featured').checked,
    };
    if (!payload.title) { toast('제목을 입력해주세요.', true); return; }
    if (!editingItem) payload.sort_order = await nextSortOrder();

    try {
      if (editingItem) {
        const { error } = await supabase.from('portfolio_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        toast('프로젝트가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('portfolio_items').insert(payload);
        if (error) throw error;
        toast('프로젝트가 추가되었습니다.');
      }
      closeItemModal();
      loadPortfolioList();
    } catch (err) {
      toast('저장 실패: ' + err.message, true);
    }
  });
}

/* ---------------------------------------------------------------------------
   대표 프로젝트 배치 (FEATURED GRID) 패널

   Gridstack was dropped here after repeated cases of its resize not
   persisting correctly (its internal collision/compaction/layout-cache
   logic silently reverted width changes on save). This is a small,
   fully self-contained drag/resize implementation instead — no
   external grid library, so every step here is directly inspectable.
--------------------------------------------------------------------------- */
const FEATURED_COLUMNS = 6;
const FEATURED_MAX_ROWS = 12;
let featuredItemsCache = [];
let featuredLayout = []; // working copy the admin drags/resizes: [{id, title, cover_image_url, x, y, w, h}]
let featuredCellSize = 0; // px; cells are square (height = width)

async function loadFeaturedItems() {
  const { data, error } = await supabase.from('portfolio_items')
    .select('id, title, cover_image_url, featured_x, featured_y, featured_w, featured_h')
    .eq('featured', true)
    .order('featured_y', { ascending: true })
    .order('featured_x', { ascending: true });
  if (error) { toast('대표 프로젝트 불러오기 실패: ' + error.message, true); return; }
  featuredItemsCache = assignDefaultFeaturedPositions(data || []);
  if (document.getElementById('panel-featured').classList.contains('active')) {
    renderFeaturedGrid(featuredItemsCache);
  }
}

/* 새로 지정된 항목은 모두 (0,0)이 기본값이라 서로 겹치므로, 아직 한 번도
   배치되지 않은(=여전히 기본값 0,0인) 항목들을 순서대로 자동 배치해 겹침을 방지합니다. */
function assignDefaultFeaturedPositions(items) {
  let x = 0;
  let y = 0;
  return items.map(item => {
    if (item.featured_x !== 0 || item.featured_y !== 0) return item;
    const w = item.featured_w || 2;
    const h = item.featured_h || 2;
    if (x + w > FEATURED_COLUMNS) { x = 0; y += h; }
    const positioned = { ...item, featured_x: x, featured_y: y };
    x += w;
    return positioned;
  });
}

function featuredRowCount() {
  return Math.max(2, ...featuredLayout.map(i => i.y + i.h), 0);
}

function drawFeaturedGrid() {
  const container = document.getElementById('featuredGridStack');
  featuredCellSize = container.clientWidth / FEATURED_COLUMNS;
  container.style.height = `${featuredRowCount() * featuredCellSize}px`;

  container.innerHTML = featuredLayout.map(item => `
    <div class="fx-item" data-id="${escapeAttr(item.id)}" style="${featuredTileStyle(item)}">
      <img src="${item.cover_image_url || ''}" alt="">
      <span class="ft-title">${escapeHtml(item.title)}</span>
      <div class="fx-resize" title="드래그해서 크기 조절"></div>
    </div>
  `).join('');

  bindFeaturedInteractions();
}

function featuredTileStyle(item) {
  const left = item.x * featuredCellSize;
  const top = item.y * featuredCellSize;
  const width = item.w * featuredCellSize;
  const height = item.h * featuredCellSize;
  return `left:${left}px; top:${top}px; width:${width}px; height:${height}px;`;
}

function renderFeaturedGrid(items) {
  const container = document.getElementById('featuredGridStack');
  const emptyMsg = document.getElementById('featuredEmptyMsg');

  if (!items.length) {
    featuredLayout = [];
    container.innerHTML = '';
    container.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }
  container.style.display = '';
  emptyMsg.style.display = 'none';

  featuredLayout = items.map(item => ({
    id: item.id,
    title: item.title,
    cover_image_url: item.cover_image_url,
    x: item.featured_x, y: item.featured_y, w: item.featured_w, h: item.featured_h,
  }));

  drawFeaturedGrid();
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

function bindFeaturedInteractions() {
  const container = document.getElementById('featuredGridStack');

  container.querySelectorAll('.fx-item').forEach(el => {
    const item = featuredLayout.find(i => i.id === el.dataset.id);
    if (!item) return;

    const startDrag = (e, mode) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const orig = { x: item.x, y: item.y, w: item.w, h: item.h };
      el.classList.add('dragging');

      const onMove = (moveEvt) => {
        const dCols = Math.round((moveEvt.clientX - startX) / featuredCellSize);
        const dRows = Math.round((moveEvt.clientY - startY) / featuredCellSize);

        if (mode === 'move') {
          item.x = clamp(orig.x + dCols, 0, FEATURED_COLUMNS - item.w);
          item.y = clamp(orig.y + dRows, 0, FEATURED_MAX_ROWS - item.h);
        } else {
          item.w = clamp(orig.w + dCols, 1, FEATURED_COLUMNS - item.x);
          item.h = clamp(orig.h + dRows, 1, FEATURED_MAX_ROWS - item.y);
        }
        el.setAttribute('style', featuredTileStyle(item));
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        el.classList.remove('dragging');
        // row count may have grown/shrunk, and container height needs updating
        drawFeaturedGrid();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.fx-resize')) return;
      startDrag(e, 'move');
    });
    el.querySelector('.fx-resize').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startDrag(e, 'resize');
    });
  });
}

function initFeaturedPanel() {
  loadFeaturedItems();

  document.getElementById('reloadFeaturedBtn').addEventListener('click', loadFeaturedItems);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.getElementById('panel-featured').classList.contains('active') && featuredLayout.length) {
        drawFeaturedGrid();
      }
    }, 150);
  });

  document.getElementById('saveFeatured').addEventListener('click', async (e) => {
    if (!featuredLayout.length) { toast('저장할 항목이 없습니다.', true); return; }

    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '저장 중...';
    setStatus('featuredSaveStatus', '저장 중...', true);
    try {
      const results = await Promise.all(featuredLayout.map(item =>
        supabase.from('portfolio_items').update({
          featured_x: item.x, featured_y: item.y, featured_w: item.w, featured_h: item.h,
        }).eq('id', item.id)
      ));
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;

      setStatus('featuredSaveStatus', '저장되었습니다.', true);
      toast('대표 프로젝트 배치가 저장되었습니다.');
    } catch (err) {
      setStatus('featuredSaveStatus', '저장 실패: ' + err.message, false);
      toast('저장 실패', true);
    } finally {
      btn.disabled = false;
      btn.textContent = '배치 저장하기';
      btn.blur();
    }
  });
}

/* ---------------------------------------------------------------------------
   견적 문의 (INQUIRIES) 패널
--------------------------------------------------------------------------- */
const PROJECT_TYPE_LABEL = { residential: '주거단지', commercial: '상업시설', public: '공공기관/입찰', personal: '개인 소장용', etc: '기타' };
const INQUIRY_STATUS_LABEL = { new: '신규', contacted: '연락완료', closed: '종결' };

let inqCurrentStatus = 'all';
let inquiriesCache = [];
let currentInquiry = null;

async function refreshInquiryBadge() {
  const { count, error } = await supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new');
  const badge = document.getElementById('inquiryBadge');
  if (error || !count) { badge.style.display = 'none'; return; }
  badge.textContent = count;
  badge.style.display = 'inline-block';
}

async function loadInquiries() {
  setStatus('inqListStatus', '불러오는 중...', true);
  let query = supabase.from('inquiries').select('*').order('created_at', { ascending: false });
  if (inqCurrentStatus !== 'all') query = query.eq('status', inqCurrentStatus);
  const { data, error } = await query;
  if (error) { setStatus('inqListStatus', '불러오기 실패: ' + error.message, false); return; }
  inquiriesCache = data || [];
  setStatus('inqListStatus', `총 ${inquiriesCache.length}건`, true);
  renderInquiryTable(inquiriesCache);
  refreshInquiryBadge();
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderInquiryTable(items) {
  const tbody = document.getElementById('inqTableBody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px;">접수된 문의가 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(i => `
    <tr data-open="${i.id}" style="cursor:pointer;">
      <td>${formatDateTime(i.created_at)}</td>
      <td class="t-title">${escapeHtml(i.name)}</td>
      <td>${escapeHtml(i.phone)}</td>
      <td>${escapeHtml(i.email)}</td>
      <td>${escapeHtml(PROJECT_TYPE_LABEL[i.project_type] || i.project_type)}</td>
      <td><span class="status-pill ${i.status === 'new' ? 'published' : ''}">${INQUIRY_STATUS_LABEL[i.status] || i.status}</span></td>
      <td class="row-actions"><button data-open-btn="${i.id}">상세</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-open], [data-open-btn]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.open || el.dataset.openBtn;
      openInquiryModal(inquiriesCache.find(i => i.id === id));
    });
  });
}

function openInquiryModal(item) {
  if (!item) return;
  currentInquiry = item;
  document.getElementById('inquiryModalBody').innerHTML = `
    <div class="inquiry-detail-row"><span>접수일</span><span>${formatDateTime(item.created_at)}</span></div>
    <div class="inquiry-detail-row"><span>이름</span><span>${escapeHtml(item.name)}</span></div>
    <div class="inquiry-detail-row"><span>연락처</span><span>${escapeHtml(item.phone)}</span></div>
    <div class="inquiry-detail-row"><span>이메일</span><span>${escapeHtml(item.email)}</span></div>
    <div class="inquiry-detail-row"><span>유형</span><span>${escapeHtml(PROJECT_TYPE_LABEL[item.project_type] || item.project_type)}</span></div>
    <div class="inquiry-detail-row"><span>예산</span><span>${escapeHtml(item.budget || '미입력')}</span></div>
    <div class="inquiry-detail-message">${escapeHtml(item.message)}</div>
  `;
  document.getElementById('inquiryStatusSelect').value = item.status;
  document.getElementById('inquiryModal').classList.add('is-open');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('is-open');
  currentInquiry = null;
}

function initInquiriesPanel() {
  loadInquiries();

  document.getElementById('inqFilterStatus').addEventListener('change', (e) => {
    inqCurrentStatus = e.target.value;
    loadInquiries();
  });

  document.getElementById('inquiryModalClose').addEventListener('click', closeInquiryModal);
  document.getElementById('inquiryModal').addEventListener('click', (e) => { if (e.target.id === 'inquiryModal') closeInquiryModal(); });

  document.getElementById('inquiryStatusSelect').addEventListener('change', async (e) => {
    if (!currentInquiry) return;
    const { error } = await supabase.from('inquiries').update({ status: e.target.value }).eq('id', currentInquiry.id);
    if (error) { toast('상태 변경 실패: ' + error.message, true); return; }
    toast('상태가 변경되었습니다.');
    loadInquiries();
  });

  document.getElementById('deleteInquiryBtn').addEventListener('click', async () => {
    if (!currentInquiry) return;
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('inquiries').delete().eq('id', currentInquiry.id);
    if (error) { toast('삭제 실패: ' + error.message, true); return; }
    toast('삭제되었습니다.');
    closeInquiryModal();
    loadInquiries();
  });
}

/* ---------------------------------------------------------------------------
   방문자 분석 (ANALYTICS) 패널
--------------------------------------------------------------------------- */
const ANALYTICS_LOOKBACK_DAYS = 400; // fetched once; covers the 12-month view
const PERIOD_RANGE_DAYS = { day: 30, week: 84, month: 365 };
const PERIOD_RANGE_LABEL = { day: '최근 30일', week: '최근 12주', month: '최근 12개월' };
const PERIOD_TREND_TITLE = { day: '일별 방문 추이', week: '주별 방문 추이', month: '월별 방문 추이' };
const DEVICE_LABEL = { mobile: '모바일', tablet: '태블릿', desktop: '데스크톱' };

let analyticsPeriod = 'day';
let analyticsRowsCache = null;

function countBy(rows, keyFn) {
  const map = new Map();
  rows.forEach(r => {
    const key = keyFn(r);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function renderStatTile(label, value) {
  return `<div class="analytics-stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}

function renderCountTable(bodyId, pairs, emptyMsg, colspan = 2) {
  const tbody = document.getElementById(bodyId);
  if (!pairs.length) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding:20px; color:var(--text-faint);">${emptyMsg}</td></tr>`;
    return;
  }
  tbody.innerHTML = pairs.slice(0, 8).map(([label, count]) => `
    <tr><td>${escapeHtml(label)}</td><td>${count}</td></tr>
  `).join('');
}

function renderUtmTable(rows) {
  const map = new Map();
  rows.filter(r => r.utm_source).forEach(r => {
    const key = `${r.utm_source}|${r.utm_medium || '-'}|${r.utm_campaign || '-'}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  const pairs = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const tbody = document.getElementById('topUtmBody');
  if (!pairs.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-faint);">UTM 유입 데이터가 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = pairs.slice(0, 8).map(([key, count]) => {
    const [source, medium, campaign] = key.split('|');
    return `<tr><td>${escapeHtml(source)}</td><td>${escapeHtml(medium)}</td><td>${escapeHtml(campaign)}</td><td>${count}</td></tr>`;
  }).join('');
}

function isLightTheme() {
  return document.body.classList.contains('theme-light');
}

/* 주 단위 집계의 기준(월요일 시작) — ISO 주 개념과 동일하게 맞춰 라벨/버킷 키가
   서로 어긋나지 않도록 통일합니다. */
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildTrendBuckets(period) {
  const now = new Date();
  if (period === 'day') {
    return Array.from({ length: 30 }, (_, idx) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - idx));
      const key = d.toISOString().slice(0, 10);
      return { key, label: key.slice(5) };
    });
  }
  if (period === 'week') {
    const start = startOfWeek(now);
    return Array.from({ length: 12 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (11 - idx) * 7);
      return { key: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}` };
    });
  }
  return Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
    return { key: monthKey(d), label: `${d.getMonth() + 1}월` };
  });
}

function rowBucketKey(period, createdAtIso) {
  const d = new Date(createdAtIso);
  if (period === 'day') return d.toISOString().slice(0, 10);
  if (period === 'week') return startOfWeek(d).toISOString().slice(0, 10);
  return monthKey(d);
}

let trendChart = null;
let deviceChart = null;

function renderTrendChart(periodRows, period) {
  const buckets = buildTrendBuckets(period);
  const counts = Object.fromEntries(buckets.map(b => [b.key, 0]));
  periodRows.forEach(r => {
    const key = rowBucketKey(period, r.created_at);
    if (key in counts) counts[key]++;
  });

  const light = isLightTheme();
  const tickColor = light ? '#57534a' : '#8a8578';
  const gridColor = light ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)';

  const ctx = document.getElementById('chartDaily');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: buckets.map(b => b.label),
      datasets: [{
        label: '방문수',
        data: buckets.map(b => counts[b.key]),
        borderColor: '#c9a961',
        backgroundColor: 'rgba(201,169,97,.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor, maxTicksLimit: 12 }, grid: { display: false } },
        y: { ticks: { color: tickColor, precision: 0 }, grid: { color: gridColor } },
      },
    },
  });
}

function renderDeviceChart(rows) {
  const pairs = countBy(rows, r => DEVICE_LABEL[r.device] || r.device || '기타');
  const legendColor = isLightTheme() ? '#16150f' : '#e8e4d9';
  const ctx = document.getElementById('chartDevice');
  if (deviceChart) deviceChart.destroy();
  deviceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: pairs.map(p => p[0]),
      datasets: [{ data: pairs.map(p => p[1]), backgroundColor: ['#c9a961', '#8a8578', '#5c5850', '#e0685c'] }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: legendColor } } },
    },
  });
}

/* 세션의 "최초 등장 시각"은 lookback 전체(최대 400일) 범위에서 계산해야, 이번
   기간에 처음 잡힌 세션인지(신규) 이전부터 있었던 세션인지(재방문)를 정확히
   구분할 수 있습니다. (lookback 이전의 첫 방문은 알 수 없어 근사치입니다) */
function computeSessionFirstSeen(allRows) {
  const map = new Map();
  allRows.forEach(r => {
    const existing = map.get(r.session_id);
    if (!existing || r.created_at < existing) map.set(r.session_id, r.created_at);
  });
  return map;
}

function renderAnalyticsAll(allRows, period = analyticsPeriod) {
  const rangeDays = PERIOD_RANGE_DAYS[period];
  const rangeStartIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const periodRows = allRows.filter(r => r.created_at >= rangeStartIso);
  const firstSeen = computeSessionFirstSeen(allRows);

  const sessionIdsInPeriod = new Set(periodRows.map(r => r.session_id));
  let newCount = 0;
  sessionIdsInPeriod.forEach(sid => { if ((firstSeen.get(sid) || '') >= rangeStartIso) newCount++; });
  const returningCount = sessionIdsInPeriod.size - newCount;
  const avgPagesPerSession = sessionIdsInPeriod.size ? (periodRows.length / sessionIdsInPeriod.size) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayViews = periodRows.filter(r => r.created_at.slice(0, 10) === todayStr).length;
  const weekViews = periodRows.filter(r => r.created_at >= weekAgoIso).length;

  document.getElementById('analyticsStats').innerHTML = [
    renderStatTile(`${PERIOD_RANGE_LABEL[period]} 총 방문`, periodRows.length),
    renderStatTile('순 방문자 수', sessionIdsInPeriod.size),
    renderStatTile('오늘 방문', todayViews),
    renderStatTile('이번주 방문', weekViews),
  ].join('');

  document.getElementById('analyticsStats2').innerHTML = [
    renderStatTile('신규 방문자', newCount),
    renderStatTile('재방문자', returningCount),
    renderStatTile('세션당 평균 조회수', avgPagesPerSession.toFixed(1)),
  ].join('');

  document.getElementById('trendChartTitle').textContent = PERIOD_TREND_TITLE[period];
  renderTrendChart(periodRows, period);
  renderDeviceChart(periodRows);

  renderCountTable('topPagesBody', countBy(periodRows, r => r.path), '데이터가 없습니다.');
  renderCountTable('topReferrersBody', countBy(periodRows, r => r.referrer_host || '직접 방문 / 알 수 없음'), '데이터가 없습니다.');
  renderCountTable('topKeywordsBody', countBy(periodRows, r => r.search_keyword), '검색 유입 키워드가 없습니다.');
  renderCountTable('topBrowsersBody', countBy(periodRows, r => r.browser || '기타'), '데이터가 없습니다.');
  renderUtmTable(periodRows);
}

function initPeriodToggle() {
  document.querySelectorAll('#periodToggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#periodToggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      analyticsPeriod = btn.dataset.period;
      if (analyticsRowsCache) renderAnalyticsAll(analyticsRowsCache);
    });
  });
}

async function initAnalyticsPanel() {
  initPeriodToggle();
  const since = new Date(Date.now() - ANALYTICS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('page_views').select('*').gte('created_at', since);
  if (error) {
    document.getElementById('analyticsStats').innerHTML = `<p class="text-muted">데이터를 불러오지 못했습니다: ${escapeHtml(error.message)}</p>`;
    return;
  }
  analyticsRowsCache = data || [];
  if (document.getElementById('panel-analytics').classList.contains('active')) {
    renderAnalyticsAll(analyticsRowsCache);
  }
}

/* ---------------------------------------------------------------------------
   화이트/다크 테마 전환
--------------------------------------------------------------------------- */
const THEME_KEY = 'admin-theme';

function applyTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  document.getElementById('themeToggleBtn').textContent = theme === 'light' ? '다크 모드' : '라이트 모드';
  if (analyticsRowsCache && document.getElementById('panel-analytics').classList.contains('active')) {
    renderAnalyticsAll(analyticsRowsCache);
  }
}

function initThemeToggle() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);

  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const next = isLightTheme() ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

/* ---------------------------------------------------------------------------
   사이드바 네비게이션
--------------------------------------------------------------------------- */
function initNav() {
  const links = document.querySelectorAll('.admin-nav a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + link.dataset.panel).classList.add('active');
      window.location.hash = link.dataset.panel;

      // Gridstack/Chart.js compute sizes from the DOM, so they must only
      // render once their panel is actually visible (not display:none).
      if (link.dataset.panel === 'featured') renderFeaturedGrid(featuredItemsCache);
      if (link.dataset.panel === 'analytics' && analyticsRowsCache) renderAnalyticsAll(analyticsRowsCache);
    });
  });
  const initialPanel = window.location.hash.replace('#', '');
  if (initialPanel) {
    const target = document.querySelector(`.admin-nav a[data-panel="${initialPanel}"]`);
    if (target) target.click();
  }
}

/* ---------------------------------------------------------------------------
   INIT
--------------------------------------------------------------------------- */
async function init() {
  const session = await requireAuth();
  if (!session) return;

  document.getElementById('logoutBtn').addEventListener('click', logout);
  initNav();
  initDropzones();
  initThemeToggle();

  await Promise.all([
    initHomePanel(),
    initAboutPanel(),
    initProcessPanel(),
    initContactPanel(),
  ]);
  await initPortfolioPanel();
  initFeaturedPanel();
  initInquiriesPanel();
  initAnalyticsPanel();
}

init();
