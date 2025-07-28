// Check if server/index.js has broken code
const fs = require('fs');

console.log('🔍 Checking for broken code in server/index.js...');
console.log('================================================');

const serverPath = './server/index.js';

if (fs.existsSync(serverPath)) {
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Check for the broken line
  const hasBrokenLine = content.includes('app.use("/api/basic-reports", auth, basicReports)');
  const hasCorrectLine = content.includes('app.use("/api/basic-reports", require("./routes/basic-reports"))');
  const hasTryCatch = content.includes('// ✅ NEW REPORTS MANAGEMENT API ROUTES');
  
  console.log(`✅ Correct route line: ${hasCorrectLine ? 'FOUND' : 'MISSING'}`);
  console.log(`❌ Broken route line: ${hasBrokenLine ? 'FOUND (REMOVE IT!)' : 'NOT FOUND'}`);
  console.log(`❌ Broken try/catch: ${hasTryCatch ? 'FOUND (REMOVE IT!)' : 'NOT FOUND'}`);
  
  console.log('');
  
  if (hasBrokenLine || hasTryCatch) {
    console.log('🚨 PROBLEM: Broken code found!');
    console.log('');
    console.log('🔧 ACTION NEEDED:');
    console.log('1. Open server/index.js');
    console.log('2. Find lines 237-245 (try/catch block)');
    console.log('3. DELETE the entire try/catch section');
    console.log('4. Keep only: app.use("/api/basic-reports", require("./routes/basic-reports"));');
    console.log('5. Save and restart server');
  } else if (hasCorrectLine) {
    console.log('✅ SUCCESS: Server looks good!');
    console.log('');
    console.log('🧪 Test your setup:');
    console.log('1. cd server && npm start');
    console.log('2. Visit: http://localhost:3000/reports');
    console.log('3. Should work without errors!');
  } else {
    console.log('⚠️  Missing basic-reports route');
    console.log('Add: app.use("/api/basic-reports", require("./routes/basic-reports"));');
  }
  
} else {
  console.log('❌ server/index.js not found in current directory');
  console.log('Make sure you\'re running this from your GodsOffice project root');
}

console.log('================================================');