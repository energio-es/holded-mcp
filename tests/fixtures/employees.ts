/**
 * Test fixtures for employee-related tests
 */

export const validEmployee = {
  name: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
};

export const employeeWithInvite = {
  ...validEmployee,
  sendInvite: true,
};

export const invalidEmployeeMissingName = {
  lastName: 'Doe',
  email: 'john.doe@example.com',
};

export const invalidEmployeeMissingLastName = {
  name: 'John',
  email: 'john.doe@example.com',
};

export const invalidEmployeeMissingEmail = {
  name: 'John',
  lastName: 'Doe',
};

export const invalidEmployeeBadEmail = {
  name: 'John',
  lastName: 'Doe',
  email: 'not-an-email',
};
