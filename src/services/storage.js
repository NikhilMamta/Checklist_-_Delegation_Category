/**
 * LocalStorage Service
 * Modular abstraction layer for local storage CRUD operations.
 * Future-ready for seamless migration to Supabase or other backends.
 */

export const STORAGE_KEYS = {
  DEPARTMENTS: 'departments',
  GROUPS: 'groups',
  SUBGROUPS: 'subgroups',
  USERS: 'users',
  GROUP_USER: 'groupUser',
  GROUP_TASK: 'grouptask',
  TASKS: 'tasks',
  TASK_ASSIGNMENTS: 'taskAssignments',
  TASK_INSTANCES: 'taskInstances',
  TASK_HISTORY: 'taskHistory',
  CURRENT_USER: 'currentUser',
  AUTH_SESSION: 'authSession',
  SETTINGS: 'settings',
  PORTAL_MODE: 'portalMode',
};

// Dispatches a window event so all listeners can reactively re-render
export const notifyStorageChange = (key) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: { key } }));
  }
};

/**
 * Get data from LocalStorage
 * Returns an empty array or default value if key doesn't exist
 */
export const getData = (key, defaultValue = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading ${key} from LocalStorage:`, error);
    return defaultValue;
  }
};

/**
 * Set data in LocalStorage
 */
export const setData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyStorageChange(key);
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to LocalStorage:`, error);
    return false;
  }
};

/**
 * Add a new item to an existing array in LocalStorage
 */
export const addData = (key, item) => {
  const list = getData(key, []);
  list.push(item);
  setData(key, list);
  return item;
};

/**
 * Update an existing item in LocalStorage by ID
 */
export const updateData = (key, id, updates) => {
  const list = getData(key, []);
  const index = list.findIndex((i) => i.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    setData(key, list);
    return list[index];
  }
  return null;
};

/**
 * Delete an item from LocalStorage by ID
 */
export const deleteData = (key, id) => {
  const list = getData(key, []);
  const filtered = list.filter((i) => i.id !== id);
  setData(key, filtered);
  return true;
};

/**
 * Clear all system data in LocalStorage
 */
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  notifyStorageChange('*');
};

// Default Departments
export const DEFAULT_DEPARTMENTS = [
  { id: 'DEPT-1', name: 'Clinical & Medical Services', code: 'CMS', description: 'Doctors, ICU, inpatient care, and clinical consultations', head: 'Dr. Ramesh Sharma', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'DEPT-2', name: 'Hospital Administration & Finance', code: 'ADM', description: 'Patient billing, TPA desk, cash desk, and insurance claims', head: 'Amit Patel', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'DEPT-3', name: 'Nursing & General Wards', code: 'NUR', description: 'Ward management, bedside nursing care, patient vitals, and hygiene', head: 'Priya Verma', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'DEPT-4', name: 'Pharmacy & Medical Supplies', code: 'PHARM', description: 'Inpatient and outpatient medication supply, drug storage, and inventory', head: 'Chief Pharmacist', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'DEPT-5', name: 'Diagnostics & Pathology Lab', code: 'DIAG', description: 'Diagnostic pathology tests, blood bank, and radiology reports', head: 'Dr. Neha Gupta', status: 'Active', createdAt: new Date().toISOString() },
];

// Default Groups (linked to Departments)
export const DEFAULT_GROUPS = [
  { id: 'GRP-1', departmentId: 'DEPT-1', name: 'Clinical & Medical Services', description: 'Doctors, ICU, and inpatient care', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'GRP-2', departmentId: 'DEPT-2', name: 'Hospital Administration & Billing', description: 'Patient billing, TPA, cash desk', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'GRP-3', departmentId: 'DEPT-3', name: 'Nursing & General Wards', description: 'Ward management, nursing, and hygiene', status: 'Active', createdAt: new Date().toISOString() },
];

// Default Subgroups
export const DEFAULT_SUBGROUPS = [
  { id: 'SGRP-1', groupId: 'GRP-1', name: 'ICU & Critical Care', description: 'Intensive care unit operations', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'SGRP-2', groupId: 'GRP-2', name: 'IPD & OPD Billing', description: 'Cash counter and insurance claims', status: 'Active', createdAt: new Date().toISOString() },
  { id: 'SGRP-3', groupId: 'GRP-3', name: 'General Inpatient Ward', description: 'Bedside patient care and checks', status: 'Active', createdAt: new Date().toISOString() },
];

// Default Users with Role and Self-Assign permissions
export const DEFAULT_USERS = [
  {
    id: 'USR-ADMIN',
    name: 'Hospital Administrator',
    username: 'admin',
    password: 'admin123',
    role: 'Admin',
    email: 'admin@mamtahospital.com',
    phone: '+91 98765 43200',
    groupId: 'GRP-2',
    subgroupId: 'SGRP-2',
    status: 'Active',
    canSelfAssign: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'USR-USER',
    name: 'Hospital Staff (User)',
    username: 'user',
    password: 'user123',
    role: 'User',
    email: 'user@mamtahospital.com',
    phone: '+91 98765 43299',
    groupId: 'GRP-3',
    subgroupId: 'SGRP-3',
    status: 'Active',
    canSelfAssign: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'USR-1',
    name: 'Dr. Ramesh Sharma',
    username: 'dr_ramesh',
    password: 'doc123',
    role: 'User',
    email: 'ramesh@mamtahospital.com',
    phone: '+91 98765 43210',
    groupId: 'GRP-1',
    subgroupId: 'SGRP-1',
    status: 'Active',
    canSelfAssign: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'USR-2',
    name: 'Priya Verma',
    username: 'priya_v',
    password: 'user123',
    role: 'User',
    email: 'priya@mamtahospital.com',
    phone: '+91 98765 43211',
    groupId: 'GRP-3',
    subgroupId: 'SGRP-3',
    status: 'Active',
    canSelfAssign: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'USR-3',
    name: 'Amit Patel',
    username: 'amit_p',
    password: 'user123',
    role: 'User',
    email: 'amit@mamtahospital.com',
    phone: '+91 98765 43212',
    groupId: 'GRP-2',
    subgroupId: 'SGRP-2',
    status: 'Active',
    canSelfAssign: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Preload sample mock data for Mamta Hospital
 */
export const loadSampleDummyData = (force = false) => {
  try {
    const currentTasks = getData(STORAGE_KEYS.TASKS, []);
    if (!force && currentTasks.length > 0) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const pastTime = new Date(Date.now() - 3600000 * 2).toISOString();

    const initialDepartments = DEFAULT_DEPARTMENTS;
    const initialGroups = DEFAULT_GROUPS;
    const initialSubgroups = DEFAULT_SUBGROUPS;
    const initialUsers = DEFAULT_USERS;

    // 20 DUMMY TASKS ACROSS 7 CATEGORIES & 14 SUBCATEGORIES
    const initialTasks = [
      // 1. Patient Care & Clinical (Tasks 1 - 5)
      {
        id: 'TASK-101',
        title: 'Morning ICU rounds and ventilator patient parameter evaluation',
        description: 'Inspect vitals and evaluate oxygen delivery logs for beds 101-108 in ICU ward.',
        category: 'Patient Care & Clinical',
        subcategory: 'Ward Rounds & Doctor Notes',
        priority: 'Urgent',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Medical Director',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Evaluate arterial blood gas (ABG) reports', required: true },
          { id: 'CHK-2', text: 'Confirm ventilator peak pressure and PEEP settings', required: true },
          { id: 'CHK-3', text: 'Sign bedside doctor round register', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-102',
        title: 'Review post-operative recovery charts in Surgical Ward 3',
        description: 'Assess post-op pain management, drain outputs, and surgical wound site dressings.',
        category: 'Patient Care & Clinical',
        subcategory: 'Ward Rounds & Doctor Notes',
        priority: 'High',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Head of Surgery',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Check surgical drain volume and incision healing', required: true }],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-103',
        title: 'Verify evening IV antibiotic dose delivery for post-op patients',
        description: 'Confirm antibiotic timing, dosage calibration, and allergy flags before administration.',
        category: 'Patient Care & Clinical',
        subcategory: 'Medication Dispensation & Vitals',
        priority: 'High',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Chief Pharmacist',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Verify antibiotic dose chart', required: true }],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-104',
        title: 'Audit high-alert electrolyte and potassium infusion bedside charts',
        description: 'Check infusion pump rate limiters and secondary nurse counter-signatures.',
        category: 'Patient Care & Clinical',
        subcategory: 'Medication Dispensation & Vitals',
        priority: 'Urgent',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Nursing Superintendent',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Verify infusion pump rate calibration', required: true },
          { id: 'CHK-2', text: 'Check dual-signoff on high-alert sticker', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-105',
        title: 'Verify discharge fitness summaries for recovered cardiac patients',
        description: 'Review echo reports and prepare cardiology discharge clearance certificates.',
        category: 'Patient Care & Clinical',
        subcategory: 'Patient Admission & Discharge',
        priority: 'Medium',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Medical Director',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'One Time',
        status: 'Done',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Sign discharge card and home prescription', required: true }],
        createdAt: pastTime,
        updatedAt: pastTime,
      },

      // 2. Equipment Inspection (Tasks 6 - 9)
      {
        id: 'TASK-106',
        title: 'Daily calibration test for backup ICU ventilators & pipeline alarms',
        description: 'Ensure zero error rate on pressure gauges and verify backup emergency battery health.',
        category: 'Equipment Inspection',
        subcategory: 'Ventilator & ICU Monitor Calibration',
        priority: 'Medium',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Biomedical Head',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Verify central oxygen line pressure gauge', required: true },
          { id: 'CHK-2', text: 'Test high/low pressure audio alarm triggers', required: true },
          { id: 'CHK-3', text: 'Confirm backup battery level above 90%', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-107',
        title: 'Inspect defibrillator pads, battery cycle and 200J rhythm test printout',
        description: 'Run daily automated test printout and verify adult/pediatric pad expiry dates.',
        category: 'Equipment Inspection',
        subcategory: 'Ventilator & ICU Monitor Calibration',
        priority: 'High',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Biomedical Head',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Run self-test rhythm pulse and print strip', required: true },
          { id: 'CHK-2', text: 'Verify gel pad seal and contact conductivity', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-108',
        title: 'Verify central liquid medical oxygen (LMO) tank level & manifold switch',
        description: 'Check main cryogenic tank volume indicator and secondary manifold cylinder bank.',
        category: 'Equipment Inspection',
        subcategory: 'Oxygen Plant & Pipeline Pressure Check',
        priority: 'Urgent',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Hospital Director',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Record LMO bulk tank level (min threshold > 40%)', required: true },
          { id: 'CHK-2', text: 'Verify primary to backup manifold auto-switch valve', required: true },
          { id: 'CHK-3', text: 'Log pipeline pressure at 4.2 bar gauge', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-109',
        title: 'Crash cart medicine seals inspection in Emergency Trauma Bay',
        description: 'Check unbroken numbered tamper tags on emergency drug trays and laryngoscope bulbs.',
        category: 'Equipment Inspection',
        subcategory: 'Crash Cart & Defibrillator Inspection',
        priority: 'High',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Emergency Incharge',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Done',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Verify tamper-evident seal integrity', required: true },
          { id: 'CHK-2', text: 'Test laryngoscope blade light intensity', required: true },
        ],
        createdAt: pastTime,
        updatedAt: pastTime,
      },

      // 3. Billing & Collections (Tasks 10 - 12)
      {
        id: 'TASK-110',
        title: 'Review interim bill clearance and pending laboratory requisitions',
        description: 'Reconcile outstanding inpatient pharmacy chits with ward billing desk.',
        category: 'Billing & Collections',
        subcategory: 'IPD Billing & Interim Clearance',
        priority: 'Medium',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Finance Head',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Verify pending investigation billing entries', required: true }],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-111',
        title: 'Approve high-cost implant and surgical consumable breakdown for billing',
        description: 'Authorize orthopedic and cardiac implant serial batch numbers for insurance claim.',
        category: 'Billing & Collections',
        subcategory: 'IPD Billing & Interim Clearance',
        priority: 'High',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Medical Director',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Sign implant barcode verification form', required: true }],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-112',
        title: 'Verify diagnostic investigation reports for TPA pre-authorization',
        description: 'Upload required MRI and blood panel documentation for cashless admission approval.',
        category: 'Billing & Collections',
        subcategory: 'Insurance & TPA Claims Approval',
        priority: 'Urgent',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'TPA Desk Manager',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'One Time',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Submit clinical justification letter', required: true }],
        createdAt: now,
        updatedAt: now,
      },

      // 4. Hygiene & Sanitation (Tasks 13 - 14)
      {
        id: 'TASK-113',
        title: 'Verify Operation Theatre laminar air flow & terminal disinfection swab report',
        description: 'Review microbiology culture swab results following weekly terminal fumigation.',
        category: 'Hygiene & Sanitation',
        subcategory: 'OT & ICU Terminal Deep Cleaning',
        priority: 'High',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Infection Control Head',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Weekly',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Check OT table and light surface culture report', required: true },
          { id: 'CHK-2', text: 'Confirm air particle count under permissible ISO limits', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-114',
        title: 'Inspect color-coded bio-waste bin segregation in ICU & Dialysis unit',
        description: 'Audit Yellow (infectious), Red (plastics), White (sharps), and Blue (glassware) bins.',
        category: 'Hygiene & Sanitation',
        subcategory: 'Biomedical Waste Segregation Audit',
        priority: 'Medium',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Pollution Control Officer',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Check puncture-proof sharps container closure', required: true },
          { id: 'CHK-2', text: 'Verify bio-hazard label and bar-code tracking stickers', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },

      // 5. Pharmacy & Inventory (Tasks 15 - 16)
      {
        id: 'TASK-115',
        title: 'Inspect emergency crash medicine inventory and adrenaline ampoules',
        description: 'Check stock levels of life-saving injectables: atropine, adrenaline, and amiodarone.',
        category: 'Pharmacy & Inventory',
        subcategory: 'Emergency & Critical Drug Stock Check',
        priority: 'Urgent',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Chief Pharmacist',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Count minimum reserve ampoules for trauma bay', required: true },
          { id: 'CHK-2', text: 'Confirm expiration date beyond 6 months', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-116',
        title: 'Verify vaccine refrigerator temperature sensor log (2°C - 8°C)',
        description: 'Check digital continuous data logger readings and backup cooling power supply.',
        category: 'Pharmacy & Inventory',
        subcategory: 'Cold Chain Vaccine Refrigerator Temp Log',
        priority: 'Medium',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Chief Pharmacist',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Done',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Record morning temperature reading (target: 4°C)', required: true },
          { id: 'CHK-2', text: 'Verify automated SMS alert system functionality', required: true },
        ],
        createdAt: pastTime,
        updatedAt: pastTime,
      },

      // 6. Regulatory & Audit (Tasks 17 - 18)
      {
        id: 'TASK-117',
        title: 'Monthly hospital mortality & morbidity clinical documentation audit',
        description: 'Ensure all critical case histories have signed death review summary sheets.',
        category: 'Regulatory & Audit',
        subcategory: 'NABH / Quality Compliance Checklist',
        priority: 'Medium',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'NABH Quality Coordinator',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Monthly',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Review ICU mortality case records with committee', required: true }],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-118',
        title: 'Inspect emergency fire exit doors & evacuation signage clearance in ICU',
        description: 'Confirm exit corridors are unblocked and illuminated glow signage is functional.',
        category: 'Regulatory & Audit',
        subcategory: 'Fire Safety & Emergency Exit Audit',
        priority: 'High',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Fire Safety Officer',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Weekly',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Ensure panic bar exit doors open smoothly without keys', required: true },
          { id: 'CHK-2', text: 'Check emergency fire extinguisher pressure needle in green zone', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },

      // 7. Maintenance & Facilities & Documentation (Tasks 19 - 20)
      {
        id: 'TASK-119',
        title: 'Audit HEPA filter differential pressure gauge readings in Clean Rooms',
        description: 'Verify positive pressure airflow in surgical suites and isolation cubicles.',
        category: 'Maintenance & Facilities',
        subcategory: 'HVAC & Air Conditioning Filter Cleaning',
        priority: 'Medium',
        taskType: 'Checklist',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Chief Engineer',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Weekly',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [
          { id: 'CHK-1', text: 'Log magnehelic gauge differential pressure reading', required: true },
          { id: 'CHK-2', text: 'Confirm pre-filter dust inspection status', required: true },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'TASK-120',
        title: 'Daily bed census, ICU occupancy and ventilator utilization report',
        description: 'Submit midnight census numbers to Hospital Director & Operations desk.',
        category: 'Documentation & Reporting',
        subcategory: 'Daily Bed Census & Occupancy Report',
        priority: 'Low',
        taskType: 'Delegation',
        assignmentLevel: 'Individual User',
        groupId: 'GRP-1',
        subgroupId: 'SGRP-1',
        givenBy: 'Operations Manager',
        assignBy: 'Hospital Admin',
        startDate: todayStr,
        dueDate: todayStr,
        endDate: todayStr,
        frequency: 'Daily',
        status: 'Pending',
        assignedUserIds: ['USR-1'],
        checklistItems: [{ id: 'CHK-1', text: 'Sign off on daily bed occupancy count sheet', required: true }],
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Generate Task Instances for Dr. Ramesh Sharma (USR-1)
    const initialInstances = initialTasks.map((t, idx) => {
      const isCompleted = t.status === 'Done';
      return {
        id: `INST-${101 + idx}`,
        taskId: t.id,
        userId: 'USR-1',
        title: t.title,
        taskType: t.taskType,
        priority: t.priority,
        category: t.category,
        subcategory: t.subcategory,
        groupId: t.groupId,
        subgroupId: t.subgroupId,
        startDate: t.startDate,
        dueDate: t.dueDate,
        endDate: t.endDate,
        frequency: t.frequency,
        status: t.status,
        checklistItemsStatus: t.checklistItems.map((item) => ({
          id: item.id,
          text: item.text,
          completed: isCompleted,
          completedAt: isCompleted ? pastTime : null,
        })),
        remarks: isCompleted ? 'Completed on morning shift protocol.' : '',
        attachment: null,
        completedAt: isCompleted ? pastTime : null,
        completedBy: isCompleted ? 'Dr. Ramesh Sharma' : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    // Sample History records for completed tasks
    const initialHistory = [
      {
        id: 'HIST-1',
        taskId: 'TASK-105',
        instanceId: 'INST-105',
        action: 'Task Completed',
        user: 'Dr. Ramesh Sharma',
        oldValue: 'In Progress',
        newValue: 'Done',
        note: 'All cardiac discharge summaries verified and approved.',
        date: todayStr,
        time: '11:30 AM',
        timestamp: pastTime,
      },
      {
        id: 'HIST-2',
        taskId: 'TASK-109',
        instanceId: 'INST-109',
        action: 'Task Completed',
        user: 'Dr. Ramesh Sharma',
        oldValue: 'Pending',
        newValue: 'Done',
        note: 'Emergency trauma cart seals verified with nurse incharge.',
        date: todayStr,
        time: '01:15 PM',
        timestamp: pastTime,
      },
      {
        id: 'HIST-3',
        taskId: 'TASK-116',
        instanceId: 'INST-116',
        action: 'Task Completed',
        user: 'Dr. Ramesh Sharma',
        oldValue: 'In Progress',
        newValue: 'Done',
        note: 'Vaccine cold chain temperature logged at 4.2°C.',
        date: todayStr,
        time: '02:45 PM',
        timestamp: pastTime,
      },
    ];

    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(initialDepartments));
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(initialGroups));
    localStorage.setItem(STORAGE_KEYS.SUBGROUPS, JSON.stringify(initialSubgroups));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(initialTasks));
    localStorage.setItem(STORAGE_KEYS.TASK_INSTANCES, JSON.stringify(initialInstances));
    localStorage.setItem(STORAGE_KEYS.TASK_HISTORY, JSON.stringify(initialHistory));
    const existingCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!existingCurrent) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify('USR-1'));
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ orgName: 'Mamta Hospital' }));

    // Automatically migrate origin users to groupUser with proper mapping
    migrateUsersToGroupUser(true);

    notifyStorageChange('*');
    return true;
  } catch (err) {
    console.error('Failed to load sample dummy data:', err);
    return false;
  }
};

/**
 * Ensures initial default data exists for Mamta Hospital
 */
export const ensureInitialData = () => {
  const existingDepts = getData(STORAGE_KEYS.DEPARTMENTS, []);
  if (!Array.isArray(existingDepts) || existingDepts.length === 0) {
    setData(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
  }

  const existingGroups = getData(STORAGE_KEYS.GROUPS, []);
  if (!Array.isArray(existingGroups) || existingGroups.length === 0) {
    setData(STORAGE_KEYS.GROUPS, DEFAULT_GROUPS);
  }

  const existingSubgroups = getData(STORAGE_KEYS.SUBGROUPS, []);
  if (!Array.isArray(existingSubgroups) || existingSubgroups.length === 0) {
    setData(STORAGE_KEYS.SUBGROUPS, DEFAULT_SUBGROUPS);
  }

  const existingTasks = getData(STORAGE_KEYS.TASKS, []);
  // Detect if cached tasks are sample dummy tasks (INST-101, TASK-101, USR-1, etc.)
  const isSampleTasks = Array.isArray(existingTasks) && existingTasks.some(t => String(t.id).includes('101') || String(t.givenBy).includes('Director') || String(t.givenBy).includes('Biomedical'));
  if (isSampleTasks) {
    setData(STORAGE_KEYS.TASKS, []);
    setData(STORAGE_KEYS.TASK_ASSIGNMENTS, []);
    setData(STORAGE_KEYS.TASK_INSTANCES, []);
    setData(STORAGE_KEYS.TASK_HISTORY, []);
  }

  // Ensure all existing users in localStorage have valid passwords and the default 'admin' and 'user' accounts exist
  const existingUsers = getData(STORAGE_KEYS.USERS, []);
  // Detect if cached users are from legacy system (e.g. contain legacy emails or old user structures)
  const isLegacyUsers = Array.isArray(existingUsers) && existingUsers.some(u => u.email?.includes('botivate') || u.number === '8085705807');
  if (isLegacyUsers || !Array.isArray(existingUsers) || existingUsers.length === 0) {
    setData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    setData(STORAGE_KEYS.GROUP_USER, []);
  } else {
    let modified = false;
    let patchedUsers = [...existingUsers];

    // 1. Ensure admin account exists with active status and password
    const adminIndex = patchedUsers.findIndex(
      (u) =>
        (u.username && u.username.toLowerCase() === 'admin') ||
        (u.email && u.email.toLowerCase() === 'admin@mamtahospital.com')
    );
    if (adminIndex === -1) {
      patchedUsers.unshift({
        id: 'USR-ADMIN',
        name: 'Hospital Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'Admin',
        email: 'admin@mamtahospital.com',
        phone: '+91 98765 43200',
        groupId: 'GRP-2',
        subgroupId: 'SGRP-2',
        status: 'Active',
        canSelfAssign: true,
        createdAt: new Date().toISOString(),
      });
      modified = true;
    } else {
      const admin = patchedUsers[adminIndex];
      if (
        !admin.password ||
        admin.password.trim() === '' ||
        admin.status !== 'Active' ||
        admin.role !== 'Admin'
      ) {
        patchedUsers[adminIndex] = {
          ...admin,
          username: 'admin',
          password: admin.password || 'admin123',
          role: 'Admin',
          status: 'Active',
        };
        modified = true;
      }
    }

    // 2. Ensure default user/staff account exists
    const userIndex = patchedUsers.findIndex(
      (u) =>
        (u.username && u.username.toLowerCase() === 'user') ||
        (u.email && u.email.toLowerCase() === 'user@mamtahospital.com')
    );
    if (userIndex === -1) {
      patchedUsers.push({
        id: 'USR-USER',
        name: 'Hospital Staff (User)',
        username: 'user',
        password: 'user123',
        role: 'User',
        email: 'user@mamtahospital.com',
        phone: '+91 98765 43299',
        groupId: patchedUsers[0]?.groupId || 'GRP-3',
        subgroupId: patchedUsers[0]?.subgroupId || 'SGRP-3',
        status: 'Active',
        canSelfAssign: true,
        createdAt: new Date().toISOString(),
      });
      modified = true;
    } else {
      const uObj = patchedUsers[userIndex];
      if (!uObj.password || uObj.password.trim() === '' || uObj.status !== 'Active') {
        patchedUsers[userIndex] = {
          ...uObj,
          username: 'user',
          password: uObj.password || 'user123',
          status: 'Active',
        };
        modified = true;
      }
    }

    // 3. Ensure any user missing password receives a default password
    patchedUsers = patchedUsers.map((u) => {
      if (!u.password) {
        modified = true;
        const defaultPassword = u.username === 'admin' ? 'admin123' : 'user123';
        return { ...u, password: defaultPassword };
      }
      return u;
    });

    if (modified) {
      setData(STORAGE_KEYS.USERS, patchedUsers);
    }
  }

  // 4. Ensure real origin users are migrated to 'groupUser' table with proper mapping (no seed/dummy data)
  migrateUsersToGroupUser(false);
};

/**
 * Migrates real origin data from USERS table to GROUP_USER table.
 * Strictly migrates authentic user records from localStorage without generating fake/seed dummy data.
 * Properly maps relational attributes:
 * - id: GU-<userId>
 * - userId: user.id
 * - userName: user.name
 * - username: user.username
 * - email: user.email
 * - mobile: user.mobile || user.phone
 * - groupId: user.groupId
 * - subgroupId: user.subgroupId
 * - role: user.role
 * - status: user.status
 * - canSelfAssign: user.canSelfAssign
 * - assignedAt: user.createdAt
 * - updatedAt: user.updatedAt || user.createdAt
 */
export const migrateUsersToGroupUser = (force = false) => {
  try {
    const originUsers = getData(STORAGE_KEYS.USERS, []);
    const existingGroupUsers = getData(STORAGE_KEYS.GROUP_USER, []);

    let updatedGroupUsers = force ? [] : [...existingGroupUsers];
    let hasChanges = force;

    // Process every actual origin user
    originUsers.forEach((user) => {
      if (!user || !user.id) return;

      const existingIndex = updatedGroupUsers.findIndex((gu) => gu.userId === user.id);
      const mappedRecord = {
        id: existingIndex !== -1 ? updatedGroupUsers[existingIndex].id : `GU-${user.id}`,
        userId: user.id,
        username: user.username || user.name || '',
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        groupId: user.groupId || null,
        subgroupId: user.subgroupId || null,
        role: user.role || 'User',
        status: user.status || 'Active',
        canSelfAssign: Boolean(user.canSelfAssign),
        assignedAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
      };

      if (existingIndex === -1) {
        updatedGroupUsers.push(mappedRecord);
        hasChanges = true;
      } else {
        const current = updatedGroupUsers[existingIndex];
        const isDifferent =
          current.groupId !== mappedRecord.groupId ||
          current.subgroupId !== mappedRecord.subgroupId ||
          current.role !== mappedRecord.role ||
          current.status !== mappedRecord.status ||
          current.username !== mappedRecord.username ||
          current.email !== mappedRecord.email ||
          current.mobile !== mappedRecord.mobile ||
          current.canSelfAssign !== mappedRecord.canSelfAssign;

        if (isDifferent) {
          updatedGroupUsers[existingIndex] = {
            ...current,
            ...mappedRecord,
            updatedAt: new Date().toISOString(),
          };
          hasChanges = true;
        }
      }
    });

    // Remove groupUser records for users that no longer exist in origin users
    const validUserIds = new Set(originUsers.map((u) => u.id));
    const prunedGroupUsers = updatedGroupUsers.filter((gu) => validUserIds.has(gu.userId));
    if (prunedGroupUsers.length !== updatedGroupUsers.length) {
      updatedGroupUsers = prunedGroupUsers;
      hasChanges = true;
    }

    if (hasChanges || existingGroupUsers.length === 0) {
      setData(STORAGE_KEYS.GROUP_USER, updatedGroupUsers);
    }

    return updatedGroupUsers;
  } catch (error) {
    console.error('Error migrating origin users to groupUser table:', error);
    return [];
  }
};

/**
 * Synchronize a single user object into the groupUser table
 */
export const syncUserToGroupUser = (user) => {
  if (!user || !user.id) return null;
  const list = getData(STORAGE_KEYS.GROUP_USER, []);
  const index = list.findIndex((gu) => gu.userId === user.id);

  const mapped = {
    id: index !== -1 ? list[index].id : `GU-${user.id}`,
    userId: user.id,
    username: user.username || user.name || '',
    email: user.email || '',
    mobile: user.mobile || user.phone || '',
    groupId: user.groupId || null,
    subgroupId: user.subgroupId || null,
    role: user.role || 'User',
    status: user.status || 'Active',
    canSelfAssign: Boolean(user.canSelfAssign),
    assignedAt: user.createdAt || (index !== -1 ? list[index].assignedAt : new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };

  if (index !== -1) {
    list[index] = mapped;
  } else {
    list.push(mapped);
  }

  setData(STORAGE_KEYS.GROUP_USER, list);
  return mapped;
};

/**
 * Delete a user's entry from groupUser table
 */
export const deleteGroupUserByUserId = (userId) => {
  if (!userId) return false;
  const list = getData(STORAGE_KEYS.GROUP_USER, []);
  const filtered = list.filter((gu) => gu.userId !== userId);
  setData(STORAGE_KEYS.GROUP_USER, filtered);
  return true;
};


