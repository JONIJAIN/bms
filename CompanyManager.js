/**
 * CompanyManager.gs - Multi-Company Management System
 * Handles company creation, switching, and company-specific data management
 */

/**
 * Get company statistics and analytics
 */
function getCompanyStats(companyId) {
  try {
    const company = getCompanyById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }
    
    const stats = {
      company: company,
      quickCapture: getQuickCaptureStats(companyId),
      weeklyTasks: getWeeklyTasksStats(companyId),
      waitingList: getWaitingListStats(companyId),
      somedayList: getSomedayListStats(companyId),
      productivity: getProductivityStats(companyId),
      mvotAnalysis: getMVOTAnalysis(companyId)
    };
    
    return stats;
    
  } catch (error) {
    Logger.log('Error getting company stats: ' + error.toString());
    throw new Error('Failed to get company statistics: ' + error.message);
  }
}

/**
 * Get company by ID
 */
function getCompanyById(companyId) {
  const companies = getCompanies();
  return companies.find(c => c.id === companyId);
}

/**
 * Update company information
 */
function updateCompany(companyId, updateData) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.COMPANIES);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === companyId) {
        const row = i + 1;
        
        // Update fields if provided
        if (updateData.name) {
          sheet.getRange(row, 2).setValue(updateData.name);
        }
        if (updateData.annualTurnover) {
          sheet.getRange(row, 3).setValue(updateData.annualTurnover);
          // Recalculate MVOT
          const newMVOT = Math.round(updateData.annualTurnover / CONFIG.MVOT_CALCULATION.WORKING_HOURS_PER_YEAR);
          sheet.getRange(row, 5).setValue(newMVOT);
        }
        if (updateData.businessType) {
          sheet.getRange(row, 4).setValue(updateData.businessType);
        }
        
        // Update last modified
        sheet.getRange(row, 7).setValue(new Date().toISOString());
        
        Logger.log(`Company updated: ${companyId}`);
        return { success: true };
      }
    }
    
    throw new Error('Company not found');
    
  } catch (error) {
    Logger.log('Error updating company: ' + error.toString());
    throw new Error('Failed to update company: ' + error.message);
  }
}

/**
 * Delete a company (soft delete - mark as inactive)
 */
function deleteCompany(companyId) {
  try {
    // Check if company has any data
    const hasData = checkCompanyHasData(companyId);
    
    if (hasData) {
      throw new Error('Cannot delete company with existing data. Archive it instead.');
    }
    
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.COMPANIES);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === companyId) {
        // Instead of deleting, mark as inactive by adding a status column or moving to archive
        sheet.deleteRow(i + 1);
        Logger.log(`Company deleted: ${companyId}`);
        return { success: true };
      }
    }
    
    throw new Error('Company not found');
    
  } catch (error) {
    Logger.log('Error deleting company: ' + error.toString());
    throw new Error('Failed to delete company: ' + error.message);
  }
}

/**
 * Check if company has any associated data
 */
function checkCompanyHasData(companyId) {
  try {
    const sheets = [
      CONFIG.SHEETS.QUICK_CAPTURE,
      CONFIG.SHEETS.WEEKLY_SCHEDULE,
      CONFIG.SHEETS.WAITING_LIST,
      CONFIG.SHEETS.SOMEDAY_LIST,
      CONFIG.SHEETS.TIME_TRACKER
    ];
    
    for (let sheetName of sheets) {
      const sheet = getSpreadsheet().getSheetByName(sheetName);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === companyId) { // Company ID is in column B (index 1)
          return true;
        }
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Error checking company data: ' + error.toString());
    return true; // Err on the side of caution
  }
}

/**
 * Get Quick Capture statistics for a company
 */
function getQuickCaptureStats(companyId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.QUICK_CAPTURE);
    const data = sheet.getDataRange().getValues();
    
    let total = 0;
    let byCategory = {};
    let byPriority = { High: 0, Medium: 0, Low: 0 };
    let byStatus = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        total++;
        
        // Count by category
        const category = row[3] || 'Uncategorized';
        byCategory[category] = (byCategory[category] || 0) + 1;
        
        // Count by priority
        const priority = row[4] || 'Medium';
        byPriority[priority] = (byPriority[priority] || 0) + 1;
        
        // Count by status
        const status = row[6] || 'Unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;
      }
    }
    
    return {
      total,
      byCategory,
      byPriority,
      byStatus,
      toProcess: byStatus['To Process'] || 0
    };
    
  } catch (error) {
    Logger.log('Error getting quick capture stats: ' + error.toString());
    return { total: 0, byCategory: {}, byPriority: {}, byStatus: {}, toProcess: 0 };
  }
}

/**
 * Get Weekly Tasks statistics for a company
 */
function getWeeklyTasksStats(companyId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    let thisWeek = 0;
    let completed = 0;
    let planned = 0;
    let totalPlannedHours = 0;
    let totalActualHours = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        const taskDate = new Date(row[2]);
        
        if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
          thisWeek++;
          
          const status = row[12] || 'Planned';
          if (status === 'Completed') {
            completed++;
          } else if (status === 'Planned') {
            planned++;
          }
          
          // Parse planned duration
          const plannedDuration = row[8];
          if (plannedDuration && typeof plannedDuration === 'string') {
            const hours = parseFloat(plannedDuration.replace(/[^\d.]/g, ''));
            if (!isNaN(hours)) totalPlannedHours += hours;
          }
          
          // Calculate actual hours if start and end times exist
          const actualStart = row[9];
          const actualEnd = row[10];
          if (actualStart && actualEnd) {
            const startTime = new Date(actualStart);
            const endTime = new Date(actualEnd);
            const actualHours = (endTime - startTime) / (1000 * 60 * 60);
            totalActualHours += actualHours;
          }
        }
      }
    }
    
    return {
      thisWeek,
      completed,
      planned,
      totalPlannedHours: Math.round(totalPlannedHours * 10) / 10,
      totalActualHours: Math.round(totalActualHours * 10) / 10,
      completionRate: thisWeek > 0 ? Math.round((completed / thisWeek) * 100) : 0
    };
    
  } catch (error) {
    Logger.log('Error getting weekly tasks stats: ' + error.toString());
    return { thisWeek: 0, completed: 0, planned: 0, totalPlannedHours: 0, totalActualHours: 0, completionRate: 0 };
  }
}

/**
 * Get Waiting List statistics for a company
 */
function getWaitingListStats(companyId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const data = sheet.getDataRange().getValues();
    
    let total = 0;
    let overdue = 0;
    let thisWeek = 0;
    const today = new Date();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId && row[9] !== 'Completed') { // Company ID match and not completed
        total++;
        
        const expectedDate = new Date(row[7]);
        if (expectedDate < today) {
          overdue++;
        }
        
        const daysFromNow = (expectedDate - today) / (1000 * 60 * 60 * 24);
        if (daysFromNow >= 0 && daysFromNow <= 7) {
          thisWeek++;
        }
      }
    }
    
    return { total, overdue, thisWeek };
    
  } catch (error) {
    Logger.log('Error getting waiting list stats: ' + error.toString());
    return { total: 0, overdue: 0, thisWeek: 0 };
  }
}

/**
 * Get Someday List statistics for a company
 */
function getSomedayListStats(companyId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SOMEDAY_LIST);
    const data = sheet.getDataRange().getValues();
    
    let total = 0;
    let needReview = 0;
    const today = new Date();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId && row[8] !== 'Completed') { // Company ID match and not completed
        total++;
        
        const reviewDate = new Date(row[6]);
        if (reviewDate <= today) {
          needReview++;
        }
      }
    }
    
    return { total, needReview };
    
  } catch (error) {
    Logger.log('Error getting someday list stats: ' + error.toString());
    return { total: 0, needReview: 0 };
  }
}

/**
 * Get productivity statistics for a company
 */
function getProductivityStats(companyId) {
  try {
    const timeSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_TRACKER);
    const data = timeSheet.getDataRange().getValues();
    
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    let weeklyHours = 0;
    let monthlyHours = 0;
    let weeklyMVOTCost = 0;
    let monthlyMVOTCost = 0;
    let categoryBreakdown = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        const taskDate = new Date(row[2]);
        const actualDuration = parseFloat(row[6]) || 0;
        const mvotCost = parseFloat(row[10]) || 0;
        const category = row[4] || 'Uncategorized';
        
        // Weekly stats
        if (taskDate >= startOfWeek) {
          weeklyHours += actualDuration;
          weeklyMVOTCost += mvotCost;
        }
        
        // Monthly stats
        if (taskDate >= startOfMonth) {
          monthlyHours += actualDuration;
          monthlyMVOTCost += mvotCost;
          
          // Category breakdown
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + actualDuration;
        }
      }
    }
    
    return {
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      monthlyHours: Math.round(monthlyHours * 10) / 10,
      weeklyMVOTCost: Math.round(weeklyMVOTCost),
      monthlyMVOTCost: Math.round(monthlyMVOTCost),
      categoryBreakdown
    };
    
  } catch (error) {
    Logger.log('Error getting productivity stats: ' + error.toString());
    return { 
      weeklyHours: 0, 
      monthlyHours: 0, 
      weeklyMVOTCost: 0, 
      monthlyMVOTCost: 0, 
      categoryBreakdown: {} 
    };
  }
}

/**
 * Get MVOT analysis for a company
 */
function getMVOTAnalysis(companyId) {
  try {
    const company = getCompanyById(companyId);
    if (!company) return null;
    
    const mvot = company.mvot;
    const productivity = getProductivityStats(companyId);
    
    // Calculate efficiency metrics
    const monthlyTargetHours = CONFIG.MVOT_CALCULATION.WORKING_HOURS_PER_MONTH;
    const actualMonthlyHours = productivity.monthlyHours;
    const efficiency = actualMonthlyHours > 0 ? Math.round((actualMonthlyHours / monthlyTargetHours) * 100) : 0;
    
    // Calculate value creation
    const potentialMonthlyValue = mvot * monthlyTargetHours;
    const actualMonthlyValue = mvot * actualMonthlyHours;
    const valueGap = potentialMonthlyValue - actualMonthlyValue;
    
    return {
      mvot,
      monthlyTargetHours,
      actualMonthlyHours,
      efficiency,
      potentialMonthlyValue: Math.round(potentialMonthlyValue),
      actualMonthlyValue: Math.round(actualMonthlyValue),
      valueGap: Math.round(valueGap),
      mvotCostSpent: productivity.monthlyMVOTCost
    };
    
  } catch (error) {
    Logger.log('Error getting MVOT analysis: ' + error.toString());
    return null;
  }
}

/**
 * Export company data
 */
function exportCompanyData(companyId, includeArchived = false) {
  try {
    const company = getCompanyById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }
    
    const exportData = {
      company: company,
      exportDate: new Date().toISOString(),
      quickCapture: getCompanyDataFromSheet(CONFIG.SHEETS.QUICK_CAPTURE, companyId, includeArchived),
      weeklySchedule: getCompanyDataFromSheet(CONFIG.SHEETS.WEEKLY_SCHEDULE, companyId, includeArchived),
      waitingList: getCompanyDataFromSheet(CONFIG.SHEETS.WAITING_LIST, companyId, includeArchived),
      somedayList: getCompanyDataFromSheet(CONFIG.SHEETS.SOMEDAY_LIST, companyId, includeArchived),
      timeTracker: getCompanyDataFromSheet(CONFIG.SHEETS.TIME_TRACKER, companyId, includeArchived)
    };
    
    return exportData;
    
  } catch (error) {
    Logger.log('Error exporting company data: ' + error.toString());
    throw new Error('Failed to export company data: ' + error.message);
  }
}

/**
 * Get company data from a specific sheet
 */
function getCompanyDataFromSheet(sheetName, companyId, includeArchived) {
  try {
    const sheet = getSpreadsheet().getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const companyData = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        // Skip archived items unless specifically requested
        if (!includeArchived && row[headers.indexOf('Status')] === 'Archived') {
          continue;
        }
        
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        companyData.push(rowData);
      }
    }
    
    return companyData;
    
  } catch (error) {
    Logger.log(`Error getting data from ${sheetName}: ` + error.toString());
    return [];
  }
}

/**
 * Get company dashboard data
 */
function getCompanyDashboard(companyId) {
  try {
    const stats = getCompanyStats(companyId);
    const upcomingTasks = getUpcomingTasks(companyId, 7); // Next 7 days
    const recentActivity = getRecentActivity(companyId, 7); // Last 7 days
    
    return {
      stats,
      upcomingTasks,
      recentActivity,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Error getting company dashboard: ' + error.toString());
    throw new Error('Failed to load company dashboard: ' + error.message);
  }
}

/**
 * Get upcoming tasks for a company
 */
function getUpcomingTasks(companyId, days = 7) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    
    const today = new Date();
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const upcomingTasks = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId && row[12] === 'Planned') { // Company ID match and status is Planned
        const taskDate = new Date(row[2]);
        if (taskDate >= today && taskDate <= futureDate) {
          upcomingTasks.push({
            id: row[0],
            date: row[2],
            day: row[3],
            timeBlock: row[4],
            taskName: row[5],
            category: row[6],
            priority: row[7],
            duration: row[8]
          });
        }
      }
    }
    
    // Sort by date
    upcomingTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return upcomingTasks;
    
  } catch (error) {
    Logger.log('Error getting upcoming tasks: ' + error.toString());
    return [];
  }
}

/**
 * Get recent activity for a company
 */
function getRecentActivity(companyId, days = 7) {
  try {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const activity = [];
    
    // Get recent captures
    const captureSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.QUICK_CAPTURE);
    const captureData = captureSheet.getDataRange().getValues();
    
    for (let i = 1; i < captureData.length; i++) {
      const row = captureData[i];
      if (row[1] === companyId && new Date(row[7]) >= cutoffDate) {
        activity.push({
          type: 'Task Captured',
          description: row[2],
          timestamp: row[7],
          category: row[3]
        });
      }
    }
    
    // Get recent completions
    const scheduleSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const scheduleData = scheduleSheet.getDataRange().getValues();
    
    for (let i = 1; i < scheduleData.length; i++) {
      const row = scheduleData[i];
      if (row[1] === companyId && row[12] === 'Completed' && new Date(row[2]) >= cutoffDate) {
        activity.push({
          type: 'Task Completed',
          description: row[5],
          timestamp: row[2],
          category: row[6]
        });
      }
    }
    
    // Sort by timestamp descending
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return activity.slice(0, 20); // Return latest 20 activities
    
  } catch (error) {
    Logger.log('Error getting recent activity: ' + error.toString());
    return [];
  }
}