import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LogoutChoiceDialog } from './LogoutChoiceDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface UserMenuProps {
  user: UserProfile;
}

export function UserMenu({ user }: UserMenuProps) {
  const navigate = useNavigate();
  const { signOutToGuest, signOutFully } = useAuth();

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleContinueAsGuest = async () => {
    setIsSigningOut(true);
    try {
      await signOutToGuest();
      setIsLogoutDialogOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out to guest mode:', error);
      toast.error('Não foi possível continuar como visitante.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOutFully = async () => {
    setIsSigningOut(true);
    try {
      await signOutFully();
      setIsLogoutDialogOpen(false);
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Error signing out fully:', error);
      toast.error('Não foi possível sair totalmente.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl || ''} alt={user.displayName || 'User'} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName || 'Usuário'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email || 'Sem email'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsLogoutDialogOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutChoiceDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        onContinueAsGuest={() => {
          void handleContinueAsGuest();
        }}
        onSignOutFully={() => {
          void handleSignOutFully();
        }}
        isLoading={isSigningOut}
      />
    </>
  );
}
