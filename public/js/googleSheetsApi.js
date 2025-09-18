/**
 * Google Sheets API Client for Canvas Discussion Browser
 * 
 * This client handles integration with Google Sheets API to fetch supplemental user data.
 * Key features:
 * - Public sheet access using API key (no OAuth required)
 * - Predetermined column schema for consistency
 * - User matching with Canvas display names
 * - Caching for performance
 * - Error handling and graceful degradation
 * 
 * Schema:
 * Column A: Canvas Display Name (for matching)
 * Column B: Institution  
 * Column C: Title
 * Column D: Notes
 * Column E: Assistant Type
 * Column F: Tags (comma-separated)
 * Column G: Custom Field 1
 * Column H: Custom Field 2
 */

/**
 * Normalize name for fuzzy matching (from dataUtils.js)
 * Enhanced to handle different name formats like "Last, First" vs "First Last"
 */
function normalizeNameForMatching(name) {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, ' ')      // Remove parentheses content
    .replace(/\b[a-z]\b/g, '')            // Remove middle initials
    .replace(/\bjonathan\b/g, 'jon')      // Common nickname mappings
    .replace(/\btimothy\b/g, 'tim')
    .replace(/\bsteven?\b/g, 'steve')
    .replace(/\bnathaniel\b/g, 'nate')
    .replace(/\braymond\b/g, 'ray')
    .replace(/\bkimberlyn\b/g, 'kim')
    .replace(/\bkimberly\b/g, 'kim')
    .replace(/[^\w\s]/g, '')              // Remove punctuation
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim();
  
  // Handle "Last, First" format by converting to sorted words
  // This way "Page Jeremy" and "Jeremy Page" both become "jeremy page"
  const words = normalized.split(' ').filter(word => word.length > 0);
  return words.sort().join(' ');
}

/**
 * Column mapping for Google Sheets data
 */
const COLUMN_MAPPING = {
  0: 'displayName',     // Column A
  1: 'institution',     // Column B
  2: 'title',          // Column C
  3: 'notes',          // Column D
  4: 'assistantType',  // Column E
  5: 'tags',           // Column F
  6: 'customField1',   // Column G
  7: 'customField2'    // Column H
};

/**
 * Fetch data from Google Sheets using the Sheets API
 * 
 * @param {string} sheetId - Google Sheets ID
 * @param {string} apiKey - Google Sheets API key
 * @param {string} range - Sheet range (default: 'A:H')
 * @returns {Promise<Array>} Array of user data objects
 */
async function fetchGoogleSheetsData(sheetId, apiKey, range = 'A:H') {
  if (!sheetId || !apiKey) {
    throw new Error('Google Sheets ID and API key are required');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      console.warn('Google Sheets returned no data');
      return [];
    }
    
    // Skip header row (first row) and process data
    const rows = data.values.slice(1);
    const userData = rows
      .filter(row => row[0]) // Filter out rows without display name
      .map(row => parseSheetRow(row));
    
    console.log(`📊 Google Sheets: Loaded ${userData.length} user records`);
    return userData;
    
  } catch (error) {
    console.error('Failed to fetch Google Sheets data:', error.message);
    throw error;
  }
}

/**
 * Parse a single row from Google Sheets into user data object
 * 
 * @param {Array} row - Array of cell values from sheet row
 * @returns {Object} Parsed user data object
 */
function parseSheetRow(row) {
  const userData = {};
  
  // Map each column to its corresponding field
  Object.entries(COLUMN_MAPPING).forEach(([colIndex, fieldName]) => {
    const cellValue = row[parseInt(colIndex)];
    
    if (cellValue && cellValue.trim()) {
      if (fieldName === 'tags') {
        // Parse comma-separated tags
        userData[fieldName] = cellValue.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else {
        userData[fieldName] = cellValue.trim();
      }
    }
  });
  
  return userData;
}

/**
 * Match Canvas users with Google Sheets data
 * Uses display name matching with fuzzy matching fallback
 * 
 * @param {Array} canvasUsers - Array of Canvas user objects
 * @param {Array} sheetsData - Array of Google Sheets user objects
 * @returns {Object} Object containing matched users and match statistics
 */
function matchUsersWithSheetsData(canvasUsers, sheetsData) {
  const matchedUsers = [];
  const unmatchedCanvas = [];
  const unmatchedSheets = [...sheetsData]; // Copy for tracking unmatched
  
  canvasUsers.forEach(canvasUser => {
    const canvasName = canvasUser.display_name || canvasUser.user_name || '';
    
    // Try exact match first
    let sheetMatch = sheetsData.find(sheetUser => 
      sheetUser.displayName === canvasName
    );
    
    // Try fuzzy match if exact match fails
    if (!sheetMatch) {
      const normalizedCanvasName = normalizeNameForMatching(canvasName);
      console.log(`🔍 Fuzzy matching for "${canvasName}" -> "${normalizedCanvasName}"`);
      
      sheetMatch = sheetsData.find(sheetUser => {
        const normalizedSheetName = normalizeNameForMatching(sheetUser.displayName);
        console.log(`   Comparing with "${sheetUser.displayName}" -> "${normalizedSheetName}"`);
        
        // First try exact normalized match
        let isMatch = normalizedCanvasName === normalizedSheetName;
        
        // If not exact, try subset matching (for middle names, etc.)
        if (!isMatch) {
          const canvasWords = normalizedCanvasName.split(' ').filter(w => w.length > 0);
          const sheetWords = normalizedSheetName.split(' ').filter(w => w.length > 0);
          
          // Check if one name is a subset of the other (handles middle names)
          // Example: "rebecca davis" matches "rebecca frost davis"
          const canvasSet = new Set(canvasWords);
          const sheetSet = new Set(sheetWords);
          
          const canvasInSheet = canvasWords.every(word => sheetSet.has(word));
          const sheetInCanvas = sheetWords.every(word => canvasSet.has(word));
          
          isMatch = canvasInSheet || sheetInCanvas;
          
          if (isMatch) {
            console.log(`   ✅ SUBSET MATCH FOUND! (${canvasInSheet ? 'canvas ⊆ sheet' : 'sheet ⊆ canvas'})`);
          }
        } else if (isMatch) {
          console.log(`   ✅ EXACT MATCH FOUND!`);
        }
        
        return isMatch;
      });
    }
    
    if (sheetMatch) {
      // Remove from unmatched list
      const unmatchedIndex = unmatchedSheets.findIndex(s => s === sheetMatch);
      if (unmatchedIndex !== -1) {
        unmatchedSheets.splice(unmatchedIndex, 1);
      }
      
      // Create enhanced user object
      matchedUsers.push({
        ...canvasUser,
        enhancedData: {
          source: 'google_sheets',
          institution: sheetMatch.institution,
          title: sheetMatch.title,
          notes: sheetMatch.notes,
          assistantType: sheetMatch.assistantType,
          tags: sheetMatch.tags || [],
          customField1: sheetMatch.customField1,
          customField2: sheetMatch.customField2,
          matchType: sheetMatch.displayName === canvasName ? 'exact' : 'fuzzy'
        }
      });
    } else {
      unmatchedCanvas.push(canvasUser);
    }
  });
  
  const stats = {
    totalCanvas: canvasUsers.length,
    totalSheets: sheetsData.length,
    matched: matchedUsers.length,
    unmatchedCanvas: unmatchedCanvas.length,
    unmatchedSheets: unmatchedSheets.length,
    matchRate: (matchedUsers.length / canvasUsers.length * 100).toFixed(1)
  };
  
  console.log(`🔄 User Matching Results:`, stats);
  
  return {
    matchedUsers,
    unmatchedCanvas,
    unmatchedSheets,
    stats
  };
}

/**
 * Cache management for Google Sheets data
 */
const SHEETS_CACHE_PREFIX = 'sheets_cache_';

/**
 * Get cached Google Sheets data
 * 
 * @param {string} sheetId - Google Sheets ID
 * @returns {Object|null} Cached data or null if not found/expired
 */
function getCachedSheetsData(sheetId) {
  try {
    const cacheKey = `${SHEETS_CACHE_PREFIX}${sheetId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`📋 Google Sheets: Using cached data for ${sheetId}`);
      return data;
    }
  } catch (error) {
    console.warn('Failed to read Google Sheets cache:', error);
  }
  return null;
}

/**
 * Cache Google Sheets data
 * 
 * @param {string} sheetId - Google Sheets ID
 * @param {Array} data - Data to cache
 */
function cacheSheetsData(sheetId, data) {
  try {
    const cacheKey = `${SHEETS_CACHE_PREFIX}${sheetId}`;
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`💾 Google Sheets: Cached ${data.length} records for ${sheetId}`);
  } catch (error) {
    console.warn('Failed to cache Google Sheets data:', error);
  }
}

/**
 * Clear Google Sheets cache
 * 
 * @param {string} sheetId - Optional specific sheet ID, or clear all if not provided
 */
function clearSheetsCache(sheetId = null) {
  try {
    if (sheetId) {
      const cacheKey = `${SHEETS_CACHE_PREFIX}${sheetId}`;
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Google Sheets: Cleared cache for ${sheetId}`);
    } else {
      // Clear all sheets cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(SHEETS_CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ Google Sheets: Cleared all cache');
    }
  } catch (error) {
    console.warn('Failed to clear Google Sheets cache:', error);
  }
}

/**
 * Main function to fetch and process Google Sheets data with caching
 * 
 * @param {Object} params - Parameters object
 * @param {string} params.sheetId - Google Sheets ID
 * @param {string} params.apiKey - Google Sheets API key
 * @param {Array} params.canvasUsers - Array of Canvas users to match
 * @param {boolean} params.useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object>} Enhanced users with match results
 */
async function fetchAndMatchSheetsData({ sheetId, apiKey, canvasUsers, useCache = true }) {
  try {
    let sheetsData = null;
    
    // Try cache first if enabled
    if (useCache) {
      const cached = getCachedSheetsData(sheetId);
      if (cached) {
        sheetsData = cached.data;
      }
    }
    
    // Fetch fresh data if no cache hit
    if (!sheetsData) {
      sheetsData = await fetchGoogleSheetsData(sheetId, apiKey);
      
      // Cache the fresh data
      if (sheetsData && sheetsData.length > 0) {
        cacheSheetsData(sheetId, sheetsData);
      }
    }
    
    // Match users with sheets data
    const matchResults = matchUsersWithSheetsData(canvasUsers, sheetsData);
    
    return {
      success: true,
      ...matchResults,
      sheetsData
    };
    
  } catch (error) {
    console.error('Google Sheets integration failed:', error);
    
    return {
      success: false,
      error: error.message,
      matchedUsers: canvasUsers, // Return original Canvas users as fallback
      unmatchedCanvas: [],
      unmatchedSheets: [],
      stats: {
        totalCanvas: canvasUsers.length,
        totalSheets: 0,
        matched: 0,
        unmatchedCanvas: canvasUsers.length,
        unmatchedSheets: 0,
        matchRate: '0.0'
      }
    };
  }
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  window.googleSheetsApi = {
    fetchAndMatchSheetsData,
    fetchGoogleSheetsData,
    matchUsersWithSheetsData,
    clearSheetsCache,
    getCachedSheetsData
  };
}