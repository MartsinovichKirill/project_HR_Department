document.addEventListener('DOMContentLoaded', () => {
  //ДАННЫЕ + СОХРАНЕНИЕ
  let employees = JSON.parse(localStorage.getItem('employees')) || [
    { name: 'Иванов Иван Иванович', dept: 'Отдел кадров', position: 'Менеджер по персоналу', start: '2024-01-10', end: '2025-01-10', type: 'договор' },
    { name: 'Петров Петр Петрович', dept: 'ИТ-отдел', position: 'Системный администратор', start: '2022-05-01', end: '2026-05-01', type: 'контракт' }
  ];

  function saveEmployees() {
    localStorage.setItem('employees', JSON.stringify(employees));
  }

  //ОТОБРАЖЕНИЕ ТАБЛИЦЫ
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
        saveEmployees();
        renderTable();
      });
    });
  }

  renderTable();

  //ДОБАВЛЕНИЕ СОТРУДНИКА
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
      saveEmployees(); 
      form.reset();
      renderTable();
    });
  }

  //ПРОВЕРКА КОНТРАКТОВ
  const alertsDiv = document.getElementById('contracts-alerts');
  if (alertsDiv) {
    const today = new Date();
    alertsDiv.innerHTML = '';
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

  //ВХОД АДМИНИСТРАТОРА
  const loginModal = document.getElementById('login-modal');
  const siteContent = document.getElementById('site-content');

  if (loginModal && siteContent) {
    const isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (!isAdminLoggedIn) {
      loginModal.style.display = 'flex';
      siteContent.classList.add('blur');
    } else {
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
  }

  //ОТЧЁТЫ
  const reportForm = document.getElementById('report-form');
  const reportTable = document.querySelector('#report-table tbody');
  if (reportForm && reportTable) {
    reportForm.addEventListener('submit', e => {
      e.preventDefault();

      const startDate = new Date(document.getElementById('startDate').value);
      const endDate = new Date(document.getElementById('endDate').value);

      const filtered = employees.filter(e => {
        const empStart = new Date(e.start);
        return empStart >= startDate && empStart <= endDate;
      });

      reportTable.innerHTML = '';
      if (filtered.length > 0) {
        filtered.forEach(emp => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${emp.name}</td>
            <td>${emp.dept}</td>
            <td>${emp.position}</td>
            <td>${emp.start}</td>
            <td>${emp.end || '—'}</td>
          `;
          reportTable.appendChild(tr);
        });
      } else {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5">Нет сотрудников, принятых в этот период.</td>`;
        reportTable.appendChild(tr);
      }
    });
  }

  //PDF-ОТЧЁТ
  const { jsPDF } = window.jspdf || {};
  const downloadBtn = document.getElementById('download-pdf');
  if (downloadBtn && jsPDF) {
    downloadBtn.addEventListener('click', () => {
      const doc = new jsPDF();
      const table = document.getElementById('report-table');
      doc.text('Отчёт отдела кадров', 14, 15);
      doc.autoTable({
        html: table,
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [42, 82, 152] }
      });
      const date = new Date().toLocaleDateString();
      doc.text(`Дата формирования: ${date}`, 14, doc.internal.pageSize.height - 10);
      doc.save('report.pdf');
    });
  }
});
