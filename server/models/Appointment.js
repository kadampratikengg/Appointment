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
  time: { type: [String], required: [true, 'At least one time slot is required'], validate: {
    validator: function(v) {
      return v.length > 0;
    },
    message: 'At least one time slot is required'
  }},
  remark: { type: String, trim: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paymentStatus: { type: String, default: 'pending' },
  attempted: { type: Boolean, default: false }
}, { timestamps: true });

appointmentSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);