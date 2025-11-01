-- Seed data for mentor registry (requires mentors table from Slice 2 migration).
insert into public.mentors (id, name, description, theme) values
  ('general', 'General Mentor', 'Default conversational agent', '{"color":"slate","accent":"gray"}'),
  ('bible', 'Bible Mentor', 'Scripture study and theology', '{"color":"amber","accent":"yellow"}'),
  ('chess', 'Chess Mentor', 'Analyzes positions with Stockfish', '{"color":"indigo","accent":"blue"}'),
  ('stock', 'Stock Mentor', 'Financial indicators and trends', '{"color":"emerald","accent":"green"}')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  theme = excluded.theme;
