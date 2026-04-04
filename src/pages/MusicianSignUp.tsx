import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MusicianSignUp = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to signup page with musician parameter
    navigate('/signup?type=musician');
  }, [navigate]);

  return null;
};

export default MusicianSignUp;
