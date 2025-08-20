const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.get('/:id', async (req, res) => {
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

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, slots, date } = req.body;
    if (!amount || !currency || !slots || !date) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const existingAppointments = await Appointment.find({ 
      date, 
      time: { $in: slots },
      paymentStatus: 'completed' 
    });
    if (existingAppointments.length > 0) {
      console.log(`One or more slots already booked for date: ${date}, slots: ${slots}`);
      return res.status(400).json({ error: 'One or more time slots are already booked' });
    }

    const options = {
      amount,
      currency,
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, formData } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !formData) {
      return res.status(400).json({ error: 'Required payment details are missing' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const existingAppointments = await Appointment.find({ 
      date: formData.date, 
      time: { $in: formData.time },
      paymentStatus: 'completed' 
    });
    if (existingAppointments.length > 0) {
      console.log(`One or more slots already booked for date: ${formData.date}, slots: ${formData.time}`);
      return res.status(400).json({ error: 'One or more time slots are already booked' });
    }

    const appointment = new Appointment({
      ...formData,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: 'completed',
    });
    await appointment.save();
    console.log('Appointment saved:', appointment);
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ error: err.message || 'Failed to verify payment' });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('Received POST /api/appointments with body:', req.body);
    const { name, email, contactNumber, area, date, time, remark } = req.body;
    if (!name || !email || !contactNumber || !area || !date || !time) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const existingAppointments = await Appointment.find({ 
      date, 
      time: { $in: Array.isArray(time) ? time : [time] },
      paymentStatus: 'completed' 
    });
    if (existingAppointments.length > 0) {
      console.log(`One or more slots already booked for date: ${date}, time: ${time}`);
      return res.status(400).json({ error: 'One or more time slots are already booked' });
    }

    const appointment = new Appointment({ 
      name, 
      email, 
      contactNumber, 
      area, 
      date, 
      time: Array.isArray(time) ? time : [time], 
      remark 
    });
    console.log('Appointment instance created:', appointment);
    await appointment.save();
    console.log('Appointment saved:', appointment);
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error saving appointment:', err);
    res.status(400).json({ error: err.message || 'Failed to save appointment' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    if (date) {
      const appointments = await Appointment.find({ date, paymentStatus: 'completed' }).select('time');
      const bookedTimes = appointments.reduce((acc, appointment) => [...acc, ...appointment.time], []);
      console.log(`Fetched ${bookedTimes.length} booked times for date: ${date}`);
      res.json(bookedTimes);
    } else {
      const appointments = await Appointment.find();
      console.log(`Fetched ${appointments.length} appointments`);
      res.json(appointments);
    }
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch appointments' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, contactNumber, area, date, time, remark } = req.body;
    if (!name || !email || !contactNumber || !area || !date || !time) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const existingAppointments = await Appointment.find({
      date,
      time: { $in: Array.isArray(time) ? time : [time] },
      _id: { $ne: req.params.id },
      paymentStatus: 'completed'
    });
    if (existingAppointments.length > 0) {
      console.log(`One or more slots already booked for date: ${date}, time: ${time}`);
      return res.status(400).json({ error: 'One or more time slots are already booked' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        email, 
        contactNumber, 
        area, 
        date, 
        time: Array.isArray(time) ? time : [time], 
        remark 
      },
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

router.patch('/:id/attempted', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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

module.exports = router;