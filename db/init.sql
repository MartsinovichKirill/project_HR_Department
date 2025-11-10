CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dept TEXT NOT NULL,
    position TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    contract_type TEXT CHECK(contract_type IN ('договор', 'контракт')) NOT NULL
);

INSERT INTO employees (name, dept, position, start_date, end_date, contract_type) VALUES
('Иванов Иван Иванович', 'Отдел кадров', 'Менеджер по персоналу', '2024-01-10', '2025-01-10', 'договор'),
('Петров Петр Петрович', 'ИТ-отдел', 'Системный администратор', '2022-05-01', '2026-05-01', 'контракт');
