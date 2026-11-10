/**
 * Savka Bistro - Sunday Brunch Party ticket register.
 *
 * This script lives inside the Google Sheet that records every ticket.
 * The ticket desk page (GitHub Pages) sends each ticket here; the script
 * checks the manager PIN, gives the ticket an ID, blocks a table number
 * that is already assigned, and adds a row to the "Tickets" tab.
 *
 * @OnlyCurrentDoc
 */

// The manager PIN. It is kept here, in the Google account, and never in
// the public GitHub repo. Change it here, then Deploy > Manage deployments
// > edit > New version, and the old PIN stops working.
const MANAGER_PIN = 'CHANGE_ME';

const SHEET_NAME = 'Tickets';
const HEADERS = ['Timestamp', 'Ticket ID', 'Name', 'Email', 'Phone', 'Package', 'Table Number'];
const ID_PREFIX = 'SBP-';

const PACKAGES = {
  solo: 'THE SOLO GROOVE - SINGLES PACKAGE',
  couples: 'BRUNCH FOR TWO - COUPLES PACKAGE',
  crew: 'THE BRUNCH CREW - TABLE FOR 4'
};

const MAX_WRONG_PINS = 10;      // wrong PINs allowed ...
const PIN_WINDOW_SECONDS = 600; // ... in this many seconds before a pause

function doGet() {
  return json_({ ok: true, service: 'Savka Sunday Brunch Party ticket register' });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return fail_('INVALID', 'The ticket details did not arrive properly. Try again.');
  }

  const cache = CacheService.getScriptCache();

  // PIN check, with a pause after too many wrong tries.
  const wrong = Number(cache.get('wrong-pins') || 0);
  if (wrong >= MAX_WRONG_PINS) {
    return fail_('LOCKED', 'Too many wrong PINs. Wait 10 minutes and try again.');
  }
  if (String(data.pin || '').trim() !== MANAGER_PIN) {
    cache.put('wrong-pins', String(wrong + 1), PIN_WINDOW_SECONDS);
    return fail_('PIN', 'Wrong manager PIN.');
  }

  // Check and tidy the details.
  const name = clean_(data.name).replace(/^[=+\-@\s]+/, '');
  const email = clean_(data.email).toLowerCase();
  const phone = clean_(data.phone);
  const pkg = String(data.package || '');
  let table = clean_(data.table).replace(/^0+(?=\d)/, '');

  if (name.length < 2 || name.length > 40) {
    return fail_('INVALID', 'Enter the client name (2 to 40 characters).');
  }
  if (!/^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    return fail_('INVALID', 'Enter a valid email address.');
  }
  if (!/^\+?[0-9][0-9 ()\-]{6,19}$/.test(phone)) {
    return fail_('INVALID', 'Enter a valid phone number.');
  }
  if (!PACKAGES[pkg]) {
    return fail_('INVALID', 'Choose a package.');
  }
  if (pkg === 'crew') {
    if (!/^[0-9]{1,3}$/.test(table)) {
      return fail_('INVALID', 'Enter the table number for The Brunch Crew (numbers only).');
    }
  } else {
    table = '';
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return fail_('BUSY', 'The sheet is busy. Try again in a moment.');
  }

  try {
    // If this exact submission was already saved (a retry after a weak
    // connection), return the same ticket instead of saving it twice.
    const requestKey = 'req-' + String(data.requestId || '').slice(0, 60);
    if (data.requestId) {
      const earlier = cache.get(requestKey);
      if (earlier) return ContentService.createTextOutput(earlier).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    let highest = 0;

    if (lastRow > 1) {
      const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();
      for (let i = 0; i < rows.length; i++) {
        const n = parseInt(String(rows[i][1]).replace(/\D/g, ''), 10);
        if (n > highest) highest = n;

        if (pkg === 'crew' && rows[i][5] === PACKAGES.crew) {
          const taken = String(rows[i][6]).trim().replace(/^0+(?=\d)/, '');
          if (taken === table) {
            return fail_('TABLE_TAKEN', 'Table ' + table + ' is already assigned to ' + rows[i][2] +
              ' (' + rows[i][1] + '). Choose another table number.');
          }
        }
      }
    }

    const next = String(highest + 1);
    const ticketId = ID_PREFIX + (next.length < 3 ? ('000' + next).slice(-3) : next);
    const row = lastRow + 1;
    const range = sheet.getRange(row, 1, 1, HEADERS.length);
    range.setNumberFormats([['dd mmm yyyy, hh:mm', '@', '@', '@', '@', '@', '@']]);
    range.setValues([[new Date(), ticketId, name, email, phone, PACKAGES[pkg], table]]);
    SpreadsheetApp.flush();

    const result = JSON.stringify({ ok: true, ticketId: ticketId, name: name, package: pkg, table: table });
    if (data.requestId) cache.put(requestKey, result, 21600);
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return fail_('SERVER', 'The ticket was not saved. Try again. (' + err.message + ')');
  } finally {
    lock.releaseLock();
  }
}

/** Finds the Tickets tab, or creates it with headers the first time. */
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const all = ss.getSheets();
    sheet = (all.length === 1 && all[0].getLastRow() === 0) ? all[0].setName(SHEET_NAME) : ss.insertSheet(SHEET_NAME, 0);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#C11416').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 170);
    sheet.setColumnWidth(3, 240);
    sheet.setColumnWidth(4, 260);
    sheet.setColumnWidth(6, 300);
    ss.setSpreadsheetTimeZone('Africa/Lagos');
  }
  return sheet;
}

/** Run this once from the editor to create the Tickets tab and grant access. */
function setup() {
  getSheet_();
}

function clean_(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function fail_(code, message) {
  return json_({ ok: false, code: code, message: message });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
