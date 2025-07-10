const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const jwt = require('jsonwebtoken');

console.log('Appointment model:', Appointment);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Add GET /:id route to check appointment existence
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      console.log(`Appointment not found for GET, ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.log('Appointment fetched:', appointment);
    res.status(200).json(appointment);
  } catch (err) {
    console.error('Error fetching appointment:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch appointment' });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('Received POST /api/appointments with body:', req.body);
    const { name, email, contactNumber, area, date, time, remark } = req.body;
    if (!name || !email || !contactNumber || !area || !date || !time) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    const appointment = new Appointment({ name, email, contactNumber, area, date, time, remark });
    console.log('Appointment instance created:', appointment);
    await appointment.save();
    console.log('Appointment saved:', appointment);
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error saving appointment:', err);
    res.status(400).json({ error: err.message || 'Failed to save appointment' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.find();
    console.log(`Fetched ${appointments.length} appointments`);
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch appointments' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, contactNumber, area, date, time, remark } = req.body;
    if (!name || !email || !contactNumber || !area || !date || !time) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { name, email, contactNumber, area, date, time, remark },
      { new: true, runValidators: true }
    );
    if (!appointment) {
      console.log(`Appointment not found for update, ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.log('Appointment updated:', appointment);
    res.status(200).json(appointment);
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(400).json({ error: err.message || 'Failed to update appointment' });
  }
});

router.patch('/:id/attempted', authenticateToken, async (req, res) => {
  try {
    const { attempted } = req.body;
    if (typeof attempted !== 'boolean') {
      return res.status(400).json({ error: 'Attempted status must be a boolean' });
    }
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { attempted },
      { new: true, runValidators: true }
    );
    if (!appointment) {
      console.log(`Appointment not found for attempted status update, ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.log('Appointment attempted status updated:', appointment);
    res.status(200).json(appointment);
  } catch (err) {
    console.error('Error updating attempted status:', err);
    res.status(400).json({ error: err.message || 'Failed to update attempted status' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      console.log(`Appointment not found for deletion, ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    console.log('Appointment deleted:', appointment);
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: err.message || 'Failed to delete appointment' });
  }
});

console.log('Exporting router:', router);
module.exports = router;