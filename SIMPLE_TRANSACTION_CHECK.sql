-- SIMPLE CHECK - Do transactions exist?

-- Just count them
SELECT COUNT(*) as total_transactions FROM transactions;

-- Show all transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;