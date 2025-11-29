INSERT INTO company_wallets (name, balance, currency, description, created_at, updated_at)
SELECT 'Ví mặc định', 0.0, 'VND', 'Ví công ty mặc định', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM company_wallets);
