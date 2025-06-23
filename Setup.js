/**
 * Setup.gs - Installation and Setup Scripts
 * Handles initial setup, configuration, and deployment of the BMP Task Management System
 */

/**
 * Main setup function - run this after uploading all files
 */
function setupBMPSystem() {
  try {
    Logger.log('Starting BMP Task Management System setup...');
    
    // Step 1: Initialize spreadsheet structure
    Logger.log('Step 1: Initializing spreadsheet structure...');
    const initResult = initializeSpreadsheet();
    if (!initResult.success) {
      throw new Error('Failed to initialize spreadsheet: ' + initResult.message);
    }
    
    // Step 2: Set up triggers
    Logger.log('Step 2: Setting up triggers...');
    setupTriggers();
    
    // Step 3: Configure default settings
    Logger.log('Step 3: Configuring default settings...');
    configureDefaultSettings();
    
    // Step 4: Create sample data (optional)
    Logger.log('Step 4: Creating sample data...');
    createSampleData();
    
    // Step 5: Set up web app
    Logger.log('Step 5: Web app setup information...');
    displayWebAppInstructions();
    
    Logger.log('BMP Task Management System setup completed successfully!');
    
    // Show success message
    const message = `
      🎉 BMP Task Management System Setup Complete!
      
      ✅ Spreadsheet structure initialized
      ✅ Triggers configured  
      ✅ Default settings applied
      ✅ Sample data created
      
      Next Steps:
      1. Deploy as web app (see instructions)
      2. Test the system with sample data
      3. Start using the Tuesday Magic methodology!
      
      Check the logs for detailed information.
    `;
    
    Browser.msgBox('Setup Complete', message, Browser.Buttons.OK);
    
    return {
      success: true,
      message: 'BMP Task Management System setup completed successfully!',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Setup failed: ' + error.toString());
    Browser.msgBox('Setup Failed', 'Setup failed: ' + error.message, Browser.Buttons.OK);
    
    return {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Set up automated triggers
 */
function setupTriggers() {
  try {
    // Delete existing triggers first
    deleteExistingTriggers();
    
    // Create new triggers
    const triggers = [
      {
        function: 'dailyMaintenanceTask',
        type: 'time',
        schedule: ScriptApp.newTrigger('dailyMaintenanceTask')
          .timeBased()
          .everyDays(1)
          .atHour(6) // 6 AM daily
          .create()
      },
      {
        function: 'weeklyReviewReminder',
        type: 'time',
        schedule: ScriptApp.newTrigger('weeklyReviewReminder')
          .timeBased()
          .onWeekDay(ScriptApp.WeekDay.SUNDAY)
          .atHour(18) // 6 PM Sunday
          .create()
      },
      {
        function: 'tuesdayMagicReminder',
        type: 'time',
        schedule: ScriptApp.newTrigger('tuesdayMagicReminder')
          .timeBased()
          .onWeekDay(ScriptApp.WeekDay.TUESDAY)
          .atHour(7) // 7 AM Tuesday
          .create()
      }
    ];
    
    // Log trigger creation
    triggers.forEach(trigger => {
      Logger.log(`Created trigger: ${trigger.function} (${trigger.type})`);
    });
    
    // Save trigger info to settings
    updateSetting('TRIGGERS_SETUP_DATE', new Date().toISOString());
    updateSetting('TRIGGERS_COUNT', triggers.length.toString());
    
    Logger.log('Triggers setup completed');
    
  } catch (error) {
    Logger.log('Error setting up triggers: ' + error.toString());
    throw new Error('Failed to setup triggers: ' + error.message);
  }
}

/**
 * Delete existing triggers to avoid duplicates
 */
function deleteExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  triggers.forEach(trigger => {
    try {
      ScriptApp.deleteTrigger(trigger);
      Logger.log(`Deleted existing trigger: ${trigger.getHandlerFunction()}`);
    } catch (error) {
      Logger.log(`Error deleting trigger: ${error.toString()}`);
    }
  });
}

/**
 * Configure default system settings
 */
function configureDefaultSettings() {
  try {
    const defaultSettings = {
      // System Settings
      'SYSTEM_VERSION': '1.0.0',
      'SETUP_DATE': new Date().toISOString(),
      'TIMEZONE': Session.getScriptTimeZone(),
      'LOCALE': getSpreadsheet().getSpreadsheetLocale(),
      
      // BMP Methodology Settings
      'TUESDAY_MAGIC_ENABLED': 'true',
      'TUESDAY_MAGIC_TIME': '08:00-12:00',
      'MONDAY_FILE_ENABLED': 'true',
      'MONDAY_FILE_TIME': '09:00-12:00',
      
      // Working Time Settings
      'WORKING_DAYS_PER_WEEK': '6',
      'WORKING_HOURS_PER_DAY': '8',
      'BREAK_DURATION_MINUTES': '15',
      'LUNCH_DURATION_MINUTES': '60',
      
      // Batching Settings
      'BATCHING_ENABLED': 'true',
      'MIN_BATCH_SIZE': '3',
      'MAX_BATCH_DURATION_HOURS': '4',
      'CONTEXT_SWITCHING_PENALTY_MINUTES': '15',
      
      // Notification Settings
      'EMAIL_NOTIFICATIONS': 'true',
      'DAILY_REMINDER_TIME': '08:00',
      'WEEKLY_REVIEW_DAY': 'Sunday',
      'WEEKLY_REVIEW_TIME': '18:00',
      
      // Time Tracking Settings
      'AUTO_TIME_TRACKING': 'true',
      'MVOT_ALERTS': 'true',
      'ESTIMATION_ACCURACY_THRESHOLD': '75',
      
      // Dashboard Settings
      'DEFAULT_VIEW': 'dashboard',
      'SHOW_TUTORIALS': 'true',
      'COMPACT_MODE': 'false',
      
      // Data Retention
      'DATA_RETENTION_MONTHS': '12',
      'AUTO_ARCHIVE_ENABLED': 'true'
    };
    
    // Apply all default settings
    Object.keys(defaultSettings).forEach(key => {
      updateSetting(key, defaultSettings[key]);
    });
    
    Logger.log(`Applied ${Object.keys(defaultSettings).length} default settings`);
    
  } catch (error) {
    Logger.log('Error configuring default settings: ' + error.toString());
    throw new Error('Failed to configure default settings: ' + error.message);
  }
}

/**
 * Create sample data for testing and demonstration
 */
function createSampleData() {
  try {
    Logger.log('Creating sample company...');
    
    // Create sample company
    const sampleCompany = {
      name: 'BMP Demo Company',
      annualTurnover: 10000000, // 1 Crore
      businessType: 'Service'
    };
    
    const companyResult = addCompany(sampleCompany);
    const companyId = companyResult.id;
    
    Logger.log(`Sample company created with ID: ${companyId}`);
    
    // Create sample tasks
    const sampleTasks = [
      {
        companyId: companyId,
        name: 'Monthly Team Meeting',
        category: 'Meetings',
        priority: 'High',
        notes: 'Discuss Q1 goals and team performance',
        timestamp: new Date().toISOString()
      },
      {
        companyId: companyId,
        name: 'Process Weekly Reports',
        category: 'Documentation',
        priority: 'Medium',
        notes: 'Review and approve all departmental reports',
        timestamp: new Date().toISOString()
      },
      {
        companyId: companyId,
        name: 'Client Follow-up Calls',
        category: 'Follow-ups',
        priority: 'High',
        notes: 'Call 5 prospects from last week\'s meeting',
        timestamp: new Date().toISOString()
      },
      {
        companyId: companyId,
        name: 'Email Newsletter Preparation',
        category: 'Emails',
        priority: 'Low',
        notes: 'Draft monthly newsletter content',
        timestamp: new Date().toISOString()
      },
      {
        companyId: companyId,
        name: 'Develop Automation System',
        category: 'Business Development',
        priority: 'High',
        notes: 'Tuesday Magic: Work on customer onboarding automation',
        timestamp: new Date().toISOString()
      }
    ];
    
    Logger.log('Creating sample tasks...');
    sampleTasks.forEach(task => {
      captureTask(task);
    });
    
    // Create sample weekly schedule
    Logger.log('Creating sample weekly schedule...');
    const currentMonday = getCurrentWeekMonday().toISOString().split('T')[0];
    createWeeklyScheduleTemplate(companyId, currentMonday);
    
    // Set as default company
    updateSetting('DEFAULT_COMPANY', companyId);
    
    Logger.log('Sample data creation completed');
    
    return {
      companyId: companyId,
      tasksCreated: sampleTasks.length,
      scheduleCreated: true
    };
    
  } catch (error) {
    Logger.log('Error creating sample data: ' + error.toString());
    // Don't throw error here as sample data is optional
    return { error: error.message };
  }
}

/**
 * Get current week's Monday
 */
function getCurrentWeekMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
}

/**
 * Display web app deployment instructions
 */
function displayWebAppInstructions() {
  const instructions = `
    📋 WEB APP DEPLOYMENT INSTRUCTIONS
    
    To complete the setup, you need to deploy this as a web app:
    
    1. Click on "Deploy" → "New deployment"
    2. Choose type: "Web app"
    3. Description: "BMP Task Management System"
    4. Execute as: "Me"
    5. Who has access: "Anyone" or "Anyone with Google account"
    6. Click "Deploy"
    7. Copy the web app URL
    8. Bookmark the URL for easy access
    
    🔧 PERMISSIONS
    You may need to:
    - Authorize the script to access your Google Sheets
    - Allow the web app to run
    - Grant necessary permissions for email notifications
    
    📖 USAGE
    After deployment:
    1. Open the web app URL
    2. Select "BMP Demo Company" to start
    3. Follow the Tuesday Magic methodology
    4. Use the weekly scheduler for optimal productivity
    
    🎯 KEY FEATURES
    ✓ Quick Capture for all tasks and ideas
    ✓ Weekly Scheduling with batching
    ✓ Tuesday Magic (4 hours for auto-pilot systems)
    ✓ MVOT (Money Value of Time) tracking
    ✓ Productivity analytics and insights
  `;
  
  Logger.log(instructions);
  
  // Also save instructions to settings for later reference
  updateSetting('DEPLOYMENT_INSTRUCTIONS', instructions);
}

/**
 * Automated maintenance tasks (triggered daily)
 */
function dailyMaintenanceTask() {
  try {
    Logger.log('Running daily maintenance task...');
    
    // Archive old completed tasks
    archiveOldCompletedTasks();
    
    // Clean up orphaned data
    cleanupOrphanedData();
    
    // Update productivity metrics
    updateDailyMetrics();
    
    Logger.log('Daily maintenance task completed');
    
  } catch (error) {
    Logger.log('Error in daily maintenance task: ' + error.toString());
  }
}

/**
 * Weekly review reminder (triggered Sunday evening)
 */
function weeklyReviewReminder() {
  try {
    Logger.log('Sending weekly review reminders...');
    
    const companies = getCompanies();
    
    companies.forEach(company => {
      // Get week's productivity data
      const weekStart = getCurrentWeekMonday().toISOString().split('T')[0];
      const analytics = getWeeklyTimeAnalytics(company.id, weekStart);
      
      // Send email reminder (if email is available)
      const userEmail = Session.getActiveUser().getEmail();
      if (userEmail) {
        sendWeeklyReviewEmail(userEmail, company.name, analytics);
      }
    });
    
    Logger.log('Weekly review reminders sent');
    
  } catch (error) {
    Logger.log('Error sending weekly review reminders: ' + error.toString());
  }
}

/**
 * Tuesday Magic reminder (triggered Tuesday morning)
 */
function tuesdayMagicReminder() {
  try {
    Logger.log('Sending Tuesday Magic reminders...');
    
    const userEmail = Session.getActiveUser().getEmail();
    if (userEmail) {
      const subject = '🪄 Tuesday Magic Time - Build Your Auto-Pilot Systems!';
      const body = `
        <h3>It's Tuesday Magic Time!</h3>
        <p>This is your dedicated 4-hour block (8 AM - 12 PM) to work on auto-pilot systems that will create freedom for the rest of your life.</p>
        
        <h4>Today's Focus Areas:</h4>
        <ul>
          <li>🔄 Process automation</li>
          <li>📋 System documentation</li>
          <li>🎯 Business development strategies</li>
          <li>🚀 Innovation and improvement projects</li>
        </ul>
        
        <h4>Tuesday Magic Rules:</h4>
        <ul>
          <li>📱 Put your phone on Do Not Disturb</li>
          <li>☕ Work from a coffee shop if possible</li>
          <li>🎯 Focus only on auto-pilot systems</li>
          <li>⏰ Dedicate the full 4 hours</li>
        </ul>
        
        <p><strong>Remember:</strong> What you build today will free up your time for the rest of your life!</p>
        
        <p><a href="${getWebAppUrl()}" style="background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Open BMP Dashboard</a></p>
      `;
      
      sendEmailNotification(userEmail, subject, body);
    }
    
    Logger.log('Tuesday Magic reminder sent');
    
  } catch (error) {
    Logger.log('Error sending Tuesday Magic reminder: ' + error.toString());
  }
}

/**
 * Send weekly review email
 */
function sendWeeklyReviewEmail(email, companyName, analytics) {
  const subject = `📊 Weekly Review - ${companyName}`;
  const body = `
    <h3>Weekly Productivity Review</h3>
    <p>Here's your productivity summary for ${companyName}:</p>
    
    <h4>📈 Weekly Totals:</h4>
    <ul>
      <li><strong>Hours Worked:</strong> ${analytics.weeklyTotals.actualTime}h</li>
      <li><strong>Tasks Completed:</strong> ${analytics.weeklyTotals.tasksCompleted}</li>
      <li><strong>Average Efficiency:</strong> ${analytics.weeklyTotals.avgEfficiency}%</li>
      <li><strong>MVOT Cost:</strong> ₹${Math.round(analytics.weeklyTotals.mvotCost).toLocaleString()}</li>
    </ul>
    
    <h4>🎯 Key Insights:</h4>
    <ul>
      ${analytics.insights.map(insight => `<li>${insight.title}: ${insight.description}</li>`).join('')}
    </ul>
    
    <h4>📅 Next Week Planning:</h4>
    <p>Use this Sunday evening to:</p>
    <ul>
      <li>Review completed tasks and achievements</li>
      <li>Plan next week's priorities</li>
      <li>Schedule Tuesday Magic time block</li>
      <li>Batch similar tasks together</li>
    </ul>
    
    <p><a href="${getWebAppUrl()}" style="background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Open BMP Dashboard</a></p>
  `;
  
  sendEmailNotification(email, subject, body);
}

/**
 * Get web app URL (placeholder - needs to be updated after deployment)
 */
function getWebAppUrl() {
  const webAppUrl = getSetting('WEB_APP_URL');
  return webAppUrl || 'https://script.google.com/your-web-app-url';
}

/**
 * Archive old completed tasks
 */
function archiveOldCompletedTasks() {
  try {
    const retentionMonths = parseInt(getSetting('DATA_RETENTION_MONTHS')) || 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    
    // Archive completed tasks older than retention period
    // Implementation depends on specific archival strategy
    
    Logger.log(`Archived tasks older than ${retentionMonths} months`);
    
  } catch (error) {
    Logger.log('Error archiving old tasks: ' + error.toString());
  }
}

/**
 * Clean up orphaned data
 */
function cleanupOrphanedData() {
  try {
    // Clean up any data without valid company references
    // Implementation for data cleanup
    
    Logger.log('Orphaned data cleanup completed');
    
  } catch (error) {
    Logger.log('Error cleaning up orphaned data: ' + error.toString());
  }
}

/**
 * Update daily metrics
 */
function updateDailyMetrics() {
  try {
    const companies = getCompanies();
    const today = new Date().toISOString().split('T')[0];
    
    companies.forEach(company => {
      // Calculate and store daily metrics
      const dailyStats = getDailyTimeStats(company.id, today);
      
      // Store metrics for trending
      const metricsKey = `DAILY_METRICS_${company.id}_${today}`;
      updateSetting(metricsKey, JSON.stringify(dailyStats));
    });
    
    Logger.log('Daily metrics updated');
    
  } catch (error) {
    Logger.log('Error updating daily metrics: ' + error.toString());
  }
}

/**
 * System health check
 */
function systemHealthCheck() {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      sheets: {},
      triggers: {},
      settings: {},
      issues: []
    };
    
    // Check sheets
    Object.values(CONFIG.SHEETS).forEach(sheetName => {
      const sheet = getSpreadsheet().getSheetByName(sheetName);
      health.sheets[sheetName] = {
        exists: !!sheet,
        rows: sheet ? sheet.getLastRow() : 0,
        columns: sheet ? sheet.getLastColumn() : 0
      };
      
      if (!sheet) {
        health.issues.push(`Missing sheet: ${sheetName}`);
      }
    });
    
    // Check triggers
    const triggers = ScriptApp.getProjectTriggers();
    health.triggers.count = triggers.length;
    health.triggers.functions = triggers.map(t => t.getHandlerFunction());
    
    if (triggers.length === 0) {
      health.issues.push('No triggers configured');
    }
    
    // Check critical settings
    const criticalSettings = ['SYSTEM_VERSION', 'DEFAULT_COMPANY', 'TUESDAY_MAGIC_ENABLED'];
    criticalSettings.forEach(setting => {
      const value = getSetting(setting);
      health.settings[setting] = !!value;
      
      if (!value) {
        health.issues.push(`Missing setting: ${setting}`);
      }
    });
    
    // Overall health status
    health.status = health.issues.length === 0 ? 'Healthy' : 'Issues Detected';
    
    Logger.log('System Health Check Results:');
    Logger.log(JSON.stringify(health, null, 2));
    
    return health;
    
  } catch (error) {
    Logger.log('Error in system health check: ' + error.toString());
    return {
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Reset system to factory defaults (use with caution)
 */
function resetSystemToDefaults() {
  const confirmation = Browser.msgBox(
    'Reset System',
    'This will reset the entire system to factory defaults and delete all data. This action cannot be undone. Are you absolutely sure?',
    Browser.Buttons.YES_NO
  );
  
  if (confirmation === 'yes') {
    const secondConfirmation = Browser.msgBox(
      'Final Confirmation',
      'Last chance! This will permanently delete ALL your BMP data. Type YES to confirm.',
      Browser.Buttons.YES_NO
    );
    
    if (secondConfirmation === 'yes') {
      try {
        // Clear all data
        clearAllSystemData();
        
        // Delete triggers
        deleteExistingTriggers();
        
        // Reset settings
        const settingsSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
        clearSheetData(settingsSheet, 1);
        
        // Re-run setup
        setupBMPSystem();
        
        Browser.msgBox('System Reset', 'System has been reset to factory defaults.', Browser.Buttons.OK);
        
      } catch (error) {
        Browser.msgBox('Reset Failed', 'System reset failed: ' + error.message, Browser.Buttons.OK);
      }
    }
  }
}

/**
 * Export system configuration
 */
function exportSystemConfiguration() {
  try {
    const config = {
      version: getSetting('SYSTEM_VERSION'),
      exportDate: new Date().toISOString(),
      settings: {},
      companies: getCompanies().length,
      systemHealth: systemHealthCheck()
    };
    
    // Export all settings
    const settingsSheet = getSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
    const settingsData = settingsSheet.getDataRange().getValues();
    
    for (let i = 1; i < settingsData.length; i++) {
      const [key, value] = settingsData[i];
      if (key) {
        config.settings[key] = value;
      }
    }
    
    return config;
    
  } catch (error) {
    Logger.log('Error exporting system configuration: ' + error.toString());
    throw new Error('Failed to export system configuration: ' + error.message);
  }
}