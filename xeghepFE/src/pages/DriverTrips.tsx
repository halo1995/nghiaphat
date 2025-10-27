import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DriverTrips = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to driver dashboard
    navigate('/driver');
  }, [navigate]);

  return null;
};

export default DriverTrips;