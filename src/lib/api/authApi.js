import authClient from './authClient';

// Login with email and password
export async function login(email, password) {
  const response = await authClient.post('/login', {
    identifier: email,
    password,
    clientId: 'Activity-Tracker',
  });
  return response.data;
}

export async function sendOtp(email) {
  const response = await authClient.post('/send-otp', {
    identifier: email,
  });
  return response.data;
}

// Verify OTP and get token
export async function verifyOtp(email, otp) {
  const response = await authClient.post('/verify-otp', {
    email: email,
    otp: otp,
    clientId: 'Activity-Tracker',
  });
  return response.data;
}

// Sign up after OTP verification
export async function signup(email, password, name) {
  const response = await authClient.post('/signup', {
    email: email,
    password: password,
    name: name,
    clientId: 'Activity-Tracker',
  });
  return response.data;
}

// Get current user profile
export async function getProfile() {
  const response = await authClient.get('/profile');
  return response.data;
}

// Logout
export async function logout() {
  const response = await authClient.post('/logout');
  return response.data;
}
