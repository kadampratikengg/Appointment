import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { Canvg } from 'canvg';
import { FaDownload, FaTimes } from 'react-icons/fa'; // Correct import for Font Awesome icons
import './BookingForm.css';
import initiatePayment from './RazorpayPayment';

// Local logo path (adjust if needed)
const LOGO_URL = '/assets/logo.png'; // Ensure this is a PNG or a valid SVG with numerical width/height

function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    area: '',
    date: '',
    time: [],
    remark: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [showBookingCard, setShowBookingCard] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  // Get current system date and time in IST
  const now = new Date();
  const istOffset = 0.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const currentIST = new Date(now.getTime() + istOffset);
  const currentDate = currentIST.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const currentHours = currentIST.getHours();
  const currentMinutes = currentIST.getMinutes();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'date' && value < currentDate) {
      setError('Cannot select a past date.');
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value, time: name === 'date' ? [] : prev.time }));
    setError('');
  };

  const handleTimeSelect = (time) => {
    if (bookedSlots.includes(time)) {
      setError('This time slot is already booked.');
      return;
    }
    setFormData((prev) => {
      const newTimes = prev.time.includes(time)
        ? prev.time.filter((t) => t !== time)
        : [...prev.time, time];
      return { ...prev, time: newTimes };
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.time.length === 0) {
      setError('Please select at least one time slot.');
      return;
    }
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const slotPrice = parseInt(process.env.REACT_APP_SLOT_PRICE) || 20;
      console.log('Creating order with data:', {
        amount: formData.time.length * slotPrice * 100,
        currency: 'INR',
        slots: formData.time,
        date: formData.date,
      });
      const orderResponse = await axios.post(
        `${apiUrl}/appointments/create-order`,
        {
          amount: formData.time.length * slotPrice * 100,
          currency: 'INR',
          slots: formData.time,
          date: formData.date,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Order Response:', orderResponse.data);
      const { orderId } = orderResponse.data;

      const result = await initiatePayment({
        orderId,
        amount: formData.time.length * slotPrice * 100,
        formData,
        apiUrl,
        onSuccess: (bookingResponse) => {
          console.log('Booking Success:', bookingResponse.data);
          setSuccess('Appointment booked successfully!');
          setBookingDetails({
            ...formData,
            _id: bookingResponse.data._id || `temp-${Date.now()}`,
            time: formData.time
              .map((t) => {
                const [hour, minute] = t.split(':').map(Number);
                const isPM = hour >= 12;
                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                return `${displayHour}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
              })
              .join(', '),
            attempted: false,
          });
          setShowBookingCard(true);
          setBookedSlots([...bookedSlots, ...formData.time]);
          setFormData({
            name: '',
            email: '',
            contactNumber: '',
            area: '',
            date: '',
            time: [],
            remark: '',
          });
          setError('');
        },
        onError: (errorMessage) => {
          console.error('Payment initiation error:', errorMessage);
          setError(errorMessage);
          setSuccess('');
        },
      });
      if (!result) {
        setError('Failed to initiate payment. Please try again.');
      }
    } catch (err) {
      console.error('Error initiating payment:', err.response || err.message);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to initiate payment. Please try again.';
      setError(errorMessage);
      setSuccess('');
    }
  };

  useEffect(() => {
    if (formData.date) {
      const fetchBookedSlots = async () => {
        try {
          const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/appointments?date=${formData.date}`;
          console.log('Fetching booked slots from:', apiUrl);
          const response = await axios.get(apiUrl, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('Booked slots:', response.data);
          setBookedSlots(response.data);
        } catch (err) {
          console.error('Error fetching booked slots:', err.response || err.message);
          const errorMessage =
            err.response?.data?.error ||
            err.message ||
            'Failed to load booked slots. Please try again.';
          setError(errorMessage);
        }
      };
      fetchBookedSlots();
    } else {
      setBookedSlots([]);
    }
  }, [formData.date]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const timeOptions = useMemo(() => {
    console.log('Generating time options for date:', formData.date);
    const options = [];
    if (!formData.date) return options;

    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        if (hour === 18 && minute > 30) break;
        const isPM = hour >= 12;
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const displayTime = `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
        const valueTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (formData.date === currentDate) {
          if (hour > currentHours || (hour === currentHours && minute > currentMinutes)) {
            options.push({ value: valueTime, label: displayTime });
          }
        } else if (formData.date > currentDate) {
          options.push({ value: valueTime, label: displayTime });
        }
      }
    }
    console.log('Time options generated:', options);
    return options;
  }, [formData.date, currentHours, currentMinutes, currentDate]);

  const downloadCardAsPDF = async () => {
    if (!bookingDetails) return;
    const doc = new jsPDF();
    const logoWidth = 30;
    const logoHeight = 30;

    try {
      // Handle SVG logo if applicable
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const v = await Canvg.from(ctx, LOGO_URL);
      await v.render();
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 20, 10, logoWidth, logoHeight);
    } catch (err) {
      console.warn('Logo image failed to load:', err.message);
      doc.setFontSize(12);
      doc.text('Logo Unavailable', 20, 20);
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Appointment Confirmation', 20, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const details = [
      `Name: ${bookingDetails.name}`,
      `Email: ${bookingDetails.email}`,
      `Contact: ${bookingDetails.contactNumber}`,
      `Area: ${bookingDetails.area}`,
      `Date: ${bookingDetails.date}`,
      `Time: ${bookingDetails.time}`,
      `Remark: ${bookingDetails.remark || 'None'}`,
      `Status: ${bookingDetails.attempted ? 'Attempted' : 'Not Attempted'}`,
    ];
    details.forEach((line, index) => {
      doc.text(line, 20, 60 + index * 10);
    });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Generated by Appointment Booking System', 20, 280);
    doc.save(`appointment_${bookingDetails._id}.pdf`);
  };

  const closePopup = () => {
    setShowBookingCard(false);
    setBookingDetails(null);
  };

  return (
    <div className='booking-form-container'>
      <h2 className='text-2xl font-semibold mb-4'>Book Appointment</h2>
      {error && <p className='error mb-4'>{error}</p>}
      {success && (
        <div className='success fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white p-4 rounded-md shadow-lg'>
          {success}
        </div>
      )}
      {showBookingCard && bookingDetails && (
        <div className='modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='modal-content bg-white rounded-lg shadow-lg p-6 max-w-md w-full'>
            <div className='appointment-card today-card'>
              <h4 className='card-title'>{bookingDetails.name}</h4>
              <p className='card-detail'><strong>Email:</strong> {bookingDetails.email}</p>
              <p className='card-detail'><strong>Contact:</strong> {bookingDetails.contactNumber}</p>
              <p className='card-detail'><strong>Area:</strong> {bookingDetails.area}</p>
              <p className='card-detail'><strong>Date:</strong> {bookingDetails.date}</p>
              <p className='card-detail'><strong>Time:</strong> {bookingDetails.time}</p>
              <p className='card-detail'><strong>Remark:</strong> {bookingDetails.remark || 'None'}</p>
              <p className='card-detail'><strong>Status:</strong> {bookingDetails.attempted ? 'Attempted' : 'Not Attempted'}</p>
              <div className='card-actions mt-4 flex space-x-2'>
                <button
                  onClick={downloadCardAsPDF}
                  className='action-button bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center'
                >
                  <FaDownload className='w-5 h-5 mr-2' />
                  Download
                </button>
                <button
                  onClick={closePopup}
                  className='action-button bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center'
                >
                  <FaTimes className='w-5 h-5 mr-2' />
                  Close
                </button>
              </div>
            </div>
          </div>
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
            min={currentDate}
          />
        </div>
        <div>
          <label className='block text-sm font-medium'>Time Slots</label>
          {formData.date ? (
            timeOptions.length > 0 ? (
              <div className='time-table-container'>
                <table className='time-table'>
                  <tbody>
                    {Array.from({ length: Math.ceil(timeOptions.length / 4) }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {timeOptions.slice(rowIndex * 4, rowIndex * 4 + 4).map((option) => (
                          <td
                            key={option.value}
                            className={`time-slot ${formData.time.includes(option.value) ? 'selected' : ''} ${
                              bookedSlots.includes(option.value) ? 'booked' : ''
                            }`}
                            onClick={() => handleTimeSelect(option.value)}
                          >
                            {option.label}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className='text-sm text-gray-500'>
                {formData.date === currentDate
                  ? `No time slots available for today after ${currentHours}:${currentMinutes.toString().padStart(2, '0')} PM.`
                  : 'No available time slots for this date.'}
              </p>
            )
          ) : (
            <p className='text-sm text-gray-500'>Please select a date to view available time slots.</p>
          )}
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
        <div>
          <p className='text-sm font-medium'>
            Total: ₹{(formData.time.length * (parseInt(process.env.REACT_APP_SLOT_PRICE) || 20)).toFixed(2)}
          </p>
        </div>
        <button
          type='submit'
          className='w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600'
        >
          Proceed to Payment
        </button>
      </form>
      <div className='mt-4 text-center'>
        <a
          href='https://api.whatsapp.com/send?phone=YOUR_PHONE_NUMBER&text=Hello! I have a question about my appointment.'
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
        >
          Contact Us on WhatsApp
        </a>
      </div>
    </div>
  );
}

export default BookingForm;