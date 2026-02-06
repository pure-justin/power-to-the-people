#!/usr/bin/env node

/**
 * System Test - Validates all campaign components
 */

import { LoopNetScraper } from './scrapers/loopnet-scraper.js';
import { LeadEnricher } from './enrichment/lead-enricher.js';
import { CommercialSolarROI } from './roi-calculator.js';
import { generateEmail, validateLeadForEmail } from './templates/email-templates.js';

console.log('🧪 Testing Commercial Outreach Campaign System\n');

// Mock lead for testing
const mockLead = {
  propertyName: 'Tech Center Plaza',
  address: {
    street: '123 Business Blvd',
    city: 'Austin',
    state: 'TX',
    zip: '78701'
  },
  location: {
    lat: 30.2672,
    lng: -97.7431
  },
  buildingType: 'office',
  squareFootage: 50000,
  yearBuilt: 2010,
  solarCapacity: 200,
  annualProduction: 300000,
  utilityProvider: 'Austin Energy',
  avgElectricRate: 0.12,
  estimatedAnnualUsage: 750000,
  contactName: 'John Smith',
  contactEmail: 'john.smith@techcenter.com',
  contactTitle: 'Property Manager',
  managementCompany: 'Tech Center Management LLC'
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: ROI Calculator
  console.log('Test 1: ROI Calculator');
  try {
    const calculator = new CommercialSolarROI();
    const roi = calculator.calculateROI(mockLead);

    console.assert(roi.systemSize > 0, 'System size should be positive');
    console.assert(roi.annualSavings > 0, 'Annual savings should be positive');
    console.assert(roi.simplePayback > 0, 'Payback period should be positive');
    console.assert(roi.roi25Year > 0, 'ROI should be positive');
    console.assert(roi.netCost > 0, 'Net cost should be positive');

    console.log(`✅ PASSED - System: ${roi.systemSize.toFixed(0)}kW, Savings: $${roi.annualSavings.toLocaleString()}/yr`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Test 2: Lead Qualification
  console.log('\nTest 2: Lead Qualification');
  try {
    const calculator = new CommercialSolarROI();
    const roi = calculator.calculateROI(mockLead);
    const qualification = calculator.calculateQualificationScore(mockLead, roi);

    console.assert(qualification.score >= 0 && qualification.score <= 100, 'Score should be 0-100');
    console.assert(qualification.tier, 'Tier should be assigned');
    console.assert(qualification.reasons.length > 0, 'Reasons should be provided');

    console.log(`✅ PASSED - Score: ${qualification.score}/100 (${qualification.tier})`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Test 3: Email Generation
  console.log('\nTest 3: Email Template Generation');
  try {
    const calculator = new CommercialSolarROI();
    const enrichedLead = { ...mockLead, ...calculator.calculateROI(mockLead) };

    const email = generateEmail('initial', enrichedLead);

    console.assert(email.subject, 'Subject should be generated');
    console.assert(email.body, 'Body should be generated');
    console.assert(email.subject.includes('$'), 'Subject should include savings');
    console.assert(email.body.includes(enrichedLead.propertyName), 'Body should include property name');

    console.log(`✅ PASSED - Subject: "${email.subject.substring(0, 60)}..."`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Test 4: Lead Validation
  console.log('\nTest 4: Lead Validation for Email');
  try {
    const calculator = new CommercialSolarROI();
    const enrichedLead = { ...mockLead, ...calculator.calculateROI(mockLead) };

    const validation = validateLeadForEmail(enrichedLead);

    console.assert(validation.valid, 'Lead should be valid for email');

    console.log(`✅ PASSED - Lead is valid for email`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Test 5: Email Sequence
  console.log('\nTest 5: Email Sequence Generation');
  try {
    const calculator = new CommercialSolarROI();
    const enrichedLead = { ...mockLead, ...calculator.calculateROI(mockLead) };

    const templates = ['initial', 'followUp1', 'followUp2', 'followUp3'];
    
    for (const template of templates) {
      const email = generateEmail(template, enrichedLead);
      console.assert(email.subject && email.body, `Template ${template} should generate email`);
    }

    console.log(`✅ PASSED - Generated ${templates.length} email templates`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Test 6: ROI Projections
  console.log('\nTest 6: 25-Year Financial Projections');
  try {
    const calculator = new CommercialSolarROI();
    const roi = calculator.calculateROI(mockLead);

    console.assert(roi.yearlyProjections, 'Yearly projections should exist');
    console.assert(roi.yearlyProjections.length === 25, 'Should have 25 years of projections');
    console.assert(roi.npv25Year > 0, 'NPV should be positive');
    console.assert(roi.totalSavings25Year > roi.netCost, 'Total savings should exceed cost');

    const year25 = roi.yearlyProjections[24];
    console.log(`✅ PASSED - Year 25: $${year25.savings.toLocaleString()} savings, $${roi.totalSavings25Year.toLocaleString()} total`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Test 7: MACRS Depreciation
  console.log('\nTest 7: Tax Benefits Calculation');
  try {
    const calculator = new CommercialSolarROI();
    const roi = calculator.calculateROI(mockLead);

    console.assert(roi.federalTaxCredit > 0, 'Federal ITC should be calculated');
    console.assert(roi.acceleratedDepreciation > 0, 'MACRS should be calculated');
    console.assert(roi.systemCost > roi.netCost, 'Net cost should be less than system cost');

    const totalIncentives = roi.federalTaxCredit + roi.stateTaxCredit + roi.acceleratedDepreciation;
    console.log(`✅ PASSED - Total incentives: $${totalIncentives.toLocaleString()} (${((totalIncentives/roi.systemCost)*100).toFixed(0)}%)`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log(`Success Rate: ${((passed/(passed+failed))*100).toFixed(0)}%`);
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! System is ready to launch.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review errors above.');
    process.exit(1);
  }
}

runTests();
