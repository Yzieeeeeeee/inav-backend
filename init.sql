CREATE DATABASE IF NOT EXISTS payment_collection_db;
USE payment_collection_db;

CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    tenure INT NOT NULL, -- Tenure in months
    emi_due DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    payment_date DATETIME NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Insert dummy data into customers table for testing
INSERT IGNORE INTO customers (account_number, issue_date, interest_rate, tenure, emi_due) VALUES
('ACC-1001', '2023-01-15', 10.50, 24, 5200.00),
('ACC-1002', '2023-05-20', 11.25, 36, 3100.50),
('ACC-1003', '2024-02-10', 9.75, 12, 12500.00);
