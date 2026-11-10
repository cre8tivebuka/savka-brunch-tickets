# Savka Brunch Party ticket desk

A one-page ticket desk for the Savka Bistro Sunday Brunch Party.

The manager opens the page, fills in the client's name, email, phone number and
package, and presses **Save and download ticket**. The details are saved to a
Google Sheet and the ticket image downloads with the client's name on it (and
the table number for The Brunch Crew).

## How it works

| Part | Where it lives | What it does |
| --- | --- | --- |
| `index.html` | This repo (GitHub Pages) | The form, the live preview and the ticket drawing |
| `assets/` | This repo | The three blank ticket designs and the Creato Display Black font |
| `apps-script/Code.gs` | Copy of the script inside the Google Sheet | Checks the PIN, gives the ticket an ID, blocks a table that is already assigned, adds the row |

The page sends each ticket to the Google Sheet script. Only when the sheet
confirms the save does the page draw and download the ticket, so every ticket
that exists has a row on the sheet.

## Sheet columns

Timestamp, Ticket ID, Name, Email, Phone, Package, Table Number

## Changing things

- **Manager PIN**: open the Google Sheet, then Extensions > Apps Script. Change
  `MANAGER_PIN` at the top, then Deploy > Manage deployments > edit (pencil) >
  Version: New version > Deploy. The PIN is never stored in this repo.
- **Freeing a table or removing a wrong ticket**: delete that row on the sheet.
  The table number can then be assigned again.
- **Ticket artwork**: replace the files in `assets/` with new 2576 x 2576
  exports that keep the name bar and table number in the same place.
- **Connecting a different sheet**: put that sheet's web app link in
  `CONFIG.endpoint` near the bottom of `index.html`.

## Font

Creato Display Black, used under the SIL Open Font License.
