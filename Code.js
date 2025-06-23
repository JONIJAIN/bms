/**
 * BMP Task Management System - Main Code File
 * Based on Business Management Program Feb'25 Notes
 * Implements the 5 Building Blocks of Business and 5 Tools of Managing Work
 */

// Global configuration
const CONFIG = {
  SHEETS: {
    COMPANIES: 'Companies',
    QUICK_CAPTURE: 'Quick Capture',
    WEEKLY_SCHEDULE: 'Weekly Schedule',
    WAITING_LIST: 'Waiting List',
    SOMEDAY_LIST: 'Someday List',
    TIME_TRACKER: 'Time Tracker',
    SETTINGS: 'Settings'
  },
  MVOT_CALCULATION: {
    WORKING_HOURS_PER_YEAR: 2300, // 6 days * 4 weeks * 12 months * 8 hours
    WORKING_HOURS_PER_MONTH: 200  // 6 days * 4 weeks * 8 hours
  }
};

/**
 * Serves the main HTML page
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setTitle('BMP Task Management Dashboard');
}

/**
 * Includes CSS and JS files in the HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Initialize the spreadsheet with required sheets and headers
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Create Companies sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.COMPANIES, [
      'ID', 'Name', 'Annual Turnover', 'Business Type', 'MVOT', 'Created Date', 'Last Modified'
    ]);
    
    // Create Quick Capture sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.QUICK_CAPTURE, [
      'ID', 'Company ID', 'Task Name', 'Category', 'Priority', 'Notes', 'Status', 'Created Date', 'Modified Date'
    ]);
    
    // Create Weekly Schedule sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.WEEKLY_SCHEDULE, [
      'ID', 'Company ID', 'Date', 'Day', 'Time Block', 'Task Name', 'Category', 'Priority', 
      'Planned Duration', 'Actual Start', 'Actual End', 'Notes', 'Status'
    ]);
    
    // Create Waiting List sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.WAITING_LIST, [
      'ID', 'Company ID', 'Task Name', 'Category', 'Priority', 'Waiting For', 'Contact Person', 
      'Expected Date', 'Notes', 'Status', 'Created Date'
    ]);
    
    // Create Someday List sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.SOMEDAY_LIST, [
      'ID', 'Company ID', 'Task Name', 'Category', 'Priority', 'Someday Reason', 'Review Date', 
      'Notes', 'Status', 'Created Date'
    ]);
    
    // Create Time Tracker sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.TIME_TRACKER, [
      'ID', 'Company ID', 'Date', 'Task Name', 'Category', 'Planned Duration', 'Actual Duration', 
      'Start Time', 'End Time', 'Notes', 'MVOT Cost'
    ]);
    
    // Create Settings sheet
    createOrUpdateSheet(ss, CONFIG.SHEETS.SETTINGS, [
      'Key', 'Value', 'Description', 'Modified Date'
    ]);
    
    // Initialize default settings
    initializeSettings();
    
    Logger.log('Spreadsheet initialized successfully');
    return { success: true, message: 'Spreadsheet initialized successfully' };
    
  } catch (error) {
    Logger.log('Error initializing spreadsheet: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Create or update a sheet with specified headers
 */
function createOrUpdateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Created new sheet: ${sheetName}`);
  }
  
  // Check if headers exist, if not add them
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some(cell => cell !== '');
  
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    
    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  
  return sheet;
}

/**
 * Initialize default settings
 */
function initializeSettings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) { // Only header row exists
    const defaultSettings = [
      ['DEFAULT_COMPANY', '', 'Default company ID for new sessions'],
      ['TUESDAY_MAGIC_TIME', '08:00-12:00', 'Default time block for Tuesday Magic'],
      ['WORKING_DAYS', '6', 'Working days per week'],
      ['WORKING_HOURS', '8', 'Working hours per day'],
      ['BATCH_CATEGORIES', 'Meetings,Documentation,Follow-ups,Emails', 'Default batching categories']
    ];
    
    for (let setting of defaultSettings) {
      setting.push(new Date().toISOString());
      sheet.appendRow(setting);
    }
  }
}

/**
 * Get all companies
 */
function getCompanies() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.COMPANIES);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const companies = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // If ID exists
        companies.push({
          id: row[0],
          name: row[1],
          annualTurnover: row[2],
          businessType: row[3],
          mvot: row[4],
          createdDate: row[5],
          lastModified: row[6]
        });
      }
    }
    
    return companies;
  } catch (error) {
    Logger.log('Error getting companies: ' + error.toString());
    throw new Error('Failed to load companies: ' + error.message);
  }
}

/**
 * Add a new company
 */
function addCompany(companyData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.COMPANIES);
    const id = generateUniqueId();
    const mvot = Math.round(companyData.annualTurnover / CONFIG.MVOT_CALCULATION.WORKING_HOURS_PER_YEAR);
    const now = new Date().toISOString();
    
    const newRow = [
      id,
      companyData.name,
      companyData.annualTurnover,
      companyData.businessType,
      mvot,
      now,
      now
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log(`Company added: ${companyData.name} (ID: ${id})`);
    return { success: true, id: id, mvot: mvot };
    
  } catch (error) {
    Logger.log('Error adding company: ' + error.toString());
    throw new Error('Failed to add company: ' + error.message);
  }
}

/**
 * Switch to a company and return its data
 */
function switchToCompany(companyId) {
  try {
    const companies = getCompanies();
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      throw new Error('Company not found');
    }
    
    // Update default company setting
    updateSetting('DEFAULT_COMPANY', companyId);
    
    return company;
    
  } catch (error) {
    Logger.log('Error switching company: ' + error.toString());
    throw new Error('Failed to switch company: ' + error.message);
  }
}

/**
 * Capture a new task
 */
function captureTask(taskData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.QUICK_CAPTURE);
    const id = generateUniqueId();
    const now = new Date().toISOString();
    
    const newRow = [
      id,
      taskData.companyId,
      taskData.name,
      taskData.category,
      taskData.priority,
      taskData.notes || '',
      'To Process',
      now,
      now
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log(`Task captured: ${taskData.name} (ID: ${id})`);
    return { success: true, id: id };
    
  } catch (error) {
    Logger.log('Error capturing task: ' + error.toString());
    throw new Error('Failed to capture task: ' + error.message);
  }
}

/**
 * Get captured tasks for a company
 */
function getCapturedTasks(companyId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.QUICK_CAPTURE);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const tasks = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === companyId && row[6] === 'To Process') { // Company ID matches and status is 'To Process'
        tasks.push({
          id: row[0],
          companyId: row[1],
          name: row[2],
          category: row[3],
          priority: row[4],
          notes: row[5],
          status: row[6],
          timestamp: row[7]
        });
      }
    }
    
    return tasks;
  } catch (error) {
    Logger.log('Error getting captured tasks: ' + error.toString());
    throw new Error('Failed to load captured tasks: ' + error.message);
  }
}

/**
 * Schedule Tuesday Magic for a company
 */
function scheduleTuesdayMagic(companyId) {
  try {
    // Find next Tuesday
    const nextTuesday = getNextTuesday();
    const timeBlock = getSetting('TUESDAY_MAGIC_TIME') || '08:00-12:00';
    
    // Add to weekly schedule
    const scheduleSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.WEEKLY_SCHEDULE);
    const id = generateUniqueId();
    const now = new Date().toISOString();
    
    const newRow = [
      id,
      companyId,
      nextTuesday.toISOString().split('T')[0], // Date only
      'Tuesday',
      timeBlock,
      'Tuesday Magic - Auto-Pilot Work',
      'Business Development',
      'High',
      '4 hours',
      '', // Actual start
      '', // Actual end
      '4 hours dedicated to building auto-pilot systems for business',
      'Planned'
    ];
    
    scheduleSheet.appendRow(newRow);
    
    Logger.log(`Tuesday Magic scheduled for ${nextTuesday.toDateString()}`);
    return { success: true, date: nextTuesday.toDateString(), timeBlock: timeBlock };
    
  } catch (error) {
    Logger.log('Error scheduling Tuesday Magic: ' + error.toString());
    throw new Error('Failed to schedule Tuesday Magic: ' + error.message);
  }
}

/**
 * Utility function to get next Tuesday
 */
function getNextTuesday() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7; // 2 = Tuesday
  const nextTuesday = new Date(today);
  
  if (daysUntilTuesday === 0 && today.getHours() >= 12) {
    // If it's Tuesday and past noon, schedule for next Tuesday
    nextTuesday.setDate(today.getDate() + 7);
  } else {
    nextTuesday.setDate(today.getDate() + daysUntilTuesday);
  }
  
  return nextTuesday;
}

/**
 * Generate unique ID
 */
function generateUniqueId() {
  return 'BMP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Update a setting
 */
function updateSetting(key, value) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();
    
    let updated = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2, 1, 2).setValues([[value, new Date().toISOString()]]);
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      sheet.appendRow([key, value, '', new Date().toISOString()]);
    }
    
    return true;
  } catch (error) {
    Logger.log('Error updating setting: ' + error.toString());
    return false;
  }
}

/**
 * Get a setting value
 */
function getSetting(key) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('Error getting setting: ' + error.toString());
    return null;
  }
}

/**
 * Test function to initialize everything
 */
function testInitialization() {
  const result = initializeSpreadsheet();
  Logger.log(result);
  
  // Test adding a sample company
  const sampleCompany = {
    name: 'Sample Tech Solutions',
    annualTurnover: 10000000,
    businessType: 'Service'
  };
  
  const companyResult = addCompany(sampleCompany);
  Logger.log('Sample company added:', companyResult);
}

/**
 * Manual trigger to run initialization
 */
function runSetup() {
  return initializeSpreadsheet();
}