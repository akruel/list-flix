import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './UserMenu';
import { LoginOptionsDialog } from './LoginOptionsDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function LoginButton() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [isLoginOptionsOpen, setIsLoginOptionsOpen] = useState(false);

  if (status === 'loading') {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  if (status === 'authenticated' && user) {
    return <UserMenu user={user} />;
  }

  return (
    <>
      <Button
        onClick={() => {
          if (status === 'anonymous') {
            setIsLoginOptionsOpen(true);
            return;
          }
          navigate('/auth');
        }}
        variant="secondary"
        className="rounded-full"
      >
        <LogIn className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Fazer Login</span>
      </Button>

      <LoginOptionsDialog
        open={isLoginOptionsOpen}
        onOpenChange={setIsLoginOptionsOpen}
      />
    </>
  );
}
