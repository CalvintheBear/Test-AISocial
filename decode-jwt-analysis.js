// Detailed analysis of the decodeJwtPayload function
console.log('=== decodeJwtPayload Function Analysis ===');

// Simulate the decodeJwtPayload function
function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // atob simulation (will fail in Node.js)
    console.log('Token payload part:', payload);
    console.log('Base64 normalized:', base64);
    
    // This will likely fail in Node.js environment
    if (typeof atob === 'undefined') {
      console.log('atob not available in Node.js - this is a silent failure point');
      return null;
    }
    
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;
    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    console.log('decodeJwtPayload failed:', e.message);
    return null; // Silent failure
  }
}

// Test with various scenarios
const testCases = [
  'invalid.jwt.token',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.signature',
  '',
  null,
  undefined
];

console.log('\n=== Testing decodeJwtPayload with various inputs ===');
testCases.forEach((token, i) => {
  console.log(`\nTest case ${i + 1}: ${token || 'empty/null'}`);
  const result = decodeJwtPayload(token);
  console.log('Result:', result);
});

// Simulate the issuer matching issue
console.log('\n=== Issuer Matching Analysis ===');
const mockPayload = {
  sub: 'user123',
  iss: 'https://old-domain.clerk.app', // Old issuer
  exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
};

const expectedIssuer = 'https://cuttingasmr.org'; // New issuer
const actualIssuer = mockPayload.iss;

console.log('Expected issuer:', expectedIssuer);
console.log('Actual issuer:', actualIssuer);
console.log('Issuer match:', expectedIssuer === actualIssuer);
console.log('This causes basicValid check to fail');