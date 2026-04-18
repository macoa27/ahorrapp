-- =============================================================
-- AHORRAPP — Migración 002: Categorías del sistema
-- Estas son las categorías por defecto para todos los usuarios.
-- user_id = NULL significa que son del sistema.
-- =============================================================

insert into public.categories (id, user_id, name, icon, color, is_system, sort_order) values
  ('00000000-0000-0000-0000-000000000001', null, 'Supermercado',     '🛒', '#22c55e', true,  1),
  ('00000000-0000-0000-0000-000000000002', null, 'Restaurantes',     '🍔', '#f97316', true,  2),
  ('00000000-0000-0000-0000-000000000003', null, 'Transporte',       '🚗', '#3b82f6', true,  3),
  ('00000000-0000-0000-0000-000000000004', null, 'Salud',            '💊', '#ef4444', true,  4),
  ('00000000-0000-0000-0000-000000000005', null, 'Educación',        '📚', '#8b5cf6', true,  5),
  ('00000000-0000-0000-0000-000000000006', null, 'Entretenimiento',  '🎬', '#ec4899', true,  6),
  ('00000000-0000-0000-0000-000000000007', null, 'Servicios',        '💡', '#f59e0b', true,  7),
  ('00000000-0000-0000-0000-000000000008', null, 'Ropa',             '👕', '#06b6d4', true,  8),
  ('00000000-0000-0000-0000-000000000009', null, 'Viajes',           '✈️', '#84cc16', true,  9),
  ('00000000-0000-0000-0000-000000000010', null, 'Hogar',            '🏠', '#a78bfa', true, 10),
  ('00000000-0000-0000-0000-000000000011', null, 'Suscripciones',    '📱', '#fb923c', true, 11),
  ('00000000-0000-0000-0000-000000000012', null, 'Otros',            '📦', '#94a3b8', true, 99)
on conflict do nothing;

insert into public.schema_migrations (version, name) values
  ('20250101000002', 'seed_system_categories')
on conflict do nothing;
