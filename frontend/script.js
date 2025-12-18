document.addEventListener('DOMContentLoaded', function() {
  let employees = [];
  const siteContent = document.getElementById('site-content');
  const loginModal = document.getElementById('login-modal');
   loadEmployees();
  initAddEmployeePage();
  initPdfReport();
  initContractValidation();
  checkExpiringContracts();

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
// Добавьте функцию для генерации PDF (используется в reports.html):
function initPdfReport() {
  const pdfBtn = document.getElementById('pdf-btn');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (!pdfBtn || !startDateInput || !endDateInput) return;
  
  pdfBtn.addEventListener('click', function() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
      alert('Выберите период для отчета');
      return;
    }
    
    // Скачивание PDF
    window.open(`/api/reports/pdf?startDate=${startDate}&endDate=${endDate}`, '_blank');
  });
}

// Добавьте функцию для поиска сотрудников по отделу и дате:
async function searchEmployeesByDeptAndDate(department, date) {
  try {
    let url = '/api/employees';
    if (department || date) {
      const params = new URLSearchParams();
      if (department && department !== 'all') params.append('dept', department);
      if (date) params.append('hiredAfter', date);
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Ошибка поиска:', error);
    return [];
  }
}


  // Загрузить отделы при инициализации
  async function loadDepartments() {
    try {
      const response = await fetch('/api/departments');
      const departments = await response.json();
      const select = document.getElementById('department-select');
      if (select) {
        select.innerHTML = '<option value="all">Все отделы</option>';
        departments.forEach(dept => {
          const option = document.createElement('option');
          option.value = dept;
          option.textContent = dept;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки отделов:', error);
    }
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
  }
    
  function checkExpiringContracts() {
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


// Проверка сроков контрактов с модальным окном действий
function initContractValidation() {
  const alerts = document.getElementById('contracts-alerts');
  if (!alerts) return;

  const today = new Date();
  const warningDate = new Date();
  warningDate.setDate(today.getDate() + 30); // 30 дней вперед

  alerts.innerHTML = '';

  // Проверяем каждый контракт
  employees.forEach(employee => {
    if (!employee.end_date) return;

    const endDate = new Date(employee.end_date);
    const timeDiff = endDate - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Если контракт истекает меньше чем через 30 дней
    if (daysDiff <= 30 && daysDiff > 0) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert';
      alertDiv.innerHTML = `
        <strong>${employee.name}</strong> - контракт истекает через ${daysDiff} дней
        <div style="margin-top: 10px;">
          <button onclick="showContractActions(${employee.id}, '${employee.name}', ${daysDiff})" 
                  style="background: #28a745; margin-right: 10px;">
            Продлить
          </button>
          <button onclick="dismissEmployee(${employee.id}, '${employee.name}')" 
                  style="background: #dc3545;">
            Уволить
          </button>
        </div>
      `;
      alerts.appendChild(alertDiv);
    }
    // Если контракт уже истек
    else if (daysDiff <= 0) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert';
      alertDiv.style.background = '#f8d7da';
      alertDiv.style.color = '#721c24';
      alertDiv.innerHTML = `
        <strong>${employee.name}</strong> - контракт истек ${Math.abs(daysDiff)} дней назад
        <button onclick="dismissEmployee(${employee.id}, '${employee.name}')" 
                style="background: #dc3545; margin-left: 10px;">
          Уволить
        </button>
      `;
      alerts.appendChild(alertDiv);
    }
  });
}

// Функция для отображения действий по контракту
function showContractActions(employeeId, employeeName, daysLeft) {
  const modalHTML = `
    <div id="contract-action-modal" class="modal">
      <div class="modal-content" style="width: 400px;">
        <h3>Действия по контракту</h3>
        <p>Контракт сотрудника <strong>${employeeName}</strong> истекает через ${daysLeft} дней.</p>
        
        <form id="extend-contract-form" style="width: 100%; margin-top: 20px;">
          <div class="input-group">
            <input type="date" id="new-end-date" required>
            <label>Новая дата окончания</label>
          </div>
          
          <div class="input-group">
            <select id="contract-type" required>
              <option value="">Выберите тип</option>
              <option value="договор">Договор</option>
              <option value="контракт">Контракт</option>
              <option value="срочный">Срочный</option>
            </select>
            <label>Тип контракта</label>
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="submit" style="flex: 1; background: #28a745;">
              Продлить
            </button>
            <button type="button" onclick="closeModal()" style="flex: 1; background: #6c757d;">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('extend-contract-form').addEventListener('submit', function(e) {
    e.preventDefault();
    extendContract(employeeId);
  });
}

// Функция продления контракта
async function extendContract(employeeId) {
  const newEndDate = document.getElementById('new-end-date').value;
  const contractType = document.getElementById('contract-type').value;

  if (!newEndDate || !contractType) {
    alert('Заполните все поля');
    return;
  }

  try {
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        end_date: newEndDate,
        contract_type: contractType 
      })
    });

    if (response.ok) {
      alert('Контракт успешно продлен!');
      closeModal();
      loadEmployees();
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при продлении контракта');
  }
}

// Функция увольнения сотрудника
async function dismissEmployee(employeeId, employeeName) {
  if (confirm(`Вы уверены, что хотите уволить ${employeeName}?`)) {
    try {
      const response = await fetch(`/api/employees/${employeeId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissal_date: new Date().toISOString().split('T')[0] })
      });

      if (response.ok) {
        alert('Сотрудник уволен');
        loadEmployees();
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка при увольнении сотрудника');
    }
  }
}

// Функция закрытия модального окна
function closeModal() {
  const modal = document.getElementById('contract-action-modal');
  if (modal) {
    modal.remove();
  }
}

// Функция для получения сотрудников по отделам, принятых после даты
async function getEmployeesHiredAfter(date, department = 'all') {
  try {
    const url = department === 'all' 
      ? `/api/employees/hired-after/${date}`
      : `/api/employees/hired-after/${date}?department=${department}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка:', error);
    return [];
  }
}

// Функция для получения сотрудников с истекающими контрактами
async function getExpiringContracts(date) {
  try {
    const response = await fetch(`/api/employees/expiring/${date}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка:', error);
    return [];
  }
}

// Функция для получения информации о сотруднике за период
async function getEmployeeInfoForPeriod(employeeId, startDate, endDate) {
  try {
    const response = await fetch(`/api/employees/${employeeId}/period?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка:', error);
    return null;
  }
}

// Инициализация расширенных отчетов (для statistics.html)
function initAdvancedReports() {
  const reportTypeSelect = document.getElementById('report-type');
  const departmentSection = document.getElementById('department-section');
  const dateSection = document.getElementById('date-section');
  const periodSection = document.getElementById('period-section');
  const generateBtn = document.getElementById('generate-advanced-report');
  const resultDiv = document.getElementById('advanced-report-result');

  if (!reportTypeSelect) return;

  // Загрузка отделов
  async function loadDepartments() {
    try {
      const response = await fetch('/api/departments');
      const departments = await response.json();
      const select = document.getElementById('department-select');
      if (select) {
        select.innerHTML = '<option value="all">Все отделы</option>';
        departments.forEach(dept => {
          const option = document.createElement('option');
          option.value = dept;
          option.textContent = dept;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки отделов:', error);
    }
  }

  reportTypeSelect.addEventListener('change', function() {
    const value = this.value;
    
    // Скрываем все секции
    departmentSection.style.display = 'none';
    dateSection.style.display = 'none';
    periodSection.style.display = 'none';

    // Показываем нужные секции в зависимости от типа отчета
    switch(value) {
      case 'department-hired':
        departmentSection.style.display = 'block';
        dateSection.style.display = 'block';
        break;
      case 'expiring-contracts':
        dateSection.style.display = 'block';
        break;
      case 'employee-period':
        periodSection.style.display = 'block';
        break;
    }
  });

  generateBtn.addEventListener('click', async function() {
    const reportType = reportTypeSelect.value;
    let resultHTML = '';

    switch(reportType) {
      case 'department-hired':
        const hireDate = document.getElementById('report-date').value;
        const department = document.getElementById('department-select').value;
        
        if (!hireDate) {
          alert('Выберите дату');
          return;
        }

        const hiredEmployees = await getEmployeesHiredAfter(hireDate, department);
        
        resultHTML = `<h3>Сотрудники, принятые после ${hireDate}</h3>`;
        if (department !== 'all') {
          resultHTML += `<p>Отдел: ${department}</p>`;
        }
        
        if (hiredEmployees.length === 0) {
          resultHTML += '<p>Нет сотрудников, соответствующих критериям.</p>';
        } else {
          resultHTML += `
            <table style="width: 100%; margin-top: 20px;">
              <thead>
                <tr>
                  <th>Ф.И.О.</th>
                  <th>Отдел</th>
                  <th>Должность</th>
                  <th>Дата начала</th>
                  <th>Тип контракта</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          hiredEmployees.forEach(emp => {
            resultHTML += `
              <tr>
                <td>${emp.name}</td>
                <td>${emp.dept}</td>
                <td>${emp.position}</td>
                <td>${emp.start_date}</td>
                <td>${emp.contract_type}</td>
              </tr>
            `;
          });
          
          resultHTML += '</tbody></table>';
        }
        break;

      case 'expiring-contracts':
        const expiringDate = document.getElementById('report-date').value;
        
        if (!expiringDate) {
          alert('Выберите дату');
          return;
        }

        const expiringContracts = await getExpiringContracts(expiringDate);
        
        resultHTML = `<h3>Контракты, истекающие до ${expiringDate}</h3>`;
        
        if (expiringContracts.length === 0) {
          resultHTML += '<p>Нет контрактов, истекающих до указанной даты.</p>';
        } else {
          resultHTML += `
            <table style="width: 100%; margin-top: 20px;">
              <thead>
                <tr>
                  <th>Ф.И.О.</th>
                  <th>Отдел</th>
                  <th>Должность</th>
                  <th>Дата окончания</th>
                  <th>Дней осталось</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
          `;
          
          expiringContracts.forEach(emp => {
            const endDate = new Date(emp.end_date);
            const today = new Date();
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            
            resultHTML += `
              <tr>
                <td>${emp.name}</td>
                <td>${emp.dept}</td>
                <td>${emp.position}</td>
                <td>${emp.end_date}</td>
                <td>${daysLeft}</td>
                <td>
                  <button onclick="showContractActions(${emp.id}, '${emp.name}', ${daysLeft})" 
                          style="padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 3px;">
                    Действия
                  </button>
                </td>
              </tr>
            `;
          });
          
          resultHTML += '</tbody></table>';
        }
        break;
    }

    resultDiv.innerHTML = resultHTML;
  });
}
  window.showContractActions = showContractActions;
  window.extendContract = extendContract;
  window.dismissEmployee = dismissEmployee;
  window.closeModal = closeModal;
});
