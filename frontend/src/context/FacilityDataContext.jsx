import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import apiClient from '../api/client';
import { useAuth } from './AuthContext.jsx';
import { apiErrorMessage } from '../utils/tickets';

const RESOURCES = ['tickets', 'engineers', 'users', 'buildings', 'floors', 'seats', 'notes'];
// Facilities load deactivated rows too, so admins can see and reactivate them
const INCLUDE_INACTIVE = new Set(['buildings', 'floors', 'seats']);

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
    const results = await Promise.allSettled(RESOURCES.map((r) => apiClient.get(`/${r}`, { params: INCLUDE_INACTIVE.has(r) ? { include_inactive: true } : {} })));

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
    const buildingDepartment = (buildingId) => buildingsById[buildingId]?.department ?? null;

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

    const activeBuildings = raw.buildings.filter((b) => b.is_active !== false);
    const activeBuildingIds = new Set(activeBuildings.map((b) => b.id));
    const activeFloors = raw.floors.filter((f) => f.is_active !== false && (!raw.buildings.length || activeBuildingIds.has(f.building_id)));
    const activeFloorIds = new Set(activeFloors.map((f) => f.id));
    const activeSeats = raw.seats.filter((s) => s.is_active !== false && activeFloorIds.has(s.floor_id));

    const notesFor = (ticketId) => raw.notes.filter((n) => n.ticket_id === ticketId);
    const noteAuthor = (note) => usersById[note.author_id]?.name ?? 'Unknown';

    return { usersById, me, myEngineer, engineerName, buildingName, buildingDepartment, locate, notesFor, noteAuthor, activeBuildings, activeFloors, activeSeats };
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

  const createTicket = useCallback((payload, successMessage) => (
    runAction(() => apiClient.post('/tickets', { status: 'Open', assigned_to_id: null, created_by_id: lookups.me?.id, ...payload }), successMessage ?? 'Issue reported')
  ), [runAction, lookups.me]);

  // Engineers also need an engineer profile (building + workload limit) before tickets can reach them
  const createUser = useCallback(async ({ name, email, password, role, buildingId, maxWorkload }) => {
    let user;
    try {
      ({ data: user } = await apiClient.post('/auth/register', { name, email, role, hashed_password: password }));
    } catch (error) {
      notify(apiErrorMessage(error), 'error');
      return false;
    }
    if (role === 'Engineer') {
      try {
        await apiClient.post('/engineers', { user_id: user.id, building_id: Number(buildingId), max_workload: Number(maxWorkload) });
      } catch (error) {
        notify(`${user.name} was added, but their engineer profile failed: ${apiErrorMessage(error)}`, 'error');
        await load();
        return true;
      }
    }
    notify(`${user.name} added`);
    await load();
    return true;
  }, [load, notify]);

  const createBuilding = useCallback((payload) => (
    runAction(() => apiClient.post('/buildings', payload), `${payload.name} added`)
  ), [runAction]);

  const createFloor = useCallback((payload) => (
    runAction(() => apiClient.post('/floors', payload), `Floor ${payload.floor_number} added`)
  ), [runAction]);

  // The API creates one seat per request, so add them in order and report how many succeeded
  const createSeats = useCallback(async (floorId, seatType, count) => {
    let added = 0;
    try {
      for (let i = 0; i < count; i += 1) {
        await apiClient.post('/seats', { floor_id: floorId, seat_type: seatType });
        added += 1;
      }
      notify(`${added} ${seatType.toLowerCase()} seat${added === 1 ? '' : 's'} added`);
      return true;
    } catch (error) {
      notify(`${added} of ${count} seats added. ${apiErrorMessage(error)}`, 'error');
      return false;
    } finally {
      await load();
    }
  }, [load, notify]);

  const updateBuilding = useCallback((building, payload) => (
    runAction(() => apiClient.put(`/buildings/${building.id}`, payload), `${payload.name} updated`)
  ), [runAction]);

  const updateFloor = useCallback((floor, payload) => (
    runAction(() => apiClient.put(`/floors/${floor.id}`, payload), `Floor ${payload.floor_number} updated`)
  ), [runAction]);

  const updateSeat = useCallback((seat, payload) => (
    runAction(() => apiClient.put(`/seats/${seat.id}`, payload), `Seat #${seat.id} updated`)
  ), [runAction]);

  // kind is 'buildings', 'floors' or 'seats'
  const setFacilityActive = useCallback((kind, item, active, label) => (
    runAction(() => apiClient.put(`/${kind}/${active ? 'active' : 'deactive'}/${item.id}`), `${label} ${active ? 'reactivated' : 'deactivated'}`)
  ), [runAction]);

  const setUserActive = useCallback((target, active) => (
    runAction(
      () => apiClient.put(`/users/${active ? 'active' : 'deactive'}/${target.id}`),
      `${target.name} ${active ? 'reactivated' : 'deactivated'}`,
    )
  ), [runAction]);

  // The API records the logged-in user as the note's author
  const addNote = useCallback((ticket, body) => (
    runAction(() => apiClient.post('/notes', { ticket_id: ticket.id, body }), 'Note posted')
  ), [runAction]);

  const value = {
    ...raw,
    ...lookups,
    // Everywhere else in the app only sees usable facilities; the Facilities page uses the all* lists
    buildings: lookups.activeBuildings,
    floors: lookups.activeFloors,
    seats: lookups.activeSeats,
    allBuildings: raw.buildings,
    allFloors: raw.floors,
    allSeats: raw.seats,
    role: user?.role,
    loading,
    failed,
    scopedTickets,
    reload: load,
    notify,
    updateTicket,
    createTicket,
    addNote,
    setUserActive,
    createUser,
    createBuilding,
    createFloor,
    createSeats,
    updateBuilding,
    updateFloor,
    updateSeat,
    setFacilityActive,
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
