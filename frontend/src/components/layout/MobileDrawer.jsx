import Sidebar from './Sidebar.jsx';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog.jsx';

export default function MobileDrawer({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="drawer" showClose={false} className="p-0">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <Sidebar className="h-full w-full border-r-0" onNavigate={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
