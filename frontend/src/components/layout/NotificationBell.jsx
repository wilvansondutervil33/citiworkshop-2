import { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import apiClient from '../../api/client';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import { formatAge } from '../../utils/tickets';

const POLL_MS = 30000;

// Bell with the count of unread notifications; the menu lists only unread ones.
// Opening one marks it read and opens its ticket.
function NotificationBell() {
  const { openTicket, reload, notify } = useFacilityData();
  const [unread, setUnread] = useState([]);
  const [anchor, setAnchor] = useState(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/notifications', { params: { unread_only: true } });
      setUnread(data);
    } catch {
      // Keep the last list; the next poll tries again
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, POLL_MS);
    window.addEventListener('focus', fetchUnread);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', fetchUnread);
    };
  }, [fetchUnread]);

  const openNotification = async (notification) => {
    setAnchor(null);
    setUnread((list) => list.filter((n) => n.id !== notification.id));
    try {
      await apiClient.put(`/notifications/${notification.id}/read`);
    } catch {
      fetchUnread();
    }
    await reload();
    openTicket(notification.ticket_id);
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setUnread([]);
      setAnchor(null);
    } catch {
      notify("Couldn't mark notifications as read. Try again.", 'error');
    }
  };

  const label = unread.length ? `${unread.length} unread notification${unread.length === 1 ? '' : 's'}` : 'No new notifications';

  return (
    <>
      <Tooltip title={label}>
        <IconButton color="inherit" aria-label={label} onClick={(e) => { setAnchor(e.currentTarget); fetchUnread(); }}>
          <Badge badgeContent={unread.length} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 360, maxWidth: 'calc(100vw - 32px)', maxHeight: 480 } } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h6" component="h2">Notifications</Typography>
          {unread.length > 0 && <Button size="small" onClick={markAllRead}>Mark all as read</Button>}
        </Box>
        <Divider />
        {!unread.length && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            You're all caught up.
          </Typography>
        )}
        {unread.map((n) => (
          <MenuItem key={n.id} onClick={() => openNotification(n)} sx={{ alignItems: 'flex-start', whiteSpace: 'normal', py: 1.25 }}>
            <ListItemIcon sx={{ mt: 0.25 }}>
              {n.kind === 'note' ? <ChatBubbleOutlineIcon fontSize="small" /> : <SyncAltIcon fontSize="small" />}
            </ListItemIcon>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">{n.message}</Typography>
              <Typography variant="caption" color="text.secondary">{formatAge(n.created_at)}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default NotificationBell;
