import { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingForm.css';

function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    area: '',
    date: '',
    time: '',
    remark: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl =
        `${process.env.REACT_APP_API_URL}/appointments` ||
        'http://localhost:5000/api/appointments';
      console.log('API URL:', apiUrl);
      console.log('Sending POST with data:', formData);
      const response = await axios.post(apiUrl, formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Response:', response.data);
      setSuccess('Appointment booked successfully!');
      setFormData({
        name: '',
        email: '',
        contactNumber: '',
        area: '',
        date: '',
        time: '',
        remark: '',
      });
      setError('');
    } catch (err) {
      console.error('Error response:', err.response || err.message);
      const errorMessage =
        err.response?.data?.error ||
        'Failed to book appointment. Please check the server and try again.';
      setError(errorMessage);
      setSuccess('');
    }
  };

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Generate time options from 7:00 AM to 6:00 PM in 30-minute intervals
  const timeOptions = [];
  for (let hour = 7; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const isPM = hour >= 12;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayTime = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      const valueTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push({ value: valueTime, label: displayTime });
    }
  }

  return (
    <div className='booking-form-container'>
      <h2 className='text-2xl font-semibold mb-4'>Book Appointment</h2>
      {error && <p className='text-red-500 mb-4'>{error}</p>}
      {success && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white p-4 rounded-md shadow-lg'>
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium'>Name</label>
          <input
            type='text'
            name='name'
            value={formData.name}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Email</label>
          <input
            type='email'
            name='email'
            value={formData.email}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Contact Number</label>
          <input
            type='tel'
            name='contactNumber'
            value={formData.contactNumber}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            pattern='\+[0-9]{10,15}'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Location</label>
          <select
            name='area'
            value={formData.area}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          >
            <option value='' disabled>
              Select an option
            </option>
            <option value='Remote'>Remote</option>
            <option value='Office'>Office</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium'>Date</label>
          <input
            type='date'
            name='date'
            value={formData.date}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Time</label>
          <select
            name='time'
            value={formData.time}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            required
          >
            <option value='' disabled>
              Select a time
            </option>
            {timeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium'>Remark</label>
          <textarea
            name='remark'
            value={formData.remark}
            onChange={handleInputChange}
            className='w-full p-3 border border-gray-300 rounded-md'
            rows='4'
          />
        </div>
        <button
          type='submit'
          className='w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600'
        >
          Book Appointment
        </button>
      </form>
      <div className='mt-4 text-center'>
        <a
          href='https://api.whatsapp.com/send?phone=YOUR_PHONE_NUMBER&text=Hello! I have a question about my appointment.'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
        >
          {/* Contact Us on WhatsApp */}
        </a>
      </div>
    </div>
  );
}

export default BookingForm;