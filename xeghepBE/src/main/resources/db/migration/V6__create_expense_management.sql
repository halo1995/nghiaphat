CREATE TABLE IF NOT EXISTS company_wallets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(16) NOT NULL DEFAULT 'VND',
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES company_wallets(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    created_by BIGINT,
    balance_after NUMERIC(18, 2)
);

CREATE INDEX IF NOT EXISTS idx_company_transactions_wallet
    ON company_transactions (wallet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS expense_vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    payee_name VARCHAR(255) NOT NULL,
    payee_account VARCHAR(255),
    description TEXT,
    note TEXT,
    status VARCHAR(20) NOT NULL,
    wallet_id BIGINT NOT NULL REFERENCES company_wallets(id),
    driver_expense_advance_id BIGINT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    submitted_by BIGINT,
    submitted_at TIMESTAMP WITHOUT TIME ZONE,
    approved_by BIGINT,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    rejected_by BIGINT,
    rejected_at TIMESTAMP WITHOUT TIME ZONE,
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_expense_vouchers_status
    ON expense_vouchers (status);

CREATE INDEX IF NOT EXISTS idx_expense_vouchers_category
    ON expense_vouchers (category);

CREATE INDEX IF NOT EXISTS idx_expense_vouchers_wallet
    ON expense_vouchers (wallet_id);

CREATE INDEX IF NOT EXISTS idx_expense_vouchers_created_at
    ON expense_vouchers (created_at DESC);

CREATE TABLE IF NOT EXISTS expense_voucher_history (
    id BIGSERIAL PRIMARY KEY,
    voucher_id BIGINT NOT NULL REFERENCES expense_vouchers(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    note TEXT,
    action_by BIGINT,
    action_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_voucher_history_voucher
    ON expense_voucher_history (voucher_id, action_at DESC);

INSERT INTO company_wallets (name, balance, currency, description)
SELECT 'Quy chính', 0, 'VND', 'Ví tiền mặt công ty'
WHERE NOT EXISTS (SELECT 1 FROM company_wallets WHERE name = 'Quy chính');
