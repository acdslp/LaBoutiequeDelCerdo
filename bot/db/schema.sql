-- Esquema de la base de datos del bot de La Boutique del Cerdo
CREATE DATABASE IF NOT EXISTS lbdc CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE lbdc;

-- Productos sincronizados desde el Excel de SYH.
-- Nota: el COSTO y el margen NO se importan a proposito: el bot habla con
-- clientes y jamas debe tener acceso a datos internos del negocio.
CREATE TABLE IF NOT EXISTS productos (
  codigo        VARCHAR(20) PRIMARY KEY,
  nombre        VARCHAR(200) NOT NULL,
  precio        DECIMAL(10,2) NOT NULL,
  categoria     VARCHAR(60) DEFAULT 'GENERAL',
  disponible    TINYINT(1) DEFAULT 1,
  actualizado   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pedidos que el bot registra desde WhatsApp
CREATE TABLE IF NOT EXISTS pedidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  telefono      VARCHAR(30) NOT NULL,
  nombre        VARCHAR(120),
  items         JSON NOT NULL,
  total_usd     DECIMAL(10,2),
  metodo_pago   VARCHAR(40),
  entrega       VARCHAR(120),
  estado        ENUM('pendiente','confirmado','entregado','cancelado') DEFAULT 'pendiente',
  creado        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversaciones marcadas para atencion humana
CREATE TABLE IF NOT EXISTS escalamientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  telefono      VARCHAR(30) NOT NULL,
  motivo        VARCHAR(300),
  atendido      TINYINT(1) DEFAULT 0,
  creado        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuracion simple (tasa, mensajes, etc.)
CREATE TABLE IF NOT EXISTS config (
  clave  VARCHAR(50) PRIMARY KEY,
  valor  VARCHAR(300) NOT NULL
);

INSERT INTO config (clave, valor) VALUES ('tasa_bs', '160')
  ON DUPLICATE KEY UPDATE clave = clave;
