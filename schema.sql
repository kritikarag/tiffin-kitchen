-- Tiffin kitchen schema. Safe to run more than once.
-- Prices are whole rupees. Dates and times are stored in the kitchen's local time.

CREATE TABLE IF NOT EXISTS kitchens (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug             VARCHAR(80)  NOT NULL UNIQUE,
  name             VARCHAR(160) NOT NULL,
  owner_language   VARCHAR(8)   NOT NULL DEFAULT 'en',
  delivery_area    VARCHAR(255) NOT NULL DEFAULT '',
  translations     JSON NULL,                         -- {"hi": {"name": "...", "delivery_area": "..."}, ...}
  capacity_per_day INT UNSIGNED NULL,               -- total portions per day; NULL means no limit
  timezone         VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
  domain           VARCHAR(255) NULL,
  owner_whatsapp   VARCHAR(15)  NULL,                 -- 91XXXXXXXXXX; customers get a link to send her their order
  upi_id           VARCHAR(100) NULL,                 -- name@bank; customers get a QR code to pay her directly
  uses_dabbas      BOOLEAN      NOT NULL DEFAULT TRUE, -- food goes out in boxes that come back; count them per customer
  status           ENUM('draft','live') NOT NULL DEFAULT 'draft',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS menu_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kitchen_id    INT UNSIGNED NOT NULL,
  name_original VARCHAR(160) NOT NULL,              -- as the owner said it
  price         INT UNSIGNED NOT NULL,              -- usual price
  unit          VARCHAR(40)  NOT NULL DEFAULT 'plate',
  translations  JSON NOT NULL,                      -- {"hi": {"name": "...", "description": "..."}, ...}
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_menus (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kitchen_id  INT UNSIGNED NOT NULL,
  menu_date   DATE NOT NULL,
  cutoff_time TIME NULL,                            -- NULL on a holiday
  status      ENUM('open','closed','holiday') NOT NULL DEFAULT 'open',
  UNIQUE KEY one_menu_per_day (kitchen_id, menu_date),
  FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_menu_items (
  daily_menu_id INT UNSIGNED NOT NULL,
  menu_item_id  INT UNSIGNED NOT NULL,
  price         INT UNSIGNED NOT NULL,              -- the price on that day
  sold_out      BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (daily_menu_id, menu_item_id),
  FOREIGN KEY (daily_menu_id) REFERENCES daily_menus(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id)  REFERENCES menu_items(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_menu_id     INT UNSIGNED NOT NULL,
  customer_name     VARCHAR(120) NOT NULL,
  phone             VARCHAR(20)  NOT NULL,
  area              VARCHAR(160) NOT NULL,
  note_original     VARCHAR(500) NULL,              -- as the customer wrote it, any language
  customer_language VARCHAR(8)   NOT NULL DEFAULT 'en',
  status            ENUM('placed','cancelled') NOT NULL DEFAULT 'placed',
  allergy_alert     BOOLEAN      NULL,              -- NULL: note not checked yet; set by Claude when the owner reads orders
  idempotency_key   VARCHAR(64)  NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_order_per_key (daily_menu_id, idempotency_key),
  FOREIGN KEY (daily_menu_id) REFERENCES daily_menus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  order_id     INT UNSIGNED NOT NULL,
  menu_item_id INT UNSIGNED NOT NULL,
  quantity     INT UNSIGNED NOT NULL,
  unit_price   INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, menu_item_id),
  FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Steel or plastic boxes (dabbas) still with each customer. One box goes out with each order, and the owner
-- marks them returned by voice or from the orders screen.
CREATE TABLE IF NOT EXISTS customer_boxes (
  kitchen_id     INT UNSIGNED NOT NULL,
  customer_phone VARCHAR(20)  NOT NULL,
  customer_name  VARCHAR(120) NOT NULL,
  pending_boxes  INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (kitchen_id, customer_phone),
  FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversations (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token          CHAR(36) NOT NULL UNIQUE,          -- random id the dashboard keeps; ids that count up are guessable
  kitchen_id     INT UNSIGNED NULL,                 -- NULL until create_kitchen runs
  messages       JSON NOT NULL,
  pending_action JSON NULL,                         -- a tool call waiting for the owner's yes
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (kitchen_id) REFERENCES kitchens(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
