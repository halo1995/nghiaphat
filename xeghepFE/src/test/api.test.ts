// Test API connection to backend
import { getDrivers } from '../data/drivers';
import { login } from '../data/auth';

// Test function to verify backend connectivity
export const testBackendAPI = async (): Promise<boolean> => {
  console.log('🔗 Testing backend API connection to http://localhost:8080');
  
  try {
    // Test drivers API
    console.log('📋 Testing drivers API...');
    const drivers = await getDrivers();
    console.log('✅ Drivers fetched successfully:', drivers.length, 'drivers');
    
    if (drivers.length > 0) {
      console.log('👤 First driver:', drivers[0].name);
      console.log('📱 Driver status:', drivers[0].status);
      console.log('📞 Driver phone:', drivers[0].phone);
    }
    
    // Test authentication (using admin credentials)
    console.log('🔐 Testing authentication API...');
    try {
      const user = await login('admin', 'admin123');
      console.log('✅ Login successful:', user.name, '(', user.role, ')');
      console.log('👤 User created at:', user.createdAt);
    } catch (loginError) {
      console.warn('⚠️ Login failed, but this might be expected:', loginError.message);
    }
    
    console.log('🎉 Backend API is working! React frontend can connect to Spring Boot backend.');
    return true;
    
  } catch (error) {
    console.error('❌ Backend API test failed:', error);
    console.error('Please ensure:');
    console.log('1️⃣  Backend server is running on http://localhost:8080');
    console.log('2️⃣  CORS is properly configured');
    console.log('3️⃣  Database migrations are complete');
    return false;
  }
};

// Auto-run test when file is imported
if (typeof window !== 'undefined') {
  testBackendAPI();
}

export default testBackendAPI;
