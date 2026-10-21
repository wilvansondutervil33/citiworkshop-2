import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import apiClient from '../api/client';
import { useAuth } from './AuthContext.jsx';
import { apiErrorMessage } from '../utils/tickets';

const RESOURCES = ['tickets', 'engineers', 'users', 'buildings', 'floors', 'seats', 'notes'];

const FacilityDataContext = createContext(null);

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]));

const initials = (name) => name.split(/\s+/).map((word) => word[0]).join('').toUpperCase();

export function FacilityDataProvider({ children }) {
  const { user, logout } = useAuth();
  const [raw, setRaw] = useState(() => Object.fromEntries(RESOURCES.map((r) => [r, []])));
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [notification, setNotification] = useState(null);

  const load = useCallback(async () => {
    const results = await Promise.allSettled(RESOURCES.map((r) => apiClient.get(`/${r}`)));

    if (results.some((r) => r.status === 'rejected' && r.reason.response?.status === 401)) {
      logout();
      return;
    }

    const next = {};
    const failures = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        next[RESOURCES[i]] = result.value.data;
      } else {
        next[RESOURCES[i]] = [];
        failures.push(RESOURCES[i]);
      }
    });
    setRaw(next);
    setFailed(failures);
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  const notify = useCallback((message, severity = 'success') => setNotification({ message, severity }), []);

  const lookups = useMemo(() => {
    // Keyed by id; kept separate from the arrays of the same resources
    const usersById = byId(raw.users);
    const engineersById = byId(raw.engineers);
    const buildingsById = byId(raw.buildings);
    const floorsById = byId(raw.floors);
    const seatsById = byId(raw.seats);

    const me = raw.users.find((u) => u.email === user?.sub) ?? null;
    const myEngineer = me ? raw.engineers.find((e) => e.user_id === me.id) ?? null : null;

    const engineerName = (engineerId) => {
      const engineer = engineersById[engineerId];
      return engineer ? usersById[engineer.user_id]?.name ?? `Engineer ${engineerId}` : null;
    };

    const buildingName = (buildingId) => buildingsById[buildingId]?.name ?? `Building ${buildingId}`;

    // Resolve a seat id into building › floor › seat, with a short code like "HT-03-024"
    const locate = (seatId) => {
      const seat = seatsById[seatId];
      const floor = seat ? floorsById[seat.floor_id] : null;
      if (!seat || !floor) return { buildingId: null, buildingName: 'Unknown location', floorNumber: null, seatType: null, code: `SEAT-${seatId}` };
      const name = buildingName(floor.building_id);
      const prefix = buildingsById[floor.building_id] ? initials(name) : `B${floor.building_id}`;
      return {
        buildingId: floor.building_id,
        buildingName: name,
        floorNumber: floor.floor_number,
        seatType: seat.seat_type,
        code: `${prefix}-${String(floor.floor_number).padStart(2, '0')}-${String(seat.id).padStart(3, '0')}`,
      };
    };

    const notesFor = (ticketId) => raw.notes.filter((n) => n.ticket_id === ticketId);

    return { usersById, me, myEngineer, engineerName, buildingName, locate, notesFor };
  }, [raw, user]);

  // Tickets each role is responsible for
  const scopedTickets = useMemo(() => {
    if (user?.role === 'Employee') return raw.tickets.filter((t) => t.created_by_id === lookups.me?.id);
    if (user?.role === 'Engineer') return raw.tickets.filter((t) => t.assigned_to_id === lookups.myEngineer?.id);
    return raw.tickets;
  }, [raw.tickets, user, lookups]);

  const runAction = useCallback(async (request, successMessage) => {
    try {
      await request();
      notify(successMessage);
      await load();
      return true;
    } catch (error) {
      notify(apiErrorMessage(error), 'error');
      return false;
    }
  }, [load, notify]);

  const updateTicket = useCallback((ticket, changes, successMessage) => {
    const payload = {
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      issue_type: ticket.issue_type,
      assigned_to_id: ticket.assigned_to_id,
      created_by_id: ticket.created_by_id,
      location_id: ticket.location_id,
      ...changes,
    };
    return runAction(() => apiClient.put(`/tickets/${ticket.id}`, payload), successMessage);
  }, [runAction]);

  const createTicket = useCallback((payload) => (
    runAction(() => apiClient.post('/tickets', { status: 'Open', assigned_to_id: null, created_by_id: lookups.me?.id, ...payload }), 'Issue reported')
  ), [runAction, lookups.me]);

  const addNote = useCallback((ticket, body) => {
    // The API stores notes against an engineer, so fall back to the ticket's assignee
    const engineerId = lookups.myEngineer?.id ?? ticket.assigned_to_id;
    if (!engineerId) {
      notify('Assign an engineer before adding notes to this ticket.', 'error');
      return Promise.resolve(false);
    }
    return runAction(() => apiClient.post('/notes', { ticket_id: ticket.id, engineer_id: engineerId, body }), 'Note posted');
  }, [lookups.myEngineer, notify, runAction]);

  const value = {
    ...raw,
    ...lookups,
    role: user?.role,
    loading,
    failed,
    scopedTickets,
    reload: load,
    notify,
    updateTicket,
    createTicket,
    addNote,
    selectedTicketId,
    openTicket: setSelectedTicketId,
    closeTicket: () => setSelectedTicketId(null),
  };

  return (
    <FacilityDataContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification ? (
          <Alert severity={notification.severity} variant="filled" onClose={() => setNotification(null)}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </FacilityDataContext.Provider>
  );
}

export function useFacilityData() {
  const context = useContext(FacilityDataContext);
  if (context === null) {
    throw new Error('useFacilityData must be used within FacilityDataProvider');
  }
  return context;
}
