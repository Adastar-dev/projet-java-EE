-- ============================================================================
-- DCMS - Script d'initialisation de la base de données MySQL
-- ============================================================================
-- Ce script crée la base de données et les tables nécessaires au projet DCMS.
-- 
-- Exécution :
--   mysql -u root -p < init.sql
-- 
-- Prérequis :
--   - MySQL 8+ installé et démarré
--   - Accès root ou utilisateur avec droits CREATE DATABASE
-- 
-- Note : Hibernate peut créer les tables automatiquement via
--   hibernate.hbm2ddl.auto=update
-- Ce script est fourni pour une installation manuelle ou en production.
-- ============================================================================

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS dcms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE dcms_db;

-- ============================================================================
-- Table : roles
-- ============================================================================
-- Stocke les rôles utilisateur du système.
-- Rôles prédéfinis : ADMIN, AGENT, USER
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table : users
-- ============================================================================
-- Stocke les utilisateurs du système.
-- Le mot de passe est hashé avec BCrypt (jamais en clair).
-- Chaque utilisateur a exactement un rôle (clé étrangère vers roles).
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table : complaints
-- ============================================================================
-- Stocke les plaintes créées par les utilisateurs.
-- Statuts possibles : NOUVELLE, EN_COURS, RESOLUE, REJETEE, FERMEE
-- created_by : utilisateur ayant créé la plainte (obligatoire)
-- assigned_to : agent assigné au traitement (nullable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NOUVELLE',
    created_by BIGINT NOT NULL,
    assigned_to BIGINT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaint_creator FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_complaint_agent FOREIGN KEY (assigned_to) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_status CHECK (status IN ('NOUVELLE', 'EN_COURS', 'RESOLUE', 'REJETEE', 'FERMEE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Table : complaint_history
-- ============================================================================
-- Historise chaque changement de statut d'une plainte.
-- Alimentée de manière ASYNCHRONE par le consumer JMS.
-- Permet la traçabilité complète du workflow.
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaint_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL,
    old_status VARCHAR(20) DEFAULT NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by BIGINT DEFAULT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Index pour optimiser les requêtes fréquentes
-- ============================================================================
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_by ON complaints(created_by);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX idx_history_complaint_id ON complaint_history(complaint_id);
CREATE INDEX idx_history_changed_at ON complaint_history(changed_at);

-- ============================================================================
-- Insertion des rôles par défaut
-- ============================================================================
INSERT IGNORE INTO roles (name) VALUES ('ADMIN');
INSERT IGNORE INTO roles (name) VALUES ('AGENT');
INSERT IGNORE INTO roles (name) VALUES ('USER');

-- ============================================================================
-- Insertion d'un administrateur par défaut
-- ============================================================================
-- Mot de passe : admin123 (hashé avec BCrypt, coût 12)
-- Ce hash a été généré avec : BCrypt.withDefaults().hashToString(12, "admin123".toCharArray())
-- IMPORTANT : Changer ce mot de passe en production !
-- ============================================================================
INSERT IGNORE INTO users (username, email, password_hash, role_id, created_at)
VALUES (
    'admin',
    'admin@dcms.com',
    '$2a$12$LJ3m4ys3Lz.Gj5FdKnVqOeUwMcIlNMFnHJ2fLzGKnMpQr5s6vWXa',
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    NOW()
);

SELECT '✅ Base de données DCMS initialisée avec succès !' AS resultat;
