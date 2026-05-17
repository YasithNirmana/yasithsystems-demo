-- ============================================================
--  YasithSystems Demo — Database Schema
-- ============================================================

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_number   TEXT NOT NULL,
  floor         INT  DEFAULT 1,
  bedrooms      INT  DEFAULT 1,
  monthly_rent  DECIMAL(10,2) NOT NULL,
  status        TEXT DEFAULT 'vacant'
                  CHECK (status IN ('occupied','vacant','maintenance')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  phone            TEXT,
  whatsapp_number  TEXT,
  unit_id          UUID REFERENCES units(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Leases
CREATE TABLE IF NOT EXISTS leases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES units(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  monthly_rent  DECIMAL(10,2) NOT NULL,
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active','expiring_soon','expired','terminated')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lease_id     UUID REFERENCES leases(id) ON DELETE CASCADE,
  amount       DECIMAL(10,2) NOT NULL,
  due_date     DATE NOT NULL,
  paid_date    DATE,
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('paid','pending','overdue')),
  month_label  TEXT NOT NULL,   -- e.g. "June 2025"
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id           UUID REFERENCES units(id) ON DELETE CASCADE,
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT DEFAULT 'other'
                      CHECK (category IN ('plumbing','electrical','hvac','structural','appliance','other')),
  priority          TEXT DEFAULT 'medium'
                      CHECK (priority IN ('low','medium','high','urgent')),
  status            TEXT DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to       TEXT,
  ai_classified     BOOLEAN DEFAULT FALSE,
  technician_notes  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_updated_at ON maintenance_requests;
CREATE TRIGGER maintenance_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
                CHECK (type IN ('rent_reminder','lease_expiry','maintenance_update','custom')),
  message     TEXT NOT NULL,
  channel     TEXT DEFAULT 'whatsapp',
  status      TEXT DEFAULT 'sent'
                CHECK (status IN ('sent','failed','pending')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status   ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_unit   ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant  ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status  ON leases(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status   ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notification_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
