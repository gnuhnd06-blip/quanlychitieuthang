// ============================================================
// 1. DỮ LIỆU
// ============================================================
function loadData(key) { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const KEY_TX = 'chitieu_transactions';
const KEY_BUDGET = 'chitieu_budgets';
const KEY_GOALS  = 'chitieu_goals';

const CAT_ICONS = { 'Ăn uống':'🍜','Di lại':'🚗','Mua sắm':'🛍️','Hóa đơn':'💡','Giải trí':'🎮','Thu nhập':'💰','Khác':'📦' };
const CAT_COLORS = { 'Ăn uống':'#4caf82','Di lại':'#5b9cf6','Mua sắm':'#f6c354','Hóa đơn':'#a78bfa','Giải trí':'#f06e6e','Khác':'#94a3b8' };

function formatMoney(a) { return a.toLocaleString('vi-VN') + ' đ'; }
function formatDate(s) { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }

// ============================================================
// 2. SIDEBAR TOGGLE - đẩy main content, không đè
// ============================================================
let sidebarOpen = true;

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  document.getElementById('content-wrapper').classList.toggle('expanded', !sidebarOpen);
}

// ============================================================
// 3. CHUYỂN TAB
// ============================================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  if (tabName === 'tong-quan') refreshOverview();
  if (tabName === 'giao-dich') renderTransactionTable();
  if (tabName === 'ngan-sach') renderBudgetCards();
  if (tabName === 'muc-tieu') renderGoals();
  if (tabName === 'bao-cao')  renderReport();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) { e.preventDefault(); switchTab(this.dataset.tab); });
});

// ============================================================
// 4. GIAO DỊCH
// ============================================================
function addTransaction() {
  const type     = document.getElementById('tx-type').value;
  const category = document.getElementById('tx-category').value;
  const amount   = parseFloat(document.getElementById('tx-amount').value);
  const desc     = document.getElementById('tx-desc').value.trim();
  const date     = document.getElementById('tx-date').value;
  if (!amount || amount <= 0) return alert('Vui lòng nhập số tiền hợp lệ!');
  if (!desc)   return alert('Vui lòng nhập mô tả!');
  if (!date)   return alert('Vui lòng chọn ngày!');
  const txList = loadData(KEY_TX);
  txList.unshift({ id: Date.now(), type, category, amount, desc, date });
  saveData(KEY_TX, txList);
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value   = '';
  renderTransactionTable();
  alert('✅ Đã lưu giao dịch!');
}

function deleteTransaction(id) {
  if (!confirm('Xóa giao dịch này?')) return;
  saveData(KEY_TX, loadData(KEY_TX).filter(tx => tx.id !== id));
  renderTransactionTable();
}

function renderTransactionTable() {
  const tbody = document.getElementById('transaction-table-body');
  const list  = loadData(KEY_TX);
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Chưa có giao dịch nào.</td></tr>'; return; }
  tbody.innerHTML = list.map(tx => `
    <tr>
      <td>${formatDate(tx.date)}</td>
      <td>${CAT_ICONS[tx.category]||'📦'} ${tx.desc}</td>
      <td>${tx.category}</td>
      <td style="color:${tx.type==='income'?'var(--green)':'var(--red)'};font-weight:700">
        ${tx.type==='income'?'+':'-'}${formatMoney(tx.amount)}</td>
      <td><button class="btn-small" onclick="deleteTransaction(${tx.id})">🗑️ Xóa</button></td>
    </tr>`).join('');
}

// ============================================================
// 5. NGÂN SÁCH
// ============================================================
function getSpentByCategory(category) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  return loadData(KEY_TX)
    .filter(tx => { if (tx.type!=='expense'||tx.category!==category) return false; const d=new Date(tx.date); return d.getFullYear()===y&&(d.getMonth()+1)===m; })
    .reduce((s, tx) => s + tx.amount, 0);
}

function addBudget() {
  const category = document.getElementById('budget-category').value;
  const limit    = parseFloat(document.getElementById('budget-limit').value);
  if (!limit || limit <= 0) return alert('Vui lòng nhập hạn mức hợp lệ!');
  const budgets = loadData(KEY_BUDGET);
  const ex = budgets.find(b => b.category === category);
  if (ex) ex.limit = limit; else budgets.push({ id: Date.now(), category, limit });
  saveData(KEY_BUDGET, budgets);
  document.getElementById('budget-limit').value = '';
  renderBudgetCards();
  alert('✅ Đã lưu ngân sách!');
}

function deleteBudget(id) {
  if (!confirm('Xóa ngân sách này?')) return;
  saveData(KEY_BUDGET, loadData(KEY_BUDGET).filter(b => b.id !== id));
  renderBudgetCards();
}

function renderBudgetCards() {
  const container = document.getElementById('budget-cards');
  const budgets   = loadData(KEY_BUDGET);
  if (!budgets.length) { container.innerHTML = '<p class="empty-msg">Chưa có ngân sách nào.</p>'; return; }
  container.innerHTML = budgets.map(b => {
    const spent = getSpentByCategory(b.category);
    const pct   = Math.min(Math.round(spent / b.limit * 100), 100);
    const over  = spent > b.limit;
    const color = CAT_COLORS[b.category] || 'var(--green)';
    return `<div class="budget-progress-card">
      <div class="budget-progress-header">
        <span class="budget-cat-name">${CAT_ICONS[b.category]||'📦'} ${b.category}</span>
        <button class="btn-small" onclick="deleteBudget(${b.id})">🗑️ Xóa</button>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span class="budget-amounts">${formatMoney(spent)} / ${formatMoney(b.limit)}</span>
        <span class="budget-percent" style="color:${over?'var(--red)':'var(--green)'}">${pct}%${over?' ⚠️ Vượt!':''}</span>
      </div>
      <div class="budget-bar"><div class="budget-fill ${over?'over':''}" style="width:${pct}%;background:${over?'var(--red)':color}"></div></div>
    </div>`;
  }).join('');
}

// ============================================================
// 6. MỤC TIÊU
// ============================================================
function addGoal() {
  const name     = document.getElementById('goal-name').value.trim();
  const target   = parseFloat(document.getElementById('goal-target').value);
  const saved    = parseFloat(document.getElementById('goal-saved').value) || 0;
  const deadline = document.getElementById('goal-deadline').value;
  if (!name)               return alert('Vui lòng nhập tên mục tiêu!');
  if (!target || target<=0) return alert('Vui lòng nhập số tiền cần hợp lệ!');
  const goals = loadData(KEY_GOALS);
  goals.push({ id: Date.now(), name, target, saved, deadline });
  saveData(KEY_GOALS, goals);
  ['goal-name','goal-target','goal-saved','goal-deadline'].forEach(id => document.getElementById(id).value = '');
  renderGoals();
  alert('✅ Đã lưu mục tiêu!');
}

function deleteGoal(id) {
  if (!confirm('Xóa mục tiêu này?')) return;
  saveData(KEY_GOALS, loadData(KEY_GOALS).filter(g => g.id !== id));
  renderGoals();
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  const goals     = loadData(KEY_GOALS);
  if (!goals.length) { container.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Chưa có mục tiêu nào.</p>'; return; }
  container.innerHTML = goals.map(g => {
    const pct = Math.min(Math.round(g.saved/g.target*100), 100);
    return `<div class="goal-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="goal-name">🎯 ${g.name}</div>
        <button class="btn-small goal-delete" onclick="deleteGoal(${g.id})">🗑️</button>
      </div>
      <div class="goal-percent">${pct}%</div>
      <div class="goal-progress"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-meta"><span>Đã có: ${formatMoney(g.saved)}</span><span>Cần: ${formatMoney(g.target)}</span></div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">
        Còn thiếu: <b>${formatMoney(Math.max(g.target-g.saved,0))}</b> • ${g.deadline?'Hạn: '+formatDate(g.deadline):'Không có hạn'}
      </div></div>`;
  }).join('');
}

// ============================================================
// 7. TỔNG QUAN
// ============================================================
function refreshOverview() {
  const txList = loadData(KEY_TX);
  let income = 0, expense = 0;
  txList.forEach(tx => { if (tx.type==='income') income+=tx.amount; else expense+=tx.amount; });
  document.getElementById('total-income').textContent  = formatMoney(income);
  document.getElementById('total-expense').textContent = formatMoney(expense);
  document.getElementById('total-balance').textContent = formatMoney(income - expense);
  document.getElementById('active-goals').textContent  = loadData(KEY_GOALS).length;
  const now = new Date();
  document.getElementById('budget-month-title').textContent = `Ngân sách tháng ${now.getMonth()+1}`;
  // Recent transactions
  const ul = document.getElementById('recent-transactions');
  const recent = txList.slice(0, 5);
  ul.innerHTML = !recent.length ? '<li class="empty-msg">Chưa có giao dịch nào.</li>' :
    recent.map(tx => `<li class="transaction-item">
      <span class="tx-icon">${CAT_ICONS[tx.category]||'📦'}</span>
      <div class="tx-info"><div class="tx-name">${tx.desc}</div><div class="tx-cat">${tx.category}</div></div>
      <div><div class="tx-amount ${tx.type}">${tx.type==='income'?'+':'-'}${formatMoney(tx.amount)}</div>
      <div class="tx-date">${formatDate(tx.date)}</div></div></li>`).join('');
  // Budget overview
  const budgets = loadData(KEY_BUDGET);
  const budgetUl = document.getElementById('budget-overview');
  budgetUl.innerHTML = !budgets.length ? '<li class="empty-msg">Chưa có ngân sách.</li>' :
    budgets.slice(0,4).map(b => {
      const spent = getSpentByCategory(b.category);
      const pct   = Math.min(Math.round(spent/b.limit*100), 100);
      const over  = spent > b.limit;
      return `<li class="budget-item">
        <div class="budget-header">
          <span>${CAT_ICONS[b.category]||'📦'} ${b.category}</span>
          <span style="font-size:12px;color:var(--muted)">${formatMoney(spent)} / ${formatMoney(b.limit)}</span>
          <span style="font-size:12px;font-weight:700;color:${over?'var(--red)':'var(--green)'}">${pct}%</span>
        </div>
        <div class="budget-bar"><div class="budget-fill ${over?'over':''}" style="width:${pct}%"></div></div>
      </li>`;
    }).join('');
  drawDonutChart(txList);
  drawLineChart(txList);
}

// ============================================================
// 8. BÁO CÁO
// ============================================================
function renderReport() {
  const txList = loadData(KEY_TX);
  let income = 0, expense = 0;
  const catMap = {};
  txList.forEach(tx => {
    if (tx.type==='income') income+=tx.amount;
    else { expense+=tx.amount; catMap[tx.category]=(catMap[tx.category]||0)+tx.amount; }
  });
  document.getElementById('rpt-income').textContent  = formatMoney(income);
  document.getElementById('rpt-expense').textContent = formatMoney(expense);
  document.getElementById('rpt-saving').textContent  = formatMoney(income-expense);
  document.getElementById('rpt-count').textContent   = txList.length;
  const container = document.getElementById('report-category-list');
  const cats = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  container.innerHTML = !cats.length ? '<p class="empty-msg">Chưa có dữ liệu.</p>' :
    cats.map(([cat, total]) => `<div class="report-cat-item"><span>${CAT_ICONS[cat]||'📦'} ${cat}</span><span style="font-weight:700;color:var(--red)">-${formatMoney(total)}</span></div>`).join('');
}

// ============================================================
// 9. CÀI ĐẶT
// ============================================================
function saveSettings() {
  const name = document.getElementById('setting-name').value.trim();
  if (!name) return alert('Vui lòng nhập tên!');
  document.querySelector('.user-name').textContent = name;
  alert(`✅ Đã lưu cài đặt cho ${name}!`);
}

function clearAllData() {
  if (!confirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu?')) return;
  [KEY_TX, KEY_BUDGET, KEY_GOALS].forEach(k => localStorage.removeItem(k));
  alert('✅ Đã xóa toàn bộ dữ liệu!');
  refreshOverview();
}

// ============================================================
// 10. BIỂU ĐỒ
// ============================================================
function drawDonutChart(txList) {
  const canvas = document.getElementById('donut-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const catMap = {};
  txList.filter(t => t.type==='expense').forEach(t => { catMap[t.category]=(catMap[t.category]||0)+t.amount; });
  const entries = Object.entries(catMap);
  const total   = entries.reduce((s,[,v]) => s+v, 0);
  document.getElementById('donut-total').textContent = formatMoney(total);
  if (!total) {
    ctx.beginPath(); ctx.arc(W/2,H/2,75,0,Math.PI*2);
    ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=30; ctx.stroke();
    document.getElementById('donut-legend').innerHTML=''; return;
  }
  let angle = -Math.PI/2;
  entries.forEach(([cat, val]) => {
    const slice = val/total*Math.PI*2, color = CAT_COLORS[cat]||'#94a3b8';
    ctx.beginPath(); ctx.arc(W/2,H/2,75,angle,angle+slice);
    ctx.strokeStyle=color; ctx.lineWidth=30; ctx.stroke();
    angle += slice;
  });
  document.getElementById('donut-legend').innerHTML = entries.map(([cat,val]) =>
    `<div class="legend-item"><div class="legend-color" style="background:${CAT_COLORS[cat]||'#94a3b8'}"></div>
     <span>${cat}</span><span style="margin-left:auto;font-weight:600">${Math.round(val/total*100)}%</span></div>`
  ).join('');
}

function drawLineChart(txList) {
  const canvas = document.getElementById('line-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const days = [];
  for (let i=29;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  let cum = 0;
  const pts = days.map(day => { cum += txList.filter(t=>t.type==='expense'&&t.date===day).reduce((s,t)=>s+t.amount,0); return cum; });
  const max = Math.max(...pts, 1);
  const p   = {top:20, bottom:30, left:40, right:20};
  const cW  = W-p.left-p.right, cH = H-p.top-p.bottom;
  const toX = i   => p.left + (i/(days.length-1))*cW;
  const toY = val => p.top  + cH - (val/max)*cH;
  ctx.beginPath(); ctx.moveTo(toX(0),toY(pts[0]));
  pts.forEach((v,i) => ctx.lineTo(toX(i),toY(v)));
  ctx.lineTo(toX(pts.length-1),p.top+cH); ctx.lineTo(toX(0),p.top+cH);
  ctx.closePath(); ctx.fillStyle='rgba(76,175,130,0.12)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(toX(0),toY(pts[0]));
  pts.forEach((v,i) => ctx.lineTo(toX(i),toY(v)));
  ctx.strokeStyle='#4caf82'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
  ctx.fillStyle='#888'; ctx.font='10px Be Vietnam Pro,sans-serif'; ctx.textAlign='center';
  [0,7,14,21,29].forEach(i => ctx.fillText(days[i].slice(5), toX(i), H-8));
}

// ============================================================
// KHỞI ĐỘNG
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().slice(0,10);
  const txDateInput = document.getElementById('tx-date');
  if (txDateInput) txDateInput.value = today;
  const mf = document.getElementById('month-filter');
  if (mf) mf.value = today.slice(0,7);
  refreshOverview();
});
