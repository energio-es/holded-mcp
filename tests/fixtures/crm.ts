/**
 * Test fixtures for CRM-related tests (leads, funnels, events, bookings)
 */

export const validLead = {
  name: 'New Lead',
};

export const leadWithDetails = {
  name: 'New Lead',
  funnel_id: 'funnel123',
  stage_id: 'stage456',
  potential: 5000,
  probability: 75,
};

export const invalidLeadProbabilityTooHigh = {
  name: 'New Lead',
  probability: 150, // Should be 0-100
};

export const validFunnel = {
  name: 'Sales Funnel',
};

export const funnelWithStages = {
  name: 'Sales Funnel',
  stages: [
    { name: 'Contact', order: 1, probability: 25 },
    { name: 'Proposal', order: 2, probability: 50 },
    { name: 'Negotiation', order: 3, probability: 75 },
  ],
};

export const validFunnelStage = {
  name: 'Contact',
  probability: 25,
};

export const validEvent = {
  name: 'Client Meeting',
  start: 1730109600,
};

export const eventWithDetails = {
  name: 'Client Meeting',
  start: 1730109600,
  end: 1730113200,
  allDay: false,
  description: 'Discuss project requirements',
  leadId: 'lead123',
};

export const validBooking = {
  locationId: 'loc123',
  serviceId: 'svc456',
  dateTime: 1730109600,
  timezone: 'Europe/Madrid',
  language: 'es',
  customFields: [
    { key: 'name', value: 'John Doe' },
    { key: 'email', value: 'john@example.com' },
  ],
};

export const invalidBookingNegativeDateTime = {
  locationId: 'loc123',
  serviceId: 'svc456',
  dateTime: -100,
  timezone: 'Europe/Madrid',
  language: 'es',
  customFields: [{ key: 'name', value: 'John' }],
};
