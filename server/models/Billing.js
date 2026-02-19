/**
 * Billing Model
 * Handles billing data operations
 */

const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR } = require('../config/database');

// Read user billing data
const readBilling = async (userId) => {
  if (!userId) {
    console.error('readBilling called without userId');
    return [];
  }
  
  const userBillingFile = path.join(DATA_DIR, userId, 'billing.json');
  try {
    const data = await fs.readFile(userBillingFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Write user billing data
const writeBilling = async (userId, billing) => {
  const userBillingFile = path.join(DATA_DIR, userId, 'billing.json');
  await fs.writeFile(userBillingFile, JSON.stringify(billing, null, 2));
};

// Add billing activity
const addBillingActivity = async (userId, activityData) => {
  const billing = await readBilling(userId);
  billing.push(activityData);
  await writeBilling(userId, billing);
  return activityData;
};

// Get billing summary for a period
const getBillingSummary = async (userId, startDate, endDate) => {
  const billing = await readBilling(userId);
  
  const filteredActivities = billing.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    return activityDate >= startDate && activityDate <= endDate;
  });
  
  const summary = {
    totalCost: 0,
    activities: filteredActivities.length,
    breakdown: {}
  };
  
  filteredActivities.forEach(activity => {
    summary.totalCost += activity.cost || 0;
    
    if (!summary.breakdown[activity.type]) {
      summary.breakdown[activity.type] = {
        count: 0,
        cost: 0
      };
    }
    
    summary.breakdown[activity.type].count++;
    summary.breakdown[activity.type].cost += activity.cost || 0;
  });
  
  return summary;
};

module.exports = {
  readBilling,
  writeBilling,
  addBillingActivity,
  getBillingSummary
};