document.addEventListener('DOMContentLoaded', function() {
  let employees = [];
  const siteContent = document.getElementById('site-content');
  const loginModal = document.getElementById('login-modal');
   loadEmployees();
  initAddEmployeePage();
  initPdfReport();
  initContractValidation();

  // Проверка админа 
  function checkAdmin() {
    if (!loginModal) return;
    const isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (!isAdminLoggedIn) {
      loginModal.style.display = 'flex';
      if (siteContent) siteContent.classList.add('blur');
    } else {
      loginModal.style.display = 'none';
      if (siteContent) siteContent.classList.remove('blur');
    }
  }
  checkAdmin();

  // Вход
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username');
      const password = document.getElementById('password');
      const loginError = document.getElementById('login-error');
      
      if (username && password) {
        if (username.value === 'admin' && password.value === 'admin123') {
          sessionStorage.setItem('adminLoggedIn', 'true');
          loginModal.style.display = 'none';
          if (siteContent) siteContent.classList.remove('blur');
        } else {
          if (loginError) loginError.textContent = 'Неверный логин или пароль';
        }
      }
    });
  }

  // Загрузка сотрудников
  async function loadEmployees() {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Ошибка сервера');
      employees = await res.json();
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      employees = JSON.parse(localStorage.getItem('employees')) || [];
    }
    renderTable();
    checkContracts();
    initReports();
  }

  // Сохранение локально
  function saveEmployees() {
    localStorage.setItem('employees', JSON.stringify(employees));
  }

  // Рендер таблицы сотрудников
  function renderTable() {
    const table = document.querySelector('#employees-table tbody');
    if (!table) return;
    table.innerHTML = '';

    employees.forEach((e, index) => {
      const tr = document.createElement('tr');
      const startDate = e.start_date ? e.start_date.slice(0, 10) : '';
      const endDate = e.end_date ? e.end_date.slice(0, 10) : '—';

      tr.innerHTML = `
        <td>${e.name || ''}</td>
        <td>${e.dept || ''}</td>
        <td>${e.position || ''}</td>
        <td>${startDate}</td>
        <td>${endDate}</td>
        <td>${e.contract_type || ''}</td>
        <td><button class="delete-btn" data-index="${index}">Удалить</button></td>
      `;

      table.appendChild(tr);
    });

    // Удаление сотрудников
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function(e) {
        const index = e.target.dataset.index;
        const emp = employees[index];
        employees.splice(index, 1);
        saveEmployees();
        renderTable();
        if (emp.id) {
          try {
            await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
          } catch (err) {
            console.error('Ошибка удаления:', err);
          }
        }
      });
    });
  }

  // Проверка контрактов
  function checkContracts() {
    const alerts = document.getElementById('contracts-alerts');
    if (!alerts) return;
    alerts.innerHTML = '';

    const today = new Date();
    let hasExpiring = false;

    employees.forEach(e => {
      if (!e.end_date) return;
      const end = new Date(e.end_date);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff < 30) {
        const d = document.createElement('div');
        d.classList.add('alert');
        d.textContent = `Контракт ${e.name || ''} истекает через ${diff} дней`;
        alerts.appendChild(d);
        hasExpiring = true;
      }
    });

    if (!hasExpiring) {
      alerts.innerHTML = '<p>Нет контрактов, истекающих в ближайший месяц.</p>';
    }
  }

  // Инициализация отчётов
  function initReports() {
    const form = document.getElementById('report-form');
    const table = document.querySelector('#report-table tbody');
    if (!form || !table) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const startDateInput = document.getElementById('startDate');
      const endDateInput = document.getElementById('endDate');
      if (!startDateInput || !endDateInput) return;

      const s = new Date(startDateInput.value);
      const e2 = new Date(endDateInput.value);

      const filtered = employees.filter(emp => {
        if (!emp.start_date) return false;
        const d = new Date(emp.start_date);
        return d >= s && d <= e2;
      });

      table.innerHTML = '';
      if (filtered.length === 0) {
        table.innerHTML = '<tr><td colspan="5">Нет сотрудников за выбранный период.</td></tr>';
        return;
      }

      filtered.forEach(e => {
        const tr = document.createElement('tr');
        const startDate = e.start_date ? e.start_date.slice(0, 10) : '';
        const endDate = e.end_date ? e.end_date.slice(0, 10) : '—';
        tr.innerHTML = `
          <td>${e.name || ''}</td>
          <td>${e.dept || ''}</td>
          <td>${e.position || ''}</td>
          <td>${startDate}</td>
          <td>${endDate}</td>
        `;
        table.appendChild(tr);
      });
    });
  }

  // Страница добавления сотрудника
  function initAddEmployeePage() {
    const form = document.getElementById('add-form');
    const messageDiv = document.getElementById('form-message');
    if (!form || !messageDiv) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('name')?.value;
      const dept = document.getElementById('dept')?.value;
      const position = document.getElementById('position')?.value;
      const start_date = document.getElementById('start')?.value;
      const end_date = document.getElementById('end')?.value || null;
      const contract_type = document.getElementById('type')?.value;

      if (!name || !dept || !position || !start_date || !contract_type) return;

      const emp = { name, dept, position, start_date, end_date, contract_type };

      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emp)
        });
        if (!res.ok) throw new Error('Ошибка сервера');

        messageDiv.innerHTML = `<div class="success-message">✅ Сотрудник успешно добавлен!</div>`;
        form.reset();
        setTimeout(() => window.location.href = 'employees.html', 2000);
      } catch (err) {
        console.error('Ошибка:', err);
        messageDiv.innerHTML = `<div class="error-message">❌ Ошибка при добавлении сотрудника</div>`;

        // fallback localStorage
        const localEmployees = JSON.parse(localStorage.getItem('employees')) || [];
        localEmployees.push(emp);
        localStorage.setItem('employees', JSON.stringify(localEmployees));
        messageDiv.innerHTML = `<div class="success-message">✅ Сотрудник добавлен в локальное хранилище!</div>`;
        setTimeout(() => window.location.href = 'employees.html', 3000);
      }
    });
    function initContractValidation() {
  const startInput = document.getElementById('start');
  const endInput = document.getElementById('end');
  const typeSelect = document.getElementById('type');
  const validationDiv = document.getElementById('contract-validation');
  
  if (!startInput || !endInput || !typeSelect || !validationDiv) return;
  
  // Функция валидации
  async function validateContract() {
    const start_date = startInput.value;
    const end_date = endInput.value;
    const contract_type = typeSelect.value;
    
    // Если не все поля заполнены, не валидируем
    if (!start_date || !end_date || !contract_type) {
      validationDiv.innerHTML = '';
      return;
    }
    
    // Проверка, что дата окончания не раньше даты начала
    if (new Date(end_date) < new Date(start_date)) {
      validationDiv.innerHTML = `<div class="error-message">❌ Дата окончания не может быть раньше даты начала</div>`;
      return false;
    }
    
    try {
      const res = await fetch('/api/contracts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date, end_date, contract_type })
      });
      
      const result = await res.json();
      
      if (result.valid) {
        validationDiv.innerHTML = `<div class="success-message">✓ Контракт корректен. Длительность: ${result.duration} месяцев</div>`;
        return true;
      } else {
        validationDiv.innerHTML = `<div class="error-message">❌ ${result.message}</div>`;
        return false;
      }
    } catch (error) {
      console.error('Ошибка валидации:', error);
      validationDiv.innerHTML = `<div class="error-message">❌ Ошибка проверки контракта</div>`;
      return false;
    }
  }
  
  // Валидация при изменении полей
  startInput.addEventListener('change', validateContract);
  endInput.addEventListener('change', validateContract);
  typeSelect.addEventListener('change', validateContract);
  
  // Также валидация при отправке формы
  const form = document.getElementById('add-form');
  if (form) {
    form.addEventListener('submit', async function(e) {
      // Если есть дата окончания, валидируем
      if (endInput.value) {
        const isValid = await validateContract();
        if (!isValid) {
          e.preventDefault(); // Отменяем отправку
          return false;
        }
      }
    });
  }
}

     
  }

  // Запуск
  loadEmployees();
  initAddEmployeePage();
  initPdfReport();
});
