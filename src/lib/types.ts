export type UnitStatus = "occupied" | "vacant" | "maintenance";
export type MaintenanceCategory = "plumbing" | "electrical" | "hvac" | "structural" | "appliance" | "other";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "closed";
export type PaymentStatus = "paid" | "pending" | "overdue";
export type LeaseStatus = "active" | "expiring_soon" | "expired" | "terminated";
export type NotificationType = "rent_reminder" | "lease_expiry" | "maintenance_update" | "custom";

export interface Property {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  floor: number;
  bedrooms: number;
  monthly_rent: number;
  status: UnitStatus;
  created_at: string;
  properties?: Property;
}

export interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  unit_id: string | null;
  created_at: string;
  units?: Unit & { properties?: Property };
}

export interface Lease {
  id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: LeaseStatus;
  created_at: string;
  tenants?: Tenant;
  units?: Unit & { properties?: Property };
}

export interface Payment {
  id: string;
  tenant_id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  month_label: string;
  created_at: string;
  tenants?: Tenant & { units?: Unit & { properties?: Property } };
}

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  ai_classified: boolean;
  technician_notes: string | null;
  created_at: string;
  updated_at: string;
  units?: Unit & { properties?: Property };
  tenants?: Tenant;
}

export interface NotificationLog {
  id: string;
  tenant_id: string;
  type: NotificationType;
  message: string;
  channel: string;
  status: string;
  created_at: string;
  tenants?: Tenant;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface DashboardMetrics {
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  maintenanceRequests: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  rentCollection: {
    collected: number;
    total: number;
    percentage: number;
  };
  expiringLeases: {
    next30Days: number;
    next60Days: number;
    leases: Lease[];
  };
  tenantSatisfaction: number;
  pendingPayments: {
    count: number;
    amount: number;
    payments: Payment[];
  };
}

export interface AIClassificationResult {
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  assignTo: string;
  estimatedResolution: string;
  technicianNotes: string;
}
