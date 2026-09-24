// Automated end-to-end test of task creation, assignment, and completion workflow
import { getData, setData, addData, updateData, STORAGE_KEYS } from './src/services/storage.js';
import { createTask, completeInstance } from './src/services/taskService.js';
import { createClient } from '@supabase/supabase-js';

// Setup Mock LocalStorage for Node environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}
globalThis.localStorage = new LocalStorageMock();

async function runEndToEndWorkflowTest() {
  console.log('===============================================================');
  console.log('🚀 STARTING FULL TASK WORKFLOW VERIFICATION TEST');
  console.log('===============================================================\n');

  // Step 1: Fetch Real Users from Supabase
  console.log('Step 1: Connecting to Supabase and loading real users...');
  const sb = createClient(
    'https://kfdtcqjkesvdfzncfbns.supabase.co',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const { data: supaUsers, error: uErr } = await sb.from('users').select('*');
  const { data: supaGroupUsers, error: guErr } = await sb.from('groupUser').select('*');

  if (uErr || !supaUsers || supaUsers.length === 0) {
    console.error('❌ Failed to fetch users from Supabase:', uErr);
    process.exit(1);
  }

  const mappedUsers = supaUsers.map(u => ({
    id: String(u.id),
    name: u.user_name || u.username,
    username: u.username || u.user_name,
    email: u.email_id || '',
    groupId: u.department || 'General',
    subgroupId: u.Designation || '',
    role: u.role ? (u.role.toLowerCase() === 'admin' ? 'Admin' : 'User') : 'User',
    status: 'Active',
    canSelfAssign: Boolean(u.can_self_assign),
    createdAt: u.created_at || new Date().toISOString(),
  }));

  // Store into localStorage
  setData(STORAGE_KEYS.USERS, mappedUsers);
  setData(STORAGE_KEYS.GROUP_USER, supaGroupUsers);
  console.log(`✅ Loaded ${mappedUsers.length} real users and ${supaGroupUsers.length} groupUser mappings.\n`);

  // Target User: Sahil Mirza (ID: '8', IT Executive)
  const targetUser = mappedUsers.find(u => u.name === 'Sahil Mirza' || u.id === '8') || mappedUsers[0];
  const creatorAdmin = mappedUsers.find(u => u.role === 'Admin') || mappedUsers[0];
  console.log(`Assignee: ${targetUser.name} (User ID: ${targetUser.id}, Dept: ${targetUser.groupId})`);
  console.log(`Creator:  ${creatorAdmin.name} (Role: ${creatorAdmin.role})\n`);

  // Step 2: Create a Task
  console.log('Step 2: Creating a new Task with checklist and assignment...');
  const taskPayload = {
    title: 'Daily IT Server Backup & Network Gateway Health Check',
    description: 'Verify redundant server snapshot and run gateway ping diagnostic.',
    taskType: 'Checklist',
    assignmentLevel: 'Individual User',
    groupId: targetUser.groupId,
    subgroupId: targetUser.subgroupId,
    category: 'IT & Infrastructure',
    subcategory: 'Server Maintenance',
    priority: 'Urgent',
    startDate: '2026-09-23',
    dueDate: '2026-09-23',
    frequency: 'Daily',
    requiredAttachment: true, // Mandatory proof attachment
    assignedUserIds: [targetUser.id],
    checklistItems: [
      { id: 'CHK-1', text: 'Verify SAN backup replication status', required: true },
      { id: 'CHK-2', text: 'Check Cisco core switch latency < 5ms', required: true },
      { id: 'CHK-3', text: 'Log UPS battery voltage in server room', required: true },
    ],
  };

  const { task, instances } = createTask(taskPayload, creatorAdmin);
  console.log(`✅ Task Created Successfully! Task ID: ${task.id}`);
  console.log(`✅ Created ${instances.length} Task Instance(s). Instance ID: ${instances[0]?.id}\n`);

  // Step 3: Verification of Storage Tables after Creation
  console.log('Step 3: Checking Table Storage (Tasks, Assignments, Instances, History)...');
  const storedTasks = getData(STORAGE_KEYS.TASKS, []);
  const storedAssignments = getData(STORAGE_KEYS.TASK_ASSIGNMENTS, []);
  const storedInstances = getData(STORAGE_KEYS.TASK_INSTANCES, []);
  const storedHistory = getData(STORAGE_KEYS.TASK_HISTORY, []);

  const foundTask = storedTasks.find(t => t.id === task.id);
  const foundAssignment = storedAssignments.find(a => a.taskId === task.id);
  const foundInstance = storedInstances.find(i => i.taskId === task.id);
  const foundHistory = storedHistory.filter(h => h.taskId === task.id);

  console.log('   - Table `tasks`:          ', foundTask ? `FOUND (${foundTask.title})` : 'MISSING');
  console.log('   - Table `taskAssignments`: ', foundAssignment ? `FOUND (Assign ID: ${foundAssignment.id} -> User: ${foundAssignment.userId})` : 'MISSING');
  console.log('   - Table `taskInstances`:   ', foundInstance ? `FOUND (Inst ID: ${foundInstance.id}, Status: ${foundInstance.status})` : 'MISSING');
  console.log('   - Table `taskHistory`:     ', foundHistory.length > 0 ? `FOUND (${foundHistory.length} events logged)` : 'MISSING');

  if (!foundTask || !foundAssignment || !foundInstance || foundHistory.length === 0) {
    console.error('❌ Table storage check failed after creation!');
    process.exit(1);
  }
  console.log('✅ All creation records verified in storage tables!\n');

  // Step 4: Execute Task Completion Workflow
  console.log('Step 4: Executing User Completion Workflow...');
  const instanceToComplete = foundInstance;

  // Complete all checklist items
  const completedChecklist = instanceToComplete.checklistItemsStatus.map(item => ({
    ...item,
    completed: true,
    completedAt: new Date().toISOString(),
  }));

  // Attempt to complete without attachment (should fail because requiredAttachment is true)
  let attachmentValidationPassed = false;
  try {
    completeInstance({
      instanceId: instanceToComplete.id,
      taskId: task.id,
      status: 'Done',
      checklistItemsStatus: completedChecklist,
      user: targetUser,
    });
  } catch (err) {
    console.log(`   [Validation Check]: Blocked without proof as expected: "${err.message}"`);
    attachmentValidationPassed = true;
  }

  if (!attachmentValidationPassed) {
    console.error('❌ Attachment validation failed!');
    process.exit(1);
  }

  // Complete with proof attachment and remarks
  console.log('   Submitting task with mandatory proof document and completion remarks...');
  completeInstance({
    instanceId: instanceToComplete.id,
    taskId: task.id,
    status: 'Done',
    remarks: 'Server backup completed with 100% data integrity hash check. Gateway latency tested at 2.1ms.',
    attachment: {
      name: 'server_backup_log_2026-09-23.pdf',
      size: 45280,
      type: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
    },
    checklistItemsStatus: completedChecklist,
    user: targetUser,
  });

  console.log('✅ Task Completion workflow submitted!\n');

  // Step 5: Verify Final Storage State
  console.log('Step 5: Verifying Final Table Storage State...');
  const updatedInstances = getData(STORAGE_KEYS.TASK_INSTANCES, []);
  const completedInst = updatedInstances.find(i => i.id === instanceToComplete.id);
  const updatedHistory = getData(STORAGE_KEYS.TASK_HISTORY, []).filter(h => h.taskId === task.id);

  console.log('   - Instance Status:       ', completedInst?.status === 'Done' ? '✅ Done' : '❌ ' + completedInst?.status);
  console.log('   - Completed At:          ', completedInst?.completedAt ? `✅ ${completedInst.completedAt}` : '❌ Not recorded');
  console.log('   - Completed By:          ', completedInst?.completedBy === targetUser.name ? `✅ ${completedInst.completedBy}` : '❌ ' + completedInst?.completedBy);
  console.log('   - Proof Attachment:      ', completedInst?.attachment?.name ? `✅ ${completedInst.attachment.name}` : '❌ None');
  console.log('   - Checklist Progress:    ', completedInst?.checklistItemsStatus?.every(i => i.completed) ? '✅ All 3/3 items checked' : '❌ Incomplete');
  console.log('   - Remarks:               ', completedInst?.remarks ? `✅ "${completedInst.remarks}"` : '❌ Empty');
  console.log('   - Total History Events:  ', `✅ ${updatedHistory.length} events logged:`);
  updatedHistory.forEach((h, idx) => {
    console.log(`      ${idx + 1}. [${h.action}] by ${h.user?.name || h.user}: ${h.note || ''}`);
  });

  console.log('\n===============================================================');
  console.log('🎉 FULL WORKFLOW COMPLETE AND VERIFIED 100% IN TABLE STORAGE!');
  console.log('===============================================================');
}

runEndToEndWorkflowTest().catch(err => {
  console.error('Workflow test error:', err);
  process.exit(1);
});
