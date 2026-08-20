const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function testDrive() {
  try {
    const keyPath = path.join(__dirname, '..', 'coastal-idea-505611-k6-21359950d50e.json');
    if (!fs.existsSync(keyPath)) {
      console.error('Key file not found at:', keyPath);
      return;
    }
    console.log('Using key file:', keyPath);

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const client = await auth.getClient();
    console.log('Auth client initialized for:', client.email);

    const drive = google.drive({ version: 'v3', auth: client });

    console.log('Querying Google Drive files list...');
    const res = await drive.files.list({
      pageSize: 30,
      fields: 'files(id, name, mimeType, parents, owners, trashed)',
      q: "trashed = false",
    });

    console.log('\n--- Accessible Files & Folders ---');
    if (res.data.files && res.data.files.length > 0) {
      res.data.files.forEach(f => {
        const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
        console.log(`[${isFolder ? 'FOLDER' : 'FILE'}] "${f.name}" (ID: ${f.id})`);
      });
    } else {
      console.log('No files/folders shared yet. Remember to share your Google Drive folder with website-storage@coastal-idea-505611-k6.iam.gserviceaccount.com as Editor.');
    }
    console.log('--- Test Finished Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during Google Drive test:', err.message);
    if (err.response && err.response.data) {
      console.error('API Error Data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

testDrive();
