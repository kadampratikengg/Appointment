import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminStyles.css';

function AdminPanel({ appointments, onCreateUser, fetchAppointments }) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState({});
  const [localAppointments, setLocalAppointments] = useState(appointments || []);
  const API_URL = process.env.REACT_APP_API_URL;

  // Local fetchAppointments implementation as a fallback
  const localFetchAppointments = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.error('No admin token found');
        alert('Please log in to fetch appointments.');
        navigate('/admin');
        return;
      }
      const response = await axios.get(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // console.log('Fetched appointments:', response.data);
      // setLocalAppointments(response.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      alert('Failed to fetch appointments: ' + (err.message || 'Unknown error'));
    }
  };

  // Use provided fetchAppointments or local fallback
  const effectiveFetchAppointments = fetchAppointments || localFetchAppointments;

  // Fetch appointments on mount
  useEffect(() => {
    if (typeof effectiveFetchAppointments === 'function') {
      effectiveFetchAppointments();
    } else {
      console.warn('fetchAppointments is not a function, using local fallback');
      localFetchAppointments();
    }
  }, [effectiveFetchAppointments]);

  // Sync localAppointments with prop changes
  useEffect(() => {
    if (appointments && Array.isArray(appointments)) {
      setLocalAppointments(appointments);
    }
  }, [appointments]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const currentDateTime = new Date();
  const today = currentDateTime.toISOString().split('T')[0];

  const sortedAppointments = [...localAppointments].sort((a, b) => {
    try {
      const dateTimeA = new Date(`${a.date}T${a.time}+05:30`);
      const dateTimeB = new Date(`${b.date}T${b.time}+05:30`);
      if (isNaN(dateTimeA.getTime()) && isNaN(dateTimeB.getTime())) return 0;
      if (isNaN(dateTimeA.getTime())) return 1;
      if (isNaN(dateTimeB.getTime())) return -1;
      return dateTimeA - dateTimeB;
    } catch (err) {
      console.error('Sorting error:', err);
      return 0;
    }
  });

  const completedAppointments = sortedAppointments.filter((appointment) => {
    try {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}+05:30`);
      return appointmentDateTime < currentDateTime;
    } catch (err) {
      console.error('Error filtering completed appointment:', err);
      return false;
    }
  });

  const todayAppointments = sortedAppointments.filter((appointment) => appointment.date === today);

  const futureAppointments = sortedAppointments.filter((appointment) => {
    try {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}+05:30`);
      return appointment.date > today || (appointment.date === today && appointmentDateTime > currentDateTime);
    } catch (err) {
      console.error('Error filtering future appointment:', err);
      return false;
    }
  });

  const validateAppointment = async (id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      alert('Invalid appointment ID format.');
      return false;
    }
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('Please log in to perform this action.');
        navigate('/admin');
        return false;
      }
      await axios.get(`${API_URL}/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (err) {
      if (err.response?.status === 404) {
        alert('Appointment not found. It may have been deleted.');
        effectiveFetchAppointments();
        return false;
      }
      console.error('Validation error:', err);
      alert('Failed to validate appointment: ' + (err.message || 'Unknown error'));
      return false;
    }
  };

  const handleDelete = async (id) => {
    if (loading[id]) return;
    setLoading((prev) => ({ ...prev, [id]: 'delete' }));
    try {
      if (!(await validateAppointment(id))) return;
      if (window.confirm('Are you sure you want to delete this appointment?')) {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`${API_URL}/appointments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        effectiveFetchAppointments();
        alert('Appointment deleted successfully.');
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      if (err.response?.status === 404) {
        alert('Appointment not found. It may have been deleted already.');
      } else {
        alert('Failed to delete appointment: ' + (err.message || 'Unknown error'));
      }
      effectiveFetchAppointments();
    } finally {
      setLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleEdit = (appointment) => {
    setEditingId(appointment._id);
    setEditForm({
      name: appointment.name,
      email: appointment.email,
      contactNumber: appointment.contactNumber,
      area: appointment.area,
      date: appointment.date,
      time: appointment.time,
      remark: appointment.remark || '',
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (id) => {
    if (loading[id]) return;
    setLoading((prev) => ({ ...prev, [id]: 'edit' }));
    try {
      if (!(await validateAppointment(id))) return;
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${API_URL}/appointments/${id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      setEditForm({});
      effectiveFetchAppointments();
      alert('Appointment updated successfully.');
    } catch (err) {
      console.error('Error updating appointment:', err);
      if (err.response?.status === 404) {
        alert('Appointment not found. It may have been deleted.');
      } else {
        alert('Failed to update appointment: ' + (err.message || 'Unknown error'));
      }
      effectiveFetchAppointments();
    } finally {
      setLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleToggleAttempted = async (id, currentStatus) => {
    if (loading[id]) return;
    setLoading((prev) => ({ ...prev, [id]: 'toggle' }));
    try {
      if (!(await validateAppointment(id))) return;
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API_URL}/appointments/${id}/attempted`,
        { attempted: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      effectiveFetchAppointments();
      alert('Attempted status updated successfully.');
    } catch (err) {
      console.error('Error updating attempted status:', err);
      if (err.response?.status === 404) {
        alert('Appointment not found. It may have been deleted.');
      } else {
        alert('Failed to update attempted status: ' + (err.message || 'Unknown error'));
      }
      effectiveFetchAppointments();
    } finally {
      setLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const renderSection = (appointments, title, cardClass) => (
    <div className="section">
      <h3 className="section-title">{title}</h3>
      {appointments.length === 0 ? (
        <p className="no-appointments">No appointments found.</p>
      ) : (
        <div className="appointment-grid">
          {appointments.map((appointment) => (
            <div key={appointment._id} className={`appointment-card ${cardClass}`}>
              {editingId === appointment._id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    placeholder="Name"
                    className="edit-input"
                  />
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    placeholder="Email"
                    className="edit-input"
                  />
                  <input
                    type="text"
                    name="contactNumber"
                    value={editForm.contactNumber}
                    onChange={handleEditChange}
                    placeholder="Contact Number"
                    className="edit-input"
                  />
                  <input
                    type="text"
                    name="area"
                    value={editForm.area}
                    onChange={handleEditChange}
                    placeholder="Area"
                    className="edit-input"
                  />
                  <input
                    type="date"
                    name="date"
                    value={editForm.date}
                    onChange={handleEditChange}
                    className="edit-input"
                  />
                  <input
                    type="time"
                    name="time"
                    value={editForm.time}
                    onChange={handleEditChange}
                    className="edit-input"
                  />
                  <textarea
                    name="remark"
                    value={editForm.remark}
                    onChange={handleEditChange}
                    placeholder="Remark"
                    className="edit-textarea"
                  />
                  <div className="edit-actions">
                    <button
                      onClick={() => handleEditSubmit(appointment._id)}
                      className="action-button save-button"
                      disabled={loading[appointment._id] === 'edit'}
                    >
                      {loading[appointment._id] === 'edit' ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="action-button cancel-button"
                      disabled={loading[appointment._id] === 'edit'}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card-actions">
                    <button
                      onClick={() => handleEdit(appointment)}
                      className="action-button edit-button"
                      title="Edit Appointment"
                      disabled={loading[appointment._id]}
                    >
                      <span role="img" aria-label="Edit">✏️</span>
                    </button>
                    <button
                      onClick={() => handleDelete(appointment._id)}
                      className="action-button delete-button"
                      title="Delete Appointment"
                      disabled={loading[appointment._id] === 'delete'}
                    >
                      {loading[appointment._id] === 'delete' ? 'Deleting...' : <span role="img" aria-label="Delete">🗑️</span>}
                    </button>
                    {cardClass === 'today-card' && (
                      <input
                        type="checkbox"
                        checked={appointment.attempted}
                        onChange={() => handleToggleAttempted(appointment._id, appointment.attempted)}
                        className={`attempt-checkbox ${appointment.attempted ? 'attempted' : 'not-attempted'}`}
                        title={appointment.attempted ? 'Mark as Not Attempted' : 'Mark as Attempted'}
                        disabled={loading[appointment._id] === 'toggle'}
                      />
                    )}
                  </div>
                  <h4 className="card-title">{appointment.name}</h4>
                  <p className="card-detail"><strong>Email:</strong> {appointment.email}</p>
                  <p className="card-detail"><strong>Contact:</strong> {appointment.contactNumber}</p>
                  <p className="card-detail"><strong>Area:</strong> {appointment.area}</p>
                  <p className="card-detail"><strong>Date:</strong> {appointment.date}</p>
                  <p className="card-detail"><strong>Time:</strong> {appointment.time}</p>
                  <p className="card-detail"><strong>Remark:</strong> {appointment.remark}</p>
                  <p className="card-detail"><strong>Status:</strong> {appointment.attempted ? 'Attempted' : 'Not Attempted'}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2 className="text-2xl font-semibold">Appointments</h2>
        <div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {renderSection(todayAppointments, "Today's", 'today-card')}
      {renderSection(futureAppointments, 'Future', 'future-card')}
      {renderSection(completedAppointments, 'Completed', 'completed-card')}
    </div>
  );
}

export default AdminPanel;