/**
 * TaskManager.gs - The Five Tools of Managing Work Implementation
 * 1. Quick Capture - Entry point for all tasks and ideas
 * 2. Schedule/Doing Now - Weekly and daily scheduling system
 * 3. Waiting List - Tasks waiting for external dependencies
 * 4. Someday List - Future ideas and projects
 * 5. Information System - Knowledge management (handled separately)
 */

/**
 * Process captured tasks - move them to appropriate lists
 * This implements the weekly review process from BMP methodology
 */
function processSelectedTasks(taskIds, decisions) {
  try {
    const results = {
      scheduled: 0,
      waiting: 0,
      someday: 0,
      completed: 0,
      errors: []
    };
    
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const decision = decisions[i];
      
      try {
        switch (decision.action) {
          case 'schedule':
            moveTaskToSchedule(taskId, decision.scheduleData);
            results.scheduled++;
            break;
          case 'waiting':
            moveTaskToWaiting(taskId, decision.waitingData);
            results.waiting++;
            break;
          case 'someday':
            moveTaskToSomeday(taskId, decision.somedayData);
            results.someday++;
            break;
          case 'complete':
            markTaskCompleted(taskId);
            results.completed++;
            break;
          default:
            throw new Error('Invalid action: ' + decision.action);
        }
      } catch (error) {
        results.errors.push(`Task ${taskId}: ${error.message}`);
      }
    }
    
    Logger.log(`Task processing completed: ${JSON.stringify(results)}`);
    return results;
    
  } catch (error) {
    Logger.log('Error processing tasks: ' + error.toString());
    throw new Error('Failed to process tasks: ' + error.message);
  }
}

/**
 * Move task from Quick Capture to Weekly Schedule
 */
function moveTaskToSchedule(taskId, scheduleData) {
  try {
    // Get task from Quick Capture
    const task = getTaskFromQuickCapture(taskId);
    if (!task) {
      throw new Error('Task not found in Quick Capture');
    }
    
    // Add to Weekly Schedule
    const scheduleSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const newId = generateUniqueId();
    
    const newRow = [
      newId,
      task.companyId,
      scheduleData.date,
      scheduleData.day || getDayName(scheduleData.date),
      scheduleData.timeBlock,
      task.name,
      task.category,
      task.priority,
      scheduleData.plannedDuration || '1 hour',
      '', // Actual start
      '', // Actual end
      task.notes,
      'Planned'
    ];
    
    scheduleSheet.appendRow(newRow);
    
    // Update status in Quick Capture
    updateQuickCaptureStatus(taskId, 'Moved to Schedule');
    
    Logger.log(`Task moved to schedule: ${taskId} -> ${newId}`);
    return { success: true, newId: newId };
    
  } catch (error) {
    Logger.log('Error moving task to schedule: ' + error.toString());
    throw new Error('Failed to move task to schedule: ' + error.message);
  }
}

/**
 * Move task from Quick Capture to Waiting List
 */
function moveTaskToWaiting(taskId, waitingData) {
  try {
    const task = getTaskFromQuickCapture(taskId);
    if (!task) {
      throw new Error('Task not found in Quick Capture');
    }
    
    const waitingSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const newId = generateUniqueId();
    
    const newRow = [
      newId,
      task.companyId,
      task.name,
      task.category,
      task.priority,
      waitingData.waitingFor,
      waitingData.contactPerson || '',
      waitingData.expectedDate || '',
      task.notes,
      'Waiting',
      new Date().toISOString()
    ];
    
    waitingSheet.appendRow(newRow);
    updateQuickCaptureStatus(taskId, 'Moved to Waiting');
    
    Logger.log(`Task moved to waiting: ${taskId} -> ${newId}`);
    return { success: true, newId: newId };
    
  } catch (error) {
    Logger.log('Error moving task to waiting: ' + error.toString());
    throw new Error('Failed to move task to waiting: ' + error.message);
  }
}

/**
 * Move task from Quick Capture to Someday List
 */
function moveTaskToSomeday(taskId, somedayData) {
  try {
    const task = getTaskFromQuickCapture(taskId);
    if (!task) {
      throw new Error('Task not found in Quick Capture');
    }
    
    const somedaySheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SOMEDAY_LIST);
    const newId = generateUniqueId();
    
    // Calculate review date (default to 3 months from now)
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + 3);
    
    const newRow = [
      newId,
      task.companyId,
      task.name,
      task.category,
      task.priority,
      somedayData.reason || 'Future consideration',
      somedayData.reviewDate || reviewDate.toISOString().split('T')[0],
      task.notes,
      'Someday',
      new Date().toISOString()
    ];
    
    somedaySheet.appendRow(newRow);
    updateQuickCaptureStatus(taskId, 'Moved to Someday');
    
    Logger.log(`Task moved to someday: ${taskId} -> ${newId}`);
    return { success: true, newId: newId };
    
  } catch (error) {
    Logger.log('Error moving task to someday: ' + error.toString());
    throw new Error('Failed to move task to someday: ' + error.message);
  }
}

/**
 * Mark task as completed in Quick Capture
 */
function markTaskCompleted(taskId) {
  try {
    updateQuickCaptureStatus(taskId, 'Completed');
    Logger.log(`Task marked completed: ${taskId}`);
    return { success: true };
    
  } catch (error) {
    Logger.log('Error marking task completed: ' + error.toString());
    throw new Error('Failed to mark task completed: ' + error.message);
  }
}

/**
 * Get task from Quick Capture by ID
 */
function getTaskFromQuickCapture(taskId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.QUICK_CAPTURE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === taskId) {
        return {
          id: row[0],
          companyId: row[1],
          name: row[2],
          category: row[3],
          priority: row[4],
          notes: row[5],
          status: row[6],
          createdDate: row[7]
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('Error getting task from quick capture: ' + error.toString());
    return null;
  }
}

/**
 * Update task status in Quick Capture
 */
function updateQuickCaptureStatus(taskId, newStatus) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.QUICK_CAPTURE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === taskId) {
        sheet.getRange(i + 1, 7).setValue(newStatus); // Status column
        sheet.getRange(i + 1, 9).setValue(new Date().toISOString()); // Modified date
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('Error updating quick capture status: ' + error.toString());
    return false;
  }
}

/**
 * Create weekly schedule template based on BMP methodology
 */
function createWeeklyScheduleTemplate(companyId, weekStartDate) {
  try {
    const startDate = new Date(weekStartDate);
    const schedule = [];
    
    // Define weekly recurring tasks based on BMP methodology
    const recurringTasks = [
      {
        day: 'Monday',
        timeBlock: '08:00-09:00',
        taskName: 'Weekly Planning & Review',
        category: 'Documentation',
        priority: 'High',
        duration: '1 hour'
      },
      {
        day: 'Monday',
        timeBlock: '09:00-12:00',
        taskName: 'Documentation Batch - Approvals, Reports, Admin',
        category: 'Documentation',
        priority: 'High',
        duration: '3 hours'
      },
      {
        day: 'Tuesday',
        timeBlock: '08:00-12:00',
        taskName: 'Tuesday Magic - Auto-Pilot Systems',
        category: 'Business Development',
        priority: 'High',
        duration: '4 hours'
      },
      {
        day: 'Wednesday',
        timeBlock: '14:00-16:00',
        taskName: 'Meetings Batch - Vendors, Clients, Staff',
        category: 'Meetings',
        priority: 'Medium',
        duration: '2 hours'
      },
      {
        day: 'Thursday',
        timeBlock: '14:00-15:30',
        taskName: 'Follow-ups & Coordination Batch',
        category: 'Follow-ups',
        priority: 'Medium',
        duration: '1.5 hours'
      },
      {
        day: 'Friday',
        timeBlock: '14:00-15:00',
        taskName: 'Email & Communication Batch',
        category: 'Emails',
        priority: 'Medium',
        duration: '1 hour'
      },
      {
        day: 'Friday',
        timeBlock: '15:00-16:00',
        taskName: 'Weekly Review & Next Week Planning',
        category: 'Documentation',
        priority: 'High',
        duration: '1 hour'
      }
    ];
    
    const scheduleSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    
    for (let dayOffset = 0; dayOffset < 6; dayOffset++) { // Monday to Saturday
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);
      const dayName = getDayName(currentDate);
      
      // Add recurring tasks for this day
      const dayTasks = recurringTasks.filter(task => task.day === dayName);
      
      for (let task of dayTasks) {
        const newId = generateUniqueId();
        const newRow = [
          newId,
          companyId,
          currentDate.toISOString().split('T')[0],
          dayName,
          task.timeBlock,
          task.taskName,
          task.category,
          task.priority,
          task.duration,
          '', // Actual start
          '', // Actual end
          'Weekly recurring task as per BMP methodology',
          'Planned'
        ];
        
        scheduleSheet.appendRow(newRow);
        schedule.push(newRow);
      }
    }
    
    Logger.log(`Weekly schedule template created for ${weekStartDate}`);
    return { success: true, tasksCreated: schedule.length };
    
  } catch (error) {
    Logger.log('Error creating weekly schedule template: ' + error.toString());
    throw new Error('Failed to create weekly schedule template: ' + error.message);
  }
}

/**
 * Get weekly schedule for a company
 */
function getWeeklySchedule(companyId, weekStartDate) {
  try {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    
    const schedule = {};
    
    // Initialize days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayName = getDayName(date);
      schedule[dayName] = {
        date: date.toISOString().split('T')[0],
        tasks: []
      };
    }
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId) { // Company ID match
        const taskDate = new Date(row[2]);
        if (taskDate >= startDate && taskDate <= endDate) {
          const dayName = row[3];
          if (schedule[dayName]) {
            schedule[dayName].tasks.push({
              id: row[0],
              timeBlock: row[4],
              taskName: row[5],
              category: row[6],
              priority: row[7],
              plannedDuration: row[8],
              actualStart: row[9],
              actualEnd: row[10],
              notes: row[11],
              status: row[12]
            });
          }
        }
      }
    }
    
    // Sort tasks by time block for each day
    Object.keys(schedule).forEach(day => {
      schedule[day].tasks.sort((a, b) => {
        const timeA = a.timeBlock.split('-')[0];
        const timeB = b.timeBlock.split('-')[0];
        return timeA.localeCompare(timeB);
      });
    });
    
    return schedule;
    
  } catch (error) {
    Logger.log('Error getting weekly schedule: ' + error.toString());
    throw new Error('Failed to get weekly schedule: ' + error.message);
  }
}

/**
 * Update task in schedule (start/end times, status, etc.)
 */
function updateScheduledTask(taskId, updateData) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === taskId) {
        const row = i + 1;
        
        if (updateData.actualStart) {
          sheet.getRange(row, 10).setValue(updateData.actualStart);
        }
        if (updateData.actualEnd) {
          sheet.getRange(row, 11).setValue(updateData.actualEnd);
          
          // Calculate actual duration and MVOT cost
          const company = getCompanyById(data[i][1]);
          if (company && updateData.actualStart) {
            const startTime = new Date(updateData.actualStart);
            const endTime = new Date(updateData.actualEnd);
            const actualHours = (endTime - startTime) / (1000 * 60 * 60);
            const mvotCost = actualHours * company.mvot;
            
            // Log to time tracker
            logTimeEntry(taskId, data[i][1], {
              date: data[i][2],
              taskName: data[i][5],
              category: data[i][6],
              plannedDuration: data[i][8],
              actualDuration: actualHours,
              startTime: updateData.actualStart,
              endTime: updateData.actualEnd,
              mvotCost: mvotCost
            });
          }
        }
        if (updateData.status) {
          sheet.getRange(row, 13).setValue(updateData.status);
        }
        if (updateData.notes) {
          const existingNotes = data[i][11];
          const newNotes = existingNotes ? existingNotes + '\n' + updateData.notes : updateData.notes;
          sheet.getRange(row, 12).setValue(newNotes);
        }
        
        Logger.log(`Scheduled task updated: ${taskId}`);
        return { success: true };
      }
    }
    
    throw new Error('Task not found');
    
  } catch (error) {
    Logger.log('Error updating scheduled task: ' + error.toString());
    throw new Error('Failed to update scheduled task: ' + error.message);
  }
}

/**
 * Log time entry for tracking
 */
function logTimeEntry(taskId, companyId, timeData) {
  try {
    const timeSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_TRACKER);
    const newId = generateUniqueId();
    
    const newRow = [
      newId,
      companyId,
      timeData.date,
      timeData.taskName,
      timeData.category,
      timeData.plannedDuration,
      timeData.actualDuration,
      timeData.startTime,
      timeData.endTime,
      '', // Notes
      timeData.mvotCost
    ];
    
    timeSheet.appendRow(newRow);
    Logger.log(`Time entry logged: ${taskId}`);
    
  } catch (error) {
    Logger.log('Error logging time entry: ' + error.toString());
  }
}

/**
 * Get waiting list for a company
 */
function getWaitingList(companyId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const data = sheet.getDataRange().getValues();
    
    const waitingList = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId && row[9] !== 'Completed') { // Company ID match and not completed
        waitingList.push({
          id: row[0],
          taskName: row[2],
          category: row[3],
          priority: row[4],
          waitingFor: row[5],
          contactPerson: row[6],
          expectedDate: row[7],
          notes: row[8],
          status: row[9],
          createdDate: row[10]
        });
      }
    }
    
    // Sort by expected date
    waitingList.sort((a, b) => {
      if (!a.expectedDate && !b.expectedDate) return 0;
      if (!a.expectedDate) return 1;
      if (!b.expectedDate) return -1;
      return new Date(a.expectedDate) - new Date(b.expectedDate);
    });
    
    return waitingList;
    
  } catch (error) {
    Logger.log('Error getting waiting list: ' + error.toString());
    throw new Error('Failed to get waiting list: ' + error.message);
  }
}

/**
 * Get someday list for a company
 */
function getSomedayList(companyId) {
  try {
    const sheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SOMEDAY_LIST);
    const data = sheet.getDataRange().getValues();
    
    const somedayList = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId && row[8] !== 'Completed') { // Company ID match and not completed
        somedayList.push({
          id: row[0],
          taskName: row[2],
          category: row[3],
          priority: row[4],
          reason: row[5],
          reviewDate: row[6],
          notes: row[7],
          status: row[8],
          createdDate: row[9]
        });
      }
    }
    
    // Sort by review date
    somedayList.sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate));
    
    return somedayList;
    
  } catch (error) {
    Logger.log('Error getting someday list: ' + error.toString());
    throw new Error('Failed to get someday list: ' + error.message);
  }
}

/**
 * Batch tasks by category for efficient processing
 */
function getBatchedTasks(companyId, weekStartDate) {
  try {
    const schedule = getWeeklySchedule(companyId, weekStartDate);
    const batches = {
      'Meetings': [],
      'Documentation': [],
      'Follow-ups': [],
      'Emails': []
    };
    
    Object.keys(schedule).forEach(day => {
      schedule[day].tasks.forEach(task => {
        if (batches[task.category]) {
          batches[task.category].push({
            ...task,
            day: day,
            date: schedule[day].date
          });
        }
      });
    });
    
    return batches;
    
  } catch (error) {
    Logger.log('Error getting batched tasks: ' + error.toString());
    throw new Error('Failed to get batched tasks: ' + error.message);
  }
}

/**
 * Utility function to get day name from date
 */
function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
}

/**
 * Get current week's Monday date
 */
function getCurrentWeekStart() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
  return new Date(today.setDate(diff));
}

/**
 * Move task from Waiting to Schedule when dependency is resolved
 */
function resolveWaitingTask(waitingTaskId, scheduleData) {
  try {
    // Get task from waiting list
    const waitingSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const waitingData = waitingSheet.getDataRange().getValues();
    
    let taskData = null;
    for (let i = 1; i < waitingData.length; i++) {
      if (waitingData[i][0] === waitingTaskId) {
        taskData = {
          companyId: waitingData[i][1],
          name: waitingData[i][2],
          category: waitingData[i][3],
          priority: waitingData[i][4],
          notes: waitingData[i][8]
        };
        
        // Mark as resolved in waiting list
        waitingSheet.getRange(i + 1, 10).setValue('Resolved');
        break;
      }
    }
    
    if (!taskData) {
      throw new Error('Waiting task not found');
    }
    
    // Add to schedule
    const scheduleSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const newId = generateUniqueId();
    
    const newRow = [
      newId,
      taskData.companyId,
      scheduleData.date,
      scheduleData.day || getDayName(scheduleData.date),
      scheduleData.timeBlock,
      taskData.name,
      taskData.category,
      taskData.priority,
      scheduleData.plannedDuration || '1 hour',
      '', // Actual start
      '', // Actual end
      taskData.notes + ' (Resolved from waiting list)',
      'Planned'
    ];
    
    scheduleSheet.appendRow(newRow);
    
    Logger.log(`Waiting task resolved and scheduled: ${waitingTaskId} -> ${newId}`);
    return { success: true, newId: newId };
    
  } catch (error) {
    Logger.log('Error resolving waiting task: ' + error.toString());
    throw new Error('Failed to resolve waiting task: ' + error.message);
  }
}

/**
 * Move task from Someday to Quick Capture for processing
 */
function activateSomedayTask(somedayTaskId) {
  try {
    // Get task from someday list
    const somedaySheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SOMEDAY_LIST);
    const somedayData = somedaySheet.getDataRange().getValues();
    
    let taskData = null;
    for (let i = 1; i < somedayData.length; i++) {
      if (somedayData[i][0] === somedayTaskId) {
        taskData = {
          companyId: somedayData[i][1],
          name: somedayData[i][2],
          category: somedayData[i][3],
          priority: somedayData[i][4],
          notes: somedayData[i][7]
        };
        
        // Mark as activated in someday list
        somedaySheet.getRange(i + 1, 9).setValue('Activated');
        break;
      }
    }
    
    if (!taskData) {
      throw new Error('Someday task not found');
    }
    
    // Add to quick capture
    const captureResult = captureTask({
      companyId: taskData.companyId,
      name: taskData.name + ' (From Someday)',
      category: taskData.category,
      priority: taskData.priority,
      notes: taskData.notes + ' (Activated from someday list)',
      timestamp: new Date().toISOString()
    });
    
    Logger.log(`Someday task activated: ${somedayTaskId} -> ${captureResult.id}`);
    return captureResult;
    
  } catch (error) {
    Logger.log('Error activating someday task: ' + error.toString());
    throw new Error('Failed to activate someday task: ' + error.message);
  }
}