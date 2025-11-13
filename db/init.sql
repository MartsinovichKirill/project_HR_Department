CREATE DATABASE hr_department;

USE hr_department;

CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dept VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    contract_type ENUM('договор','контракт') NOT NULL
);

INSERT INTO employees (name, dept, position, start_date, end_date, contract_type) VALUES
('Иванов Иван Иванович', 'Отдел кадров', 'Менеджер по персоналу', '2024-01-10', '2025-01-10', 'договор'),
('Петров Петр Петрович', 'ИТ-отдел', 'Системный администратор', '2022-05-01', '2026-05-01', 'контракт');
