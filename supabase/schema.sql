-- ============================================================
-- Velora · schéma initial (Phase 0)
-- PostgreSQL / Supabase
-- ============================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Marchés
--
-- Un marché est une ligne, pas un déploiement. Ajouter un pays = insérer ici.
--
-- NB : aucun champ pixel/token. Meta, TikTok et Snapchat utilisent des
-- identifiants GLOBAUX, partagés par tous les marchés — ils vivent dans la
-- configuration d'environnement de l'API, pas ici.
-- ─────────────────────────────────────────────────────────────
create table market_config (
  code              text primary key check (code ~ '^[a-z]{2}$'),
  name              text        not null,
  currency          text        not null check (currency in ('XOF', 'XAF')),
  phone_prefix      text        not null,
  whatsapp          text,
  delivery_estimate text        not null,
  free_shipping_threshold integer check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  enabled           boolean     not null default false,

  -- Toggles §3 du plan — éditables depuis le dashboard, sans redéploiement.
  submission_event  text        not null default 'Lead' check (submission_event in ('Lead', 'Purchase')),
  send_purchase_on_delivery boolean not null default false,
  require_otp       boolean     not null default false,
  vpn_action        text        not null default 'flag' check (vpn_action in ('flag', 'block')),
  max_orders_per_ip_24h integer not null default 50,
  auto_blacklist_score  integer not null default 85,

  -- Le blocage est désactivé par défaut. Voir packages/fraud : passer à
  -- 'active' sans avoir observé la distribution réelle des scores revient à
  -- bannir de vrais clients (CGNAT).
  fraud_enforcement text        not null default 'shadow' check (fraud_enforcement in ('shadow', 'active')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Catalogue
-- ─────────────────────────────────────────────────────────────
create table products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text        not null,
  category    text,
  description text,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid        not null references products(id) on delete cascade,
  sku         text unique not null,
  color       text,
  size        text,
  -- Le franc CFA n'a pas de sous-unité : les montants sont des entiers.
  -- Un numeric ici inviterait des centimes qui n'existent pas.
  price       integer     not null check (price >= 0),
  price_before integer    check (price_before is null or price_before >= price),
  stock       integer     not null default 0 check (stock >= 0),
  images      jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index on variants (product_id);

-- ─────────────────────────────────────────────────────────────
-- Commandes
-- ─────────────────────────────────────────────────────────────
create type order_status as enum (
  'pending',      -- soumise, pas encore appelée
  'confirmed',    -- confirmée par téléphone
  'shipped',
  'delivered',    -- livrée ET payée
  'returned',     -- refus à la porte
  'cancelled',
  'fraud'
);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  reference     text unique not null,
  market        text        not null references market_config(code),
  status        order_status not null default 'pending',

  customer_name    text     not null,
  customer_phone   text     not null,  -- E.164 normalisé
  customer_city    text     not null,
  customer_address text     not null,

  total         integer     not null check (total >= 0),
  currency      text        not null check (currency in ('XOF', 'XAF')),

  -- Snapshot du panier figé à la soumission : l'agent de confirmation doit
  -- voir exactement ce que le client a vu, même si le prix a changé depuis.
  cart_snapshot jsonb       not null,

  -- Identifiants publicitaires capturés dès la première visite, persistés ici
  -- pour permettre un envoi CAPI différé (Purchase à la livraison, J+3).
  fbp text, fbc text, ttp text, ttclid text,
  ip  inet, user_agent text,

  risk_score    integer     check (risk_score between 0 and 100),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on orders (market, status);
create index on orders (customer_phone);
create index on orders (created_at desc);

create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid    not null references orders(id) on delete cascade,
  variant_id uuid    references variants(id) on delete set null,
  quantity   integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0)
);

create index on order_items (order_id);

-- ─────────────────────────────────────────────────────────────
-- Event log tracking
-- ─────────────────────────────────────────────────────────────
create type tracking_status as enum ('pending', 'sent', 'failed');

create table tracking_events (
  -- L'unicité de event_id EST la garantie d'idempotence : un retry de la
  -- queue ne peut pas produire un doublon côté Meta/TikTok.
  event_id    text primary key,
  order_id    uuid references orders(id) on delete set null,
  market      text not null references market_config(code),
  event_name  text not null,
  platform    text not null check (platform in ('meta', 'tiktok', 'snapchat')),
  status      tracking_status not null default 'pending',
  payload     jsonb not null,
  error       text,
  attempts    integer not null default 0,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index on tracking_events (status, created_at);
create index on tracking_events (order_id);

-- ─────────────────────────────────────────────────────────────
-- Anti-fraude
-- ─────────────────────────────────────────────────────────────
create table fraud_assessments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete cascade,
  score       integer not null check (score between 0 and 100),
  signals     jsonb   not null default '[]'::jsonb,
  decision    text    not null check (decision in ('accept', 'review', 'block', 'blacklist')),
  -- Ce qui a été réellement appliqué. En shadow mode, `applied` vaut 'accept'
  -- même quand `decision` vaut 'block' : c'est cet écart qu'on mesure avant
  -- d'activer l'enforcement.
  applied     text    not null check (applied in ('accept', 'review', 'block', 'blacklist')),
  enforcement text    not null check (enforcement in ('shadow', 'active')),
  created_at  timestamptz not null default now()
);

create index on fraud_assessments (order_id);
create index on fraud_assessments (score desc);

create table blacklist (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('phone', 'ip', 'cidr', 'device', 'name', 'address')),
  value       text not null,
  reason      text,
  market      text references market_config(code),
  expires_at  timestamptz,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (kind, value)
);

create index on blacklist (kind, value);

-- ─────────────────────────────────────────────────────────────
-- Journal d'audit
--
-- Le dashboard permet de bannir un client en un clic. Toute action
-- destructrice doit être attribuable à quelqu'un, après coup.
-- ─────────────────────────────────────────────────────────────
create table admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index on admin_audit_log (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
--
-- Aucune de ces tables n'est exposée au client anonyme : le storefront passe
-- par l'API (service role). On active RLS sans policy permissive — tout est
-- donc refusé par défaut, ce qui est l'intention.
-- ─────────────────────────────────────────────────────────────
alter table market_config      enable row level security;
alter table products           enable row level security;
alter table variants           enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table tracking_events    enable row level security;
alter table fraud_assessments  enable row level security;
alter table blacklist          enable row level security;
alter table admin_audit_log    enable row level security;

-- ─────────────────────────────────────────────────────────────
-- Seed
-- ─────────────────────────────────────────────────────────────
insert into market_config (code, name, currency, phone_prefix, delivery_estimate, free_shipping_threshold, enabled)
values
  ('bj', 'Bénin',          'XOF', '229', '24–48 h', 50000, true),
  ('ci', 'Côte d''Ivoire', 'XOF', '225', '48–72 h', 50000, false),
  ('ga', 'Gabon',          'XAF', '241', '3–5 j',   null,  false);

insert into products (slug, name, category)
values ('montre-chronographe-acier', 'Montre chronographe acier', 'Montres · acier');

insert into variants (product_id, sku, color, size, price, price_before, stock)
select p.id, v.sku, v.color, v.size, v.price, v.price_before, v.stock
from products p,
  (values
    ('VLR-CHR-NOIR-40', 'Noir', '40 mm', 25000, 35000, 40),
    ('VLR-CHR-NOIR-42', 'Noir', '42 mm', 25000, 35000, 35),
    ('VLR-CHR-OR-40',   'Or',   '40 mm', 25000, 35000, 20),
    ('VLR-CHR-OR-42',   'Or',   '42 mm', 25000, 35000, 18)
  ) as v(sku, color, size, price, price_before, stock)
where p.slug = 'montre-chronographe-acier';
