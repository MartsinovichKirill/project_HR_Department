document.addEventListener('DOMContentLoaded', function() {
  let employees = [];
  const siteContent = document.getElementById('site-content');
  const loginModal = document.getElementById('login-modal');

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
        const u = username.value;
        const p = password.value;
        if (u === 'admin' && p === 'admin123') {
          sessionStorage.setItem('adminLoggedIn', 'true');
          loginModal.style.display = 'none';
          if (siteContent) siteContent.classList.remove('blur');
        } else {
          if (loginError) loginError.textContent = 'Неверный логин или пароль';
        }
      }
    });
  }

  // Загрузка сотрудников из БД
  async function loadEmployees() {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Ошибка сервера');
      employees = await res.json();
      console.log('Загружено сотрудников:', employees.length);
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

    employees.forEach(function(e, index) {
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

    // Обработчики удаления
    document.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', async function(e) {
        const index = e.target.dataset.index;
        const emp = employees[index];
        employees.splice(index, 1);
        saveEmployees();
        renderTable();
        if (emp.id) {
          try {
            await fetch('/api/employees/' + emp.id, { method: 'DELETE' });
          } catch (error) {
            console.error('Ошибка удаления:', error);
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

    employees.forEach(function(e) {
      if (!e.end_date) return;
      const end = new Date(e.end_date);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

      if (diff < 30 && diff > 0) {
        const d = document.createElement('div');
        d.classList.add('alert');
        d.textContent = 'Контракт ' + (e.name || '') + ' истекает через ' + diff + ' дней';
        alerts.appendChild(d);
        hasExpiring = true;
      }
    });

    if (!hasExpiring) {
      alerts.innerHTML = '<p>Нет контрактов, истекающих в ближайший месяц.</p>';
    }
  }

  // Отчёты
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

      const filtered = employees.filter(function(emp) {
        if (!emp.start_date) return false;
        const d = new Date(emp.start_date);
        return d >= s && d <= e2;
      });

      table.innerHTML = '';

      if (filtered.length === 0) {
        table.innerHTML = '<tr><td colspan="5">Нет сотрудников за выбранный период.</td></tr>';
        return;
      }

      filtered.forEach(function(e) {
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

  // ОТЧЕТ PDF
  function initPdfReport() {
    const pdfBtn = document.getElementById('pdf-btn');
    if (!pdfBtn) return;
    
    pdfBtn.addEventListener('click', function() {
      const startDateInput = document.getElementById('startDate');
      const endDateInput = document.getElementById('endDate');
      
      if (!startDateInput || !endDateInput) return;
      
      const startDate = startDateInput.value;
      const endDate = endDateInput.value;
      
      if (!startDate || !endDate) {
        alert('Выберите начальную и конечную даты');
        return;
      }
      
      window.open('/api/reports/pdf?startDate=' + startDate + '&endDate=' + endDate, '_blank');
    });
  }

  // Обработчик для страницы добавления
  function initAddEmployeePage() {
    const form = document.getElementById('add-form');
    const messageDiv = document.getElementById('form-message');
    
    if (!form || !messageDiv) return;
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const nameInput = document.getElementById('name');
      const deptInput = document.getElementById('dept');
      const positionInput = document.getElementById('position');
      const startInput = document.getElementById('start');
      const endInput = document.getElementById('end');
      const typeInput = document.getElementById('type');
      
      if (!nameInput || !deptInput || !positionInput || !startInput || !typeInput) return;
      
      const emp = {
        name: nameInput.value,
        dept: deptInput.value,
        position: positionInput.value,
        start_date: startInput.value,
        end_date: endInput ? endInput.value || null : null,
        contract_type: typeInput.value
      };

      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emp)
        });

        if (!res.ok) throw new Error('Ошибка сервера');

        messageDiv.innerHTML = `
          <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; border: 1px solid #c3e6cb;">
            ✅ Сотрудник успешно добавлен!
          </div>
        `;
        
        form.reset();
        setTimeout(function() {
          window.location.href = 'employees.html';
        }, 2000);
        
      } catch (error) {
        console.error('Ошибка:', error);
        messageDiv.innerHTML = `
          <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb;">
            ❌ Ошибка при добавлении сотрудника
          </div>
        `;
        
        // Fallback на localStorage
        try {
          const localEmployees = JSON.parse(localStorage.getItem('employees')) || [];
          localEmployees.push(emp);
          localStorage.setItem('employees', JSON.stringify(localEmployees));
          
          messageDiv.innerHTML = `
            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; border: 1px solid #c3e6cb;">
              ✅ Сотрудник добавлен в локальное хранилище!
            </div>
          `;
          setTimeout(function() {
            window.location.href = 'employees.html';
          }, 3000);
        } catch (localError) {
          console.error('Локальная ошибка:', localError);
        }
      }
    });
  }

  // Запуск
  loadEmployees();
  initAddEmployeePage();
  initPdfReport();
});