BEGIN TRANSACTION;
CREATE TABLE backend_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      api_url TEXT DEFAULT 'http://localhost:4000/api',
      tenant_id TEXT DEFAULT 'ten_849201',
      tenant_name TEXT DEFAULT 'GetPOS Kafe Chilonzor',
      auth_token TEXT DEFAULT '',
      sync_interval INTEGER DEFAULT 30,
      is_external_active INTEGER DEFAULT 0,
      last_sync_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "backend_config" VALUES(1,'https://getpos.uz','90e04abf-246d-4683-91eb-1ac34d7b2ee7','Test Kafe','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxODIwOTgzODQyLCJpYXQiOjE3ODk0NDc4NDIsImp0aSI6IjdiODNmODNhM2JlMjRjMGI4NTYyOTlkZWNhYzJiNTlmIiwidXNlcl9pZCI6ImI1OGQ3NGYzLTM1NDEtNDM0MS1hY2Y4LWZmMDBjMTM5NjRjNyIsInRlbmFudF9pZCI6IjkwZTA0YWJmLTI0NmQtNDY4My05MWViLTFhYzM0ZDdiMmVlNyIsInRlbmFudF9uYW1lIjoiVGVzdCBLYWZlIiwicm9sZSI6Im1hbmFnZXIiLCJuYW1lIjoiS2FmZWUiLCJlbWFpbCI6ImthZmVlQGdtYWlsLmNvbSIsImNhbl9zZWxsX29uX2RlYnQiOmZhbHNlLCJtYXhfZGVidF9saW1pdCI6MTUwMDAwMC4wfQ.QSpZ1f88NPNjjtf36Q8PCK6QLLwxQwIGrrWZw7OwWLI',30,1,'2026-09-15 04:50:42','2026-09-14 10:47:59','2026-09-14 10:47:59');
CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT,
      order_index INTEGER DEFAULT 0
    , image TEXT);
INSERT INTO "categories" VALUES(1,'БИР ЗУМДА','fastfood_1','🍔',1,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(2,'БИРИНЧИ','first_dish_2','🍲',2,'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(3,'ИККИНЧИ','second_dish_3','🍖',3,'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(4,'КАБОБ','kabob_4','🍢',4,'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(5,'НОН ВА ЧОЙ','bread_tea_5','🍵',5,'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(6,'САЛАТ','salads_6','🥗',6,'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(7,'ЯХНА','yahna_drinks_7','🥤',7,'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(8,'HOTDOGLAR','hotdogs_8','🌭',8,'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=300&auto=format&fit=crop&q=80');
INSERT INTO "categories" VALUES(9,'BAR VA ICHIMLIKLAR','store_goods','🥤',7,NULL);
CREATE TABLE fiscal_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON
      status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    );
INSERT INTO "fiscal_queue" VALUES(1,'pay_1789382897447','ord_3960e53a','{"paymentId":"pay_1789382897447","receiptSeq":1002,"company":{"name":"KAFE \"MILLIY TAOMLAR\" MCHJ","inn":"307849201","terminalId":"EP108492","fiscalModuleId":"FM99882211","address":"Toshkent sh., Chilonzor tumani, 9-mavze"},"totalAmount":42000,"vatAmount":4500,"paymentMethod":"cash","cashAmount":42000,"cardAmount":0,"fiscalSign":"415710189646","fiscalQrUrl":"https://ofd.soliq.uz/check?t=EP108492&r=1002&c=1789382897443&s=42000&f=415710189646","qrImageBase64":"data:image/png;base64,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","date":"2026-09-14T10:48:17.443Z","isOnline":false,"isSynced":0,"items":[{"id":3,"order_id":"ord_3960e53a","product_id":5,"product_name":"Choyxona Oshi (Palov)","quantity":1,"price":42000,"comment":"","status":"sent","created_at":"2026-09-14 10:48:17","is_cancelled":0,"cancel_reason":"","mxik_code":"10701002001000000","package_code":"796","vat_percent":12}]}','synced',NULL,'2026-09-14 10:48:17','2026-09-14 10:48:17');
INSERT INTO "fiscal_queue" VALUES(2,'pay_1789382926526','ord_08681244','{"paymentId":"pay_1789382926526","receiptSeq":1004,"company":{"name":"KAFE \"MILLIY TAOMLAR\" MCHJ","inn":"307849201","terminalId":"EP108492","fiscalModuleId":"FM99882211","address":"Toshkent sh., Chilonzor tumani, 9-mavze"},"totalAmount":42000,"vatAmount":4500,"paymentMethod":"cash","cashAmount":42000,"cardAmount":0,"fiscalSign":"595256995281","fiscalQrUrl":"https://ofd.soliq.uz/check?t=EP108492&r=1004&c=1789382926522&s=42000&f=595256995281","qrImageBase64":"data:image/png;base64,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","date":"2026-09-14T10:48:46.522Z","isOnline":false,"isSynced":0,"items":[{"id":6,"order_id":"ord_08681244","product_id":5,"product_name":"Choyxona Oshi (Palov)","quantity":1,"price":42000,"comment":"","status":"sent","created_at":"2026-09-14 10:48:46","is_cancelled":0,"cancel_reason":"","mxik_code":"10701002001000000","package_code":"796","vat_percent":12}]}','synced',NULL,'2026-09-14 10:48:46','2026-09-14 10:48:46');
INSERT INTO "fiscal_queue" VALUES(3,'pay_1789383137074','ord_3cd9a9f0','{"paymentId":"pay_1789383137074","receiptSeq":1006,"company":{"name":"KAFE \"MILLIY TAOMLAR\" MCHJ","inn":"307849201","terminalId":"EP108492","fiscalModuleId":"FM99882211","address":"Toshkent sh., Chilonzor tumani, 9-mavze"},"totalAmount":42000,"vatAmount":4500,"paymentMethod":"cash","cashAmount":42000,"cardAmount":0,"fiscalSign":"383784548903","fiscalQrUrl":"https://ofd.soliq.uz/check?t=EP108492&r=1006&c=1789383137068&s=42000&f=383784548903","qrImageBase64":"data:image/png;base64,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","date":"2026-09-14T10:52:17.068Z","isOnline":false,"isSynced":0,"items":[{"id":9,"order_id":"ord_3cd9a9f0","product_id":5,"product_name":"Choyxona Oshi (Palov)","quantity":1,"price":42000,"comment":"","status":"sent","created_at":"2026-09-14 10:52:17","is_cancelled":0,"cancel_reason":"","mxik_code":"10701002001000000","package_code":"796","vat_percent":12}]}','synced',NULL,'2026-09-14 10:52:17','2026-09-14 10:52:17');
INSERT INTO "fiscal_queue" VALUES(4,'pay_1789383501684','ord_57e6ecbc','{"paymentId":"pay_1789383501684","receiptSeq":1008,"company":{"name":"KAFE \"MILLIY TAOMLAR\" MCHJ","inn":"307849201","terminalId":"EP108492","fiscalModuleId":"FM99882211","address":"Toshkent sh., Chilonzor tumani, 9-mavze"},"totalAmount":75000,"vatAmount":8036,"paymentMethod":"cash","cashAmount":42000,"cardAmount":0,"fiscalSign":"706285668028","fiscalQrUrl":"https://ofd.soliq.uz/check?t=EP108492&r=1008&c=1789383501680&s=75000&f=706285668028","qrImageBase64":"data:image/png;base64,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","date":"2026-09-14T10:58:21.680Z","isOnline":false,"isSynced":0,"items":[{"id":13,"order_id":"ord_57e6ecbc","product_id":13,"product_name":"Coca-Cola 1.5L","quantity":1,"price":18000,"comment":"","status":"sent","created_at":"2026-09-14 10:57:32","is_cancelled":0,"cancel_reason":"","mxik_code":"10702002001000000","package_code":"796","vat_percent":12},{"id":14,"order_id":"ord_57e6ecbc","product_id":11,"product_name":"Ko''k choy (Limon bilan)","quantity":1,"price":8000,"comment":"","status":"sent","created_at":"2026-09-14 10:57:32","is_cancelled":0,"cancel_reason":"","mxik_code":"10702001001000000","package_code":"796","vat_percent":12},{"id":15,"order_id":"ord_57e6ecbc","product_id":12,"product_name":"Qora choy (Zafaron)","quantity":1,"price":7000,"comment":"","status":"sent","created_at":"2026-09-14 10:57:32","is_cancelled":0,"cancel_reason":"","mxik_code":"10702001001000000","package_code":"796","vat_percent":12},{"id":18,"order_id":"ord_57e6ecbc","product_id":5,"product_name":"Choyxona Oshi (Palov)","quantity":1,"price":42000,"comment":"","status":"sent","created_at":"2026-09-14 10:58:21","is_cancelled":0,"cancel_reason":"","mxik_code":"10701002001000000","package_code":"796","vat_percent":12}]}','synced',NULL,'2026-09-14 10:58:21','2026-09-14 10:58:21');
INSERT INTO "fiscal_queue" VALUES(5,'pay_1789384374141','ord_fe5db030','{"paymentId":"pay_1789384374141","receiptSeq":1010,"company":{"name":"KAFE \"MILLIY TAOMLAR\" MCHJ","inn":"307849201","terminalId":"EP108492","fiscalModuleId":"FM99882211","address":"Toshkent sh., Chilonzor tumani, 9-mavze"},"totalAmount":42000,"vatAmount":4500,"paymentMethod":"cash","cashAmount":42000,"cardAmount":0,"fiscalSign":"352412379011","fiscalQrUrl":"https://ofd.soliq.uz/check?t=EP108492&r=1010&c=1789384374135&s=42000&f=352412379011","qrImageBase64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAgYSURBVO3BQY5jSZJEQX0O3v/Kb3I1CwMN8PpkZEV3qwj+kap666SqVidVtTqpqtVJVa1Oqmr1ygLIb6LmBpBJzd8A5Ck1TwGZ1NwC8tPUTEB+EzXTSVWtTqpqdVJVq5OqWr3yD6j5aUA+oeabgExqPqHmKSCTmk+o+SYgn1Dz04DcOKmq1UlVrU6qanVSVatXPgTkKTWfADKpmYD8W9TcADKpmdRMQG6pmYBMaiYgk5pJzbcBeUrNUydVtTqpqtVJVa1Oqmr1Sv0/NZ9QMwG5oeYpNROQTwC5AWRS89/ipKpWJ1W1Oqmq1UlVrV75LwNkUjMBmYDcUPMOkG8C8pSad4BMam4AmdRMQCY1/4lOqmp1UlWrk6panVTV6pUPqfntgNxQcwPIO2puALmh5tvU3AAyqZmATGq+Tc2/4aSqVidVtTqpqtVJVa1e+QeA/HZqJiCTmgnIpOYTQCY1E5BJzQRkUjMBeUfNBGRSMwGZ1ExAJjW3gPwWJ1W1Oqmq1UlVrU6qanVSVatXFmrqPTWfAPKUmgnIJ9Q8BeQpNb/dSVWtTqpqdVJVq5OqWr2yADKpmYD8DWomNTfU3FBzA8g7am6ouQFkUnNDzd+gZgJyA8jfoOapk6panVTV6qSqVidVtcI/cgnIpGYCckPNJ4B8k5oJyCfUTEBuqJmATGomIO+o+e2ATGomIE+puXFSVauTqlqdVNXqpKpW+EfeAPKUmgnIpGYC8o6aG0AmNU8BmdS8A+SnqfkEkEnNU0CeUnMLyKTmBpAbaqaTqlqdVNXqpKpWJ1W1euVDar5JzS0gk5oJyFNqJiC31DwFZALybUAmNROQSc0E5G8AckPNBOTGSVWtTqpqdVJVq5OqWr2yUHMDyDcB+RvUTED+LUCeUvMJIBOQSc0EZFIzAZmAvKPmKTUTkKdOqmp1UlWrk6panVTVCv/IB4BMaiYgN9S8A+QpNROQG2puAbmh5puAfELNNwGZ1NwCMql5CsgNNdNJVa1Oqmp1UlWrk6pa4R/5MiB/g5obQCY1E5BJzd8AZFLzFJB31ExAbqiZgDyl5h0gT6n5ppOqWp1U1eqkqlYnVbU6qarVKx8CMqm5AWRS8w6QCcgNNd8E5BNqJjVPAZnUfELNBGRSMwG5AeQTap4CMqmZTqpqdVJVq5OqWp1U1eqVBZAbam4AuQHkHTUTkG9SMwH5hJobQCY13wbkBpBJzQ01E5BbaiYgN4BMap46qarVSVWtTqpqdVJVq1f+ATVPqZmATGreAXJDzQ0gk5pJzS0gE5BJzaTmKTWfUDMBeQrIbwJkUnPjpKpWJ1W1Oqmq1UlVrfCPvAHkp6mZgLyjZgJyQ80NIJ9Q8xSQSc1TQN5RMwH5JjUTkL9BzQTkhprppKpWJ1W1Oqmq1UlVrV5ZqJmATGpuALmh5paaCchTam4AuQVkUvNNQG4BmdT8NDWfADKpmYBMaiYgN06qanVSVauTqlqdVNXqlQWQSc0E5IaaCcgn1DwF5IaaT6iZgDwFZFIzAXlHzQTkm9RMQG6p+WlqbpxU1eqkqlYnVbU6qarVK/8AkEnNDSCTmltAbqiZgExqJiCfAPLT1ExAbgGZ1NwAMqmZgExqPqFmAjKpuQFkUjOdVNXqpKpWJ1W1OqmqFf6RLwPybWomIJOanwbkHTU3gExqvgnIO2puAJnUTEBuqLkF5Ck1E5BJzY2TqlqdVNXqpKpWJ1W1OqmqFf6RDwC5oWYCMqn5twCZ1NwC8k1qbgCZ1LwD5IaaCcik5gaQb1PzFJBJzXRSVauTqlqdVNXqpKpWryyATGomNROQCcgNILfUTEBuqHkKyCfUfJOaCcg7aiYgN9RMQJ5S821AvumkqlYnVbU6qarVSVWt8I+8AWRSMwGZ1ExAbqh5B8gNNROQp9RMQG6pmYDcUDMB+TY1Pw3It6n5aSdVtTqpqtVJVa1Oqmr1yr9IzQTkE0AmNROQG0A+AWRSMwGZgExqJiC31ExAJjUTkEnNt6mZgExAJjUTkBtqppOqWp1U1eqkqlYnVbV65UNqJiBPqfkb1ExAvk3NBOSnqXkHyDcBmdRMaiYgt9R8k5obJ1W1Oqmq1UlVrU6qavXKh4BMap4C8o6aG0C+Sc0tIBOQSc0EZFIzAZnU3FIzAZmAPAXkE0CeUvNNJ1W1Oqmq1UlVrU6qaoV/5D8UkEnNbwJkUvMUkG9TcwPIpGYCMqn5BJAbam4AmdRMJ1W1Oqmq1UlVrU6qavXKAshvomZS89OATGpuqbkBZFLzlJpPAJnUfBOQd9TcUDMBuaHmxklVrU6qanVSVauTqlqdVNXqlX9AzU8DcgvIpOYpIJOaW0AmNTfUfBOQW2omNROQSc1Taj4BZFJzA8ikZjqpqtVJVa1Oqmp1UlWrVz4E5Ck13wZkUjMBmdTcAPKOmqeATGomNTeA3AIyqZnUTEBuAPk2NROQSc1TJ1W1Oqmq1UlVrU6qavXK/wAg36TmHSBPqfkb1ExAJiCTmqfUTEDeUTMBmYBMaiYgT51U1eqkqlYnVbU6qarVK/8D1PwNap4CMqmZgHybmgnIDTUTkBtqbqmZgNxQMwG5cVJVq5OqWp1U1eqkqlavfEjNv0XNNwGZ1ExA3lEzAbmhZgIyqZmA3AJyQ80NIJOaCcgtNROQSc0EZFLz1ElVrU6qanVSVauTqlq98g8A+U2A3FAzAXlKzS01v4maCcgEZFIzqflN1ExAnjqpqtVJVa1Oqmp1UlUr/CNV9dZJVa1Oqmp1UlWrk6pa/R+p5faVa3rz0wAAAABJRU5ErkJggg==","date":"2026-09-14T11:12:54.135Z","isOnline":false,"isSynced":0,"items":[{"id":21,"order_id":"ord_fe5db030","product_id":5,"product_name":"Choyxona Oshi (Palov)","quantity":1,"price":42000,"comment":"","status":"sent","created_at":"2026-09-14 11:12:54","is_cancelled":0,"cancel_reason":"","mxik_code":"10701002001000000","package_code":"796","vat_percent":12}]}','synced',NULL,'2026-09-14 11:12:54','2026-09-14 11:12:54');
INSERT INTO "fiscal_queue" VALUES(6,'pay_1789384557245','ord_76ab98fe','{"paymentId":"pay_1789384557245","receiptSeq":1012,"company":{"name":"KAFE \"MILLIY TAOMLAR\" MCHJ","inn":"307849201","terminalId":"EP108492","fiscalModuleId":"FM99882211","address":"Toshkent sh., Chilonzor tumani, 9-mavze"},"totalAmount":42000,"vatAmount":4500,"paymentMethod":"cash","cashAmount":42000,"cardAmount":0,"fiscalSign":"083212608963","fiscalQrUrl":"https://ofd.soliq.uz/check?t=EP108492&r=1012&c=1789384557241&s=42000&f=083212608963","qrImageBase64":"data:image/png;base64,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","date":"2026-09-14T11:15:57.241Z","isOnline":false,"isSynced":0,"items":[{"id":24,"order_id":"ord_76ab98fe","product_id":5,"product_name":"Choyxona Oshi (Palov)","quantity":1,"price":42000,"comment":"","status":"sent","created_at":"2026-09-14 11:15:57","is_cancelled":0,"cancel_reason":"","mxik_code":"10701002001000000","package_code":"796","vat_percent":12}]}','synced',NULL,'2026-09-14 11:15:57','2026-09-14 11:15:57');
CREATE TABLE halls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "halls" VALUES(1,'Asosiy Zal',1,'2026-09-14 12:50:38');
INSERT INTO "halls" VALUES(2,'Zal 1',2,'2026-09-14 12:50:38');
INSERT INTO "halls" VALUES(3,'Zal 2',3,'2026-09-14 12:50:38');
INSERT INTO "halls" VALUES(4,'2-Qavat Zal',4,'2026-09-14 12:50:38');
INSERT INTO "halls" VALUES(5,'VIP Xona',5,'2026-09-14 12:50:38');
CREATE TABLE kitchen_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      table_number INTEGER NOT NULL,
      waiter_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      printed INTEGER DEFAULT 0
    );
INSERT INTO "kitchen_tickets" VALUES(1,'ord_32515839',5,'Ofitsiant Sardor','[{"product_name":"Qiyma shashlik","quantity":2,"comment":"piyozsiz"},{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":"issiqroq"}]','2026-09-14 10:48:17',1);
INSERT INTO "kitchen_tickets" VALUES(2,'ord_3960e53a',2,'Ofitsiant Sardor','[{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":""}]','2026-09-14 10:48:17',1);
INSERT INTO "kitchen_tickets" VALUES(3,'ord_d07275a6',5,'Ofitsiant Sardor','[{"product_name":"Qiyma shashlik","quantity":2,"comment":"piyozsiz"},{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":"issiqroq"}]','2026-09-14 10:48:46',1);
INSERT INTO "kitchen_tickets" VALUES(4,'ord_08681244',2,'Ofitsiant Sardor','[{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":""}]','2026-09-14 10:48:46',1);
INSERT INTO "kitchen_tickets" VALUES(5,'ord_034694af',5,'Ofitsiant Sardor','[{"product_name":"Qiyma shashlik","quantity":2,"comment":"piyozsiz"},{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":"issiqroq"}]','2026-09-14 10:52:16',1);
INSERT INTO "kitchen_tickets" VALUES(6,'ord_3cd9a9f0',2,'Ofitsiant Sardor','[{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":""}]','2026-09-14 10:52:17',1);
INSERT INTO "kitchen_tickets" VALUES(7,'ord_671a8e3e',1,'Kafee','[{"product_name":"Yangi siqilgan apelsin sharbati","quantity":1,"comment":""},{"product_name":"Qora choy (Zafaron)","quantity":1,"comment":""},{"product_name":"Ko''k choy (Limon bilan)","quantity":1,"comment":""}]','2026-09-14 10:57:07',1);
INSERT INTO "kitchen_tickets" VALUES(8,'ord_57e6ecbc',2,'Kafee','[{"product_name":"Coca-Cola 1.5L","quantity":1,"comment":""},{"product_name":"Ko''k choy (Limon bilan)","quantity":1,"comment":""},{"product_name":"Qora choy (Zafaron)","quantity":1,"comment":""}]','2026-09-14 10:57:32',1);
INSERT INTO "kitchen_tickets" VALUES(9,'ord_7944a017',5,'Ofitsiant Sardor','[{"product_name":"Qiyma shashlik","quantity":2,"comment":"piyozsiz"},{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":"issiqroq"}]','2026-09-14 10:58:21',1);
INSERT INTO "kitchen_tickets" VALUES(10,'ord_57e6ecbc',2,'Ofitsiant Sardor','[{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":""}]','2026-09-14 10:58:21',1);
INSERT INTO "kitchen_tickets" VALUES(11,'ord_fadef762',5,'Ofitsiant Sardor','[{"product_name":"Qiyma shashlik","quantity":2,"comment":"piyozsiz"},{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":"issiqroq"}]','2026-09-14 11:12:54',1);
INSERT INTO "kitchen_tickets" VALUES(12,'ord_fe5db030',2,'Ofitsiant Sardor','[{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":""}]','2026-09-14 11:12:54',1);
INSERT INTO "kitchen_tickets" VALUES(13,'ord_e9f9c8cc',5,'Ofitsiant Sardor','[{"product_name":"Qiyma shashlik","quantity":2,"comment":"piyozsiz"},{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":"issiqroq"}]','2026-09-14 11:15:57',1);
INSERT INTO "kitchen_tickets" VALUES(14,'ord_76ab98fe',2,'Ofitsiant Sardor','[{"product_name":"Choyxona Oshi (Palov)","quantity":1,"comment":""}]','2026-09-14 11:15:57',1);
INSERT INTO "kitchen_tickets" VALUES(15,'ord_a263894e',2,'Akbar','[{"product_name":"Osh","quantity":1,"comment":""}]','2026-09-14 12:31:22',1);
INSERT INTO "kitchen_tickets" VALUES(16,'ord_92db73a5',3,'Akbar','[{"product_name":"HAMBURGER","quantity":2,"comment":""},{"product_name":"CHEESEBURGER","quantity":2,"comment":""}]','2026-09-14 12:42:37',1);
INSERT INTO "kitchen_tickets" VALUES(17,'ord_92db73a5',3,'Akbar','[{"product_name":"Mastava","quantity":2,"comment":"Issiq"},{"product_name":"Chuchvara","quantity":1,"comment":"Qatiq bilan"}]','2026-09-14 12:50:47',1);
INSERT INTO "kitchen_tickets" VALUES(18,'ord_92db73a5',3,'Akbar','[{"product_name":"Sho''rva (Go''shtli)","quantity":1,"comment":""}]','2026-09-14 12:54:00',1);
INSERT INTO "kitchen_tickets" VALUES(19,'ord_671a8e3e',1,'Akbar','[{"product_name":"CHEESEBURGER","quantity":2,"comment":"Issiq bo''lsin"}]','2026-09-14 13:00:19',1);
INSERT INTO "kitchen_tickets" VALUES(20,'ord_671a8e3e',1,'Sardor','[{"product_name":"CHICKENBURGER","quantity":1,"comment":"Muzsiz"}]','2026-09-14 13:00:19',1);
INSERT INTO "kitchen_tickets" VALUES(21,'ord_671a8e3e',1,'Akbar','[{"product_name":"Chuchvara","quantity":2,"comment":""}]','2026-09-14 13:07:18',1);
CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL,
      comment TEXT DEFAULT '', -- 'Piyozsiz', 'Issiqroq', 'Achchiq bo'lmasin'
      status TEXT DEFAULT 'sent', -- 'sent', 'ready', 'served'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_cancelled INTEGER DEFAULT 0, cancel_reason TEXT DEFAULT '', waiter_id TEXT, waiter_name TEXT DEFAULT '',
      FOREIGN KEY (order_id) REFERENCES orders (id)
    );
INSERT INTO "order_items" VALUES(1,'ord_32515839',7,'Qiyma shashlik',2,22000,'piyozsiz','sent','2026-09-14 10:48:17',0,'',NULL,'');
INSERT INTO "order_items" VALUES(2,'ord_32515839',5,'Choyxona Oshi (Palov)',1,42000,'issiqroq','sent','2026-09-14 10:48:17',0,'',NULL,'');
INSERT INTO "order_items" VALUES(3,'ord_3960e53a',5,'Choyxona Oshi (Palov)',1,42000,'','sent','2026-09-14 10:48:17',0,'',NULL,'');
INSERT INTO "order_items" VALUES(4,'ord_d07275a6',7,'Qiyma shashlik',2,22000,'piyozsiz','sent','2026-09-14 10:48:46',0,'',NULL,'');
INSERT INTO "order_items" VALUES(5,'ord_d07275a6',5,'Choyxona Oshi (Palov)',1,42000,'issiqroq','sent','2026-09-14 10:48:46',0,'',NULL,'');
INSERT INTO "order_items" VALUES(6,'ord_08681244',5,'Choyxona Oshi (Palov)',1,42000,'','sent','2026-09-14 10:48:46',0,'',NULL,'');
INSERT INTO "order_items" VALUES(7,'ord_034694af',7,'Qiyma shashlik',2,22000,'piyozsiz','sent','2026-09-14 10:52:16',0,'',NULL,'');
INSERT INTO "order_items" VALUES(8,'ord_034694af',5,'Choyxona Oshi (Palov)',1,42000,'issiqroq','sent','2026-09-14 10:52:16',0,'',NULL,'');
INSERT INTO "order_items" VALUES(9,'ord_3cd9a9f0',5,'Choyxona Oshi (Palov)',1,42000,'','sent','2026-09-14 10:52:17',0,'',NULL,'');
INSERT INTO "order_items" VALUES(10,'ord_671a8e3e',14,'Yangi siqilgan apelsin sharbati',5,25000,'Kassadan 5 taga oshirildi','sent','2026-09-14 10:57:07',0,'',NULL,'Kassa');
INSERT INTO "order_items" VALUES(11,'ord_671a8e3e',12,'Qora choy (Zafaron)',1,7000,'','sent','2026-09-14 10:57:07',0,'',NULL,'');
INSERT INTO "order_items" VALUES(12,'ord_671a8e3e',11,'Ko''k choy (Limon bilan)',1,8000,'','sent','2026-09-14 10:57:07',0,'',NULL,'');
INSERT INTO "order_items" VALUES(13,'ord_57e6ecbc',13,'Coca-Cola 1.5L',1,18000,'','sent','2026-09-14 10:57:32',0,'',NULL,'');
INSERT INTO "order_items" VALUES(14,'ord_57e6ecbc',11,'Ko''k choy (Limon bilan)',1,8000,'','sent','2026-09-14 10:57:32',0,'',NULL,'');
INSERT INTO "order_items" VALUES(15,'ord_57e6ecbc',12,'Qora choy (Zafaron)',1,7000,'','sent','2026-09-14 10:57:32',0,'',NULL,'');
INSERT INTO "order_items" VALUES(16,'ord_7944a017',7,'Qiyma shashlik',2,22000,'piyozsiz','sent','2026-09-14 10:58:21',0,'',NULL,'');
INSERT INTO "order_items" VALUES(17,'ord_7944a017',5,'Choyxona Oshi (Palov)',1,42000,'issiqroq','sent','2026-09-14 10:58:21',0,'',NULL,'');
INSERT INTO "order_items" VALUES(18,'ord_57e6ecbc',5,'Choyxona Oshi (Palov)',1,42000,'','sent','2026-09-14 10:58:21',0,'',NULL,'');
INSERT INTO "order_items" VALUES(19,'ord_fadef762',7,'Qiyma shashlik',2,22000,'piyozsiz','sent','2026-09-14 11:12:53',0,'',NULL,'');
INSERT INTO "order_items" VALUES(20,'ord_fadef762',5,'Choyxona Oshi (Palov)',1,42000,'issiqroq','sent','2026-09-14 11:12:53',0,'',NULL,'');
INSERT INTO "order_items" VALUES(21,'ord_fe5db030',5,'Choyxona Oshi (Palov)',1,42000,'','sent','2026-09-14 11:12:54',0,'',NULL,'');
INSERT INTO "order_items" VALUES(22,'ord_e9f9c8cc',7,'Qiyma shashlik',2,22000,'piyozsiz','sent','2026-09-14 11:15:57',0,'',NULL,'');
INSERT INTO "order_items" VALUES(23,'ord_e9f9c8cc',5,'Choyxona Oshi (Palov)',1,42000,'issiqroq','sent','2026-09-14 11:15:57',0,'',NULL,'');
INSERT INTO "order_items" VALUES(24,'ord_76ab98fe',5,'Choyxona Oshi (Palov)',1,42000,'','sent','2026-09-14 11:15:57',0,'',NULL,'');
INSERT INTO "order_items" VALUES(25,'ord_a263894e',1,'Osh',1,35000,'','sent','2026-09-14 12:31:22',0,'',NULL,'');
INSERT INTO "order_items" VALUES(26,'ord_92db73a5',23,'HAMBURGER',2,25000,'','sent','2026-09-14 12:42:37',0,'',NULL,'');
INSERT INTO "order_items" VALUES(27,'ord_92db73a5',21,'CHEESEBURGER',2,28000,'','sent','2026-09-14 12:42:37',0,'',NULL,'');
INSERT INTO "order_items" VALUES(28,'ord_92db73a5',1,'Mastava',1,40000,'yaxshilab pishir','sent','2026-09-14 12:50:47',0,'',NULL,'Akbar');
INSERT INTO "order_items" VALUES(29,'ord_92db73a5',3,'Chuchvara',3,20000,'Qatiq bilan','sent','2026-09-14 12:50:47',0,'',NULL,'Akbar');
INSERT INTO "order_items" VALUES(30,'ord_92db73a5',2,'Sho''rva (Go''shtli)',2,50000,'','sent','2026-09-14 12:54:00',0,'',NULL,'Akbar');
INSERT INTO "order_items" VALUES(31,'ord_671a8e3e',21,'CHEESEBURGER',2,28000,'Issiq bo''lsin','sent','2026-09-14 13:00:19',0,'','101','Akbar');
INSERT INTO "order_items" VALUES(32,'ord_671a8e3e',22,'CHICKENBURGER',1,26000,'Muzsiz','cancelled','2026-09-14 13:00:19',1,'Mijoz ichmadi, qaytarildi','102','Sardor');
INSERT INTO "order_items" VALUES(33,'ord_671a8e3e',3,'Chuchvara',1,35000,'Piyozsiz','cancelled','2026-09-14 13:07:18',1,'Mijoz rad etdi','1','Akbar');
CREATE TABLE orders (
      id TEXT PRIMARY KEY, -- UUID
      table_id INTEGER NOT NULL,
      waiter_id INTEGER,
      waiter_name TEXT,
      status TEXT DEFAULT 'open', -- 'open', 'bill_requested', 'paid', 'cancelled'
      total_amount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables (id)
    );
INSERT INTO "orders" VALUES('ord_32515839',5,1,'Ofitsiant Sardor','paid',86000,'2026-09-14 10:48:17','2026-09-14 10:48:17');
INSERT INTO "orders" VALUES('ord_3960e53a',2,1,'Ofitsiant Sardor','paid',42000,'2026-09-14 10:48:17','2026-09-14 10:48:17');
INSERT INTO "orders" VALUES('ord_d07275a6',5,1,'Ofitsiant Sardor','paid',86000,'2026-09-14 10:48:46','2026-09-14 10:48:46');
INSERT INTO "orders" VALUES('ord_08681244',2,1,'Ofitsiant Sardor','paid',42000,'2026-09-14 10:48:46','2026-09-14 10:48:46');
INSERT INTO "orders" VALUES('ord_034694af',5,1,'Ofitsiant Sardor','paid',86000,'2026-09-14 10:52:16','2026-09-14 10:52:16');
INSERT INTO "orders" VALUES('ord_3cd9a9f0',2,1,'Ofitsiant Sardor','paid',42000,'2026-09-14 10:52:17','2026-09-14 10:52:17');
INSERT INTO "orders" VALUES('ord_671a8e3e',1,'b58d74f3-3541-4341-acf8-ff00c13964c7','Kafee','open',196000,'2026-09-14 10:57:07','2026-09-14 13:14:33');
INSERT INTO "orders" VALUES('ord_57e6ecbc',2,'b58d74f3-3541-4341-acf8-ff00c13964c7','Kafee','paid',75000,'2026-09-14 10:57:32','2026-09-14 10:58:21');
INSERT INTO "orders" VALUES('ord_7944a017',5,1,'Ofitsiant Sardor','paid',86000,'2026-09-14 10:58:21','2026-09-14 10:58:21');
INSERT INTO "orders" VALUES('ord_fadef762',5,1,'Ofitsiant Sardor','paid',86000,'2026-09-14 11:12:53','2026-09-14 11:12:53');
INSERT INTO "orders" VALUES('ord_fe5db030',2,1,'Ofitsiant Sardor','paid',42000,'2026-09-14 11:12:54','2026-09-14 11:12:54');
INSERT INTO "orders" VALUES('ord_e9f9c8cc',5,1,'Ofitsiant Sardor','paid',86000,'2026-09-14 11:15:57','2026-09-14 11:15:57');
INSERT INTO "orders" VALUES('ord_76ab98fe',2,1,'Ofitsiant Sardor','paid',42000,'2026-09-14 11:15:57','2026-09-14 11:15:57');
INSERT INTO "orders" VALUES('ord_a263894e',2,10,'Akbar','open',35000,'2026-09-14 12:31:22','2026-09-14 12:31:22');
INSERT INTO "orders" VALUES('ord_92db73a5',3,1116249494381928832,'Akbar','bill_requested',306000,'2026-09-14 12:42:37','2026-09-14 13:31:31');
CREATE TABLE payments (
      id TEXT PRIMARY KEY, -- UUID
      order_id TEXT NOT NULL,
      table_id INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL, -- 'cash', 'card', 'split'
      cash_amount INTEGER DEFAULT 0,
      card_amount INTEGER DEFAULT 0,
      fiscal_sign TEXT, -- Soliq fiskal belgisi
      fiscal_qr_url TEXT, -- Soliq QR kodi URL manzili
      receipt_seq INTEGER, -- Chek seriya raqami
      is_synced_soliq INTEGER DEFAULT 1, -- 1: yuborildi, 0: oflayn navbatda
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    );
INSERT INTO "payments" VALUES('pay_1789382897425','ord_32515839',5,86000,'split',30000,56000,'331886777731','https://ofd.soliq.uz/check?t=EP108492&r=1001&c=1789382897411&s=86000&f=331886777731',1001,1,'2026-09-14T10:48:17.411Z');
INSERT INTO "payments" VALUES('pay_1789382897447','ord_3960e53a',2,42000,'cash',42000,0,'415710189646','https://ofd.soliq.uz/check?t=EP108492&r=1002&c=1789382897443&s=42000&f=415710189646',1002,1,'2026-09-14T10:48:17.443Z');
INSERT INTO "payments" VALUES('pay_1789382926505','ord_d07275a6',5,86000,'split',30000,56000,'691527935599','https://ofd.soliq.uz/check?t=EP108492&r=1003&c=1789382926493&s=86000&f=691527935599',1003,1,'2026-09-14T10:48:46.493Z');
INSERT INTO "payments" VALUES('pay_1789382926526','ord_08681244',2,42000,'cash',42000,0,'595256995281','https://ofd.soliq.uz/check?t=EP108492&r=1004&c=1789382926522&s=42000&f=595256995281',1004,1,'2026-09-14T10:48:46.522Z');
INSERT INTO "payments" VALUES('pay_1789383137033','ord_034694af',5,86000,'split',30000,56000,'728927108667','https://ofd.soliq.uz/check?t=EP108492&r=1005&c=1789383137008&s=86000&f=728927108667',1005,1,'2026-09-14T10:52:17.008Z');
INSERT INTO "payments" VALUES('pay_1789383137074','ord_3cd9a9f0',2,42000,'cash',42000,0,'383784548903','https://ofd.soliq.uz/check?t=EP108492&r=1006&c=1789383137068&s=42000&f=383784548903',1006,1,'2026-09-14T10:52:17.068Z');
INSERT INTO "payments" VALUES('pay_1789383501662','ord_7944a017',5,86000,'split',30000,56000,'414307158172','https://ofd.soliq.uz/check?t=EP108492&r=1007&c=1789383501648&s=86000&f=414307158172',1007,1,'2026-09-14T10:58:21.648Z');
INSERT INTO "payments" VALUES('pay_1789383501684','ord_57e6ecbc',2,75000,'cash',42000,0,'706285668028','https://ofd.soliq.uz/check?t=EP108492&r=1008&c=1789383501680&s=75000&f=706285668028',1008,1,'2026-09-14T10:58:21.680Z');
INSERT INTO "payments" VALUES('pay_1789384374098','ord_fadef762',5,86000,'split',30000,56000,'146181759015','https://ofd.soliq.uz/check?t=EP108492&r=1009&c=1789384374072&s=86000&f=146181759015',1009,1,'2026-09-14T11:12:54.072Z');
INSERT INTO "payments" VALUES('pay_1789384374141','ord_fe5db030',2,42000,'cash',42000,0,'352412379011','https://ofd.soliq.uz/check?t=EP108492&r=1010&c=1789384374135&s=42000&f=352412379011',1010,1,'2026-09-14T11:12:54.135Z');
INSERT INTO "payments" VALUES('pay_1789384557212','ord_e9f9c8cc',5,86000,'split',30000,56000,'524924207950','https://ofd.soliq.uz/check?t=EP108492&r=1011&c=1789384557197&s=86000&f=524924207950',1011,1,'2026-09-14T11:15:57.197Z');
INSERT INTO "payments" VALUES('pay_1789384557245','ord_76ab98fe',2,42000,'cash',42000,0,'083212608963','https://ofd.soliq.uz/check?t=EP108492&r=1012&c=1789384557241&s=42000&f=083212608963',1012,1,'2026-09-14T11:15:57.241Z');
CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT,
      mxik_code TEXT NOT NULL, -- Soliq 17 xonali MXIK (IKPU) kodi
      package_code TEXT DEFAULT '796', -- Qadoq kodi (dona / porsiya)
      vat_percent INTEGER DEFAULT 12, -- QQS stavkasi (12% yoki 0%)
      is_available INTEGER DEFAULT 1, remote_id TEXT, barcode TEXT, cost_price INTEGER DEFAULT 0, workshop TEXT DEFAULT 'Кухня', product_type TEXT DEFAULT 'Товар', stock_quantity REAL DEFAULT 100, unit TEXT DEFAULT 'dona', min_stock_alert REAL DEFAULT 5,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );
INSERT INTO "products" VALUES(1,2,'Chuchvara sho''rva',28000,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',98.0,'dona',5.0);
INSERT INTO "products" VALUES(2,1,'Sho''rva (Go''shtli)',35000,'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',98.0,'dona',5.0);
INSERT INTO "products" VALUES(3,1,'Chuchvara',38000,'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',97.0,'dona',5.0);
INSERT INTO "products" VALUES(4,1,'Lag''mon (Suyuq)',40000,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(5,2,'Choyxona Oshi (Palov)',42000,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80','10701002001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',96.0,'dona',5.0);
INSERT INTO "products" VALUES(6,2,'Qo''y go''shti shashlik',25000,'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(7,2,'Qiyma shashlik',22000,'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,0,'Кухня','Товар',96.0,'dona',5.0);
INSERT INTO "products" VALUES(8,2,'Tovuq shashlik',20000,'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(9,2,'Qozon kabob',55000,'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80','10701002001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(10,2,'Qovurma Lag''mon',40000,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80','10701002001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(11,3,'Ko''k choy (Limon bilan)',8000,'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80','10702001001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(12,3,'Qora choy (Zafaron)',7000,'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80','10702001001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(13,3,'Coca-Cola 1.5L',18000,'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80','10702002001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(14,3,'Yangi siqilgan apelsin sharbati',25000,'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80','10702002002000000','796',12,1,NULL,NULL,0,'Кухня','Товар',96.0,'dona',5.0);
INSERT INTO "products" VALUES(15,3,'Gazsiz suv 0.5L',4000,'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80','10702002003000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(16,4,'Achchiq-chuchuk',15000,'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80','10701003001000000','796',12,1,NULL,NULL,15000,'Кухня','Товар',125.0,'dona',5.0);
INSERT INTO "products" VALUES(17,4,'Bahor salati',18000,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80','10701003001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(18,4,'Smak salati',24000,'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80','10701003001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(19,4,'Sezar salati',36000,'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80','10701003001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(20,4,'Tandir non',5000,'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80','10701004001000000','796',12,1,NULL,NULL,0,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(21,1,'CHEESEBURGER',28000,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,18000,'Кухня','Товар',96.0,'dona',5.0);
INSERT INTO "products" VALUES(22,1,'CHICKENBURGER',26000,'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,16000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(23,1,'HAMBURGER',25000,'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,15000,'Кухня','Товар',98.0,'dona',5.0);
INSERT INTO "products" VALUES(24,1,'LAVASH',32000,'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,20000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(25,1,'MINI LAVASH',26000,'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,16000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(26,1,'TANDIR LAVASH KATTA',36000,'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,23000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(27,1,'TANDIR LAVASH KICHIK',30000,'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,19000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(28,1,'KARTOSHKA FREE',16000,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,8000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(29,1,'TOVUQ OYOQLARI',30000,'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,19000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(30,1,'TOVUQ QANOTLARI',28000,'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,17000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(31,4,'QIYMA SHASHLIK',22000,'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,14000,'Кабаб','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(32,4,'KUSKAVOY SHASHLIK',25000,'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80','10701002002000000','796',12,1,NULL,NULL,16000,'Кабаб','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(33,8,'HOTDOG KICHIK',15000,'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,9000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(34,8,'HOTDOG KATTA',20000,'https://images.unsplash.com/photo-1627054234033-030b76e279a1?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,12000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(35,8,'HOTDOG (GO''SHTLI)',24000,'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,15000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(36,8,'HOTDOG (QAZILI)',28000,'https://images.unsplash.com/photo-1627054234033-030b76e279a1?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,18000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(37,8,'HOTDOG (SALATLI)',18000,'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80','10701001001000000','796',12,1,NULL,NULL,11000,'Кухня','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(38,7,'LIPTON 0.5L',10000,'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80','10702002001000000','796',12,1,NULL,NULL,6500,'Бар','Товар',100.0,'dona',5.0);
INSERT INTO "products" VALUES(39,7,'FANTA 1.5L',16000,'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=600&auto=format&fit=crop&q=80','10702002001000000','796',12,1,NULL,NULL,11000,'Бар','Товар',100.0,'dona',5.0);
CREATE TABLE stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'in' (prihod/kirim), 'out_sale' (savdo/chiqim), 'adjustment' (inventarizatsiya/tahrir), 'waste' (spisanie/brak)
      quantity REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      unit_price INTEGER DEFAULT 0,
      total_price INTEGER DEFAULT 0,
      supplier TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );
INSERT INTO "stock_movements" VALUES(1,16,'in',25.0,100.0,125.0,15000,375000,'Bozor','Test Prihod','Admin','2026-09-14 11:12:49');
INSERT INTO "stock_movements" VALUES(2,7,'out_sale',2.0,100.0,98.0,22000,44000,'','Savdo: 5-stol (Buyurtma ord_fadef762)','Ofitsiant Sardor','2026-09-14 11:12:53');
INSERT INTO "stock_movements" VALUES(3,5,'out_sale',1.0,100.0,99.0,42000,42000,'','Savdo: 5-stol (Buyurtma ord_fadef762)','Ofitsiant Sardor','2026-09-14 11:12:53');
INSERT INTO "stock_movements" VALUES(4,5,'out_sale',1.0,99.0,98.0,42000,42000,'','Savdo: 2-stol (Buyurtma ord_fe5db030)','Ofitsiant Sardor','2026-09-14 11:12:54');
INSERT INTO "stock_movements" VALUES(5,7,'out_sale',2.0,98.0,96.0,22000,44000,'','Savdo: 5-stol (Buyurtma ord_e9f9c8cc)','Ofitsiant Sardor','2026-09-14 11:15:57');
INSERT INTO "stock_movements" VALUES(6,5,'out_sale',1.0,98.0,97.0,42000,42000,'','Savdo: 5-stol (Buyurtma ord_e9f9c8cc)','Ofitsiant Sardor','2026-09-14 11:15:57');
INSERT INTO "stock_movements" VALUES(7,5,'out_sale',1.0,97.0,96.0,42000,42000,'','Savdo: 2-stol (Buyurtma ord_76ab98fe)','Ofitsiant Sardor','2026-09-14 11:15:57');
INSERT INTO "stock_movements" VALUES(8,1,'out_sale',1.0,100.0,99.0,32000,32000,'','Savdo: 2-stol (Buyurtma ord_a263894e)','Akbar','2026-09-14 12:31:22');
INSERT INTO "stock_movements" VALUES(9,23,'out_sale',2.0,100.0,98.0,25000,50000,'','Savdo: 3-stol (Buyurtma ord_92db73a5)','Akbar','2026-09-14 12:42:37');
INSERT INTO "stock_movements" VALUES(10,21,'out_sale',2.0,100.0,98.0,28000,56000,'','Savdo: 3-stol (Buyurtma ord_92db73a5)','Akbar','2026-09-14 12:42:37');
INSERT INTO "stock_movements" VALUES(11,1,'out_sale',2.0,99.0,97.0,32000,64000,'','Savdo: 3-stol (Buyurtma ord_92db73a5)','Akbar','2026-09-14 12:50:47');
INSERT INTO "stock_movements" VALUES(12,3,'out_sale',1.0,100.0,99.0,38000,38000,'','Savdo: 3-stol (Buyurtma ord_92db73a5)','Akbar','2026-09-14 12:50:47');
INSERT INTO "stock_movements" VALUES(13,2,'out_sale',1.0,100.0,99.0,35000,35000,'','Savdo: STOL - 3-stol (Buyurtma ord_92db73a5)','Akbar','2026-09-14 12:54:00');
INSERT INTO "stock_movements" VALUES(14,21,'out_sale',2.0,98.0,96.0,28000,56000,'','Savdo: STOL - 1-stol (Buyurtma ord_671a8e3e)','Akbar','2026-09-14 13:00:19');
INSERT INTO "stock_movements" VALUES(15,22,'out_sale',1.0,100.0,99.0,26000,26000,'','Savdo: STOL - 1-stol (Buyurtma ord_671a8e3e)','Sardor','2026-09-14 13:00:19');
INSERT INTO "stock_movements" VALUES(16,22,'in',1.0,99.0,100.0,26000,26000,'','Qaytarildi: STOL - 1 (Buyurtma ord_671a8e3e) - Mijoz ichmadi, qaytarildi','Kafee','2026-09-14 13:00:19');
INSERT INTO "stock_movements" VALUES(17,3,'out_sale',2.0,99.0,97.0,38000,76000,'','Savdo: STOL - 1-stol (Buyurtma ord_671a8e3e)','Akbar','2026-09-14 13:07:18');
INSERT INTO "stock_movements" VALUES(18,3,'in',1.0,97.0,98.0,38000,38000,'','Tahrirlandi (Kamaytirildi): STOL - 1 (Buyurtma ord_671a8e3e)','Akbar','2026-09-14 13:07:18');
INSERT INTO "stock_movements" VALUES(19,3,'out_sale',2.0,98.0,96.0,20000,40000,'','Tahrirlandi (Oshirildi): STOL - 3 (Buyurtma ord_92db73a5)','Akbar','2026-09-14 13:08:53');
INSERT INTO "stock_movements" VALUES(20,3,'in',1.0,96.0,97.0,38000,38000,'','Qaytarildi: STOL - 1 (Buyurtma ord_671a8e3e) - Mijoz rad etdi','Kafee','2026-09-14 13:08:58');
INSERT INTO "stock_movements" VALUES(21,14,'out_sale',4.0,100.0,96.0,25000,100000,'','Tahrirlandi (Oshirildi): STOL - 1 (Buyurtma ord_671a8e3e)','Kassa','2026-09-14 13:14:33');
INSERT INTO "stock_movements" VALUES(22,2,'out_sale',1.0,99.0,98.0,50000,50000,'','Tahrirlandi (Oshirildi): STOL - 3 (Buyurtma ord_92db73a5)','Akbar','2026-09-14 13:24:02');
INSERT INTO "stock_movements" VALUES(23,1,'in',1.0,97.0,98.0,40000,40000,'','Tahrirlandi (Kamaytirildi): STOL - 3 (Buyurtma ord_92db73a5)','Akbar','2026-09-14 13:31:11');
CREATE TABLE tables (
      id INTEGER PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'free', -- 'free' (yashil), 'busy' (qizil), 'bill_requested' (sariq)
      current_order_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , hall TEXT DEFAULT 'Основной');
INSERT INTO "tables" VALUES(1,1,'STOL - 1',4,'busy','ord_671a8e3e','2026-09-14 13:07:18','Asosiy Zal');
INSERT INTO "tables" VALUES(2,2,'STOL - 2',4,'busy','ord_a263894e','2026-09-14 12:31:22','Asosiy Zal');
INSERT INTO "tables" VALUES(3,3,'STOL - 3',4,'busy','ord_92db73a5','2026-09-14 12:54:00','Asosiy Zal');
INSERT INTO "tables" VALUES(4,4,'STOL - 4',4,'free',NULL,'2026-09-14 10:47:59','Asosiy Zal');
INSERT INTO "tables" VALUES(5,5,'STOL - 5',4,'free',NULL,'2026-09-14 11:15:57','Asosiy Zal');
INSERT INTO "tables" VALUES(6,6,'STOL - 6',4,'free',NULL,'2026-09-14 10:47:59','Zal 1');
INSERT INTO "tables" VALUES(7,7,'STOL - 7',4,'free',NULL,'2026-09-14 10:47:59','Zal 1');
INSERT INTO "tables" VALUES(8,8,'STOL - 8',4,'free',NULL,'2026-09-14 10:47:59','Zal 1');
INSERT INTO "tables" VALUES(9,9,'STOL - 9',4,'free',NULL,'2026-09-14 10:47:59','Zal 1');
INSERT INTO "tables" VALUES(10,10,'STOL - 10',4,'free',NULL,'2026-09-14 10:47:59','Zal 1');
INSERT INTO "tables" VALUES(11,11,'STOL - 11',4,'free',NULL,'2026-09-14 10:47:59','Zal 2');
INSERT INTO "tables" VALUES(12,12,'STOL - 12',4,'free',NULL,'2026-09-14 10:47:59','Zal 2');
INSERT INTO "tables" VALUES(13,13,'STOL - 13',4,'free',NULL,'2026-09-14 10:47:59','Zal 2');
INSERT INTO "tables" VALUES(14,14,'STOL - 14',4,'free',NULL,'2026-09-14 10:47:59','Zal 2');
INSERT INTO "tables" VALUES(15,15,'STOL - 15',4,'free',NULL,'2026-09-14 10:47:59','Zal 2');
INSERT INTO "tables" VALUES(16,16,'STOL - 16',4,'free',NULL,'2026-09-14 10:47:59','2-Qavat Zal');
INSERT INTO "tables" VALUES(17,17,'STOL - 17',4,'free',NULL,'2026-09-14 10:47:59','2-Qavat Zal');
INSERT INTO "tables" VALUES(18,18,'STOL - 18',4,'free',NULL,'2026-09-14 10:47:59','2-Qavat Zal');
INSERT INTO "tables" VALUES(19,19,'STOL - 19',4,'free',NULL,'2026-09-14 10:47:59','2-Qavat Zal');
INSERT INTO "tables" VALUES(20,20,'STOL - 20',4,'free',NULL,'2026-09-14 10:47:59','2-Qavat Zal');
CREATE TABLE telegram_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      bot_token TEXT DEFAULT '',
      bot_username TEXT DEFAULT '@Hisobchiuz101bot',
      is_enabled INTEGER DEFAULT 1,
      poll_interval INTEGER DEFAULT 30,
      last_update_id INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "telegram_settings" VALUES(1,'','@Hisobchiuz101bot',1,30,0,'2026-09-14 10:47:59','2026-09-14 10:47:59');
CREATE TABLE telegram_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT UNIQUE,
      user_id TEXT,
      username TEXT DEFAULT '',
      first_name TEXT DEFAULT '',
      reg_code TEXT DEFAULT '',
      sub_number INTEGER DEFAULT 1268,
      sub_expires TEXT DEFAULT '05.05.2027',
      is_active INTEGER DEFAULT 1,
      notify_bot_status INTEGER DEFAULT 1,
      notify_db_backup INTEGER DEFAULT 1,
      notify_cashier_report INTEGER DEFAULT 1,
      notify_status INTEGER DEFAULT 1,
      notify_orders INTEGER DEFAULT 1,
      notify_cancellations INTEGER DEFAULT 1,
      notify_bill INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO "telegram_subscribers" VALUES(1,'123456789','123456789','admin','Системный Администратор','6901',1268,'05.05.2027',1,1,1,1,1,1,1,1,'2026-09-14 10:47:59');
CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'cashier', 'waiter', 'admin'
      pin TEXT NOT NULL,
      is_shift_open INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , status TEXT DEFAULT 'active', user_code TEXT, tenant_id TEXT, phone TEXT DEFAULT '', login TEXT DEFAULT '', password TEXT DEFAULT '');
INSERT INTO "users" VALUES(1,'Kafee','admin','3333',1,'2026-09-14 10:47:59','active','b58d74f3-3541-4341-acf8-ff00c13964c7','90e04abf-246d-4683-91eb-1ac34d7b2ee7','+998881111111','kafee@gmail.com','3333');
INSERT INTO "users" VALUES(10,'Akbar','waiter','3333',1,'2026-09-14 12:04:04','active','0ea11162-a4d9-4f94-a38e-192fdf88d89b','90e04abf-246d-4683-91eb-1ac34d7b2ee7','+998880000000','akbar@getpos.uz','333333');
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('users',11);
INSERT INTO "sqlite_sequence" VALUES('categories',9);
INSERT INTO "sqlite_sequence" VALUES('products',39);
INSERT INTO "sqlite_sequence" VALUES('telegram_subscribers',1);
INSERT INTO "sqlite_sequence" VALUES('order_items',33);
INSERT INTO "sqlite_sequence" VALUES('kitchen_tickets',21);
INSERT INTO "sqlite_sequence" VALUES('fiscal_queue',6);
INSERT INTO "sqlite_sequence" VALUES('stock_movements',23);
INSERT INTO "sqlite_sequence" VALUES('halls',6);
COMMIT;
