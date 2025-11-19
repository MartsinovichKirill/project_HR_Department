const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const PDFDocument = require('pdfkit'); // ДОБАВЬТЕ ЭТУ СТРОКУ

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

// HTML страницы
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/employees.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/employees.html')));
app.get('/add-employee.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/add-employee.html')));
app.get('/contracts.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/contracts.html')));
app.get('/reports.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/reports.html')));

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});