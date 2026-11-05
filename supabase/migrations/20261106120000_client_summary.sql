-- Coach client page: the client's answers and progress (no documents, dates, journal or contacts).
alter table client_shared add column if not exists summary jsonb;
