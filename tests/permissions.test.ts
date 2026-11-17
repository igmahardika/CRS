import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  canAccessPage,
  getDefaultLandingRoute,
  isNocDepartment,
  isValidDepartment,
} from '../lib/permissions';
import { UserSession } from '../lib/token';

describe('Permissions & RBAC Unit Tests (lib/permissions.ts)', () => {
  const adminUser: UserSession = {
    id: 'u1',
    username: 'admin',
    name: 'Administrator',
    role: 'ADMIN',
    department: 'Network Operation',
  };

  const nocOperator: UserSession = {
    id: 'u2',
    username: 'noc_op',
    name: 'NOC Operator',
    role: 'OPERATOR',
    department: 'Network Operation',
  };

  const salesStaff: UserSession = {
    id: 'u3',
    username: 'sales_user',
    name: 'Sales Staff',
    role: 'STAFF',
    department: 'Account Executive',
  };

  it('ADMIN should possess all permissions', () => {
    assert.equal(hasPermission(adminUser, 'system:admin'), true);
    assert.equal(hasPermission(adminUser, 'report:create'), true);
    assert.equal(hasPermission(adminUser, 'report:approve'), true);
    assert.equal(hasPermission(adminUser, 'customer:write'), true);
    assert.equal(hasPermission(adminUser, 'schedule:manage'), true);
  });

  it('NOC Operator should have operational permissions but NOT system:admin', () => {
    assert.equal(hasPermission(nocOperator, 'report:create'), true);
    assert.equal(hasPermission(nocOperator, 'discovery:view'), true);
    assert.equal(hasPermission(nocOperator, 'system:admin'), false);
    assert.equal(hasPermission(nocOperator, 'report:approve'), false);
  });

  it('Sales / Non-NOC staff should have request permissions but not generator or admin', () => {
    assert.equal(hasPermission(salesStaff, 'request:create'), true);
    assert.equal(hasPermission(salesStaff, 'request:view_dept'), true);
    assert.equal(hasPermission(salesStaff, 'report:create'), false);
    assert.equal(hasPermission(salesStaff, 'system:admin'), false);
    assert.equal(hasPermission(salesStaff, 'discovery:manage'), false);
  });

  it('should route users to correct default landing pages', () => {
    assert.equal(getDefaultLandingRoute(adminUser), '/');
    assert.equal(getDefaultLandingRoute(nocOperator), '/');
    assert.equal(getDefaultLandingRoute(salesStaff), '/requests');
  });

  it('should correctly validate department identifiers', () => {
    assert.equal(isNocDepartment('Network Operation'), true);
    assert.equal(isNocDepartment('Account Executive'), false);
    assert.equal(isValidDepartment('Customer Experience'), true);
    assert.equal(isValidDepartment('HackerDepartment'), false);
  });

  it('should enforce page access restrictions', () => {
    assert.equal(canAccessPage(salesStaff, '/users'), false);
    assert.equal(canAccessPage(salesStaff, '/settings'), false);
    assert.equal(canAccessPage(salesStaff, '/requests'), true);
    assert.equal(canAccessPage(adminUser, '/users'), true);
    assert.equal(canAccessPage(adminUser, '/settings'), true);
  });
});
