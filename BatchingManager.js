/**
 * BatchingManager.gs - Implementation of "The MAGIC of Batching"
 * Core principle: Multi-tasking is the worst destroyer of TIME
 * Groups similar tasks together for efficient processing
 * 
 * Based on BMP methodology:
 * 1) Meetings – Vendor, Clients, Staff
 * 2) Documentation - Anything documentary (Monday batch)
 * 3) Follow ups & Coordination
 * 4) Emails & Others
 */

/**
 * Batch configuration based on BMP methodology
 */
const BATCHING_CONFIG = {
  categories: {
    'Meetings': {
      name: 'Meetings',
      description: 'Vendor, Clients, Staff meetings',
      recommendedDay: 'Wednesday',
      recommendedTimeBlock: '14:00-16:00',
      batchSize: 'All weekly meetings',
      color: '#28a745',
      icon: 'fas fa-users'
    },
    'Documentation': {
      name: 'Documentation',
      description: 'Signing of cheques, All Approvals, Reports',
      recommendedDay: 'Monday',
      recommendedTimeBlock: '09:00-12:00',
      batchSize: 'Monday File - All weekly docs',
      color: '#dc3545',
      icon: 'fas fa-file-alt'
    },
    'Follow-ups': {
      name: 'Follow ups & Coordination',
      description: 'All coordination and follow-up tasks',
      recommendedDay: 'Thursday',
      recommendedTimeBlock: '14:00-15:30',
      batchSize: '1.5 hours batch',
      color: '#17a2b8',
      icon: 'fas fa-phone'
    },
    'Emails': {
      name: 'Emails & Others',
      description: 'All communication and miscellaneous tasks',
      recommendedDay: 'Friday',
      recommendedTimeBlock: '14:00-15:00',
      batchSize: '1 hour batch',
      color: '#6f42c1',
      icon: 'fas fa-envelope'
    },
    'Business Development': {
      name: 'Tuesday Magic',
      description: 'Auto-pilot systems development',
      recommendedDay: 'Tuesday',
      recommendedTimeBlock: '08:00-12:00',
      batchSize: '4 hours dedicated',
      color: '#ffc107',
      icon: 'fas fa-magic'
    }
  },
  
  batchingRules: {
    minBatchSize: 3, // Minimum tasks to form a batch
    maxBatchDuration: 4, // Maximum hours per batch
    breakDuration: 0.25, // 15 minutes break between batches
    bufferTime: 0.5 // 30 minutes buffer for unexpected items
  }
};

/**
 * Analyze tasks and suggest optimal batching
 */
function analyzeTasksForBatching(companyId, weekStartDate) {
  try {
    // Get all tasks for the week
    const weekTasks = getWeeklyTasks(companyId, weekStartDate);
    const unscheduledTasks = getCapturedTasks(companyId);
    
    const analysis = {
      totalTasks: weekTasks.length + unscheduledTasks.length,
      batchingOpportunities: {},
      recommendations: [],
      timeWastePreventions: [],
      efficiencyGains: {}
    };
    
    // Combine all tasks for analysis
    const allTasks = [...weekTasks, ...unscheduledTasks];
    
    // Group tasks by category
    const tasksByCategory = groupTasksByCategory(allTasks);
    
    // Analyze each category for batching opportunities
    Object.keys(tasksByCategory).forEach(category => {
      const categoryTasks = tasksByCategory[category];
      const batchConfig = BATCHING_CONFIG.categories[category];
      
      if (batchConfig && categoryTasks.length >= BATCHING_CONFIG.batchingRules.minBatchSize) {
        analysis.batchingOpportunities[category] = {
          taskCount: categoryTasks.length,
          estimatedTimeSpent: calculateEstimatedTime(categoryTasks),
          currentlyScheduled: categoryTasks.filter(t => t.status === 'Planned').length,
          batchRecommendation: generateBatchRecommendation(category, categoryTasks, batchConfig)
        };
      }
    });
    
    // Generate specific recommendations
    analysis.recommendations = generateBatchingRecommendations(tasksByCategory);
    
    // Calculate time waste prevention
    analysis.timeWastePreventions = calculateTimeWastePrevention(tasksByCategory);
    
    // Calculate efficiency gains
    analysis.efficiencyGains = calculateEfficiencyGains(tasksByCategory);
    
    Logger.log(`Batching analysis completed for ${companyId}: ${JSON.stringify(analysis)}`);
    return analysis;
    
  } catch (error) {
    Logger.log('Error analyzing tasks for batching: ' + error.toString());
    throw new Error('Failed to analyze tasks for batching: ' + error.message);
  }
}

/**
 * Get weekly tasks for analysis
 */
function getWeeklyTasks(companyId, weekStartDate) {
  try {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    
    const tasks = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        const taskDate = new Date(row[2]);
        if (taskDate >= startDate && taskDate <= endDate) {
          tasks.push({
            id: row[0],
            companyId: row[1],
            date: row[2],
            day: row[3],
            timeBlock: row[4],
            name: row[5],
            category: row[6],
            priority: row[7],
            plannedDuration: row[8],
            status: row[12],
            source: 'scheduled'
          });
        }
      }
    }
    
    return tasks;
    
  } catch (error) {
    Logger.log('Error getting weekly tasks: ' + error.toString());
    return [];
  }
}

/**
 * Group tasks by category for batching analysis
 */
function groupTasksByCategory(tasks) {
  const grouped = {};
  
  tasks.forEach(task => {
    const category = task.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(task);
  });
  
  return grouped;
}

/**
 * Calculate estimated time for tasks
 */
function calculateEstimatedTime(tasks) {
  let totalHours = 0;
  
  tasks.forEach(task => {
    if (task.plannedDuration) {
      const hours = parseFloat(task.plannedDuration.replace(/[^\d.]/g, '')) || 1;
      totalHours += hours;
    } else {
      totalHours += 1; // Default 1 hour for unestimated tasks
    }
  });
  
  return Math.round(totalHours * 10) / 10; // Round to 1 decimal
}

/**
 * Generate batch recommendation for a category
 */
function generateBatchRecommendation(category, tasks, batchConfig) {
  const totalTime = calculateEstimatedTime(tasks);
  const batchDuration = Math.min(totalTime + BATCHING_CONFIG.batchingRules.bufferTime, 
                                BATCHING_CONFIG.batchingRules.maxBatchDuration);
  
  return {
    recommendedDay: batchConfig.recommendedDay,
    recommendedTime: batchConfig.recommendedTimeBlock,
    batchDuration: batchDuration,
    taskCount: tasks.length,
    efficiency: calculateBatchEfficiency(tasks.length, totalTime),
    contextSwitchingSaved: calculateContextSwitchingSaved(tasks.length),
    implementation: generateImplementationPlan(category, tasks, batchConfig)
  };
}

/**
 * Calculate batch efficiency improvement
 */
function calculateBatchEfficiency(taskCount, totalTime) {
  // Context switching overhead: approximately 10-15 minutes per switch
  const contextSwitchOverhead = (taskCount - 1) * 0.25; // 15 minutes in hours
  const batchedTime = totalTime;
  const unbatchedTime = totalTime + contextSwitchOverhead;
  
  const efficiency = ((unbatchedTime - batchedTime) / unbatchedTime) * 100;
  return Math.round(efficiency);
}

/**
 * Calculate context switching time saved
 */
function calculateContextSwitchingSaved(taskCount) {
  if (taskCount <= 1) return 0;
  
  // Average context switching time: 15 minutes per switch
  const switchingMinutes = (taskCount - 1) * 15;
  return Math.round(switchingMinutes / 60 * 10) / 10; // Convert to hours, round to 1 decimal
}

/**
 * Generate specific batching recommendations
 */
function generateBatchingRecommendations(tasksByCategory) {
  const recommendations = [];
  
  // Monday File Recommendation (Documentation)
  if (tasksByCategory['Documentation'] && tasksByCategory['Documentation'].length > 0) {
    recommendations.push({
      type: 'Monday File',
      priority: 'High',
      category: 'Documentation',
      description: 'Create a Monday File system - All documents of the week should come to you at the beginning of the week',
      implementation: 'Schedule all approval tasks, report reviews, and administrative work for Monday 9:00-12:00',
      tasks: tasksByCategory['Documentation'].length,
      timeBlocked: '3 hours',
      benefit: 'Eliminates daily administrative interruptions and follows "Eat the Frog" principle'
    });
  }
  
  // Tuesday Magic Recommendation
  if (tasksByCategory['Business Development'] && tasksByCategory['Business Development'].length > 0) {
    recommendations.push({
      type: 'Tuesday Magic',
      priority: 'Critical',
      category: 'Business Development',
      description: 'Dedicate 4 hours every Tuesday 8am-12pm for auto-pilot systems development',
      implementation: 'Block Tuesday morning in a coffee shop without mobile phone for deep work',
      tasks: tasksByCategory['Business Development'].length,
      timeBlocked: '4 hours',
      benefit: 'Builds systems that create freedom for the rest of your life'
    });
  }
  
  // Meetings Batch Recommendation
  if (tasksByCategory['Meetings'] && tasksByCategory['Meetings'].length >= 3) {
    recommendations.push({
      type: 'Meeting Batch',
      priority: 'High',
      category: 'Meetings',
      description: 'Batch all vendor, client, and staff meetings into specific time blocks',
      implementation: 'Schedule all meetings for Wednesday 2:00-4:00 PM or designated meeting blocks',
      tasks: tasksByCategory['Meetings'].length,
      timeBlocked: '2-3 hours',
      benefit: `Eliminates ${calculateContextSwitchingSaved(tasksByCategory['Meetings'].length)} hours of context switching`
    });
  }
  
  // Communication Batch Recommendation
  if (tasksByCategory['Emails'] || tasksByCategory['Follow-ups']) {
    const emailTasks = tasksByCategory['Emails'] || [];
    const followupTasks = tasksByCategory['Follow-ups'] || [];
    const totalCommunication = emailTasks.length + followupTasks.length;
    
    if (totalCommunication >= 3) {
      recommendations.push({
        type: 'Communication Batch',
        priority: 'Medium',
        category: 'Communication',
        description: 'Batch all emails, calls, and follow-ups into dedicated communication blocks',
        implementation: 'Process all emails and communications 2-3 times per day at scheduled intervals',
        tasks: totalCommunication,
        timeBlocked: '1-2 hours',
        benefit: 'Prevents constant interruption and improves focus on deep work'
      });
    }
  }
  
  return recommendations;
}

/**
 * Calculate time waste prevention
 */
function calculateTimeWastePrevention(tasksByCategory) {
  const preventions = [];
  
  Object.keys(tasksByCategory).forEach(category => {
    const tasks = tasksByCategory[category];
    if (tasks.length >= BATCHING_CONFIG.batchingRules.minBatchSize) {
      const contextSwitchingSaved = calculateContextSwitchingSaved(tasks.length);
      const setupTimeSaved = (tasks.length - 1) * 0.1; // 6 minutes setup time per task
      
      preventions.push({
        category: category,
        contextSwitchingSaved: contextSwitchingSaved,
        setupTimeSaved: setupTimeSaved,
        totalTimeSaved: contextSwitchingSaved + setupTimeSaved,
        tasks: tasks.length
      });
    }
  });
  
  return preventions;
}

/**
 * Calculate efficiency gains from batching
 */
function calculateEfficiencyGains(tasksByCategory) {
  let totalTasksInBatches = 0;
  let totalTimeSaved = 0;
  let totalOriginalTime = 0;
  
  Object.keys(tasksByCategory).forEach(category => {
    const tasks = tasksByCategory[category];
    if (tasks.length >= BATCHING_CONFIG.batchingRules.minBatchSize) {
      const originalTime = calculateEstimatedTime(tasks);
      const timeSaved = calculateContextSwitchingSaved(tasks.length);
      
      totalTasksInBatches += tasks.length;
      totalTimeSaved += timeSaved;
      totalOriginalTime += originalTime;
    }
  });
  
  const efficiencyPercentage = totalOriginalTime > 0 ? 
    Math.round((totalTimeSaved / totalOriginalTime) * 100) : 0;
  
  return {
    tasksInBatches: totalTasksInBatches,
    timeSavedHours: Math.round(totalTimeSaved * 10) / 10,
    efficiencyGain: efficiencyPercentage,
    hoursPerWeek: Math.round(totalTimeSaved * 10) / 10,
    hoursPerMonth: Math.round(totalTimeSaved * 4.33 * 10) / 10,
    hoursPerYear: Math.round(totalTimeSaved * 52 * 10) / 10
  };
}

/**
 * Generate implementation plan for a batch
 */
function generateImplementationPlan(category, tasks, batchConfig) {
  return {
    phase1: `Block ${batchConfig.recommendedTimeBlock} on ${batchConfig.recommendedDay} for ${category}`,
    phase2: `Move all ${tasks.length} ${category} tasks to this time block`,
    phase3: `Prepare all materials needed for batch processing before the session`,
    phase4: `Execute all tasks in sequence without interruption`,
    phase5: `Review completed work and plan next batch`,
    tools: getBatchingToolsForCategory(category),
    preparation: getBatchPreparationSteps(category, tasks)
  };
}

/**
 * Get batching tools for specific category
 */
function getBatchingToolsForCategory(category) {
  const tools = {
    'Meetings': [
      'Block calendar for back-to-back meetings',
      'Prepare agenda templates',
      'Set up video conference room',
      'Prepare meeting materials in advance'
    ],
    'Documentation': [
      'Create Monday File system',
      'Digital signature setup',
      'Document review checklist',
      'Approval workflow template'
    ],
    'Follow-ups': [
      'Contact list preparation',
      'Call script templates',
      'Follow-up email templates',
      'CRM system update'
    ],
    'Emails': [
      'Email templates library',
      'Unsubscribe from unnecessary lists',
      'Email filtering rules',
      'Response templates for common queries'
    ],
    'Business Development': [
      'Project planning tools',
      'System design templates',
      'Process documentation',
      'Automation tools research'
    ]
  };
  
  return tools[category] || ['General batching preparation'];
}

/**
 * Get batch preparation steps
 */
function getBatchPreparationSteps(category, tasks) {
  const baseSteps = [
    'Gather all materials needed for the batch',
    'Set phone to Do Not Disturb mode',
    'Close unnecessary browser tabs and applications',
    'Prepare workspace for optimal productivity'
  ];
  
  const categorySpecific = {
    'Meetings': [
      'Send agenda to all participants 24 hours in advance',
      'Book meeting rooms/video conferences',
      'Prepare presentation materials',
      'Review previous meeting notes'
    ],
    'Documentation': [
      'Collect all documents requiring approval',
      'Prepare signing materials',
      'Review company policies if needed',
      'Set up document filing system'
    ],
    'Follow-ups': [
      'Prepare list of contacts to reach',
      'Review previous communication history',
      'Prepare talking points for each contact',
      'Set up call logging system'
    ],
    'Emails': [
      'Sort emails by priority and type',
      'Prepare response templates',
      'Set up email signatures',
      'Review email backlog'
    ]
  };
  
  return [...baseSteps, ...(categorySpecific[category] || [])];
}

/**
 * Implement batching recommendations automatically
 */
function implementBatchingRecommendations(companyId, weekStartDate, recommendationsToImplement) {
  try {
    const results = {
      implemented: 0,
      tasksMovedToBatches: 0,
      timeBlocksCreated: 0,
      errors: []
    };
    
    const weeklySchedule = getWeeklySchedule(companyId, weekStartDate);
    const unscheduledTasks = getCapturedTasks(companyId);
    
    recommendationsToImplement.forEach(recommendation => {
      try {
        const result = implementSingleBatch(companyId, weekStartDate, recommendation, 
                                           weeklySchedule, unscheduledTasks);
        
        results.implemented++;
        results.tasksMovedToBatches += result.tasksMoved;
        results.timeBlocksCreated += result.blocksCreated;
        
      } catch (error) {
        results.errors.push(`${recommendation.type}: ${error.message}`);
      }
    });
    
    Logger.log(`Batching implementation completed: ${JSON.stringify(results)}`);
    return results;
    
  } catch (error) {
    Logger.log('Error implementing batching recommendations: ' + error.toString());
    throw new Error('Failed to implement batching recommendations: ' + error.message);
  }
}

/**
 * Implement a single batch recommendation
 */
function implementSingleBatch(companyId, weekStartDate, recommendation, weeklySchedule, unscheduledTasks) {
  const batchConfig = BATCHING_CONFIG.categories[recommendation.category];
  if (!batchConfig) {
    throw new Error(`Unknown batch category: ${recommendation.category}`);
  }
  
  // Find tasks that belong to this batch
  const batchTasks = [...weeklySchedule, ...unscheduledTasks]
    .filter(task => task.category === recommendation.category);
  
  if (batchTasks.length === 0) {
    return { tasksMoved: 0, blocksCreated: 0 };
  }
  
  // Create the batch time block
  const batchDate = getBatchDateForWeek(weekStartDate, batchConfig.recommendedDay);
  const timeBlock = batchConfig.recommendedTimeBlock;
  
  // Create batch session task
  const batchSessionId = createBatchSession(companyId, batchDate, timeBlock, recommendation);
  
  // Move relevant tasks to the batch or mark them as part of batch
  let tasksMoved = 0;
  batchTasks.forEach(task => {
    if (task.source === 'captured') {
      // Move unscheduled task to the batch
      moveTaskToBatch(task.id, batchSessionId, batchDate, timeBlock);
      tasksMoved++;
    } else if (task.source === 'scheduled') {
      // Update scheduled task to be part of batch
      updateTaskToBatch(task.id, batchSessionId);
      tasksMoved++;
    }
  });
  
  return { tasksMoved, blocksCreated: 1 };
}

/**
 * Create a batch session in the schedule
 */
function createBatchSession(companyId, date, timeBlock, recommendation) {
  try {
    const scheduleSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const batchId = generateUniqueId();
    
    const newRow = [
      batchId,
      companyId,
      date,
      getDayName(date),
      timeBlock,
      `${recommendation.type} - Batch Session`,
      recommendation.category,
      'High',
      recommendation.timeBlocked || '2 hours',
      '', // Actual start
      '', // Actual end
      `Batch processing: ${recommendation.description}. Tasks: ${recommendation.tasks}`,
      'Planned'
    ];
    
    scheduleSheet.appendRow(newRow);
    
    Logger.log(`Batch session created: ${batchId} for ${recommendation.type}`);
    return batchId;
    
  } catch (error) {
    Logger.log('Error creating batch session: ' + error.toString());
    throw new Error('Failed to create batch session: ' + error.message);
  }
}

/**
 * Get the date for a specific day in the week
 */
function getBatchDateForWeek(weekStartDate, dayName) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayIndex = days.indexOf(dayName);
  
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + dayIndex);
  
  return date.toISOString().split('T')[0];
}

/**
 * Move unscheduled task to batch
 */
function moveTaskToBatch(taskId, batchSessionId, date, timeBlock) {
  try {
    const task = getTaskFromQuickCapture(taskId);
    if (!task) return false;
    
    // Create a note that this task is part of a batch
    const batchNote = `Part of batch session ${batchSessionId}. Original task: ${task.name}`;
    
    // Update the batch session to include this task
    updateBatchSessionTasks(batchSessionId, task.name);
    
    // Mark task as moved to batch
    updateQuickCaptureStatus(taskId, 'Moved to Batch');
    
    return true;
    
  } catch (error) {
    Logger.log('Error moving task to batch: ' + error.toString());
    return false;
  }
}

/**
 * Update scheduled task to be part of batch
 */
function updateTaskToBatch(taskId, batchSessionId) {
  try {
    // Add note that this task is now part of a batch
    const batchNote = `Moved to batch session ${batchSessionId} for improved efficiency`;
    
    updateScheduledTask(taskId, {
      notes: batchNote,
      status: 'Batched'
    });
    
    return true;
    
  } catch (error) {
    Logger.log('Error updating task to batch: ' + error.toString());
    return false;
  }
}

/**
 * Update batch session to include task names
 */
function updateBatchSessionTasks(batchSessionId, taskName) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === batchSessionId) {
        const currentNotes = data[i][11] || '';
        const updatedNotes = currentNotes + '\n• ' + taskName;
        sheet.getRange(i + 1, 12).setValue(updatedNotes);
        break;
      }
    }
    
  } catch (error) {
    Logger.log('Error updating batch session tasks: ' + error.toString());
  }
}

/**
 * Get batching insights for dashboard
 */
function getBatchingInsights(companyId, weekStartDate) {
  try {
    const analysis = analyzeTasksForBatching(companyId, weekStartDate);
    
    const insights = {
      potentialTimeSaved: analysis.efficiencyGains.timeSavedHours || 0,
      batchableCategories: Object.keys(analysis.batchingOpportunities).length,
      implementationStatus: checkBatchingImplementation(companyId, weekStartDate),
      quickWins: getQuickBatchingWins(analysis),
      weeklyEfficiency: calculateWeeklyBatchingEfficiency(companyId, weekStartDate)
    };
    
    return insights;
    
  } catch (error) {
    Logger.log('Error getting batching insights: ' + error.toString());
    return {
      potentialTimeSaved: 0,
      batchableCategories: 0,
      implementationStatus: {},
      quickWins: [],
      weeklyEfficiency: 0
    };
  }
}

/**
 * Check current batching implementation status
 */
function checkBatchingImplementation(companyId, weekStartDate) {
  const schedule = getWeeklySchedule(companyId, weekStartDate);
  const implementation = {
    mondayDocumentation: false,
    tuesdayMagic: false,
    wednesdayMeetings: false,
    thursdayFollowups: false,
    fridayEmails: false
  };
  
  Object.keys(schedule).forEach(day => {
    schedule[day].tasks.forEach(task => {
      if (day === 'Monday' && task.category === 'Documentation') {
        implementation.mondayDocumentation = true;
      }
      if (day === 'Tuesday' && task.category === 'Business Development') {
        implementation.tuesdayMagic = true;
      }
      if (day === 'Wednesday' && task.category === 'Meetings') {
        implementation.wednesdayMeetings = true;
      }
      if (day === 'Thursday' && task.category === 'Follow-ups') {
        implementation.thursdayFollowups = true;
      }
      if (day === 'Friday' && task.category === 'Emails') {
        implementation.fridayEmails = true;
      }
    });
  });
  
  return implementation;
}

/**
 * Get quick batching wins
 */
function getQuickBatchingWins(analysis) {
  const wins = [];
  
  Object.keys(analysis.batchingOpportunities).forEach(category => {
    const opportunity = analysis.batchingOpportunities[category];
    if (opportunity.taskCount >= 3 && opportunity.currentlyScheduled === 0) {
      wins.push({
        category: category,
        impact: 'High',
        effort: 'Low',
        timeSaved: calculateContextSwitchingSaved(opportunity.taskCount),
        action: `Batch all ${opportunity.taskCount} ${category} tasks together`
      });
    }
  });
  
  return wins.sort((a, b) => b.timeSaved - a.timeSaved).slice(0, 3);
}

/**
 * Calculate weekly batching efficiency
 */
function calculateWeeklyBatchingEfficiency(companyId, weekStartDate) {
  const schedule = getWeeklySchedule(companyId, weekStartDate);
  let totalTasks = 0;
  let batchedTasks = 0;
  
  Object.keys(schedule).forEach(day => {
    schedule[day].tasks.forEach(task => {
      totalTasks++;
      
      // Check if task is part of a batch (look for batch indicators)
      if (task.notes && task.notes.includes('batch') || 
          isBatchRecommendedTime(day, task.timeBlock, task.category)) {
        batchedTasks++;
      }
    });
  });
  
  return totalTasks > 0 ? Math.round((batchedTasks / totalTasks) * 100) : 0;
}

/**
 * Check if task is scheduled at batch-recommended time
 */
function isBatchRecommendedTime(day, timeBlock, category) {
  const batchConfig = BATCHING_CONFIG.categories[category];
  if (!batchConfig) return false;
  
  return day === batchConfig.recommendedDay && 
         timeBlock.includes(batchConfig.recommendedTimeBlock.split('-')[0]);
}

/**
 * Generate batching report for company
 */
function generateBatchingReport(companyId, weekStartDate) {
  try {
    const analysis = analyzeTasksForBatching(companyId, weekStartDate);
    const insights = getBatchingInsights(companyId, weekStartDate);
    
    const report = {
      company: getCompanyById(companyId),
      reportDate: new Date().toISOString(),
      weekAnalyzed: weekStartDate,
      
      summary: {
        totalTasks: analysis.totalTasks,
        batchableCategories: Object.keys(analysis.batchingOpportunities).length,
        potentialTimeSaved: insights.potentialTimeSaved,
        currentEfficiency: insights.weeklyEfficiency
      },
      
      opportunities: analysis.batchingOpportunities,
      recommendations: analysis.recommendations,
      implementation: insights.implementationStatus,
      quickWins: insights.quickWins,
      
      financialImpact: calculateBatchingFinancialImpact(companyId, analysis.efficiencyGains),
      
      nextSteps: generateBatchingNextSteps(analysis, insights)
    };
    
    return report;
    
  } catch (error) {
    Logger.log('Error generating batching report: ' + error.toString());
    throw new Error('Failed to generate batching report: ' + error.message);
  }
}

/**
 * Calculate financial impact of batching
 */
function calculateBatchingFinancialImpact(companyId, efficiencyGains) {
  const company = getCompanyById(companyId);
  if (!company) return { weekly: 0, monthly: 0, annual: 0 };
  
  const mvot = company.mvot;
  
  return {
    weekly: Math.round(efficiencyGains.hoursPerWeek * mvot),
    monthly: Math.round(efficiencyGains.hoursPerMonth * mvot),
    annual: Math.round(efficiencyGains.hoursPerYear * mvot)
  };
}

/**
 * Generate next steps for batching implementation
 */
function generateBatchingNextSteps(analysis, insights) {
  const nextSteps = [];
  
  // Priority 1: Tuesday Magic
  if (!insights.implementationStatus.tuesdayMagic) {
    nextSteps.push({
      priority: 1,
      action: 'Implement Tuesday Magic',
      description: 'Block 4 hours every Tuesday 8am-12pm for auto-pilot systems',
      impact: 'High - Creates freedom for rest of life',
      timeframe: 'This week'
    });
  }
  
  // Priority 2: Monday File
  if (!insights.implementationStatus.mondayDocumentation && 
      analysis.batchingOpportunities['Documentation']) {
    nextSteps.push({
      priority: 2,
      action: 'Create Monday File System',
      description: 'Move all weekly documentation to Monday morning batch',
      impact: 'High - Eliminates daily administrative interruptions',
      timeframe: 'This week'
    });
  }
  
  // Priority 3: Top quick wins
  insights.quickWins.forEach((win, index) => {
    nextSteps.push({
      priority: 3 + index,
      action: `Batch ${win.category} tasks`,
      description: win.action,
      impact: `Medium - Saves ${win.timeSaved} hours per week`,
      timeframe: 'Next 2 weeks'
    });
  });
  
  return nextSteps;
}