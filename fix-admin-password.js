// Generate correct bcrypt hash for saacontracting2024
const bcrypt = require('bcryptjs');

const password = 'saacontracting2024';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);

// Test the hash
const isValid = bcrypt.compareSync(password, hash);
console.log('Hash validation:', isValid);