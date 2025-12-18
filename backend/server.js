const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const PDFDocument = require('pdfkit'); // ДОБАВЬТЕ ЭТУ СТРОКУ
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// MySQL подключение
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Alecseevich098511-', 
  database: 'employees_db'
});
let employees = [];
let departments = [];

// Функция для модального окна с действиями по контракту
function showContractActionModal(employeeName, daysLeft, employeeId) {
  const modalHTML = `
    <div id="contract-action-modal" class="modal">
      <div class="modal-content" style="width: 400px;">
        <h3>Контракт истекает</h3>
        <p>Контракт сотрудника <strong>${employeeName}</strong> истекает через ${daysLeft} дней.</p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          <button onclick="extendContract(${employeeId})" style="background: #28a745;">
            📝 Продлить контракт
          </button>
          <button onclick="initiateDismissal(${employeeId})" style="background: #dc3545;">
            🗑️ Уволить сотрудника
          </button>
          <button onclick="closeContractModal()" style="background: #6c757d;">
            Отложить
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeContractModal() {
  const modal = document.getElementById('contract-action-modal');
  if (modal) modal.remove();
}

async function extendContract(employeeId) {
  const newEndDate = prompt('Введите новую дату окончания (YYYY-MM-DD):');
  if (!newEndDate) return;
  
  try {
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: newEndDate })
    });
    
    if (res.ok) {
      alert('Контракт успешно продлен!');
      loadEmployees();
    }
  } catch (err) {
    console.error('Ошибка продления:', err);
  } finally {
    closeContractModal();
  }
}

async function initiateDismissal(employeeId) {
  if (confirm('Вы уверены, что хотите уволить сотрудника?')) {
    const dismissalDate = new Date().toISOString().split('T')[0];
    
    try {
      const res = await fetch(`/api/employees/${employeeId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissal_date: dismissalDate })
      });
      
      if (res.ok) {
        alert('Сотрудник уволен');
        loadEmployees();
      }
    } catch (err) {
      console.error('Ошибка увольнения:', err);
    }
  }
  closeContractModal();
}
// Добавьте эндпоинт для валидации контрактов (требуется по ТЗ):
app.post('/api/contracts/validate', (req, res) => {
  const { start_date, end_date, contract_type } = req.body;
  
  if (!start_date || !end_date || !contract_type) {
    return res.status(400).json({ valid: false, message: 'Все поля обязательны' });
  }
  
  const start = new Date(start_date);
  const end = new Date(end_date);
  
  // Проверка что дата окончания позже даты начала
  if (end <= start) {
    return res.json({ 
      valid: false, 
      message: 'Дата окончания должна быть позже даты начала' 
    });
  }
  
  // Рассчитать разницу в месяцах
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 
    + (end.getMonth() - start.getMonth());
  
  // Проверка ограничений по ТЗ
  if (contract_type === 'договор' && monthsDiff > 12) {
    return res.json({ 
      valid: false, 
      message: 'Договор не может быть больше 1 года' 
    });
  }
  
  if (contract_type === 'контракт' && (monthsDiff < 12 || monthsDiff > 60)) {
    return res.json({ 
      valid: false, 
      message: 'Контракт должен быть от 1 до 5 лет' 
    });
  }
  
  return res.json({ 
    valid: true, 
    duration: monthsDiff,
    message: 'Контракт корректен' 
  });
});

// Добавьте обработку для statistics.html:
app.get('/statistics.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/statistics.html'));
});
// Проверка подключения
db.getConnection((err) => {
  if (err) {
    console.error('Ошибка подключения к MySQL:', err);
  } else {
    console.log('Подключение к MySQL успешно!');
  }
});

// Получить всех сотрудников
app.get('/api/employees', (req, res) => {
  console.log('Запрос к /api/employees'); // для отладки
  db.query('SELECT * FROM employees', (err, results) => {
    if (err) {
      console.error('Ошибка MySQL:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log('Найдено сотрудников:', results.length); // для отладки
    res.json(results);
  });
});

// Добавить сотрудника
app.post('/api/employees', (req, res) => {
  const { name, dept, position, start_date, end_date, contract_type } = req.body;
  console.log('Добавление сотрудника:', name); // для отладки
  db.query(
    'INSERT INTO employees (name, dept, position, start_date, end_date, contract_type) VALUES (?, ?, ?, ?, ?, ?)',
    [name, dept, position, start_date, end_date || null, contract_type],
    (err, results) => {
      if (err) {
        console.error('Ошибка добавления:', err);
        return res.status(500).json({ error: err.message });
      }
      db.query('SELECT * FROM employees WHERE id = ?', [results.insertId], (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(result[0]);
      });
    }
  );
});

// Удалить сотрудника
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM employees WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.sendStatus(204);
  });
});



// Генерация PDF отчета
app.get('/api/reports/pdf', (req, res) => {
  const { startDate, endDate } = req.query;
  console.log('Генерация PDF:', startDate, 'до', endDate);

  db.query(
    `SELECT * FROM employees WHERE start_date >= ? AND start_date <= ?`,
    [endDate, startDate],
    (err, results) => {
      if (err) {
        console.error('Ошибка PDF:', err);
        return res.status(500).json({ error: err.message });
      }

      try {
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=report-${startDate}-to-${endDate}.pdf`
        );

        doc.pipe(res);

        doc.registerFont('Arial', path.join(__dirname, 'fonts', 'arial.ttf'));
        doc.registerFont('Arial-Bold', path.join(__dirname, 'fonts', 'arialbd.ttf'));

        doc.font('Arial-Bold')
           .fontSize(20)
           .text('ОТЧЕТ ПО СОТРУДНИКАМ', { align: 'center' });
        doc.moveDown();
        
        doc.font('Arial')
           .fontSize(12)
           .text(`Период: с ${startDate} по ${endDate}`, { align: 'center' });
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        let yPosition = doc.y + 10;

        if (results.length === 0) {
          doc.font('Arial')
             .fontSize(14)
             .text('Нет сотрудников за выбранный период', 50, yPosition);
        } else {
          results.forEach((employee, index) => {
            // Перенос на новую страницу
            if (yPosition > 650) {
              doc.addPage();
              yPosition = 50;
            }

            // Имя сотрудника - жирный
            doc.font('Arial-Bold')
               .fontSize(14)
               .text(`${index + 1}. ${employee.name}`, 50, yPosition);

            // Детали - обычный
            doc.font('Arial')
               .fontSize(10)
               .text(
                 `Отдел: ${employee.dept || '—'}
Должность: ${employee.position || '—'}
Дата начала: ${employee.start_date || '—'}
Дата окончания: ${employee.end_date || '—'}
Тип контракта: ${employee.contract_type || '—'}`,
                 70,
                 yPosition + 20
               );

            doc.moveTo(50, yPosition + 100).lineTo(550, yPosition + 100).stroke();

            yPosition += 120;
          });
        }

        doc.end();
      } catch (pdfError) {
        console.error('Ошибка создания PDF:', pdfError);
        res.status(500).json({ error: 'Ошибка генерации PDF' });
      }
    }
  );
});
app.get('/api/employees/expiring/:date', (req, res) => {
  const { date } = req.params;
  db.query(
    `SELECT * FROM employees 
     WHERE end_date IS NOT NULL 
     AND end_date <= ? 
     AND end_date > CURDATE()
     ORDER BY end_date ASC`,
    [date],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Получить сотрудников по отделу, принятых после даты
app.get('/api/employees/hired-after/:date', (req, res) => {
  const { date } = req.params;
  const { department } = req.query;
  
  let query = 'SELECT * FROM employees WHERE start_date > ?';
  const params = [date];
  
  if (department && department !== 'all') {
    query += ' AND dept = ?';
    params.push(department);
  }
  
  query += ' ORDER BY dept, start_date';
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

//Получить статистику по отделам
app.get('/api/statistics/departments', (req, res) => {
  db.query(
    `SELECT dept, 
            COUNT(*) as total,
            SUM(CASE WHEN end_date IS NULL OR end_date > CURDATE() THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN end_date IS NOT NULL AND end_date <= CURDATE() THEN 1 ELSE 0 END) as inactive
     FROM employees 
     GROUP BY dept`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

//Получить информацию о сотруднике за период
app.get('/api/employees/:id/period', (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  
  db.query(
    `SELECT * FROM employees 
     WHERE id = ? 
     AND start_date <= ? 
     AND (end_date IS NULL OR end_date >= ?)`,
    [id, endDate, startDate],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0] || null);
    }
  );
});

//Обновить сотрудника (для редактирования)
app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);
  
  db.query(
    `UPDATE employees SET ${fields} WHERE id = ?`,
    values,
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

//Уволить сотрудника
app.post('/api/employees/:id/dismiss', (req, res) => {
  const { id } = req.params;
  const { dismissal_date } = req.body;
  
  db.query(
    'UPDATE employees SET end_date = ? WHERE id = ?',
    [dismissal_date, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

//Получить уникальные отделы
app.get('/api/departments', (req, res) => {
  db.query('SELECT DISTINCT dept FROM employees ORDER BY dept', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results.map(r => r.dept));
  });
});

// HTML страницы
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/employees.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/employees.html')));
app.get('/add-employee.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/add-employee.html')));
app.get('/contracts.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/contracts.html')));
app.get('/reports.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/reports.html')));

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});