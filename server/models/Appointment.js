const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  contactNumber: { 
    type: String, 
    required: [true, 'Contact number is required'], 
    trim: true,
    match: [/^\+\d{10,15}$/, 'Please enter a valid contact number']
  },
  area: { type: String, required: [true, 'Area is required'], trim: true },
  date: { type: String, required: [true, 'Date is required'], trim: true },
  time: { type: String, required: [true, 'Time is required'], trim: true },
  remark: { type: String, trim: true },
  attempted: { type: Boolean, default: false } // Added attempted field
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);