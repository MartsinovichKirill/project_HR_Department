CREATE DATABASE IF NOT EXISTS employees_db;
USE employees_db;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dept VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    contract_type VARCHAR(50) NOT NULL
);

INSERT INTO employees (name, dept, position, start_date, end_date, contract_type)
VALUES
('Иванов Иван', 'ИТ', 'Программист', '2023-01-01', NULL, 'контракт'),
('Петров Петр', 'HR', 'Менеджер', '2022-05-10', '2024-05-10', 'срочный');