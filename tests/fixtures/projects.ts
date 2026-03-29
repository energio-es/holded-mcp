/**
 * Test fixtures for project-related tests
 */

export const validProject = {
  name: 'Website Redesign',
};

export const validTask = {
  name: 'New Task',
  project_id: 'proj123',
  list_id: 'list456',
};

export const taskWithDescription = {
  ...validTask,
  description: 'Task description',
};

export const invalidTaskMissingName = {
  project_id: 'proj123',
  list_id: 'list456',
};

export const invalidTaskMissingProjectId = {
  name: 'New Task',
  list_id: 'list456',
};

export const validProjectTimeTracking = {
  project_id: 'proj123',
  duration: 3600, // 1 hour in seconds
  costHour: 5000, // 50.00 in cents
};

export const invalidProjectTimeTrackingNegativeDuration = {
  project_id: 'proj123',
  duration: -100,
  costHour: 5000,
};
