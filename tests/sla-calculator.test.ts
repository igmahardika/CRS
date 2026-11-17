import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSla,
  getDaysInMonth,
  getTotalMinutesInMonth,
  formatDowntimeDuration,
} from '../lib/sla-calculator';

describe('SLA Calculator Unit Tests (lib/sla-calculator.ts)', () => {
  it('should correctly calculate days and total minutes in a month', () => {
    // October has 31 days = 44,640 minutes
    assert.equal(getDaysInMonth(2026, 10), 31);
    assert.equal(getTotalMinutesInMonth(2026, 10), 31 * 24 * 60);

    // February 2024 (Leap year) has 29 days
    assert.equal(getDaysInMonth(2024, 2), 29);
    // February 2026 (Common year) has 28 days
    assert.equal(getDaysInMonth(2026, 2), 28);
  });

  it('should calculate 100.00% SLA availability when there is zero downtime', () => {
    const res = calculateSla([], [], 2026, 10);
    assert.equal(res.totalDowntimeMinutes, 0);
    assert.equal(res.downtimePercent, 0);
    assert.equal(res.onlinePercent, 100);
    assert.equal(res.availabilityPercent, 100);
    assert.equal(res.downtimeDurationStr, '-');
    assert.equal(res.isCaseEmpty, true);
    assert.equal(res.isTicketEmpty, true);
  });

  it('should accurately calculate SLA when downtime cases exist', () => {
    const cases = [
      {
        noCase: 'CAS-001',
        date: '2026-10-05',
        description: 'Fiber Cut Incident',
        action: 'Splicing',
        downtimeMinutes: 120, // 2 hours
      },
      {
        noCase: 'CAS-002',
        date: '2026-10-12',
        description: 'Power Outage',
        action: 'Genset activation',
        downtimeMinutes: 30, // 30 minutes
      },
    ];

    const tickets = [
      {
        noTicket: 'TCK-001',
        date: '2026-10-05',
        description: 'Reported issue',
        action: 'Checked link',
        status: 'Closed',
      },
    ];

    const res = calculateSla(cases, tickets, 2026, 10);
    assert.equal(res.totalDowntimeMinutes, 150); // 120 + 30
    assert.equal(res.caseCount, 2);
    assert.equal(res.ticketCount, 1);
    assert.equal(res.downtimeDurationStr, '2 hrs 30 mins');
    assert.ok(res.availabilityPercent < 100 && res.availabilityPercent > 99);
  });

  it('should format downtime duration strings properly', () => {
    assert.equal(formatDowntimeDuration(0), '-');
    assert.equal(formatDowntimeDuration(45), '45 mins');
    assert.equal(formatDowntimeDuration(60), '1 hrs');
    assert.equal(formatDowntimeDuration(95), '1 hrs 35 mins');
  });
});
