/**
 * Centralized Category and Subcategory Catalog for Mamta Hospital Task Manager
 */

export const HOSPITAL_CATEGORIES = [
  {
    id: 'patient-care',
    name: 'Patient Care & Clinical',
    iconName: 'HeartPulse',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    cardGradient: 'from-blue-600 to-cyan-600',
    accentColor: 'text-blue-600',
    lightBg: 'bg-blue-50/70',
    borderColor: 'border-blue-200',
    description: 'Clinical rounds, vital signs, medication dispensing, and direct nursing care.',
    subcategories: [
      'Ward Rounds & Doctor Notes',
      'Medication Dispensation & Vitals',
      'Nursing Handover & Bedside Care',
      'Patient Admission & Discharge',
      'Lab Sample Collection & Tracking',
      'Doctor Consultation Follow-up',
    ],
  },
  {
    id: 'billing-collections',
    name: 'Billing & Collections',
    iconName: 'Receipt',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardGradient: 'from-emerald-600 to-teal-600',
    accentColor: 'text-emerald-600',
    lightBg: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
    description: 'Cash desk reconciliation, insurance/TPA claims, and IPD/OPD discharge billing.',
    subcategories: [
      'OPD Cash Counter Closing',
      'IPD Billing & Interim Clearance',
      'Insurance & TPA Claims Approval',
      'Discharge Billing Clearance',
      'Daily Revenue & Cash Reconciliation',
      'Refunds & Adjustments Clearance',
    ],
  },
  {
    id: 'general-operations',
    name: 'General Operations',
    iconName: 'Briefcase',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardGradient: 'from-indigo-600 to-blue-600',
    accentColor: 'text-indigo-600',
    lightBg: 'bg-indigo-50/70',
    borderColor: 'border-indigo-200',
    description: 'Daily administrative routine, briefing, roster coordination, and transport.',
    subcategories: [
      'Morning Staff Briefing & Handoff',
      'Staff Attendance & Duty Rostering',
      'Ambulance & Transport Readiness',
      'Security & Visitor Desk Monitoring',
      'Reception & Patient Helpdesk',
      'General Administrative Coordination',
    ],
  },
  {
    id: 'equipment-inspection',
    name: 'Equipment Inspection',
    iconName: 'Activity',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    cardGradient: 'from-amber-500 to-orange-600',
    accentColor: 'text-amber-600',
    lightBg: 'bg-amber-50/70',
    borderColor: 'border-amber-200',
    description: 'Biomedical devices, oxygen supply lines, ventilators, and power systems.',
    subcategories: [
      'Ventilator & ICU Monitor Calibration',
      'Oxygen Plant & Pipeline Pressure Check',
      'Crash Cart & Defibrillator Inspection',
      'Autoclave & Sterilization Monitoring',
      'Generator, UPS & Backup Power Test',
      'Suction Apparatus & Nebulizer Checks',
    ],
  },
  {
    id: 'regulatory-audit',
    name: 'Regulatory & Audit',
    iconName: 'ShieldCheck',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    cardGradient: 'from-rose-600 to-pink-600',
    accentColor: 'text-rose-600',
    lightBg: 'bg-rose-50/70',
    borderColor: 'border-rose-200',
    description: 'NABH standards, fire safety drills, statutory compliance, and infection logs.',
    subcategories: [
      'NABH / Quality Compliance Checklist',
      'Fire Safety & Emergency Exit Audit',
      'Infection Control Protocol Audit',
      'Statutory Licenses Expiry Tracking',
      'Medical Records (MRD) Documentation',
      'Patient Safety Incident Review',
    ],
  },
  {
    id: 'hygiene-sanitation',
    name: 'Hygiene & Sanitation',
    iconName: 'Sparkles',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    cardGradient: 'from-teal-500 to-emerald-600',
    accentColor: 'text-teal-600',
    lightBg: 'bg-teal-50/70',
    borderColor: 'border-teal-200',
    description: 'Sterilization, bio-waste segregation, linen disinfection, and room cleaning.',
    subcategories: [
      'OT & ICU Terminal Deep Cleaning',
      'Biomedical Waste Segregation Audit',
      'Linen Exchange & Laundry Protocol',
      'Washroom & Public Area Disinfection',
      'Pest Control & Sanitization Fogging',
      'Water Dispenser & Filter Sanitation',
    ],
  },
  {
    id: 'pharmacy-inventory',
    name: 'Pharmacy & Inventory',
    iconName: 'Pill',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    cardGradient: 'from-purple-600 to-indigo-600',
    accentColor: 'text-purple-600',
    lightBg: 'bg-purple-50/70',
    borderColor: 'border-purple-200',
    description: 'Cold chain temperature logs, stock audits, high-alert drug counts, and refills.',
    subcategories: [
      'Emergency & Critical Drug Stock Check',
      'Medicine Expiry & Near-Expiry Audit',
      'Cold Chain Vaccine Refrigerator Temp Log',
      'Narcotics & High-Alert Drug Verification',
      'Surgical Disposables & Consumables Restock',
      'Pharmacy Counter Stock Reconciliation',
    ],
  },
  {
    id: 'maintenance-facilities',
    name: 'Maintenance & Facilities',
    iconName: 'Wrench',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    cardGradient: 'from-slate-700 to-slate-900',
    accentColor: 'text-slate-700',
    lightBg: 'bg-slate-50',
    borderColor: 'border-slate-200',
    description: 'HVAC systems, electrical distribution, elevators, plumbing, and CCTV.',
    subcategories: [
      'HVAC & Air Conditioning Filter Cleaning',
      'Plumbing, RO Plant & Water Tank Check',
      'Electrical Panels & Lighting Maintenance',
      'Elevator & Lift Safety Inspection',
      'CCTV Cameras & Access Control Inspection',
      'General Hospital Infrastructure Repairs',
    ],
  },
  {
    id: 'documentation-reporting',
    name: 'Documentation & Reporting',
    iconName: 'FileText',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    cardGradient: 'from-cyan-600 to-blue-700',
    accentColor: 'text-cyan-600',
    lightBg: 'bg-cyan-50/70',
    borderColor: 'border-cyan-200',
    description: 'Daily occupancy census, shift handover registers, and government submissions.',
    subcategories: [
      'Daily Bed Census & Occupancy Report',
      'Clinical Incident & Sentinel Event Log',
      'Shift Supervisor Handover Report',
      'Departmental Performance & KPI Log',
      'Birth / Death Registry Compliance',
      'Monthly Hospital Quality Indicator Report',
    ],
  },
];

/**
 * Get all category names
 */
export const getAllCategoryNames = () => {
  return HOSPITAL_CATEGORIES.map((c) => c.name);
};

/**
 * Get metadata for a category name
 */
export const getCategoryMeta = (categoryName) => {
  const found = HOSPITAL_CATEGORIES.find(
    (c) => c.name.toLowerCase() === (categoryName || '').toLowerCase()
  );
  if (found) return found;

  // Fallback for custom categories
  return {
    id: 'custom',
    name: categoryName || 'General',
    iconName: 'Tag',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardGradient: 'from-indigo-500 to-blue-600',
    accentColor: 'text-indigo-600',
    lightBg: 'bg-indigo-50/70',
    borderColor: 'border-indigo-200',
    description: 'Custom specialized operational category.',
    subcategories: ['General Tasks', 'Urgent Action', 'Routine Review'],
  };
};

/**
 * Get subcategories for a given category name
 */
export const getSubcategoriesForCategory = (categoryName) => {
  const meta = getCategoryMeta(categoryName);
  return meta.subcategories || ['General'];
};
