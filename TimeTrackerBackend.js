/**
 * TimeTrackerBackend.gs - Time Tracking Backend Implementation
 * Alternative filename to avoid conflicts with existing TimeTracker.gs
 * Handles time logging, MVOT calculations, and productivity analytics
 * Supports the BMP principle of tracking actual vs planned time
 */

/**
 * Start tracking a task
 */
function startTaskTracking(taskId) {
  try {
    // Update task status to "In Progress"
    updateScheduledTask(taskId, {
      status: 'In Progress',
      actualStart: new Date().toISOString()
    });
    
    // Log the start event
    Logger.log(`Task tracking started: ${taskId}`);
    return { success: true, startTime: new Date().toISOString() };
    
  } catch (error) {
    Logger.log('Error starting task tracking: ' + error.toString());
    throw new Error('Failed to start task tracking: ' + error.message);
  }
}

/**
 * Stop tracking a task
 */
function stopTaskTracking(taskId, actualEndTime = null) {
  try {
    const endTime = actualEndTime || new Date().toISOString();
    
    // Update task with end time
    updateScheduledTask(taskId, {
      status: 'Completed',
      actualEnd: endTime
    });
    
    Logger.log(`Task tracking stopped: ${taskId}`);
    return { success: true, endTime: endTime };
    
  } catch (error) {
    Logger.log('Error stopping task tracking: ' + error.toString());
    throw new Error('Failed to stop task tracking: ' + error.message);
  }
}

/**
 * Log a time entry manually or from timer
 */
function logManualTimeEntry(timeData) {
  try {
    const timeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_TRACKER);
    const id = generateUniqueId();
    
    const newRow = [
      id,
      timeData.companyId,
      timeData.date,
      timeData.taskName,
      timeData.category,
      timeData.plannedDuration,
      timeData.actualDuration,
      timeData.startTime,
      timeData.endTime,
      timeData.notes || '',
      timeData.mvotCost
    ];
    
    timeSheet.appendRow(newRow);
    
    Logger.log(`Manual time entry logged: ${timeData.taskName}`);
    return { success: true, id: id };
    
  } catch (error) {
    Logger.log('Error logging manual time entry: ' + error.toString());
    throw new Error('Failed to log time entry: ' + error.message);
  }
}

/**
 * Get time entries for a company
 */
function getTimeEntries(companyId, limit = 50, offset = 0) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_TRACKER);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const entries = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        entries.push({
          id: row[0],
          companyId: row[1],
          date: row[2],
          taskName: row[3],
          category: row[4],
          plannedDuration: parseFloat(row[5]) || 0,
          actualDuration: parseFloat(row[6]) || 0,
          startTime: formatTimeString(row[7]),
          endTime: formatTimeString(row[8]),
          notes: row[9],
          mvotCost: parseFloat(row[10]) || 0
        });
      }
    }
    
    // Sort by date/time descending
    entries.sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime));
    
    // Apply limit and offset
    return entries.slice(offset, offset + limit);
    
  } catch (error) {
    Logger.log('Error getting time entries: ' + error.toString());
    throw new Error('Failed to get time entries: ' + error.message);
  }
}

/**
 * Get daily time statistics for a company
 */
function getDailyTimeStats(companyId, date) {
  try {
    const targetDate = new Date(date);
    const entries = getTimeEntriesForDate(companyId, targetDate);
    
    let totalPlannedTime = 0;
    let totalActualTime = 0;
    let totalMVOTCost = 0;
    let tasksCompleted = 0;
    let accuracySum = 0;
    let validAccuracyCount = 0;
    const categoryBreakdown = {};
    
    entries.forEach(entry => {
      totalPlannedTime += entry.plannedDuration;
      totalActualTime += entry.actualDuration;
      totalMVOTCost += entry.mvotCost;
      tasksCompleted++;
      
      // Calculate accuracy for this entry
      if (entry.plannedDuration > 0) {
        const accuracy = calculateTimeAccuracy(entry.plannedDuration, entry.actualDuration);
        accuracySum += accuracy;
        validAccuracyCount++;
      }
      
      // Category breakdown
      const category = entry.category || 'Uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + entry.actualDuration;
    });
    
    // Calculate overall efficiency (actual vs planned productivity)
    const efficiency = totalPlannedTime > 0 ? 
      Math.min(100, Math.round((totalActualTime / totalPlannedTime) * 100)) : 0;
    
    // Calculate average estimation accuracy
    const estimationAccuracy = validAccuracyCount > 0 ? 
      Math.round(accuracySum / validAccuracyCount) : 0;
    
    const stats = {
      date: date,
      plannedTime: Math.round(totalPlannedTime * 10) / 10,
      actualTime: Math.round(totalActualTime * 10) / 10,
      hoursWorked: Math.round(totalActualTime * 10) / 10,
      mvotCost: totalMVOTCost,
      tasksCompleted: tasksCompleted,
      efficiency: efficiency,
      estimationAccuracy: estimationAccuracy,
      categoryBreakdown: categoryBreakdown,
      productivity: calculateProductivityScore(totalPlannedTime, totalActualTime, tasksCompleted)
    };
    
    return stats;
    
  } catch (error) {
    Logger.log('Error getting daily time stats: ' + error.toString());
    throw new Error('Failed to get daily time statistics: ' + error.message);
  }
}

/**
 * Get time entries for a specific date
 */
function getTimeEntriesForDate(companyId, date) {
  const dateString = date.toISOString().split('T')[0];
  const allEntries = getTimeEntries(companyId, 1000); // Get all entries
  
  return allEntries.filter(entry => entry.date === dateString);
}

/**
 * Calculate time estimation accuracy
 */
function calculateTimeAccuracy(plannedHours, actualHours) {
  if (plannedHours === 0) return 100;
  
  const difference = Math.abs(plannedHours - actualHours);
  const accuracy = Math.max(0, 100 - (difference / plannedHours) * 100);
  
  return Math.round(accuracy);
}

/**
 * Calculate productivity score
 */
function calculateProductivityScore(plannedTime, actualTime, tasksCompleted) {
  if (plannedTime === 0 || actualTime === 0) return 0;
  
  // Base score: how close actual time is to planned time
  const timeEfficiency = Math.max(0, 100 - Math.abs(plannedTime - actualTime) / plannedTime * 100);
  
  // Task completion bonus
  const taskBonus = Math.min(20, tasksCompleted * 2);
  
  // Final score
  const score = Math.min(100, timeEfficiency + taskBonus);
  
  return Math.round(score);
}

/**
 * Get weekly time analytics
 */
function getWeeklyTimeAnalytics(companyId, weekStartDate) {
  try {
    const startDate = new Date(weekStartDate);
    const analytics = {
      weekStart: weekStartDate,
      dailyStats: [],
      weeklyTotals: {
        plannedTime: 0,
        actualTime: 0,
        mvotCost: 0,
        tasksCompleted: 0,
        avgEfficiency: 0,
        avgAccuracy: 0
      },
      trends: {},
      insights: []
    };
    
    // Get daily stats for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayStats = getDailyTimeStats(companyId, currentDate.toISOString().split('T')[0]);
      dayStats.dayName = getDayName(currentDate);
      
      analytics.dailyStats.push(dayStats);
      
      // Add to weekly totals
      analytics.weeklyTotals.plannedTime += dayStats.plannedTime;
      analytics.weeklyTotals.actualTime += dayStats.actualTime;
      analytics.weeklyTotals.mvotCost += dayStats.mvotCost;
      analytics.weeklyTotals.tasksCompleted += dayStats.tasksCompleted;
    }
    
    // Calculate averages
    const validDays = analytics.dailyStats.filter(day => day.actualTime > 0).length;
    if (validDays > 0) {
      analytics.weeklyTotals.avgEfficiency = Math.round(
        analytics.dailyStats.reduce((sum, day) => sum + day.efficiency, 0) / validDays
      );
      analytics.weeklyTotals.avgAccuracy = Math.round(
        analytics.dailyStats.reduce((sum, day) => sum + day.estimationAccuracy, 0) / validDays
      );
    }
    
    // Generate insights
    analytics.insights = generateWeeklyInsights(analytics);
    
    return analytics;
    
  } catch (error) {
    Logger.log('Error getting weekly time analytics: ' + error.toString());
    throw new Error('Failed to get weekly analytics: ' + error.message);
  }
}

/**
 * Generate insights from weekly analytics
 */
function generateWeeklyInsights(analytics) {
  const insights = [];
  
  // MVOT Cost Analysis
  const company = getCompanyById(analytics.dailyStats[0]?.companyId);
  if (company && analytics.weeklyTotals.mvotCost > 0) {
    const potentialWeeklyValue = company.mvot * 40; // Assuming 40-hour work week
    const actualWeeklyValue = company.mvot * analytics.weeklyTotals.actualTime;
    const valueGap = potentialWeeklyValue - actualWeeklyValue;
    
    if (valueGap > 0) {
      insights.push({
        type: 'mvot_gap',
        title: 'MVOT Value Gap Identified',
        description: `You have a potential value gap of ₹${Math.round(valueGap).toLocaleString()} this week`,
        impact: 'High',
        recommendation: 'Focus on increasing productive hours or optimizing time allocation'
      });
    }
  }
  
  // Efficiency Trend
  const efficiencyTrend = calculateTrend(analytics.dailyStats.map(d => d.efficiency));
  if (efficiencyTrend < -10) {
    insights.push({
      type: 'efficiency_decline',
      title: 'Declining Efficiency Trend',
      description: 'Your efficiency has decreased over the week',
      impact: 'Medium',
      recommendation: 'Review task planning and eliminate distractions'
    });
  } else if (efficiencyTrend > 10) {
    insights.push({
      type: 'efficiency_improvement',
      title: 'Improving Efficiency',
      description: 'Your efficiency is trending upward this week',
      impact: 'Positive',
      recommendation: 'Continue current practices and identify what\'s working well'
    });
  }
  
  // Time Estimation Accuracy
  if (analytics.weeklyTotals.avgAccuracy < 70) {
    insights.push({
      type: 'estimation_accuracy',
      title: 'Low Time Estimation Accuracy',
      description: `Your average estimation accuracy is ${analytics.weeklyTotals.avgAccuracy}%`,
      impact: 'Medium',
      recommendation: 'Track more detailed time data to improve future estimates'
    });
  }
  
  // Best Performing Day
  const bestDay = analytics.dailyStats.reduce((best, current) => 
    current.productivity > best.productivity ? current : best
  );
  
  if (bestDay.productivity > 0) {
    insights.push({
      type: 'best_day',
      title: `${bestDay.dayName} was your most productive day`,
      description: `Productivity score: ${bestDay.productivity}%, Tasks completed: ${bestDay.tasksCompleted}`,
      impact: 'Positive',
      recommendation: 'Analyze what made this day successful and replicate the pattern'
    });
  }
  
  return insights;
}

/**
 * Calculate trend from array of values
 */
function calculateTrend(values) {
  if (values.length < 2) return 0;
  
  const validValues = values.filter(v => v > 0);
  if (validValues.length < 2) return 0;
  
  const firstHalf = validValues.slice(0, Math.floor(validValues.length / 2));
  const secondHalf = validValues.slice(Math.floor(validValues.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  return ((secondAvg - firstAvg) / firstAvg) * 100;
}

/**
 * Format time string for display
 */
function formatTimeString(timeValue) {
  if (!timeValue) return '';
  
  // If it's already a time string, return as is
  if (typeof timeValue === 'string' && timeValue.includes(':')) {
    return timeValue;
  }
  
  // If it's a full datetime, extract time
  try {
    const date = new Date(timeValue);
    return date.toTimeString().substr(0, 5); // HH:MM
  } catch (error) {
    return timeValue.toString();
  }
}

/**
 * Get MVOT analysis for a company
 */
function getMVOTAnalysis(companyId, periodDays = 30) {
  try {
    const company = getCompanyById(companyId);
    if (!company) throw new Error('Company not found');
    
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - periodDays);
    
    // Get all time entries for the period
    const timeEntries = getTimeEntriesForPeriod(companyId, startDate, endDate);
    
    let totalActualHours = 0;
    let totalMVOTCost = 0;
    let totalPlannedHours = 0;
    const categoryAnalysis = {};
    
    timeEntries.forEach(entry => {
      totalActualHours += entry.actualDuration;
      totalMVOTCost += entry.mvotCost;
      totalPlannedHours += entry.plannedDuration;
      
      const category = entry.category || 'Uncategorized';
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          hours: 0,
          cost: 0,
          efficiency: 0,
          taskCount: 0
        };
      }
      
      categoryAnalysis[category].hours += entry.actualDuration;
      categoryAnalysis[category].cost += entry.mvotCost;
      categoryAnalysis[category].taskCount += 1;
    });
    
    // Calculate efficiency by category
    Object.keys(categoryAnalysis).forEach(category => {
      const categoryData = categoryAnalysis[category];
      categoryData.efficiency = categoryData.hours > 0 ? 
        Math.round((categoryData.cost / (categoryData.hours * company.mvot)) * 100) : 0;
    });
    
    const analysis = {
      company: company,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: periodDays
      },
      mvot: company.mvot,
      totals: {
        actualHours: Math.round(totalActualHours * 10) / 10,
        plannedHours: Math.round(totalPlannedHours * 10) / 10,
        mvotCost: Math.round(totalMVOTCost),
        averageHoursPerDay: Math.round((totalActualHours / periodDays) * 10) / 10
      },
      potential: {
        maxDailyHours: 8,
        maxPeriodHours: 8 * periodDays,
        maxPeriodValue: 8 * periodDays * company.mvot,
        utilizationRate: Math.round((totalActualHours / (8 * periodDays)) * 100)
      },
      gaps: {
        hourGap: (8 * periodDays) - totalActualHours,
        valueGap: (8 * periodDays * company.mvot) - totalMVOTCost
      },
      categoryAnalysis: categoryAnalysis,
      recommendations: generateMVOTRecommendations(categoryAnalysis, totalActualHours, company.mvot)
    };
    
    return analysis;
    
  } catch (error) {
    Logger.log('Error getting MVOT analysis: ' + error.toString());
    throw new Error('Failed to get MVOT analysis: ' + error.message);
  }
}

/**
 * Get time entries for a specific period
 */
function getTimeEntriesForPeriod(companyId, startDate, endDate) {
  const allEntries = getTimeEntries(companyId, 10000); // Get all entries
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];
  
  return allEntries.filter(entry => 
    entry.date >= startDateString && entry.date <= endDateString
  );
}

/**
 * Generate MVOT-based recommendations
 */
function generateMVOTRecommendations(categoryAnalysis, totalHours, mvotRate) {
  const recommendations = [];
  
  // Find highest cost categories
  const categoriesByValue = Object.entries(categoryAnalysis)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 3);
  
  categoriesByValue.forEach(([category, data], index) => {
    if (data.hours > 0) {
      const hourlyEfficiency = data.cost / data.hours;
      
      if (hourlyEfficiency < mvotRate * 0.7) {
        recommendations.push({
          type: 'low_efficiency',
          category: category,
          priority: index + 1,
          description: `${category} tasks are running below optimal MVOT efficiency`,
          impact: `₹${Math.round(data.cost - (data.hours * mvotRate * 0.8)).toLocaleString()} potential savings`,
          action: 'Consider batching, automation, or delegation for this category'
        });
      }
    }
  });
  
  // Overall utilization recommendation
  const maxPossibleHours = totalHours / 0.8; // Assuming 80% utilization is optimal
  if (totalHours < maxPossibleHours * 0.6) {
    recommendations.push({
      type: 'low_utilization',
      category: 'Overall',
      priority: 1,
      description: 'Low overall time utilization detected',
      impact: `₹${Math.round((maxPossibleHours - totalHours) * mvotRate).toLocaleString()} opportunity cost`,
      action: 'Increase productive hours or review time tracking accuracy'
    });
  }
  
  return recommendations;
}