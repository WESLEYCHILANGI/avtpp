-- ============================================================
-- AVTPP Database Schema
-- Automated Vehicle Toll Payment and Request Platform
-- Based on ERD (Figure 5.2) and Table 5.1
--
-- NOTE: Tables are created inside whichever database the app connects to
-- (see config/database.js). No CREATE DATABASE/USE here so the same schema
-- works on managed MySQL hosts where the database name is fixed.
-- ============================================================

-- ── USERS ──
CREATE TABLE IF NOT EXISTS Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    PhoneNumber VARCHAR(20) NOT NULL,
    DateRegistered DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,
    FailedLoginAttempts INT DEFAULT 0,
    LockedUntil DATETIME DEFAULT NULL
) ENGINE=InnoDB;

-- ── ACCOUNTS (1:1 with Users) ──
CREATE TABLE IF NOT EXISTS Accounts (
    AccountID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    Balance DECIMAL(12,2) DEFAULT 0.00,
    LowBalanceThreshold DECIMAL(10,2) DEFAULT 50.00,
    LastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── VEHICLES (M:1 with Users) ──
CREATE TABLE IF NOT EXISTS Vehicles (
    VehicleID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    LicencePlate VARCHAR(20) NOT NULL UNIQUE,
    Make VARCHAR(50) NOT NULL,
    Model VARCHAR(50) NOT NULL,
    Year YEAR NOT NULL,
    VehicleClass ENUM('Class1_Motorcycle', 'Class2_LightVehicle', 'Class3_Minibus', 'Class4_HeavyBus', 'Class5_LightTruck', 'Class6_HeavyTruck') NOT NULL DEFAULT 'Class2_LightVehicle',
    DateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── TOLL GATES ──
CREATE TABLE IF NOT EXISTS TollGates (
    GateID INT AUTO_INCREMENT PRIMARY KEY,
    GateName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Route VARCHAR(100) NOT NULL,
    Province VARCHAR(50) NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- ── TARIFF RATES (M:1 with TollGates) ──
CREATE TABLE IF NOT EXISTS TariffRates (
    TariffID INT AUTO_INCREMENT PRIMARY KEY,
    GateID INT NOT NULL,
    VehicleClass ENUM('Class1_Motorcycle', 'Class2_LightVehicle', 'Class3_Minibus', 'Class4_HeavyBus', 'Class5_LightTruck', 'Class6_HeavyTruck') NOT NULL,
    Amount DECIMAL(8,2) NOT NULL,
    Currency VARCHAR(3) DEFAULT 'ZMW',
    FOREIGN KEY (GateID) REFERENCES TollGates(GateID) ON DELETE CASCADE,
    UNIQUE KEY unique_gate_class (GateID, VehicleClass)
) ENGINE=InnoDB;

-- ── TRANSACTIONS ──
CREATE TABLE IF NOT EXISTS Transactions (
    TransactionID INT AUTO_INCREMENT PRIMARY KEY,
    AccountID INT NOT NULL,
    VehicleID INT NOT NULL,
    GateID INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    TransactionDateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    Status ENUM('Completed', 'Failed', 'Pending') NOT NULL DEFAULT 'Pending',
    Currency VARCHAR(3) DEFAULT 'ZMW',
    BalanceAfter DECIMAL(12,2),
    FOREIGN KEY (AccountID) REFERENCES Accounts(AccountID),
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID),
    FOREIGN KEY (GateID) REFERENCES TollGates(GateID)
) ENGINE=InnoDB;

-- ── TOP-UP RECORDS ──
CREATE TABLE IF NOT EXISTS TopUps (
    TopUpID INT AUTO_INCREMENT PRIMARY KEY,
    AccountID INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Provider ENUM('MTN_Money', 'Airtel_Money', 'Zamtel_Kwacha') NOT NULL,
    PhoneNumber VARCHAR(20) NOT NULL,
    TransactionRef VARCHAR(100) UNIQUE,
    Status ENUM('Completed', 'Failed', 'Pending') NOT NULL DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CompletedAt DATETIME DEFAULT NULL,
    Currency VARCHAR(3) DEFAULT 'ZMW',
    FOREIGN KEY (AccountID) REFERENCES Accounts(AccountID)
) ENGINE=InnoDB;

-- ── NOTIFICATIONS ──
CREATE TABLE IF NOT EXISTS Notifications (
    NotificationID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    Title VARCHAR(200) NOT NULL,
    Message TEXT NOT NULL,
    Type ENUM('toll_deduction', 'low_balance', 'topup_success', 'topup_failed', 'account', 'system') NOT NULL,
    IsRead BOOLEAN DEFAULT FALSE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── ADMINS ──
CREATE TABLE IF NOT EXISTS Admins (
    AdminID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('SuperAdmin', 'Staff') NOT NULL DEFAULT 'Staff',
    LastLogin DATETIME DEFAULT NULL,
    IsActive BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;
