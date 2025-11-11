document.addEventListener('DOMContentLoaded', () => {
  let employees = [
    {name: 'Иванов Иван Иванович', dept: 'Отдел кадров', position: 'Менеджер по персоналу', start: '2024-01-10', end: '2025-01-10', type: 'договор'},
    {name: 'Петров Петр Петрович', dept: 'ИТ-отдел', position: 'Системный администратор', start: '2022-05-01', end: '2026-05-01', type: 'контракт'}
  ];
  function renderTable() {
    const table = document.querySelector('#employees-table tbody');
    if (!table) return;
    table.innerHTML = '';

    employees.forEach((e, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${e.name}</td>
        <td>${e.dept}</td>
        <td>${e.position}</td>
        <td>${e.start}</td>
        <td>${e.end || '—'}</td>
        <td>${e.type}</td>
        <td><button class="delete-btn" data-index="${index}">Удалить</button></td>
      `;
      table.appendChild(tr);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const index = e.target.dataset.index;
        employees.splice(index, 1);
        renderTable();
      });
    });
  }

  renderTable();
  const form = document.getElementById('add-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const newEmployee = {
        name: document.getElementById('name').value,
        dept: document.getElementById('dept').value,
        position: document.getElementById('position').value,
        start: document.getElementById('start').value,
        end: document.getElementById('end').value,
        type: document.getElementById('type').value
      };
      employees.push(newEmployee);
      form.reset();
      renderTable();
    });
  }
  const alertsDiv = document.getElementById('contracts-alerts');
  if (alertsDiv) {
    const today = new Date();
    employees.forEach(e => {
      if (e.end) {
        const endDate = new Date(e.end);
        const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 30 && diffDays > 0) {
          const alert = document.createElement('div');
          alert.classList.add('alert');
          alert.textContent = `Контракт сотрудника ${e.name} истекает через ${diffDays} дней.`;
          alertsDiv.appendChild(alert);
        }
      }
    });
    if (alertsDiv.children.length === 0) {
      alertsDiv.innerHTML = '<p>Нет контрактов, истекающих в ближайший месяц.</p>';
    }
  } 
  // Вход админа
const loginModal = document.getElementById('login-modal');
const siteContent = document.getElementById('site-content');
loginModal.style.display = 'flex';
siteContent.classList.add('blur');
const isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn');
if (isAdminLoggedIn) {
  loginModal.style.display = 'none';
  siteContent.classList.remove('blur');
}
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (username === 'admin' && password === 'admin123') {
    sessionStorage.setItem('adminLoggedIn', 'true');
    loginModal.style.display = 'none';
    siteContent.classList.remove('blur');
    alert('Добро пожаловать, администратор!');
  } else {
    document.getElementById('login-error').textContent = 'Неверный логин или пароль';
  }
});
});
