import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  complianceRules,
  calculateComplianceScore,
  evaluateAuditChecklist
} from '../src/complianceEngine.js';

describe('EY Compliance & Governance Engine', () => {
  it('should have predefined enterprise compliance rules loaded', () => {
    assert.ok(Array.isArray(complianceRules));
    assert.ok(complianceRules.length >= 5, 'Should have at least 5 governance rules defined');
    
    // Check required fields on each rule
    for (const rule of complianceRules) {
      assert.ok(rule.id, 'Rule must have an ID');
      assert.ok(rule.framework, 'Rule must belong to a regulatory framework');
      assert.ok(rule.title, 'Rule must have a descriptive title');
      assert.ok(rule.status, 'Rule must specify status');
      assert.ok(rule.severity, 'Rule must specify severity level');
    }
  });

  it('should calculate 100% score when all rules pass', () => {
    const mockRules = [
      { id: 'R1', status: 'PASS' },
      { id: 'R2', status: 'PASS' },
      { id: 'R3', status: 'PASS' }
    ];
    const score = calculateComplianceScore(mockRules);
    assert.equal(score, 100);
  });

  it('should compute proportionate compliance score on partial passes', () => {
    const mockRules = [
      { id: 'R1', status: 'PASS' },
      { id: 'R2', status: 'FAIL' },
      { id: 'R3', status: 'PASS' },
      { id: 'R4', status: 'WARNING' }
    ];
    // 2 out of 4 = 50%
    const score = calculateComplianceScore(mockRules);
    assert.equal(score, 50);
  });

  it('should return empty score if rule list is empty', () => {
    assert.equal(calculateComplianceScore([]), 0);
  });

  it('should generate full audit report with optimal status normally', () => {
    const report = evaluateAuditChecklist(false);
    assert.ok(report.score >= 80, 'Standard score should be >= 80%');
    assert.equal(report.status, 'OPTIMAL');
    assert.ok(report.evaluatedAt);
    assert.equal(report.failedRules, 0);
  });

  it('should flag attention and warnings when incident simulation is active', () => {
    const report = evaluateAuditChecklist(true);
    assert.ok(report.warningRules > 0, 'Warning rules should be greater than 0 during incident');
    const degradedRule = report.rules.find(r => r.id === 'ZTNA-04');
    assert.ok(degradedRule, 'ZTNA-04 should exist');
    assert.equal(degradedRule.status, 'WARNING');
  });
});
